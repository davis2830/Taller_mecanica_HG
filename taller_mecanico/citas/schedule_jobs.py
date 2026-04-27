"""
APScheduler jobs para el módulo de citas.

Registra el callback en el scheduler compartido (`usuarios.scheduler`) y
delega la programación a la fila `TareaProgramada` correspondiente en DB.
"""
import logging

from django.core.management import call_command

logger = logging.getLogger(__name__)


def recordatorios_citas_job_async():
    """
    Cron path: encola el envío en Celery (`.delay()`) para no bloquear el
    scheduler. Si el worker Celery no está corriendo, el mensaje se queda
    en RabbitMQ hasta que se levante.
    """
    from .tasks import enviar_recordatorios_citas_task
    logger.info("[Citas] Encolando recordatorios de citas (Celery)...")
    enviar_recordatorios_citas_task.delay()


def recordatorios_citas_job_sync():
    """
    Run-now path: ejecuta el command síncrono para devolver feedback
    inmediato al toast de la UI.
    """
    logger.info("[Citas] Ejecutando recordatorios de citas (síncrono)...")
    call_command('enviar_recordatorios')


def iniciar():
    """
    Registra el callback en el scheduler compartido y programa según
    la fila de DB. Este wiring se llama desde apps.ready() — la inicialización
    real del scheduler está deferida en `usuarios.scheduler` para evitar
    interferir con el autoreload de runserver.
    """
    from usuarios.scheduler import (
        register_callback, schedule_when_ready,
    )
    from usuarios.models import TareaProgramada

    register_callback(
        TareaProgramada.TAREA_CITAS_RECORDATORIOS,
        recordatorios_citas_job_async,
        sync_callback=recordatorios_citas_job_sync,
    )
    schedule_when_ready(TareaProgramada.TAREA_CITAS_RECORDATORIOS)
