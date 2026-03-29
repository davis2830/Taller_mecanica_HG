from django.contrib import admin
from .models import OrdenTrabajo, OrdenRepuesto

class OrdenRepuestoInline(admin.TabularInline):
    model = OrdenRepuesto
    extra = 1

@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = ['id', 'vehiculo', 'estado', 'mecanico_asignado', 'fecha_creacion']
    list_filter = ['estado', 'fecha_creacion']
    search_fields = ['vehiculo__placa', 'diagnostico']
    inlines = [OrdenRepuestoInline]

@admin.register(OrdenRepuesto)
class OrdenRepuestoAdmin(admin.ModelAdmin):
    list_display = ['id', 'orden', 'producto', 'cantidad', 'precio_unitario']
