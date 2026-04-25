"""
APScheduler jobs para el módulo de facturación.

Se registra en el scheduler compartido (`usuarios.scheduler`) para que la
hora y el on/off sean editables desde *Sistema → Tareas Programadas* en
caliente, sin reiniciar Django.
"""
import logging

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
    """
    Registra el callback en el scheduler compartido para que la fila
    `cxc_recordatorios_diario` de la tabla `TareaProgramada` la pueda
    programar / reprogramar / ejecutar manualmente desde la UI.
    """
    from usuarios.scheduler import register_callback, schedule_when_ready
    from usuarios.models import TareaProgramada

    register_callback(
        TareaProgramada.TAREA_CXC_RECORDATORIOS, recordatorios_cobro_job,
    )
    schedule_when_ready(TareaProgramada.TAREA_CXC_RECORDATORIOS)
