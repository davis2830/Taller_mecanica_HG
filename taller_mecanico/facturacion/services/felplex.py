"""
Adapter real para FELplex — certificador FEL autorizado por SAT Guatemala.

Documentación API: https://documenter.getpostman.com/view/1055317/TVCZYqHT

Flujo:
  1. Se construye un payload JSON con los datos de la factura.
  2. Se envía POST síncrono a FELplex.
  3. FELplex genera el XML, lo firma, lo envía a SAT y devuelve el resultado.

Autenticación: header ``X-Authorization`` con la API key de la entidad.

URLs base:
  - Sandbox:    https://felplex.stage.plex.lat
  - Producción: https://felplex.plex.lat
"""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal

import requests
from django.utils import timezone

from .certificador import CertificadorBase, CertificacionResultado

log = logging.getLogger(__name__)

_TIMEOUT = 30  # segundos

# Mapeo tipo DTE interno → tipo FELplex
_TIPO_MAP = {
    'FACT': 'FACT',
    'FCAM': 'FCAM',
    'FPEQ': 'FPEQ',
    'NCRE': 'NCRE',
    'NDEB': 'NDEB',
}


def _base_url(config) -> str:
    """Devuelve la URL base del API según el ambiente o la URL personalizada."""
    if config.certificador_api_url:
        return config.certificador_api_url.rstrip('/')
    if config.ambiente == 'PRODUCCION':
        return 'https://felplex.plex.lat'
    return 'https://felplex.stage.plex.lat'


def _headers(config) -> dict:
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Authorization': config.certificador_api_key,
    }


def _entity_id(config) -> str:
    return config.certificador_usuario


def _build_item(descripcion: str, cantidad, precio_con_iva, tasa_iva: Decimal,
                iva_incluido: bool, bien_o_servicio: str = 'S',
                descuento: Decimal = Decimal('0')) -> dict:
    """Construye un item en el formato JSON de FELplex."""
    precio = float(Decimal(str(precio_con_iva)))
    qty = float(Decimal(str(cantidad)))

    item = {
        'qty': qty,
        'type': bien_o_servicio,
        'price': precio,
        'description': descripcion[:200],
        'without_iva': 0 if iva_incluido else 1,
        'discount': float(descuento),
        'is_discount_percentage': 0,
        'taxes': [],
    }
    return item


