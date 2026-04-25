"""
APScheduler jobs para el módulo de citas.

Wiring que se carga desde `CitasConfig.ready()` cuando corre `runserver`.
Para producción real con varios workers, mover a Celery beat para evitar
duplicación.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command
from django_apscheduler.jobstores import DjangoJobStore, register_events

logger = logging.getLogger(__name__)


def recordatorios_citas_job():
    """
    Llama al management command `enviar_recordatorios` que envía un correo
    a los clientes con cita CONFIRMADA o PENDIENTE para el día siguiente.
    Idempotente: el mismo command revisa el modelo `Notificacion` para no
    reenviar si ya se mandó.
    """
    logger.info("[Citas] Disparando recordatorios de citas para mañana...")
    try:
        call_command('enviar_recordatorios')
    except Exception as e:
        logger.exception("[Citas] Falló enviar_recordatorios: %s", e)


def iniciar():
    scheduler = BackgroundScheduler(timezone="America/Guatemala")
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # Diario a las 18:00 (6 pm GT) — recordatorio para citas del día siguiente.
    scheduler.add_job(
        recordatorios_citas_job,
        trigger="cron",
        hour="18",
        minute="00",
        id="citas_recordatorios_diario",
        max_instances=1,
        replace_existing=True,
    )

    register_events(scheduler)
    scheduler.start()
    logger.info("Scheduler de citas iniciado: recordatorios diarios a las 18:00 GT.")
