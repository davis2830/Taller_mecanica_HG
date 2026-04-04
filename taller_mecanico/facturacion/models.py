from django.db import models
from taller.models import OrdenTrabajo
from django.utils import timezone

class Factura(models.Model):
    ESTADOS = (
        ('BORRADOR', 'Borrador (Pre-factura)'),
        ('EMITIDA', 'Emitida (Pagada/Cerrada)'),
        ('ANULADA', 'Anulada'),
    )
    
    METODOS_PAGO = (
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta (Crédito/Débito)'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('OTROS', 'Otros (Cheque, Cripto, etc.)'),
    )

    orden = models.OneToOneField(
        OrdenTrabajo, 
        on_delete=models.RESTRICT, 
        related_name='factura',
        help_text="La orden de trabajo restringirá el borrado si ya tiene factura."
    )
    
    numero_factura = models.CharField(max_length=20, unique=True, blank=True, null=True)
    
    # ── Precios Congelados (Inmutables una vez EMITIDA) ──
    costo_mano_obra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    costo_repuestos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # ───────────────────────────────────────────
    
    estado = models.CharField(max_length=15, choices=ESTADOS, default='BORRADOR')
    metodo_pago = models.CharField(max_length=15, choices=METODOS_PAGO, null=True, blank=True)
    
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_pagada = models.DateTimeField(null=True, blank=True)
    notas_internas = models.TextField(blank=True, null=True)

    @property
    def subtotal(self):
        return self.costo_mano_obra + self.costo_repuestos

    @property
    def total_general(self):
        return self.subtotal - self.descuento

    def generar_numero(self):
        if not self.numero_factura:
            auto_id = f"{self.id:06d}"
            # Ej: F-2023-0001
            year = timezone.now().year
            self.numero_factura = f"F-{year}-{auto_id}"
            self.save(update_fields=['numero_factura'])

    def __str__(self):
        numero = self.numero_factura if self.numero_factura else f"Borrador {self.id}"
        return f"{numero} - Orden #{self.orden.id}"

    class Meta:
        verbose_name = "Factura"
        verbose_name_plural = "Facturas"
        ordering = ['-fecha_emision']
