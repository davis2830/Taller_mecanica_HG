# facturacion/utils.py
"""
Envío de correos relacionados con facturación.

Refactor: ahora usa templates Django bajo `facturacion/emails/...` que
extienden el layout base con logo + nombre de marca.
"""
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import datetime
import logging

from citas.utils import formato_fecha_es
from taller_mecanico.email_helpers import get_email_context
from taller_mecanico.notification_channels import (
    canal_email, canal_whatsapp,
    EVENTO_FACTURA_EMITIDA, EVENTO_RECORDATORIO_COBRO,
)
from taller_mecanico.whatsapp import enviar_whatsapp_task

logger = logging.getLogger(__name__)


def enviar_email_factura(factura, destinatario_email=None):
    """Envía el comprobante de factura emitida al cliente."""
    orden = factura.orden
    cita = orden.cita if orden else None

    if not destinatario_email:
        if cita and cita.cliente:
            destinatario_email = cita.cliente.email
    if not destinatario_email:
        return False

    if not canal_email(EVENTO_FACTURA_EMITIDA):
        logger.info(f"[facturacion:emitida] canal email deshabilitado por config; saltando.")
        return False

    # Cálculos
    monto_mo = float(factura.costo_mano_obra or 0)
    monto_rep = float(factura.costo_repuestos or 0)
    monto_dto = float(factura.descuento or 0)
    subtotal = monto_mo + monto_rep
    total = subtotal - monto_dto

    cliente_nombre = "Cliente"
    if cita and cita.cliente:
        cliente_nombre = cita.cliente.first_name or cita.cliente.username

    vehiculo_desc = "Vehículo"
    if orden and orden.vehiculo:
        vehiculo_desc = (
            f"{orden.vehiculo.marca} {orden.vehiculo.modelo} "
            f"({orden.vehiculo.placa})"
        )

    repuestos = []
    for rep in orden.repuestos.all() if orden else []:
        repuestos.append({
            'producto': rep.producto,
            'cantidad': rep.cantidad,
            'importe': float(rep.cantidad) * float(rep.precio_unitario),
        })

    fecha_emision = (
        formato_fecha_es(factura.fecha_pagada)
        if factura.fecha_pagada
        else formato_fecha_es(datetime.date.today())
    )

    contexto = get_email_context({
        'factura': factura,
        'cliente_nombre': cliente_nombre,
        'vehiculo_desc': vehiculo_desc,
        'fecha_emision': fecha_emision,
        'servicio_nombre': cita.servicio.nombre if cita else 'Servicio general',
        'monto_mo': monto_mo,
        'monto_dto': monto_dto,
        'subtotal': subtotal,
        'total': total,
        'repuestos': repuestos,
        'metodo_pago': factura.get_metodo_pago_display(),
    })

    asunto = f"Factura electrónica #{factura.numero_factura} — {contexto['marca']['nombre_empresa']}"

    try:
        html = render_to_string('facturacion/emails/factura_emitida.html', contexto)
        texto = strip_tags(html)
        email = EmailMultiAlternatives(
            asunto, texto, settings.EMAIL_HOST_USER, [destinatario_email]
        )
        email.attach_alternative(html, "text/html")
        email.send()
        return True
    except Exception as exc:
        logger.exception(f"[facturacion] Error enviando factura: {exc}")
        return False


def enviar_email_recordatorio_cobro(factura, dias_diferencia=0):
    """
    Recordatorio de cobro para factura B2B a crédito.
    `dias_diferencia`:
      - negativo: faltan días (ej. -3 = recordatorio 3 días antes)
      - 0       : vence hoy
      - positivo: vencida
    """
    # Guards de negocio: aplican a TODOS los canales.
    if not factura.empresa:
        return False
    if factura.condicion_pago != 'CREDITO':
        return False
    if factura.pago_estado in ('PAGADA', 'NO_APLICA'):
        return False

    # Despacho WhatsApp paralelo (mock por ahora). Se hace ANTES del check
    # de email_cobro para que una empresa con solo teléfono y sin email
    # de cobro registrado pueda recibir el recordatorio por WhatsApp.
    if canal_whatsapp(EVENTO_RECORDATORIO_COBRO):
        telefono = getattr(factura.empresa, 'telefono', '') or ''
        if telefono:
            try:
                enviar_whatsapp_task.delay(
                    EVENTO_RECORDATORIO_COBRO, telefono,
                    {
                        'marca': (get_email_context().get('marca') or {}).get('nombre_empresa') or 'el taller',
                        'numero_factura': factura.numero_factura,
                        'saldo': f"{float(factura.saldo_pendiente):.2f}",
                        'fecha_venc': factura.fecha_vencimiento.isoformat() if factura.fecha_vencimiento else '',
                    },
                )
            except Exception as exc:
                logger.warning(f"[whatsapp:recordatorio_cobro] no se pudo encolar: {exc}")

    if not canal_email(EVENTO_RECORDATORIO_COBRO):
        logger.info(f"[facturacion:recordatorio] canal email deshabilitado por config; saltando.")
        return False

    # Guard específico de email — después del WhatsApp porque solo afecta correo.
    if not factura.empresa.email_cobro:
        return False

    empresa = factura.empresa
    saldo = factura.saldo_pendiente
    venc = factura.fecha_vencimiento

    if dias_diferencia < 0:
        asunto = (
            f"Recordatorio de pago: factura {factura.numero_factura} "
            f"vence en {abs(dias_diferencia)} día(s)"
        )
        encabezado = f"Vence en {abs(dias_diferencia)} día(s)"
        color = '#3b82f6'
    elif dias_diferencia == 0:
        asunto = f"Su factura {factura.numero_factura} vence hoy"
        encabezado = "Vence hoy"
        color = '#f59e0b'
    else:
        asunto = (
            f"Factura {factura.numero_factura} vencida hace "
            f"{dias_diferencia} día(s)"
        )
        encabezado = f"Vencida hace {dias_diferencia} día(s)"
        color = '#dc2626'

    contexto = get_email_context({
        'factura': factura,
        'empresa': empresa,
        'saldo': saldo,
        'fecha_venc': venc.isoformat() if venc else '—',
        'asunto': asunto,
        'encabezado': encabezado,
        'color': color,
    })

    try:
        html = render_to_string(
            'facturacion/emails/recordatorio_cobro.html', contexto
        )
        texto = strip_tags(html)
        email = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[empresa.email_cobro],
        )
        email.attach_alternative(html, 'text/html')
        email.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.exception(f"[facturacion] Error enviando recordatorio cobro: {exc}")
        return False
