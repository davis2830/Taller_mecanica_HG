from django.apps import AppConfig


class FacturacionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'facturacion'

    def ready(self):
        import sys
        import os
        # Solo iniciar el scheduler si estamos corriendo el servidor (evita crasheos al hacer makemigrations y migrate)
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN', None) == 'true':
            from . import schedule_jobs
            schedule_jobs.iniciar()
