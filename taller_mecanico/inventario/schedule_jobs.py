"""
APScheduler jobs para el módulo de inventario.

Dos jobs (AM y PM) que disparan `generar_alertas_inventario --resumen-diario`,
ambos configurables en hora y on/off desde Sistema → Tareas Programadas.
"""
import logging

from django.core.management import call_command

logger = logging.getLogger(__name__)


def resumen_diario_job():
    """Genera alertas + envía resumen diario por correo."""
    logger.info("[Inventario] Ejecutando resumen diario de alertas...")
    call_command('generar_alertas_inventario', '--resumen-diario')


def iniciar():
    """
    Registra los dos callbacks (AM y PM) en el scheduler compartido.
    """
    from usuarios.scheduler import (
        register_callback, schedule_when_ready,
    )
    from usuarios.models import TareaProgramada

    for tarea_id in (
        TareaProgramada.TAREA_INVENTARIO_RESUMEN_AM,
        TareaProgramada.TAREA_INVENTARIO_RESUMEN_PM,
    ):
        register_callback(tarea_id, resumen_diario_job)
        schedule_when_ready(tarea_id)
