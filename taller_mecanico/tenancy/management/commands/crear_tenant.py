"""Management command para crear un tenant nuevo.

Uso:
    python manage.py crear_tenant <slug> <nombre> <email_contacto> [--dominio DOMINIO]

Ejemplo:
    python manage.py crear_tenant fixfast "Fixfast Pro" admin@fixfast.com
    → crea schema `taller_fixfast`, con dominio `fixfast.localhost` en dev.

Lo que hace:
    1. Valida que el slug no esté reservado ni tomado.
    2. Crea el modelo `Tenant` (django-tenants auto-crea el schema Postgres).
    3. Corre las migraciones de TENANT_APPS en el schema nuevo.
    4. Crea un `Domain` primario para el subdomain (ej. `fixfast.localhost`).
    5. Imprime el subdomain resultante.

NO crea usuarios dentro del tenant — para eso usá `crear_admin_tenant` (futuro).
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from tenancy.models import Domain, Tenant


class Command(BaseCommand):
    help = 'Crea un tenant nuevo (taller cliente) con su schema Postgres y dominio primario.'

    def add_arguments(self, parser) -> None:
        parser.add_argument('slug', type=str, help='Slug URL-safe (ej. "fixfast").')
        parser.add_argument('nombre', type=str, help='Nombre comercial del taller.')
        parser.add_argument('email_contacto', type=str, help='Email del dueño para soporte.')
        parser.add_argument(
            '--dominio-base',
            type=str,
            default='localhost',
            help='Dominio base donde se monta el subdomain. Default: "localhost" (dev). '
                 'En prod usar "autoservipro.com".',
        )
        parser.add_argument(
            '--trial-dias',
            type=int,
            default=14,
            help='Días de trial gratis. Default 14. Usar 0 para sin trial.',
        )

    def handle(self, *args, **options) -> None:
        slug = options['slug'].lower().strip()
        nombre = options['nombre']
        email_contacto = options['email_contacto']
        dominio_base = options['dominio_base']
        trial_dias = options['trial_dias']

        from datetime import date, timedelta

        trial_hasta = date.today() + timedelta(days=trial_dias) if trial_dias > 0 else None

        with transaction.atomic():
            if Tenant.objects.filter(slug=slug).exists():
                raise CommandError(f'Ya existe un tenant con slug "{slug}".')

            tenant = Tenant(
                nombre=nombre,
                slug=slug,
                email_contacto=email_contacto,
                trial_hasta=trial_hasta,
            )
            try:
                tenant.save()  # django-tenants crea el schema y corre migraciones.
            except ValidationError as exc:
                raise CommandError(f'Error al crear tenant: {exc}')

            dominio_completo = f'{slug}.{dominio_base}'
            Domain.objects.create(
                domain=dominio_completo,
                tenant=tenant,
                is_primary=True,
            )

        self.stdout.write(self.style.SUCCESS(
            f'Tenant "{slug}" creado.\n'
            f'  Schema:   {tenant.schema_name}\n'
            f'  Dominio:  http://{dominio_completo}:8000\n'
            f'  Trial:    hasta {trial_hasta or "sin trial"}\n'
        ))
        self.stdout.write(self.style.WARNING(
            f'Recordá agregar a /etc/hosts:\n'
            f'  127.0.0.1 {dominio_completo}'
        ))
