from django.contrib import admin
from .models import (
    ConfiguracionFacturacion,
    Factura,
    PagoFactura,
    DocumentoElectronico,
)


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = (
        'numero_factura', 'orden', 'estado',
        'condicion_pago', 'pago_estado',
        'empresa', 'total_general_display',
        'fecha_emision', 'fecha_vencimiento',
    )
    list_filter = ('estado', 'condicion_pago', 'pago_estado', 'iva_incluido')
    search_fields = ('numero_factura', 'orden__id', 'empresa__razon_social', 'empresa__nit')
    readonly_fields = ('fecha_emision', 'fecha_pagada', 'override_at')

    def total_general_display(self, obj):
        return f"Q{obj.total_general}"
    total_general_display.short_description = 'Total'


@admin.register(PagoFactura)
class PagoFacturaAdmin(admin.ModelAdmin):
    list_display = ('factura', 'monto', 'metodo', 'fecha_pago', 'registrado_por', 'fecha_creacion')
    list_filter = ('metodo', 'fecha_pago')
    search_fields = ('factura__numero_factura', 'referencia')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')


admin.site.register(ConfiguracionFacturacion)
admin.site.register(DocumentoElectronico)
