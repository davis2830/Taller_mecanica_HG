"""
Cliente del certificador FEL.

Expone una interfaz `CertificadorBase` con `certificar(documento)` y
`anular(documento, motivo)`. La implementación por defecto es
`MockCertificador` — devuelve UUIDs y series falsos para probar todo el flujo
sin integrarse todavía a un proveedor real.

Cuando el usuario firme con INFILE / Digifact / etc., solo se agrega la
implementación real en esta misma carpeta y se registra en `get_certificador`.
"""
from __future__ import annotations

import uuid
import datetime as dt
from dataclasses import dataclass
from django.utils import timezone

from .xml_dte import construir_xml_dte


@dataclass
class CertificacionResultado:
    """Resultado de un intento de certificación / anulación."""
    ok: bool
    uuid_sat: str = ''
    serie: str = ''
    numero_autorizacion: str = ''
    xml_certificado: str = ''
    fecha_sat: dt.datetime | None = None
    error: str = ''


class CertificadorBase:
    """Interfaz base. Todos los certificadores reales heredan de aquí."""
    nombre = 'base'

    def __init__(self, config):
        self.config = config  # ConfiguracionFacturacion

    def certificar(self, documento) -> CertificacionResultado:
        raise NotImplementedError

    def anular(self, documento, motivo: str) -> CertificacionResultado:
        raise NotImplementedError


class MockCertificador(CertificadorBase):
    """
    Certificador simulado. NO envía nada a SAT — solo registra el envío
    con UUID y serie falsos para que el flujo completo sea probable de
    punta a punta mientras no hay proveedor real configurado.
    """
    nombre = 'MOCK'

    def certificar(self, documento) -> CertificacionResultado:
        xml_local = construir_xml_dte(documento)
        # Emulamos el XML "firmado" agregándole un comentario de mock.
        xml_firmado = xml_local.replace(
            '<?xml',
            '<!-- MOCK: este XML no fue firmado por SAT -->\n<?xml',
            1,
        )
        now = timezone.now()
        fake_uuid = str(uuid.uuid4()).upper()
        correlativo = f"MOCK-{documento.factura.id:06d}"

        return CertificacionResultado(
            ok=True,
            uuid_sat=fake_uuid,
            serie=self.config.serie_fel or 'A',
            numero_autorizacion=correlativo,
            xml_certificado=xml_firmado,
            fecha_sat=now,
            error='',
        )

    def anular(self, documento, motivo: str) -> CertificacionResultado:
        if not documento.uuid_sat:
            return CertificacionResultado(ok=False, error='Documento sin UUID no se puede anular.')
        return CertificacionResultado(
            ok=True,
            uuid_sat=documento.uuid_sat,
            serie=documento.serie,
            numero_autorizacion=documento.numero_autorizacion,
            fecha_sat=timezone.now(),
        )


class InfileCertificador(CertificadorBase):
    """Stub — se implementará cuando el cliente firme contrato con INFILE."""
    nombre = 'INFILE'

    def certificar(self, documento) -> CertificacionResultado:
        return CertificacionResultado(
            ok=False,
            error="INFILE aún no está integrado. Contacta soporte para habilitar el adapter real.",
        )

    def anular(self, documento, motivo: str) -> CertificacionResultado:
        return CertificacionResultado(
            ok=False,
            error="INFILE aún no está integrado.",
        )


class DigifactCertificador(CertificadorBase):
    """Stub — se implementará cuando el cliente firme contrato con Digifact."""
    nombre = 'DIGIFACT'

    def certificar(self, documento) -> CertificacionResultado:
        return CertificacionResultado(
            ok=False,
            error="Digifact aún no está integrado. Contacta soporte para habilitar el adapter real.",
        )

    def anular(self, documento, motivo: str) -> CertificacionResultado:
        return CertificacionResultado(
            ok=False,
            error="Digifact aún no está integrado.",
        )


# Registro de adapters disponibles.
_REGISTRY = {
    '': MockCertificador,          # Sin definir → mock (para poder probar el flujo).
    'INFILE': InfileCertificador,
    'DIGIFACT': DigifactCertificador,
    'GUATEFACT': CertificadorBase,  # Pendiente.
    'MEGAPRINT': CertificadorBase,  # Pendiente.
    'OTRO': CertificadorBase,       # Pendiente.
}


def get_certificador(config) -> CertificadorBase:
    """
    Factory. Dado el singleton ConfiguracionFacturacion, devuelve el cliente
    apropiado. Si el certificador no está definido → MockCertificador.
    """
    cls = _REGISTRY.get(config.certificador or '', MockCertificador)
    if cls is CertificadorBase:
        # Aún no implementado — caer en mock para no bloquear el flujo.
        cls = MockCertificador
    return cls(config)
