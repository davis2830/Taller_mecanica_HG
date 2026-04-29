"""
Tareas Celery del módulo inventario.

`generar_alertas_inventario_task` envuelve el management command
`generar_alertas_inventario --resumen-diario` para que pueda ser
despachado al worker Celery con `.delay()` desde el job de APScheduler.
"""
from celery import shared_task
from django.core.management import call_command

from taller_mecanico.celery_helpers import TenantAwareTask


@shared_task(base=TenantAwareTask)
def generar_alertas_inventario_task(resumen_diario=True):
    args = ['generar_alertas_inventario']
    if resumen_diario:
        args.append('--resumen-diario')
    call_command(*args)
    return "Alertas de inventario generadas."
