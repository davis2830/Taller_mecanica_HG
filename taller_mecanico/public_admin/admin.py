"""Admin de Django para el modelo PublicUser (superadmin SaaS)."""

from django.contrib import admin

from .models import PublicUser


@admin.register(PublicUser)
class PublicUserAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'email', 'rol', 'activo', 'ultimo_login')
    list_filter = ('rol', 'activo')
    search_fields = ('nombre', 'email')
    readonly_fields = ('ultimo_login', 'fecha_creacion')
    ordering = ('nombre',)
    # Ocultamos el hash de la password — se cambia con un form dedicado
    # que hashea el plaintext antes de guardar. TODO en PR #41c / #44.
    exclude = ('password',)
