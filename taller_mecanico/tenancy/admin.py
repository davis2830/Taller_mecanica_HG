"""Admin de Django para gestionar tenants desde el superadmin SaaS.

Este admin solo es accesible desde el schema `public` (ej. `admin.localhost`
en dev). Desde un subdomain de tenant NO se muestran estos modelos — son
SHARED_APPS y pertenecen al dueño del SaaS.
"""

from django.contrib import admin

from .models import Domain, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'slug', 'email_contacto', 'activo', 'trial_hasta', 'fecha_creacion')
    list_filter = ('activo',)
    search_fields = ('nombre', 'slug', 'email_contacto')
    readonly_fields = ('schema_name', 'fecha_creacion', 'fecha_actualizacion')
    ordering = ('nombre',)


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
    list_filter = ('is_primary',)
    search_fields = ('domain',)
    autocomplete_fields = ('tenant',)
