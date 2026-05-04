"""Configura el routing del dashboard superadmin.

django-tenants rutea por ``Host`` header. Para que ``admin.localhost`` (dev)
o ``admin.autoservipro.com`` (prod) caiga al ``PUBLIC_SCHEMA_URLCONF`` con el
panel superadmin, necesitamos:

    1. Un ``Tenant`` especial con ``schema_name='public'`` y ``slug='public'``.
       Representa al "tenant público" — no es un taller, es el SaaS mismo.
    2. Un ``Domain`` con el hostname del panel admin, apuntando a ese tenant.

Este comando es idempotente: si ya existen, los reutiliza. Se puede correr
múltiples veces sin efectos secundarios.

Uso:

    # Dev (default):
    python manage.py setup_admin_domain

    # Prod:
    python manage.py setup_admin_domain --host admin.autoservipro.com

    # Múltiples hosts (ej. para IP directa + subdomain):
    python manage.py setup_admin_domain --host admin.localhost --host 10.0.0.5
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from tenancy.models import Domain, Tenant


class Command(BaseCommand):
    help = 'Crea/actualiza el tenant público + sus dominios de admin.'

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            '--host',
            action='append',
            default=None,
            help=(
                'Hostname para rutear al panel admin (ej. admin.localhost). '
                'Se puede pasar varias veces para múltiples hosts. '
                'Default: admin.localhost.'
            ),
        )
        parser.add_argument(
            '--nombre',
            default='SaaS Admin',
            help='Nombre comercial del "tenant" público. Default: "SaaS Admin".',
        )
        parser.add_argument(
            '--email-contacto',
            default='admin@autoservipro.com',
            help='Email de contacto del tenant público.',
        )

    def handle(self, *args, **opts) -> None:
        hosts: list[str] = opts.get('host') or ['admin.localhost']
        nombre: str = opts['nombre']
        email_contacto: str = opts['email_contacto']

        # 1) Tenant público. schema_name='public' + auto_create_schema=False
        # (el schema `public` ya existe en Postgres desde la creación de la DB).
        try:
            public_tenant = Tenant.objects.get(schema_name='public')
            created = False
        except Tenant.DoesNotExist:
            public_tenant = Tenant(
                schema_name='public',
                slug='public',
                nombre=nombre,
                email_contacto=email_contacto,
                activo=True,
            )
            # NO crear schema: `public` ya existe y tiene migrations SHARED_APPS.
            public_tenant.auto_create_schema = False
            public_tenant.save()
            created = True

        self.stdout.write(self.style.SUCCESS(
            f'{"CREADO" if created else "YA EXISTÍA"} Tenant público '
            f'(schema=public, slug={public_tenant.slug})'
        ))

        # 2) Domains para todos los hosts solicitados.
        for i, host in enumerate(hosts):
            domain, dom_created = Domain.objects.get_or_create(
                domain=host,
                defaults={'tenant': public_tenant, 'is_primary': i == 0},
            )
            # Si ya existía apuntando a otro tenant, lo reapuntamos al público.
            # Este comando es la fuente de verdad para "estos hosts van a admin".
            if not dom_created and domain.tenant_id != public_tenant.pk:
                domain.tenant = public_tenant
                domain.is_primary = i == 0
                domain.save(update_fields=['tenant', 'is_primary'])
                self.stdout.write(self.style.WARNING(
                    f'REASIGNADO Domain {host} → public (era {domain.tenant_id})'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'{"CREADO" if dom_created else "YA EXISTÍA"} Domain: {host}'
                ))

        self.stdout.write(self.style.SUCCESS(
            '\nDashboard superadmin accesible en los hosts configurados.'
        ))
