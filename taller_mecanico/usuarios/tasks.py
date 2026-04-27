"""
Tareas Celery del módulo `usuarios`.

Encolamos los envíos de correo de cambio de email para evitar bloqueos
en el request del usuario y para tener trazabilidad/reintentos a través
del worker (no se pierden si el SMTP está temporalmente caído).
"""
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_email_verificacion_cambio_correo_task(self, email_destino, nombre, link):
    """
    Envía el correo con el link para confirmar el cambio de email al
    correo NUEVO del usuario.
    """
    try:
        send_mail(
            subject="Confirma tu nuevo correo — AutoServiPro",
            message=(
                f"Hola {nombre},\n\n"
                f"Recibimos una solicitud para cambiar el correo de tu cuenta a {email_destino}.\n"
                f"Para confirmar el cambio, abre el siguiente link:\n\n{link}\n\n"
                f"El link expira en 24 horas. Si tú no solicitaste este cambio, "
                f"ignora este correo y cambia tu contraseña."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_destino],
            fail_silently=False,
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
        send_mail(
            subject="Solicitud de cambio de correo — AutoServiPro",
            message=(
                f"Hola {nombre},\n\n"
                f"Se está intentando cambiar tu correo a {email_nuevo}.\n"
                f"Si NO fuiste tú, cambia tu contraseña inmediatamente y avisa al "
                f"administrador del taller."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_destino],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)
