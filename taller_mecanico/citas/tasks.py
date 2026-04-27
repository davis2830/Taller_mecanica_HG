from celery import shared_task
from django.core.management import call_command
from .models import Cita
from .utils import enviar_email_cita

@shared_task
def enviar_correo_cita_task(cita_id, tipo_email):
    try:
        cita = Cita.objects.get(id=cita_id)
        enviado = enviar_email_cita(cita, tipo_email)
        return f"Email {tipo_email} enviado: {enviado} para Cita {cita_id}"
    except Cita.DoesNotExist:
        return f"Error: Cita {cita_id} no existe."
    except Exception as e:
        return f"Error enviando email para cita {cita_id}: {str(e)}"


@shared_task
def enviar_recordatorios_citas_task():
    """
    Envuelve el management command `enviar_recordatorios` para que pueda
    despacharse al worker Celery con `.delay()` desde APScheduler.
    """
    call_command('enviar_recordatorios')
    return "Recordatorios de citas enviados."
