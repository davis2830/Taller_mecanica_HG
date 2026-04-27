"""
APScheduler jobs para el módulo de facturación.

Se registra en el scheduler compartido (`usuarios.scheduler`) para que la
hora y el on/off sean editables desde *Sistema → Tareas Programadas* en
caliente, sin reiniciar Django.
"""
import logging

logger = logging.getLogger(__name__)


def _get_tasks():
    from .tasks import (
        actualizar_facturas_vencidas_task,
        enviar_recordatorios_cobro_task,
    )
    return actualizar_facturas_vencidas_task, enviar_recordatorios_cobro_task


def recordatorios_cobro_job_async():
    """
    Cron path: encola las tareas en Celery (`.delay()`) en lugar de
    ejecutarlas síncrono. Si el worker no corre, los mensajes se quedan
    en RabbitMQ hasta que se levante.
    """
    from .models import ConfiguracionFacturacion
    actualizar_vencidas, enviar_recordatorios = _get_tasks()
    config = ConfiguracionFacturacion.get()

    actualizar_vencidas.delay()
    logger.info("[CxC] Marcado de vencidas encolado en Celery.")

    if not config.recordatorios_cobro_auto:
        logger.info("[CxC] Recordatorios automáticos deshabilitados; se omite el envío.")
        return

    enviar_recordatorios.delay()
    logger.info("[CxC] Recordatorios encolados en Celery.")


def recordatorios_cobro_job_sync():
    """
    Run-now path: ejecuta síncrono usando `.apply()` para devolver
    feedback inmediato al toast de la UI (al usuario que apretó
    "Ejecutar ahora").
    """
    from .models import ConfiguracionFacturacion
    actualizar_vencidas, enviar_recordatorios = _get_tasks()
    config = ConfiguracionFacturacion.get()

    try:
        r1 = actualizar_vencidas.apply()
        logger.info("[CxC] Marcado de vencidas: %s", r1.result)
    except Exception as e:
        logger.exception("[CxC] Falló actualizar_facturas_vencidas: %s", e)

    if not config.recordatorios_cobro_auto:
        logger.info("[CxC] Recordatorios automáticos deshabilitados; se omite el envío.")
        return

    try:
        r2 = enviar_recordatorios.apply()
        logger.info("[CxC] Recordatorios enviados: %s", r2.result)
    except Exception as e:
        logger.exception("[CxC] Falló enviar_recordatorios_cobro: %s", e)


def iniciar():
    """
    Registra el callback en el scheduler compartido para que la fila
    `cxc_recordatorios_diario` de la tabla `TareaProgramada` la pueda
    programar / reprogramar / ejecutar manualmente desde la UI.
    """
    from usuarios.scheduler import register_callback, schedule_when_ready
    from usuarios.models import TareaProgramada

    register_callback(
        TareaProgramada.TAREA_CXC_RECORDATORIOS,
        recordatorios_cobro_job_async,
        sync_callback=recordatorios_cobro_job_sync,
    )
    schedule_when_ready(TareaProgramada.TAREA_CXC_RECORDATORIOS)
