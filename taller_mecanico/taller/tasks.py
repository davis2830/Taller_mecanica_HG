"""
Tareas Celery del módulo taller.
"""
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

import logging

from taller_mecanico.email_helpers import get_email_context
from taller_mecanico.notification_channels import (
    canal_email, canal_whatsapp,
    EVENTO_OT_ESPERANDO_REPUESTOS_TALLER,
    EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE,
)
from taller_mecanico.whatsapp import enviar_whatsapp_task

logger = logging.getLogger(__name__)


def _cargar_orden_con_relaciones(orden_id):
    from taller.models import OrdenTrabajo
    return (
        OrdenTrabajo.objects
        .select_related('vehiculo', 'vehiculo__propietario', 'cita', 'mecanico_asignado')
        .prefetch_related('repuestos__producto')
        .get(id=orden_id)
    )


def _datos_repuestos(orden):
    """Estructura common para items de repuesto, usada por correos taller y cliente."""
    return [{
        'producto': r.producto.nombre,
        'sku': getattr(r.producto, 'sku', '') or '',
        'cantidad': r.cantidad,
        'precio_unitario': r.precio_unitario,
        'subtotal': r.subtotal,
        'en_transito': r.en_transito,
    } for r in orden.repuestos.all()]


def _datos_ordenes_compra(orden):
    """Resumen de OC asociadas a la cita_taller de la orden."""
    if not orden.cita_id:
        return []
    from inventario.models import OrdenCompra
    ocs = (
        OrdenCompra.objects
        .filter(cita_taller_id=orden.cita_id)
        .exclude(estado='CANCELADA')
        .select_related('proveedor')
        .prefetch_related('detalles__producto')
    )
    return [{
        'numero': f"OC-{oc.id:04d}",
        'estado': oc.get_estado_display(),
        'proveedor': oc.proveedor.nombre if oc.proveedor else '—',
        'fecha_esperada': oc.fecha_esperada,
        'total': oc.total,
        'detalles': [{
            'producto': d.producto.nombre,
            'cantidad_solicitada': d.cantidad_solicitada,
            'cantidad_recibida': d.cantidad_recibida,
        } for d in oc.detalles.all()],
    } for oc in ocs]


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_aviso_esperando_repuestos_task(self, orden_id):
    """
    Aviso INTERNO al taller (admin/recepción/superusuarios) cuando una OT
    pasa a ESPERANDO_REPUESTOS. Incluye precios, OC y detalles operativos.
    """
    from inventario.utils import obtener_usuarios_notificacion

    try:
        orden = _cargar_orden_con_relaciones(orden_id)
    except Exception:
        logger.warning(f"[esperando_repuestos:taller] OT {orden_id} no existe; abortando aviso.")
        return f"OT {orden_id} no existe."

    if not canal_email(EVENTO_OT_ESPERANDO_REPUESTOS_TALLER):
        logger.info(
            f"[esperando_repuestos:taller] OT {orden_id}: canal email deshabilitado por config; saltando."
        )
        return "Canal email deshabilitado."

    usuarios = obtener_usuarios_notificacion()
    emails = [u.email for u in usuarios if u.email]
    if not emails:
        logger.warning(f"[esperando_repuestos:taller] No hay destinatarios para OT {orden_id}.")
        return "Sin destinatarios."

    cliente = getattr(orden.vehiculo, 'propietario', None)
    cliente_nombre = (
        f"{cliente.first_name} {cliente.last_name}".strip()
        if cliente else '—'
    ) or (cliente.username if cliente else '—')

    frontend_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    detalle_url = f"{frontend_url}/taller/ordenes/{orden.id}" if frontend_url else None

    contexto = get_email_context({
        'orden': orden,
        'cliente_nombre': cliente_nombre,
        'items': _datos_repuestos(orden),
        'ordenes_compra': _datos_ordenes_compra(orden),
        'detalle_url': detalle_url,
    })

    asunto = f"[Taller] OT #{orden.id} en espera de repuestos — {orden.vehiculo.placa}"

    try:
        html = render_to_string('taller/emails/esperando_repuestos.html', contexto)
        texto = strip_tags(html)
        msg = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=emails,
        )
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
        logger.info(
            f"[esperando_repuestos:taller] OT {orden_id} avisada a {len(emails)} destinatarios."
        )
        return f"OK: {len(emails)} destinatarios."
    except Exception as exc:
        logger.exception(f"[esperando_repuestos:taller] Error OT {orden_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return f"Error tras 3 reintentos: {exc}"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_aviso_esperando_repuestos_cliente_task(self, orden_id):
    """
    Aviso al CLIENTE cuando su OT pasa a ESPERANDO_REPUESTOS.
    Incluye sólo detalle informativo (pieza + cantidad), SIN precios ni OC.
    """
    try:
        orden = _cargar_orden_con_relaciones(orden_id)
    except Exception:
        logger.warning(f"[esperando_repuestos:cliente] OT {orden_id} no existe; abortando.")
        return f"OT {orden_id} no existe."

    cliente = getattr(orden.vehiculo, 'propietario', None)
    if not cliente or not cliente.email:
        logger.info(
            f"[esperando_repuestos:cliente] OT {orden_id} sin email de cliente; saltando."
        )
        return "Cliente sin email."

    # Despachar WhatsApp en paralelo si está habilitado y hay teléfono.
    if canal_whatsapp(EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE):
        perfil = getattr(cliente, 'perfil', None)
        telefono = getattr(perfil, 'telefono', '') or ''
        if telefono:
            params = {
                'cliente_nombre': cliente.first_name or cliente.username,
                'marca': (get_email_context().get('marca') or {}).get('nombre_empresa') or 'el taller',
                'vehiculo': f"{orden.vehiculo.marca} {orden.vehiculo.modelo} ({orden.vehiculo.placa})",
            }
            try:
                enviar_whatsapp_task.delay(
                    EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE, telefono, params,
                )
            except Exception as exc:
                logger.warning(f"[whatsapp:esperando_repuestos] no se pudo encolar: {exc}")

    if not canal_email(EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE):
        logger.info(
            f"[esperando_repuestos:cliente] OT {orden_id}: canal email deshabilitado por config; saltando."
        )
        return "Canal email deshabilitado."

    contexto = get_email_context({
        'orden': orden,
        'cliente': cliente,
        'items': _datos_repuestos(orden),
    })

    asunto = "Tu vehículo está esperando repuestos"

    try:
        html = render_to_string(
            'taller/emails/esperando_repuestos_cliente.html', contexto
        )
        texto = strip_tags(html)
        msg = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[cliente.email],
        )
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
        logger.info(
            f"[esperando_repuestos:cliente] OT {orden_id} avisada a {cliente.email}."
        )
        return f"OK: {cliente.email}"
    except Exception as exc:
        logger.exception(f"[esperando_repuestos:cliente] Error OT {orden_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return f"Error tras 3 reintentos: {exc}"