def _build_payload(documento) -> dict:
    """
    Construye el payload JSON completo para certificar un DTE en FELplex.
    Soporta FACT, FPEQ, FCAM y NCRE.
    """
    factura = documento.factura
    orden = factura.orden
    cita = getattr(orden, 'cita', None)
    cliente = getattr(cita, 'cliente', None)
    perfil = getattr(cliente, 'perfil', None) if cliente else None
    servicio = getattr(cita, 'servicio', None)

    tipo = _TIPO_MAP.get(documento.tipo_dte, 'FACT')
    tasa = factura.tasa_iva or Decimal('0.12')
    iva_incluido = factura.iva_incluido

    # ── Items ──
    items = []

    # Mano de obra / servicio
    if factura.costo_mano_obra and factura.costo_mano_obra > 0:
        items.append(_build_item(
            descripcion=servicio.nombre if servicio else 'Servicio mecánico',
            cantidad=1,
            precio_con_iva=factura.costo_mano_obra,
            tasa_iva=tasa,
            iva_incluido=iva_incluido,
            bien_o_servicio='S',
        ))

    # Repuestos detallados
    repuestos_qs = orden.repuestos.all() if hasattr(orden, 'repuestos') else []
    for r in repuestos_qs:
        items.append(_build_item(
            descripcion=r.producto.nombre if r.producto else 'Repuesto',
            cantidad=r.cantidad,
            precio_con_iva=r.precio_unitario or 0,
            tasa_iva=tasa,
            iva_incluido=iva_incluido,
            bien_o_servicio='B',
        ))

    # Si no hay detalle de repuestos pero sí costo_repuestos > 0
    if not repuestos_qs and factura.costo_repuestos and factura.costo_repuestos > 0:
        items.append(_build_item(
            descripcion='Repuestos y materiales',
            cantidad=1,
            precio_con_iva=factura.costo_repuestos,
            tasa_iva=tasa,
            iva_incluido=iva_incluido,
            bien_o_servicio='B',
        ))

    # Si no hay items (edge case), agregar línea genérica
    if not items:
        items.append(_build_item(
            descripcion='Servicio de taller',
            cantidad=1,
            precio_con_iva=factura.total_general,
            tasa_iva=tasa,
            iva_incluido=True,
            bien_o_servicio='S',
        ))

    # ── Receptor ──
    nit = perfil.nit_normalizado if perfil else 'CF'
    nit_limpio = nit.replace('-', '').strip()
    es_cf = nit_limpio.upper() == 'CF' or not nit_limpio

    nombre_receptor = (
        perfil.nombre_fiscal_o_nombre if perfil
        else (f"{cliente.first_name} {cliente.last_name}".strip() if cliente else 'Consumidor Final')
    )

    # ── Totales ──
    total = float(factura.total_general)
    total_tax = float(factura.monto_iva)

    # ── Emails ──
    emails = []
    email_cliente = getattr(cliente, 'email', '') if cliente else ''
    if email_cliente:
        emails.append({'email': email_cliente})

    # ── Fecha emisión ──
    fecha = factura.fecha_emision or timezone.now()
    if hasattr(fecha, 'isoformat'):
        datetime_issue = fecha.strftime('%Y-%m-%dT%H:%M:%S')
    else:
        datetime_issue = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

    payload = {
        'type': tipo,
        'datetime_issue': datetime_issue,
        'items': items,
        'total': total,
        'total_tax': f"{total_tax:.2f}",
        'emails': emails,
        'to_cf': 1 if es_cf else 0,
    }

    # Receptor (solo si NO es CF)
    if not es_cf:
        direccion = (
            perfil.direccion_fiscal_o_direccion if perfil else 'Ciudad'
        )
        payload['to'] = {
            'tax_code_type': 'NIT',
            'tax_code': nit_limpio,
            'tax_name': nombre_receptor or 'Consumidor Final',
            'address': {
                'street': direccion or 'Ciudad',
                'city': 'Guatemala',
                'state': 'Guatemala',
                'zip': '01001',
                'country': 'GT',
            },
        }

    # ── FCAM: pagos programados ──
    if tipo == 'FCAM' and factura.condicion_pago == 'CREDITO':
        from datetime import timedelta
        fecha_base = (factura.fecha_emision or timezone.now()).date()
        fecha_venc = fecha_base + timedelta(days=factura.dias_credito or 30)
        payload['use_payments'] = 1
        payload['payments'] = [{
            'date': fecha_venc.isoformat(),
            'amount': total,
        }]

    # ── NCRE: referencia al documento original ──
    if tipo == 'NCRE' and documento.documento_original:
        payload['parent_invoice_id'] = documento.documento_original.uuid_sat

    return payload


