"""Setup inicial del SaaS: crea el primer tenant ``demo`` + el superadmin.

Es un comando idempotente que orquesta los pasos individuales (que también
podés correr a mano):

    1. ``crear_publicuser <email> <nombre> --password ...``
    2. ``crear_tenant demo "Demo" demo@... --dominio-base localhost``

Pensado para que lo corras una sola vez después de mergear PR #41c, ya sea
en tu laptop (dev) o en el VPS (prod).

Uso:

    # Dev local: crea steed.galvez como superadmin + tenant demo (demo.localhost):
    python manage.py setup_saas \\
        --superadmin-email steed.galvez@gmail.com \\
        --superadmin-nombre "Steed Gálvez" \\
        --superadmin-password "tu-pass-fuerte" \\
        --tenant-slug demo \\
        --tenant-nombre "Demo Taller" \\
        --tenant-email-contacto demo@autoservipro.com \\
        --dominio-base localhost

    # Prod (cuando tengas el dominio):
    python manage.py setup_saas ... --dominio-base autoservipro.com

Si los recursos ya existen, los reutiliza/actualiza sin error (idempotente).
"""
from __future__ import annotations

from datetime import date, timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import get_public_schema_name, schema_context

from public_admin.models import PublicUser
from tenancy.models import Domain, Tenant


class Command(BaseCommand):
    help = 'Setup inicial del SaaS: superadmin (PublicUser en public) + primer tenant demo.'

    def add_arguments(self, parser) -> None:
        # Superadmin
        parser.add_argument('--superadmin-email', required=True, type=str)
        parser.add_argument('--superadmin-nombre', required=True, type=str)
        parser.add_argument('--superadmin-password', required=True, type=str)
        # Tenant
        parser.add_argument('--tenant-slug', default='demo', type=str)
        parser.add_argument('--tenant-nombre', default='Demo Taller', type=str)
        parser.add_argument('--tenant-email-contacto', required=True, type=str)
        parser.add_argument(
            '--dominio-base', default='localhost', type=str,
            help='Default: localhost (dev). En prod: autoservipro.com.',
        )
        parser.add_argument(
            '--trial-dias', default=14, type=int,
            help='Días de trial del tenant. Default 14.',
        )

    def handle(self, *args, **options) -> None:
        if len(options['superadmin_password']) < 8:
            raise CommandError('El password del superadmin debe tener al menos 8 caracteres.')

        superadmin = self._setup_superadmin(options)
        tenant, dominio = self._setup_tenant(options)

        self.stdout.write(self.style.SUCCESS('\n=== Setup SaaS completo ==='))
        self.stdout.write(self.style.SUCCESS(
            f'Superadmin: {superadmin.email} ({superadmin.rol})'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Tenant:     {tenant.slug} → schema {tenant.schema_name}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Dominio:    http://{dominio}:8000'
        ))
        if options['dominio_base'] == 'localhost':
            self.stdout.write(self.style.WARNING(
                f'\nAgregá a /etc/hosts:\n'
                f'  127.0.0.1 {dominio} admin.localhost'
            ))

    def _setup_superadmin(self, options) -> PublicUser:
        email = options['superadmin_email'].strip().lower()
        nombre = options['superadmin_nombre'].strip()
        password = options['superadmin_password']

        with schema_context(get_public_schema_name()):
            user, created = PublicUser.objects.get_or_create(
                email=email,
                defaults={
                    'nombre': nombre,
                    'rol': PublicUser.ROL_SUPERADMIN,
                    'activo': True,
                },
            )
            user.set_password(password)
            user.nombre = nombre
            user.save()
        action = 'creado' if created else 'actualizado'
        self.stdout.write(f'Superadmin {email} {action}.')
        return user

    def _setup_tenant(self, options) -> tuple[Tenant, str]:
        slug = options['tenant_slug'].lower().strip()
        nombre = options['tenant_nombre']
        email_contacto = options['tenant_email_contacto']
        dominio_base = options['dominio_base']
        trial_dias = options['trial_dias']

        trial_hasta = (
            date.today() + timedelta(days=trial_dias) if trial_dias > 0 else None
        )

        with transaction.atomic():
            tenant = Tenant.objects.filter(slug=slug).first()
            if tenant is None:
                tenant = Tenant(
                    nombre=nombre,
                    slug=slug,
                    email_contacto=email_contacto,
                    trial_hasta=trial_hasta,
                )
                tenant.save()  # django-tenants crea schema + migra.
                self.stdout.write(f'Tenant "{slug}" creado (schema {tenant.schema_name}).')
            else:
                self.stdout.write(f'Tenant "{slug}" ya existe (schema {tenant.schema_name}); reutilizando.')

            dominio_completo = f'{slug}.{dominio_base}'
            domain, dom_created = Domain.objects.get_or_create(
                domain=dominio_completo,
                defaults={'tenant': tenant, 'is_primary': True},
            )
            if dom_created:
                self.stdout.write(f'Dominio {dominio_completo} creado.')
            else:
                self.stdout.write(f'Dominio {dominio_completo} ya existe; reutilizando.')

        return tenant, dominio_completo
