# citas/utils.py
"""
Envío de correos relacionados con Citas / OT del cliente.

Refactor: ahora cada `tipo_email` mapea a un template HTML bajo
`citas/templates/citas/emails/<nombre>.html`, que extiende el layout base
en `templates/emails/base.html`. El layout base muestra logo y nombre del
taller (de ConfiguracionTaller) y un footer consistente.

Tipos soportados:
  - 'confirmacion'   : decide entre 'cita_pendiente_confirmar.html' (con
                       link mágico) y 'cita_confirmada.html' según estado.
  - 'recordatorio'   : 'cita_recordatorio.html'
  - 'cambio_estado'  : 'cita_cambio_estado.html'
  - 'en_revision'    : 'cita_en_revision.html'
  - 'cotizacion'     : 'cita_cotizacion.html' (incluye desglose con precios)
  - 'listo'          : 'cita_listo.html'
  - 'encuesta'       : 'cita_encuesta.html'
"""
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.signing import Signer
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import datetime
import logging

from taller_mecanico.email_helpers import get_email_context

logger = logging.getLogger(__name__)

_DIAS = {0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves',
         4: 'Viernes', 5: 'Sábado', 6: 'Domingo'}
_MESES = {1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo',
          6: 'junio', 7: 'julio', 8: 'agosto', 9: 'septiembre',
          10: 'octubre', 11: 'noviembre', 12: 'diciembre'}


def formato_fecha_es(fecha):
    """Fecha en español sin depender del locale del SO."""
    return f"{_DIAS[fecha.weekday()]}, {fecha.day} de {_MESES[fecha.month]} de {fecha.year}"


# Mapa tipo_email → (template, asunto, color del banner). El banner_color
# se setea como bloque en cada template, así que aquí solo lo usamos para
# logs/diagnóstico.
_ASUNTOS = {
    'confirmacion_pendiente': 'Confirma tu cita',
    'confirmacion_confirmada': 'Cita confirmada',
    'recordatorio': 'Recordatorio de cita',
    'cambio_estado': 'Actualización de cita',
    'en_revision': 'Tu vehículo está en revisión',
    'cotizacion': 'Cotización lista',
    'listo': 'Tu vehículo está listo para recoger',
    'encuesta': '¡Gracias por visitarnos!',
}


def _calcular_precio_mostrar(cita):
    precio = float(cita.servicio.precio or 0)
    orden = getattr(cita, 'orden_trabajo', None)
    if orden:
        try:
            precio += float(orden.total_repuestos or 0)
        except Exception:
            pass
    return precio


def enviar_email_cita(cita, tipo_email, destinatario_email=None):
    """
    Envía un correo HTML al cliente para un evento de cita.
    Retorna True si se envió, False si no había email o falló el envío.
    """
    destinatario = destinatario_email or cita.cliente.email
    if not destinatario:
        return False

    cuando = (
        f"{formato_fecha_es(cita.fecha)} a las "
        f"{cita.hora_inicio.strftime('%H:%M')}"
    )
    precio_mostrar = _calcular_precio_mostrar(cita)
    nombre_servicio = cita.servicio.nombre

    # Contexto base + datos comunes a todas las plantillas.
    ctx = get_email_context({
        'cita': cita,
        'cuando': cuando,
        'precio_mostrar': precio_mostrar,
    })

    # Resolver template + asunto según tipo.
    if tipo_email == 'confirmacion':
        if cita.estado == 'PENDIENTE':
            template = 'citas/emails/cita_pendiente_confirmar.html'
            base_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
            token = Signer().sign(str(cita.id))
            ctx['enlace_confirmar'] = (
                f"{base_url}/citas/confirmar-email/{token}/" if base_url else ''
            )
            asunto = f"Confirma tu cita — {nombre_servicio}"
        else:
            template = 'citas/emails/cita_confirmada.html'
            asunto = f"Cita confirmada — {nombre_servicio}"

    elif tipo_email == 'recordatorio':
        dias = (cita.fecha - datetime.date.today()).days
        if dias == 0:
            cuando_texto = "hoy"
        elif dias == 1:
            cuando_texto = "mañana"
        else:
            cuando_texto = f"el {cita.fecha.strftime('%d/%m/%Y')}"
        ctx['cuando_texto'] = cuando_texto
        template = 'citas/emails/cita_recordatorio.html'
        asunto = f"Recordatorio: tu cita es {cuando_texto} — {nombre_servicio}"

    elif tipo_email == 'cambio_estado':
        template = 'citas/emails/cita_cambio_estado.html'
        asunto = f"Actualización de tu cita — {nombre_servicio}"

    elif tipo_email == 'en_revision':
        template = 'citas/emails/cita_en_revision.html'
        asunto = f"Tu vehículo está en revisión — {nombre_servicio}"

    elif tipo_email == 'cotizacion':
        template = 'citas/emails/cita_cotizacion.html'
        repuestos = []
        orden = getattr(cita, 'orden_trabajo', None)
        if orden:
            repuestos = list(orden.repuestos.all())
        ctx['repuestos'] = repuestos
        asunto = f"Cotización de tu vehículo — {marca_nombre(ctx)}"

    elif tipo_email == 'listo':
        template = 'citas/emails/cita_listo.html'
        asunto = f"Tu vehículo está listo para recoger — {nombre_servicio}"

    elif tipo_email == 'encuesta':
        template = 'citas/emails/cita_encuesta.html'
        ctx['enlace_encuesta'] = ''  # placeholder hasta que el módulo de encuestas exista
        asunto = "Gracias por visitarnos — cuéntanos tu experiencia"

    else:
        logger.warning(f"[enviar_email_cita] Tipo desconocido: {tipo_email}")
        return False

    try:
        html = render_to_string(template, ctx)
        texto = strip_tags(html)
        email = EmailMultiAlternatives(
            asunto,
            texto,
            settings.EMAIL_HOST_USER,
            [destinatario],
        )
        email.attach_alternative(html, "text/html")
        email.send()
        return True
    except Exception as exc:
        logger.exception(f"[enviar_email_cita] Error tipo={tipo_email} cita={cita.id}: {exc}")
        return False


def marca_nombre(ctx):
    """Helper para obtener nombre de marca desde el contexto sin reventar si falta."""
    return (ctx.get('marca') or {}).get('nombre_empresa') or 'el taller'
