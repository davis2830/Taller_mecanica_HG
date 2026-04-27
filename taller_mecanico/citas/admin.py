# citas/admin.py
from django.contrib import admin
from .models import Vehiculo, Cita, TipoServicio, Notificacion, ConfiguracionTaller, CanalNotificacion

class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('marca', 'modelo', 'año', 'placa', 'propietario')
    search_fields = ('marca', 'modelo', 'placa')
    list_filter = ('marca', 'año')

class CitaAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'servicio', 'fecha', 'hora_inicio', 'estado')
    list_filter = ('estado', 'fecha', 'servicio__categoria')
    search_fields = ('cliente__username', 'vehiculo__placa')
    date_hierarchy = 'fecha'

class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'duracion', 'precio')
    list_filter = ('categoria',)
    search_fields = ('nombre', 'descripcion')

class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('cita', 'tipo', 'fecha_envio', 'enviado')
    list_filter = ('tipo', 'enviado')

class ConfiguracionTallerAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'capacidad_mecanico', 'capacidad_carwash', 'hora_apertura', 'hora_cierre', 'actualizado_el')

    def has_add_permission(self, request):
        # Singleton: no permitir crear más instancias manualmente.
        return not ConfiguracionTaller.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CanalNotificacion)
class CanalNotificacionAdmin(admin.ModelAdmin):
    list_display = ('label', 'evento', 'grupo', 'email_activo', 'whatsapp_activo', 'actualizado_el')
    list_filter = ('grupo', 'email_activo', 'whatsapp_activo')
    search_fields = ('evento', 'label')
    list_editable = ('email_activo', 'whatsapp_activo')


admin.site.register(Vehiculo, VehiculoAdmin)
admin.site.register(Cita, CitaAdmin)
admin.site.register(TipoServicio, TipoServicioAdmin)
admin.site.register(Notificacion, NotificacionAdmin)
admin.site.register(ConfiguracionTaller, ConfiguracionTallerAdmin)