"""
Capa de envío de WhatsApp.

Este módulo expone una task Celery `enviar_whatsapp_task(evento, telefono, params)`
que SERÁ implementada con Twilio en PR F. Por ahora es un MOCK:

  - Si `WHATSAPP_BACKEND` (settings) == 'twilio'   → llama a Twilio (PR F).
  - Si `WHATSAPP_BACKEND` == 'mock' (default)      → solo loguea y retorna 'sent'.

De esta forma, el resto del código ya puede llamar `enviar_whatsapp_task.delay(...)`
sin esperar a que Twilio esté operativo. Cuando PR F aterrice, solo cambia la
implementación de `_send_twilio()` y el setting `WHATSAPP_BACKEND`.

Plantillas:
  Twilio/Meta requiere plantillas pre-aprobadas. Aquí mantenemos un mapa
  `evento -> plantilla` que el operador puede ajustar (en PR F lo movemos a
  settings/Modelo). Por ahora el mock usa el mismo mensaje y solo loguea.
"""
import logging
from typing import Optional

from celery import shared_task
from django.conf import settings


logger = logging.getLogger(__name__)


# Plantillas mock — texto plano que se imprimiría en WhatsApp si fuera real.
# Las variables van como {nombre}, {placa}, etc. — los emisores las pasan
# en `params`.
PLANTILLAS_WHATSAPP = {
    'cita_pendiente_confirmar':
        "Hola {cliente_nombre}, recibimos tu solicitud de cita en {marca} para "
        "{servicio} el {cuando}. Confirma con un clic: {enlace_confirmar}",
    'cita_confirmada':
        "Hola {cliente_nombre}, tu cita en {marca} para {servicio} el {cuando} "
        "quedó confirmada. ¡Te esperamos!",
    'cita_recordatorio':
        "Recordatorio {marca}: tu cita es {cuando} ({servicio}, vehículo "
        "{vehiculo}). ¡Nos vemos pronto!",
    'cita_cambio_estado':
        "Hola {cliente_nombre}, tu cita {cita_id} en {marca} cambió a estado "
        "{estado}.",
    'cita_en_revision':
        "Hola {cliente_nombre}, tu vehículo {vehiculo} ya está en inspección "
        "en {marca}. Te avisamos al terminar.",
    'cita_cotizacion':
        "Hola {cliente_nombre}, te enviamos por correo la cotización de "
        "tu vehículo {vehiculo} ({marca}). Total estimado: Q {total}.",
    'cita_listo':
        "¡Buenas noticias {cliente_nombre}! Tu vehículo {vehiculo} ya está listo "
        "para recoger en {marca}.",
    'cita_encuesta':
        "Hola {cliente_nombre}, ¿cómo te fue con tu vehículo? Califica el "
        "servicio: {url_encuesta}",
    'ot_esperando_repuestos_cliente':
        "Hola {cliente_nombre}, tu vehículo {vehiculo} en {marca} pasó a "
        "'Esperando repuestos'. Te avisaremos cuando lleguen.",
    'recordatorio_cobro':
        "Recordatorio {marca}: factura {numero_factura} con saldo Q {saldo}, "
        "vence {fecha_venc}.",
}


def renderizar_plantilla(evento: str, params: dict) -> Optional[str]:
    plantilla = PLANTILLAS_WHATSAPP.get(evento)
    if not plantilla:
        return None
    try:
        return plantilla.format(**params)
    except KeyError as exc:
        logger.warning(
            "[whatsapp:%s] Falta parámetro %s para plantilla; mensaje no enviado.",
            evento, exc,
        )
        return None


def _send_mock(evento: str, telefono: str, mensaje: str) -> str:
    """
    No envía nada — solo loguea para que el operador pueda ver en consola
    qué saldría por WhatsApp si Twilio estuviera operativo.
    """
    logger.info(
        "[whatsapp:MOCK] evento=%s telefono=%s\n  Mensaje: %s",
        evento, telefono, mensaje,
    )
    return 'mock'


def _send_twilio(evento: str, telefono: str, mensaje: str) -> str:
    """
    Reservado para PR F. Hoy levanta NotImplementedError si llega aquí.
    """
    raise NotImplementedError(
        "Backend Twilio no está disponible en este PR. "
        "Settings WHATSAPP_BACKEND debe ser 'mock'."
    )


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def enviar_whatsapp_task(self, evento: str, telefono: str, params: dict):
    """
    Envía (o simula) un mensaje de WhatsApp para un evento determinado.

    Args:
        evento: slug del evento (ver `notification_channels.py`).
        telefono: número en formato E.164 (ej. '+50212345678').
        params: dict con las variables que rellena la plantilla.

    Behavior:
        - Si el evento no tiene plantilla registrada → no-op + warning.
        - Si telefono está vacío / inválido → no-op + warning.
        - Si WHATSAPP_BACKEND == 'mock' (default) → loguea y retorna.
        - Si WHATSAPP_BACKEND == 'twilio' → llama a Twilio (no impl. en este PR).
    """
    if not telefono:
        logger.info("[whatsapp:%s] sin teléfono; saltando.", evento)
        return 'no-phone'

    mensaje = renderizar_plantilla(evento, params or {})
    if mensaje is None:
        return 'no-template'

    backend = getattr(settings, 'WHATSAPP_BACKEND', 'mock')
    try:
        if backend == 'twilio':
            return _send_twilio(evento, telefono, mensaje)
        return _send_mock(evento, telefono, mensaje)
    except NotImplementedError:
        # En transición — no falla la cola, solo loguea como mock.
        return _send_mock(evento, telefono, mensaje)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[whatsapp:%s] error enviando: %s", evento, exc)
        raise self.retry(exc=exc)
