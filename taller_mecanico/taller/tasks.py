"""
Tareas Celery del módulo taller.
"""
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_aviso_esperando_repuestos_task(self, orden_id):
    """
    Cuando una OrdenTrabajo cambia a ESPERANDO_REPUESTOS, enviamos un correo
    al admin/recepción/superusuarios listando las piezas pendientes y, si
    existe, el número de Orden de Compra asociada a la cita.

    El correo incluye:
      - Datos de la orden (número, vehículo, cliente)
      - Listado de repuestos asignados a la OT (nombre, cantidad, precio)
      - Resumen de OC asociada (si la cita tiene una)
      - Link al detalle de la OT en el frontend (si FRONTEND_URL está set)

    Reintentos automáticos: 3 con 60s entre cada uno.
    """
    from taller.models import OrdenTrabajo
    from inventario.utils import obtener_usuarios_notificacion

    try:
        orden = (
            OrdenTrabajo.objects
            .select_related('vehiculo', 'vehiculo__propietario', 'cita', 'mecanico_asignado')
            .prefetch_related('repuestos__producto')
            .get(id=orden_id)
        )
    except OrdenTrabajo.DoesNotExist:
        logger.warning(f"[esperando_repuestos] OT {orden_id} no existe; abortando aviso.")
        return f"OT {orden_id} no existe."

    # Destinatarios: admin + mecánico + superusuarios (mismo criterio que alertas de inventario).
    usuarios = obtener_usuarios_notificacion()
    emails = [u.email for u in usuarios if u.email]
    if not emails:
        logger.warning(f"[esperando_repuestos] No hay destinatarios para notificar OT {orden_id}.")
        return "Sin destinatarios."

    repuestos = list(orden.repuestos.all())
    items = [{
        'producto': r.producto.nombre,
        'sku': getattr(r.producto, 'sku', '') or '',
        'cantidad': r.cantidad,
        'precio_unitario': r.precio_unitario,
        'subtotal': r.subtotal,
        'en_transito': r.en_transito,
    } for r in repuestos]

    # OC asociada: la cita_taller de OrdenCompra apunta a Cita; buscamos la(s) OC.
    ordenes_compra = []
    if orden.cita_id:
        from inventario.models import OrdenCompra
        ocs = (
            OrdenCompra.objects
            .filter(cita_taller_id=orden.cita_id)
            .exclude(estado='CANCELADA')
            .select_related('proveedor')
            .prefetch_related('detalles__producto')
        )
        for oc in ocs:
            ordenes_compra.append({
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
            })

    cliente = getattr(orden.vehiculo, 'propietario', None)
    cliente_nombre = (
        f"{cliente.first_name} {cliente.last_name}".strip()
        if cliente else '—'
    ) or (cliente.username if cliente else '—')

    frontend_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    detalle_url = f"{frontend_url}/taller/ordenes/{orden.id}" if frontend_url else None

    asunto = f"[Taller] OT #{orden.id} en espera de repuestos — {orden.vehiculo.placa}"
    contexto = {
        'orden': orden,
        'cliente_nombre': cliente_nombre,
        'items': items,
        'ordenes_compra': ordenes_compra,
        'detalle_url': detalle_url,
        'fecha': timezone.now(),
    }

    try:
        html = render_to_string('taller/emails/esperando_repuestos.html', contexto)
        # Texto plano simple como fallback.
        lineas = [
            f"OT #{orden.id} - {orden.vehiculo.placa} ({orden.vehiculo.marca} {orden.vehiculo.modelo})",
            f"Cliente: {cliente_nombre}",
            f"Mecánico: {orden.mecanico_asignado.get_full_name() if orden.mecanico_asignado else '—'}",
            "",
            "Repuestos requeridos:",
        ]
        if items:
            for it in items:
                lineas.append(
                    f"  • {it['cantidad']} x {it['producto']} "
                    f"({'En tránsito' if it['en_transito'] else 'Pendiente'})"
                )
        else:
            lineas.append("  (sin repuestos asignados todavía)")
        if ordenes_compra:
            lineas.append("")
            lineas.append("Órdenes de compra asociadas:")
            for oc in ordenes_compra:
                lineas.append(f"  • {oc['numero']} ({oc['estado']}) — Proveedor: {oc['proveedor']}")
        if detalle_url:
            lineas.append("")
            lineas.append(f"Ver detalle: {detalle_url}")
        texto = "\n".join(lineas)

        msg = EmailMultiAlternatives(
            subject=asunto,
            body=texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=emails,
        )
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
        logger.info(
            f"[esperando_repuestos] OT {orden_id} avisada a {len(emails)} destinatarios."
        )
        return f"OK: {len(emails)} destinatarios."
    except Exception as exc:
        logger.exception(f"[esperando_repuestos] Error enviando aviso OT {orden_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return f"Error tras 3 reintentos: {exc}"
