# usuarios/apps.py
import os
import sys

from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'usuarios'

    def ready(self):
        import usuarios.signals  # noqa: F401

        # Solo lanzar el scheduler en el proceso del runserver real.
        # `RUN_MAIN=true` distingue al child del autoreloader; con --noreload
        # también se permite. Saltarse para makemigrations / migrate / shell.
        is_runserver = 'runserver' in sys.argv
        run_main = os.environ.get('RUN_MAIN', None) == 'true'
        no_reload = '--noreload' in sys.argv
        if is_runserver and (run_main or no_reload):
            from . import scheduler
            scheduler.start_deferred_init()
