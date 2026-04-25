"""
APScheduler jobs para el módulo de citas.

Registra el callback en el scheduler compartido (`usuarios.scheduler`) y
delega la programación a la fila `TareaProgramada` correspondiente en DB.
"""
import logging

from django.core.management import call_command

logger = logging.getLogger(__name__)


def recordatorios_citas_job():
    """
    Llama al management command `enviar_recordatorios` que envía un correo
    a los clientes con cita CONFIRMADA o PENDIENTE para el día siguiente.
    Idempotente: el command revisa el modelo `Notificacion` para no
    reenviar si ya se mandó.
    """
    logger.info("[Citas] Disparando recordatorios de citas para mañana...")
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
        TareaProgramada.TAREA_CITAS_RECORDATORIOS, recordatorios_citas_job,
    )
    schedule_when_ready(TareaProgramada.TAREA_CITAS_RECORDATORIOS)