class FELplexCertificador(CertificadorBase):
    """
    Certificador real FELplex.
    Envía DTEs via API REST JSON y recibe UUID/serie/autorización de SAT.
    Soporta FACT, FPEQ, FCAM, NCRE.
    """
    nombre = 'FELPLEX'

    def _validate_config(self) -> str | None:
        """Retorna mensaje de error si falta configuración, o None si OK."""
        if not _entity_id(self.config):
            return (
                "Falta el Entity ID de FELplex. "
                "Configuralo en Facturación → Configuración → Usuario del certificador."
            )
        if not self.config.certificador_api_key:
            return (
                "Falta la API Key de FELplex. "
                "Configurala en Facturación → Configuración → API Key del certificador."
            )
        return None

    def certificar(self, documento) -> CertificacionResultado:
        error = self._validate_config()
        if error:
            return CertificacionResultado(ok=False, error=error)

        entity = _entity_id(self.config)
        url = f"{_base_url(self.config)}/api/entity/{entity}/invoices/await"

        payload = _build_payload(documento)

        log.info("FELplex certificar DTE tipo=%s factura=%s url=%s",
                 documento.tipo_dte, documento.factura.id, url)

        try:
            resp = requests.post(url, json=payload, headers=_headers(self.config),
                                 timeout=_TIMEOUT)
        except requests.RequestException as exc:
            msg = f"Error de conexión con FELplex: {exc}"
            log.error(msg)
            return CertificacionResultado(ok=False, error=msg)

        try:
            data = resp.json()
        except ValueError:
            msg = f"FELplex respondió con contenido no-JSON (HTTP {resp.status_code})"
            log.error(msg)
            return CertificacionResultado(ok=False, error=msg)

        if not resp.ok or not data.get('valid', False):
            errors = data.get('errors', data.get('error', ''))
            if isinstance(errors, dict):
                errors = '; '.join(f"{k}: {v}" for k, v in errors.items())
            msg = f"FELplex rechazó el DTE (HTTP {resp.status_code}): {errors}"
            log.warning(msg)
            return CertificacionResultado(ok=False, error=msg)

        # Parsear respuesta exitosa
        sat = data.get('sat', {})
        uuid_sat = data.get('uuid', '')
        serie = sat.get('serie', '')
        numero = sat.get('no', '')
        autorizacion = sat.get('authorization', '')
        fecha_cert_str = sat.get('certification_date', '')

        fecha_cert = None
        if fecha_cert_str:
            try:
                fecha_cert = timezone.make_aware(
                    datetime.strptime(fecha_cert_str, '%Y-%m-%d %H:%M:%S')
                )
            except (ValueError, TypeError):
                fecha_cert = timezone.now()

        log.info("FELplex certificado OK uuid=%s serie=%s no=%s", uuid_sat, serie, numero)

        return CertificacionResultado(
            ok=True,
            uuid_sat=uuid_sat,
            serie=serie,
            numero_autorizacion=autorizacion or numero,
            xml_certificado='',  # FELplex no devuelve XML en la respuesta JSON
            fecha_sat=fecha_cert or timezone.now(),
        )

    def anular(self, documento, motivo: str) -> CertificacionResultado:
        error = self._validate_config()
        if error:
            return CertificacionResultado(ok=False, error=error)

        if not documento.uuid_sat:
            return CertificacionResultado(
                ok=False, error='El documento no tiene UUID de SAT — no se puede anular.'
            )

        entity = _entity_id(self.config)
        url = f"{_base_url(self.config)}/api/entity/{entity}/invoices/{documento.uuid_sat}"

        log.info("FELplex anular DTE uuid=%s motivo=%s", documento.uuid_sat, motivo)

        try:
            resp = requests.delete(
                url,
                json={'reason': motivo or 'Anulación solicitada por el emisor.'},
                headers=_headers(self.config),
                timeout=_TIMEOUT,
            )
        except requests.RequestException as exc:
            msg = f"Error de conexión con FELplex al anular: {exc}"
            log.error(msg)
            return CertificacionResultado(ok=False, error=msg)

        try:
            data = resp.json()
        except ValueError:
            msg = f"FELplex respondió con contenido no-JSON al anular (HTTP {resp.status_code})"
            log.error(msg)
            return CertificacionResultado(ok=False, error=msg)

        if not resp.ok or not data.get('success', False):
            errors = data.get('errors', data.get('error', ''))
            if isinstance(errors, dict):
                errors = '; '.join(f"{k}: {v}" for k, v in errors.items())
            msg = f"FELplex rechazó la anulación (HTTP {resp.status_code}): {errors}"
            log.warning(msg)
            return CertificacionResultado(ok=False, error=msg)

        log.info("FELplex anulado OK uuid=%s", documento.uuid_sat)

        return CertificacionResultado(
            ok=True,
            uuid_sat=data.get('uuid', documento.uuid_sat),
            serie=documento.serie,
            numero_autorizacion=documento.numero_autorizacion,
            fecha_sat=timezone.now(),
        )


def consultar_nit(config, nit: str) -> dict:
    """
    Consulta datos de un NIT ante SAT via FELplex.

    Retorna dict con:
      - ok: bool
      - nombre: str (nombre fiscal del contribuyente)
      - error: str (si ok=False)
    """
    entity = _entity_id(config)
    if not entity or not config.certificador_api_key:
        return {'ok': False, 'error': 'Falta configuración de FELplex (Entity ID o API Key).'}

    nit_limpio = nit.replace('-', '').replace(' ', '').strip()
    if not nit_limpio:
        return {'ok': False, 'error': 'NIT vacío.'}

    url = f"{_base_url(config)}/api/entity/{entity}/find/NIT/{nit_limpio}"

    try:
        resp = requests.get(url, headers=_headers(config), timeout=_TIMEOUT)
    except requests.RequestException as exc:
        return {'ok': False, 'error': f'Error de conexión: {exc}'}

    if not resp.ok:
        return {'ok': False, 'error': f'NIT no encontrado (HTTP {resp.status_code}).'}

    try:
        data = resp.json()
    except ValueError:
        return {'ok': False, 'error': 'Respuesta inválida de FELplex.'}

    nombre = data.get('name', data.get('nombre', ''))
    return {'ok': True, 'nombre': nombre, 'data': data}
