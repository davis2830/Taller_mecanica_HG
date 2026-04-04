import logging
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events
from inventario.utils import enviar_resumen_alertas_diario
from django.core.management import call_command

logger = logging.getLogger(__name__)

def resumen_diario_job():
    logger.info("Ejecutando Job de Resumen Diario de Alertas...")
    # Llama al script de manejo para forzar la actualización y envío de reportes
    call_command('generar_alertas_inventario', '--resumen-diario')

def iniciar():
    scheduler = BackgroundScheduler(timezone="America/El_Salvador") # Asegurar Timezone si se necesita, usamos la de windows
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # Ejecutar todos los días a las 07:00 AM
    scheduler.add_job(
        resumen_diario_job,
        trigger="cron",
        hour="07",
        minute="00",
        id="resumen_diario_manana",
        max_instances=1,
        replace_existing=True,
    )
    
    # Ejecutar todos los días a las 05:00 PM (17:00)
    scheduler.add_job(
        resumen_diario_job,
        trigger="cron",
        hour="17",
        minute="00",
        id="resumen_diario_tarde",
        max_instances=1,
        replace_existing=True,
    )

    register_events(scheduler)
    scheduler.start()
    logger.info("Scheduler Iniciado: Resúmenes configurados para las 7:00 AM y 5:00 PM.")
