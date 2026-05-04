"""Modelos de multi-tenancy.

Viven en el schema `public` de Postgres (son compartidos entre todos los
tenants). Dependen de `django-tenants` que maneja la creación/migración de
schemas cuando se guarda un `Tenant` nuevo.

Modelos:
    - Tenant: un taller cliente (ej. "Fixfast Pro"). Auto-crea el schema
      de Postgres la primera vez que se guarda con `auto_create_schema=True`.
    - Domain: el dominio/subdomain que mapea a ese tenant (ej. `fixfast.localhost`
      en dev, `fixfast.autoservipro.com` en prod). Un tenant puede tener varios.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_tenants.models import DomainMixin, TenantMixin


# Slugs reservados que NUNCA pueden ser usados como subdomain de un tenant.
# 'public' es el schema compartido; 'admin' es nuestro dashboard SaaS;
# 'www' / 'api' son convenciones que podríamos querer mapear a endpoints
# globales en el futuro.
SLUGS_RESERVADOS = {'public', 'admin', 'www', 'api', 'mail', 'static'}


class Tenant(TenantMixin):
    """Un taller cliente del SaaS.

    El `schema_name` es el identificador Postgres (ej. `taller_fixfast`).
    El `slug` es el identificador humano usado en el subdomain.

    Al guardar por primera vez con `auto_create_schema=True`, django-tenants
    crea el schema y corre TODAS las migraciones de TENANT_APPS en él.
    """

    # Nombre legible del taller (lo que el dueño quiere que se muestre en UI).
    nombre = models.CharField(
        _('nombre comercial'),
        max_length=100,
        help_text=_('Ej. "Fixfast Pro Taller Mecánico"'),
    )

    # Slug URL-safe, usado como subdomain. Unique sin ser el PK (el PK es el
    # id auto-incremental; el schema_name lo derivamos de este slug).
    slug = models.SlugField(
        _('slug'),
        max_length=50,
        unique=True,
        help_text=_('Identificador en URL. Ej. "fixfast" → fixfast.autoservipro.com'),
    )

    # Datos de contacto para el superadmin SaaS.
    email_contacto = models.EmailField(
        _('email de contacto'),
        help_text=_('Email del dueño del taller para soporte y facturación del SaaS'),
    )

    # Ciclo de vida del tenant.
    activo = models.BooleanField(
        _('activo'),
        default=True,
        help_text=_('Si está desactivado, los logins al subdomain retornan 403'),
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    # Trial / suscripción. Se detalla más en PR #44 (pricing). Por ahora solo
    # guardamos la fecha de fin del trial para poder bloquear cuando venza.
    trial_hasta = models.DateField(
        _('trial hasta'),
        null=True,
        blank=True,
        help_text=_('Fecha en la que vence el trial. Vacío = sin trial (plan de pago)'),
    )

    # Hooks de django-tenants: crear schema automáticamente al guardar.
    auto_create_schema = True
    # En borrado: eliminar también el schema. Seguro en dev; en prod vas a
    # querer soft-delete (activo=False) y nunca borrar el schema, así queda
    # el historial de datos por si hay disputas.
    auto_drop_schema = False

    class Meta:
        verbose_name = _('Tenant')
        verbose_name_plural = _('Tenants')
        ordering = ['nombre']

    def __str__(self) -> str:
        return f'{self.nombre} ({self.slug})'

    def clean(self) -> None:
        super().clean()
        slug_lower = (self.slug or '').lower()
        # Excepción: el "tenant público" usa slug='public' y schema_name='public'
        # — es necesario para que django-tenants pueda rutear admin.* y otros
        # subdominios sin tenant a nuestro PUBLIC_SCHEMA_URLCONF.
        is_public_tenant = (
            slug_lower == 'public' and self.schema_name == 'public'
        )
        if slug_lower in SLUGS_RESERVADOS and not is_public_tenant:
            raise ValidationError(
                {'slug': _(f'"{slug_lower}" es un slug reservado del sistema.')}
            )
        # Evitar doble prefijo en el schema: el slug "taller-foo" derivaría
        # `schema_name='taller_taller_foo'` (porque agregamos `taller_` al
        # guardar). Forzamos al usuario a escribir solo el sufijo.
        if slug_lower.startswith(('taller-', 'taller_')):
            sugerencia = slug_lower.split('-', 1)[-1].split('_', 1)[-1]
            raise ValidationError({
                'slug': _(
                    f'No usar el prefijo "taller-"/"taller_" — se agrega '
                    f'automáticamente al schema. Usá "{sugerencia}" en su lugar.'
                )
            })

    def save(self, *args, **kwargs) -> None:
        # Normalizamos slug y derivamos schema_name. Schema en Postgres
        # solo acepta [a-z0-9_], así que reemplazamos guiones.
        if self.slug:
            self.slug = self.slug.lower().strip()
        if not self.schema_name and self.slug:
            # Excepción: slug='public' → schema_name='public' (tenant del
            # schema público, no un taller). Sin prefijo `taller_`.
            if self.slug == 'public':
                self.schema_name = 'public'
            else:
                self.schema_name = f'taller_{self.slug.replace("-", "_")}'
        self.full_clean()
        super().save(*args, **kwargs)


class Domain(DomainMixin):
    """Un dominio/subdomain que resuelve a un tenant específico.

    django-tenants usa esto para el middleware: cuando llega una request a
    `fixfast.autoservipro.com`, busca `Domain.domain='fixfast.autoservipro.com'`,
    obtiene el `tenant` relacionado y setea `connection.set_schema(tenant.schema_name)`.

    Un tenant puede tener varios dominios (ej. `fixfast.autoservipro.com` +
    un dominio propio como `reservas.fixfast.com`). El `is_primary` define
    cuál se usa para construir URLs de correos y notificaciones.
    """

    class Meta:
        verbose_name = _('Dominio')
        verbose_name_plural = _('Dominios')
