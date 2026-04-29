"""Management command para crear un PublicUser (superadmin SaaS).

PublicUser vive en el schema ``public`` y NO está vinculado a ningún tenant.
Es la identidad del dueño del SaaS (vos, Steed) y de futuros empleados
tuyos que administren la plataforma.

Uso:

    python manage.py crear_publicuser steed.galvez@gmail.com "Steed Gálvez"
    # te pedirá el password de forma interactiva (no aparece en el shell history).

    # Pasando password por flag (útil en CI / scripts; cuidado con history):
    python manage.py crear_publicuser steed@example.com "Steed" --password 'xxx' --rol superadmin

    # Update de password:
    python manage.py crear_publicuser steed@example.com "Steed" --update

Por defecto crea con rol ``superadmin``. Use ``--rol soporte`` o ``--rol ventas``
para crear empleados con rol limitado.
"""
from getpass import getpass

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import get_public_schema_name, schema_context

from public_admin.models import PublicUser


class Command(BaseCommand):
    help = 'Crear o actualizar un PublicUser (superadmin / staff del SaaS) en el schema public.'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario (login).')
        parser.add_argument('nombre', type=str, help='Nombre completo del usuario.')
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help='Password en claro. Si se omite, se pide interactivamente.',
        )
        parser.add_argument(
            '--rol',
            choices=[PublicUser.ROL_SUPERADMIN, PublicUser.ROL_SOPORTE, PublicUser.ROL_VENTAS],
            default=PublicUser.ROL_SUPERADMIN,
            help='Rol en el SaaS. Default: superadmin.',
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Si el usuario existe, actualiza nombre/rol/password en lugar de fallar.',
        )

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        nombre = options['nombre'].strip()
        password = options['password']
        rol = options['rol']
        update = options['update']

        if not password:
            password = getpass('Password: ')
            password_confirm = getpass('Repetir password: ')
            if password != password_confirm:
                raise CommandError('Los passwords no coinciden.')
        if not password or len(password) < 8:
            raise CommandError('El password debe tener al menos 8 caracteres.')

        # PublicUser vive en ``public``; forzamos el schema para evitar
        # accidentes si alguien corre el comando dentro de un tenant.
        with schema_context(get_public_schema_name()):
            try:
                user = PublicUser.objects.get(email=email)
                if not update:
                    raise CommandError(
                        f'Ya existe un PublicUser con email {email}. '
                        f'Use --update para sobrescribir.'
                    )
                user.nombre = nombre
                user.rol = rol
                user.set_password(password)
                user.save()
                action = 'actualizado'
            except PublicUser.DoesNotExist:
                user = PublicUser(email=email, nombre=nombre, rol=rol, activo=True)
                user.set_password(password)
                user.save()
                action = 'creado'

        self.stdout.write(self.style.SUCCESS(
            f'PublicUser {email} ({rol}) {action} en schema public.'
        ))
        self.stdout.write(
            'Login en: http://admin.localhost:8000/  (dev)\n'
            '          https://admin.autoservipro.com/  (prod, cuando exista el dominio)'
        )
