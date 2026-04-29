"""
Tareas Celery del módulo `usuarios`.

Encolamos los envíos de correo de cambio de email para evitar bloqueos
en el request del usuario y para tener trazabilidad/reintentos a través
del worker (no se pierden si el SMTP está temporalmente caído).
"""
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from taller_mecanico.email_helpers import get_email_context


def _enviar_html(subject, template, context, to_email):
    html = render_to_string(template, context)
    texto = strip_tags(html)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach_alternative(html, 'text/html')
    msg.send(fail_silently=False)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_email_verificacion_cambio_correo_task(self, email_destino, nombre, link):
    """
    Envía el correo con el link para confirmar el cambio de email al
    correo NUEVO del usuario.
    """
    try:
        ctx = get_email_context({
            'email_destino': email_destino,
            'nombre': nombre,
            'link': link,
        })
        subject = f"Confirma tu nuevo correo — {ctx['marca']['nombre_empresa']}"
        _enviar_html(
            subject,
            'usuarios/email_verificacion_cambio_correo.html',
            ctx,
            email_destino,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_aviso_cambio_correo_task(self, email_destino, nombre, email_nuevo):
    """
    Notifica al correo VIEJO que se está intentando cambiar el correo, por
    si no fue el dueño de la cuenta quien lo solicitó.
    """
    try:
        ctx = get_email_context({
            'nombre': nombre,
            'email_nuevo': email_nuevo,
        })
        subject = f"Solicitud de cambio de correo — {ctx['marca']['nombre_empresa']}"
        _enviar_html(
            subject,
            'usuarios/email_aviso_cambio_correo.html',
            ctx,
            email_destino,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
