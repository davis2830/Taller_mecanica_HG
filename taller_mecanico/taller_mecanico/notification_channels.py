"""
Registro central de eventos del sistema y helpers para consultar si
un canal (correo / WhatsApp) está activo para cada evento.

Patrón de uso desde un emisor de notificación (Celery task / view):

    from taller_mecanico.notification_channels import (
        EVENTO_CITA_RECORDATORIO, canal_email, canal_whatsapp,
    )

    if canal_email(EVENTO_CITA_RECORDATORIO):
        enviar_email(...)
    if canal_whatsapp(EVENTO_CITA_RECORDATORIO):
        enviar_whatsapp_mock_task.delay(...)

La lectura va contra la tabla `citas.CanalNotificacion`. Si la fila no
existe, el default es email=True / whatsapp=False — preserva el
comportamiento anterior cuando el evento todavía no se ha registrado en
la migración inicial.
"""

# Identificadores estables de eventos (slugs) — NO renombrar sin migración.
EVENTO_CITA_PENDIENTE_CONFIRMAR = 'cita_pendiente_confirmar'
EVENTO_CITA_CONFIRMADA = 'cita_confirmada'
EVENTO_CITA_RECORDATORIO = 'cita_recordatorio'
EVENTO_CITA_CAMBIO_ESTADO = 'cita_cambio_estado'
EVENTO_CITA_EN_REVISION = 'cita_en_revision'
EVENTO_CITA_COTIZACION = 'cita_cotizacion'
EVENTO_CITA_LISTO = 'cita_listo'
EVENTO_CITA_ENCUESTA = 'cita_encuesta'

EVENTO_OT_ESPERANDO_REPUESTOS_TALLER = 'ot_esperando_repuestos_taller'
EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE = 'ot_esperando_repuestos_cliente'

EVENTO_FACTURA_EMITIDA = 'factura_emitida'
EVENTO_RECORDATORIO_COBRO = 'recordatorio_cobro'

EVENTO_INVENTARIO_ALERTA_STOCK = 'inventario_alerta_stock'
EVENTO_INVENTARIO_RESUMEN_DIARIO = 'inventario_resumen_diario'

EVENTO_USUARIO_ACTIVACION = 'usuario_activacion'
EVENTO_USUARIO_CAMBIO_CORREO_VERIFICACION = 'usuario_cambio_correo_verificacion'
EVENTO_USUARIO_CAMBIO_CORREO_AVISO = 'usuario_cambio_correo_aviso'


