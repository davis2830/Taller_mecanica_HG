"""
APScheduler jobs para el módulo de facturación.

Wiring que se carga desde `FacturacionConfig.ready()` cuando corre `runserver`.
Para producción real con varios workers, mover esto a Celery beat.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events

logger = logging.getLogger(__name__)


def recordatorios_cobro_job():
    """
    Marca facturas vencidas y envía recordatorios de cobro respetando el toggle
    `ConfiguracionFacturacion.recordatorios_cobro_auto`.
    """
    from .models import ConfiguracionFacturacion
    from .tasks import (
        actualizar_facturas_vencidas_task,
        enviar_recordatorios_cobro_task,
    )

    config = ConfiguracionFacturacion.get()
    # Siempre marcamos vencidas (es seguro y no genera tráfico saliente).
    try:
        r1 = actualizar_facturas_vencidas_task.apply()
        logger.info("[CxC] Marcado de vencidas: %s", r1.result)
    except Exception as e:
        logger.exception("[CxC] Falló actualizar_facturas_vencidas: %s", e)

    if not config.recordatorios_cobro_auto:
        logger.info("[CxC] Recordatorios automáticos deshabilitados; se omite el envío.")
        return

    try:
        r2 = enviar_recordatorios_cobro_task.apply()
        logger.info("[CxC] Recordatorios enviados: %s", r2.result)
    except Exception as e:
        logger.exception("[CxC] Falló enviar_recordatorios_cobro: %s", e)


def iniciar():
    scheduler = BackgroundScheduler(timezone="America/Guatemala")
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # Diario a las 08:00 — temprano para dar tiempo a respuesta el mismo día.
    scheduler.add_job(
        recordatorios_cobro_job,
        trigger="cron",
        hour="08",
        minute="00",
        id="cxc_recordatorios_diario",
        max_instances=1,
        replace_existing=True,
    )

    register_events(scheduler)
    scheduler.start()
    logger.info("Scheduler de facturación iniciado: recordatorios CxC diarios a las 08:00 GT.")
