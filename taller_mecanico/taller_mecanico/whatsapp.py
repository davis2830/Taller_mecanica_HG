"""
Capa de envío de WhatsApp.

Expone una task Celery `enviar_whatsapp_task(evento, telefono, params)` que envía
mensajes a través de Twilio o, si el backend está en modo `mock`, solo loguea.

Selección de backend:
  - settings.WHATSAPP_BACKEND == 'twilio'   → llama a la Twilio REST API.
  - settings.WHATSAPP_BACKEND == 'mock' (default) → solo loguea.

Plantillas:
  En el SANDBOX de Twilio podés enviar texto libre a números que hicieron
  opt-in al sandbox (mandar "join <palabra>" desde su WhatsApp). En PRODUCCIÓN
  con un número WhatsApp Business propio, Meta exige plantillas pre-aprobadas
  para mensajes iniciados por el negocio. En ese caso hay que mover los textos
  de `PLANTILLAS_WHATSAPP` a Meta Business Manager y reemplazarlos por su SID.
"""
import logging
from typing import Optional

from celery import shared_task
from django.conf import settings


logger = logging.getLogger(__name__)


# Plantillas usadas en sandbox / fallback. Cuando la cuenta esté aprobada con
# Meta, los SIDs de plantilla se podrán usar vía Twilio Content API.
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


def _normalizar_e164(telefono: str) -> str:
    """
    Normaliza un teléfono a E.164. Si ya empieza con '+' lo respeta.
    Si solo son dígitos, asume el código de país de settings.WHATSAPP_DEFAULT_COUNTRY_CODE
    (default '502' = Guatemala).
    """
    raw = (telefono or '').strip().replace(' ', '').replace('-', '')
    if not raw:
        return ''
    if raw.startswith('+'):
        return raw
    digitos = ''.join(ch for ch in raw if ch.isdigit())
    if not digitos:
        return ''
    cc = str(getattr(settings, 'WHATSAPP_DEFAULT_COUNTRY_CODE', '502'))
    # Si el número ya incluye el código de país (más de 8 dígitos en GT), respeta;
    # de lo contrario antepone el cc.
    if len(digitos) <= 8:
        return f"+{cc}{digitos}"
    return f"+{digitos}"


def _send_mock(evento: str, telefono: str, mensaje: str) -> str:
    """No envía nada — solo loguea para inspección manual."""
    logger.info(
        "[whatsapp:MOCK] evento=%s telefono=%s\n  Mensaje: %s",
        evento, telefono, mensaje,
    )
    return 'mock'


def _send_twilio(evento: str, telefono: str, mensaje: str) -> str:
    """
    Envía un WhatsApp vía Twilio REST API.

    Requiere settings:
      - TWILIO_ACCOUNT_SID
      - TWILIO_AUTH_TOKEN
      - TWILIO_WHATSAPP_FROM (formato E.164, ej. '+14155238886' para sandbox)

    Si alguna falta, cae a mock + warning para no romper la cola.
    Devuelve el SID del mensaje de Twilio o lanza excepción para que la task
    Celery la atrape y haga retry.
    """
    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '') or ''
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '') or ''
    from_number = getattr(settings, 'TWILIO_WHATSAPP_FROM', '') or ''

    if not (account_sid and auth_token and from_number):
        logger.warning(
            "[whatsapp:%s] Twilio no configurado (faltan SID/token/from); "
            "cae a MOCK.", evento,
        )
        return _send_mock(evento, telefono, mensaje)

    destino = _normalizar_e164(telefono)
    if not destino:
        logger.warning(
            "[whatsapp:%s] teléfono inválido tras normalizar: %r", evento, telefono,
        )
        return 'invalid-phone'

    # Importa aquí para que el import del módulo no requiera la lib si el
    # backend está en mock.
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
    except ImportError:
        logger.error(
            "[whatsapp:%s] La librería 'twilio' no está instalada — pip install twilio",
            evento,
        )
        return _send_mock(evento, telefono, mensaje)

    client = Client(account_sid, auth_token)
    try:
        msg = client.messages.create(
            from_=f"whatsapp:{from_number}",
            to=f"whatsapp:{destino}",
            body=mensaje,
        )
    except TwilioRestException as exc:
        # Errores típicos del sandbox: número no opted-in (63007/63016/63018),
        # número inválido (21211), credenciales incorrectas (20003).
        # Estos NO se retryan — el problema no se resuelve esperando.
        logger.warning(
            "[whatsapp:%s] Twilio rechazó mensaje a %s "
            "(code=%s status=%s msg=%s)",
            evento, destino, exc.code, exc.status, exc.msg,
        )
        return f"twilio-error-{exc.code}"

    logger.info(
        "[whatsapp:%s] Twilio OK to=%s sid=%s status=%s",
        evento, destino, msg.sid, msg.status,
    )
    return msg.sid


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def enviar_whatsapp_task(self, evento: str, telefono: str, params: dict):
    """
    Envía (o simula) un mensaje de WhatsApp para un evento determinado.

    Args:
        evento: slug del evento (ver `notification_channels.py`).
        telefono: número en formato E.164 o digitos sueltos (ver `_normalizar_e164`).
        params: dict con las variables que rellena la plantilla.

    Behavior:
        - Sin teléfono → no-op.
        - Sin plantilla → no-op + warning.
        - WHATSAPP_BACKEND == 'mock' (default) → loguea y retorna 'mock'.
        - WHATSAPP_BACKEND == 'twilio' → envía vía Twilio. Errores de Twilio
          (número inválido, no opt-in) NO disparan retry; errores de red sí.
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
    except Exception as exc:  # noqa: BLE001
        # Errores no contemplados (red caída, timeout, etc.) — retry exponencial.
        logger.exception("[whatsapp:%s] error inesperado: %s", evento, exc)
        raise self.retry(exc=exc)
