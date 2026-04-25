# usuarios/admin.py
from django.contrib import admin
from .models import Rol, Perfil, Empresa, TareaProgramada

admin.site.register(Rol)
admin.site.register(Perfil)


@admin.register(TareaProgramada)
class TareaProgramadaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tarea_id', 'hora', 'habilitada', 'ultima_ejecucion', 'ultima_ejecucion_status')
    list_filter = ('habilitada', 'ultima_ejecucion_status')
    readonly_fields = ('tarea_id', 'nombre', 'descripcion', 'ultima_ejecucion', 'ultima_ejecucion_status', 'ultima_ejecucion_mensaje')


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = (
        'razon_social', 'nit', 'dias_credito', 'limite_credito',
        'activo', 'recordatorios_activos', 'fecha_creacion',
    )
    list_filter = ('activo', 'recordatorios_activos', 'dias_credito')
    search_fields = ('nit', 'razon_social', 'nombre_comercial')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')
    fieldsets = (
        ('Identidad fiscal', {
            'fields': ('nit', 'razon_social', 'nombre_comercial', 'direccion_fiscal'),
        }),
        ('Contacto', {
            'fields': ('email_cobro', 'contacto_principal', 'telefono'),
        }),
        ('Crédito', {
            'fields': ('dias_credito', 'limite_credito', 'recordatorios_activos', 'activo'),
        }),
        ('Notas', {
            'fields': ('notas',),
            'classes': ('collapse',),
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',),
        }),
    )