# (evento, label, descripcion, grupo, orden) — usado por la migración inicial
# y por la UI de Configuración del Taller.
EVENTOS_REGISTRADOS = [
    # ── Citas ─────────────────────────────────────────────────────────────
    (EVENTO_CITA_PENDIENTE_CONFIRMAR, 'Confirmar cita pendiente',
     'Cuando el cliente solicita una cita: se le manda un link mágico para confirmarla.',
     'Citas', 10),
    (EVENTO_CITA_CONFIRMADA, 'Cita confirmada',
     'Cuando una cita se marca como confirmada (manual o por click del cliente).',
     'Citas', 20),
    (EVENTO_CITA_RECORDATORIO, 'Recordatorio de cita',
     'El día anterior a la cita (job programado).',
     'Citas', 30),
    (EVENTO_CITA_CAMBIO_ESTADO, 'Cambio de estado de la cita',
     'Cuando una cita cambia entre estados (genérico).',
     'Citas', 40),
    (EVENTO_CITA_EN_REVISION, 'OT pasó a En Revisión',
     'Cuando la OT del cliente entra a inspección/diagnóstico.',
     'Citas', 50),
    (EVENTO_CITA_COTIZACION, 'OT pasó a Cotización',
     'Cuando se le manda al cliente la cotización del trabajo (incluye precios).',
     'Citas', 60),
    (EVENTO_CITA_LISTO, 'Vehículo listo para entregar',
     'Cuando la OT pasa a Listo / Esperando entrega.',
     'Citas', 70),
    (EVENTO_CITA_ENCUESTA, 'Encuesta post-servicio',
     'Después de entregar el vehículo, se invita al cliente a calificar el servicio.',
     'Citas', 80),

    # ── Repuestos / OC ────────────────────────────────────────────────────
    (EVENTO_OT_ESPERANDO_REPUESTOS_TALLER, 'OT en Esperando Repuestos (taller)',
     'Aviso INTERNO al admin/recepción cuando la OT pasa a Esperando Repuestos. Incluye lista de piezas y OC asociadas.',
     'Repuestos', 10),
    (EVENTO_OT_ESPERANDO_REPUESTOS_CLIENTE, 'OT en Esperando Repuestos (cliente)',
     'Aviso al cliente — solo nombre y cantidad de piezas, sin precios.',
     'Repuestos', 20),

    # ── Facturación ───────────────────────────────────────────────────────
    (EVENTO_FACTURA_EMITIDA, 'Factura emitida',
     'Al certificar una factura, se le manda al cliente con el detalle.',
     'Facturación', 10),
    (EVENTO_RECORDATORIO_COBRO, 'Recordatorio de cobro (CxC)',
     'Recordatorios automáticos de saldos pendientes (pre-vencimiento, vencimiento, vencidos).',
     'Facturación', 20),

    # ── Inventario ────────────────────────────────────────────────────────
    (EVENTO_INVENTARIO_ALERTA_STOCK, 'Alerta de stock (individual)',
     'Cuando un producto cruza umbral de stock crítico/bajo/agotado.',
     'Inventario', 10),
    (EVENTO_INVENTARIO_RESUMEN_DIARIO, 'Resumen diario de inventario',
     'Reporte diario con todas las alertas activas.',
     'Inventario', 20),

    # ── Cuentas / Seguridad ──────────────────────────────────────────────
    (EVENTO_USUARIO_ACTIVACION, 'Activación de cuenta',
     'Email enviado al registrar un nuevo usuario para activar la cuenta.',
     'Cuentas', 10),
    (EVENTO_USUARIO_CAMBIO_CORREO_VERIFICACION, 'Verificación de cambio de correo',
     'Cuando un usuario cambia su correo, link de confirmación al correo nuevo.',
     'Cuentas', 20),
    (EVENTO_USUARIO_CAMBIO_CORREO_AVISO, 'Aviso al correo viejo (cambio)',
     'Cuando un usuario cambia su correo, aviso de seguridad al correo anterior.',
     'Cuentas', 30),
]


# Por ahora, eventos sensibles de seguridad (cuentas) NO permiten WhatsApp
# desde la UI — son confidenciales y deben quedar siempre por correo.
EVENTOS_SOLO_EMAIL = {
    EVENTO_USUARIO_ACTIVACION,
    EVENTO_USUARIO_CAMBIO_CORREO_VERIFICACION,
    EVENTO_USUARIO_CAMBIO_CORREO_AVISO,
}

# Eventos de seguridad de cuentas: el correo es OBLIGATORIO (no se puede
# desactivar desde la UI ni desde el modelo). Si el admin marca email=False
# para uno de estos, igual se envía. Razón: deshabilitar estos romperia
# flujos de activación / cambio de correo / recuperación.
EVENTOS_EMAIL_OBLIGATORIO = {
    EVENTO_USUARIO_ACTIVACION,
    EVENTO_USUARIO_CAMBIO_CORREO_VERIFICACION,
    EVENTO_USUARIO_CAMBIO_CORREO_AVISO,
}


def canal_email(evento: str) -> bool:
    """¿Está activo el canal de correo para este evento?

    Los eventos en EVENTOS_EMAIL_OBLIGATORIO siempre se envían — son
    flujos de seguridad que no pueden desactivarse.
    """
    if evento in EVENTOS_EMAIL_OBLIGATORIO:
        return True
    from citas.models import CanalNotificacion
    email_on, _ = CanalNotificacion.get_config(evento)
    return email_on


def canal_whatsapp(evento: str) -> bool:
    """¿Está activo el canal de WhatsApp para este evento?"""
    if evento in EVENTOS_SOLO_EMAIL:
        return False
    from citas.models import CanalNotificacion
    _, wa_on = CanalNotificacion.get_config(evento)
    return wa_on


def get_config(evento: str):
    """Devuelve la tupla (email, whatsapp) para un evento."""
    from citas.models import CanalNotificacion
    return CanalNotificacion.get_config(evento)
