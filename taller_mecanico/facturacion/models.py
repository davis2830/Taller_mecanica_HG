from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.utils import timezone

from taller.models import OrdenTrabajo


# IVA por defecto para Guatemala (Contribuyente General = 12%).
# Se guarda por factura para soportar, a futuro, Pequeño Contribuyente (5%) u otros.
TASA_IVA_DEFAULT = Decimal('0.12')


def _q(value):
    """Redondea a 2 decimales usando banca redondeo HALF_UP (estándar SAT)."""
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


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

    # ── IVA (Guatemala) ────────────────────────────────────────────────
    # `iva_incluido=True` significa que los precios guardados en mano_obra /
    # repuestos YA tienen IVA dentro (común en talleres). Entonces:
    #     total = mano_obra + repuestos − descuento   (lo que paga el cliente)
    #     total_sin_iva = total / (1 + tasa)
    #     monto_iva = total − total_sin_iva
    # Si `iva_incluido=False`, se suma el IVA al subtotal:
    #     subtotal = mano_obra + repuestos − descuento
    #     monto_iva = subtotal × tasa
    #     total = subtotal + monto_iva
    iva_incluido = models.BooleanField(
        default=True,
        help_text=(
            "Si está activo, los precios de mano de obra y repuestos ya tienen IVA "
            "incluido (desglose retrocalculado). Si está inactivo, el IVA se suma al total."
        ),
    )
    tasa_iva = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=TASA_IVA_DEFAULT,
        help_text="Tasa de IVA aplicable. Guatemala General = 0.12, Pequeño Contribuyente = 0.05.",
    )
    # ───────────────────────────────────────────────────────────────────
    
    estado = models.CharField(max_length=15, choices=ESTADOS, default='BORRADOR')
    metodo_pago = models.CharField(max_length=15, choices=METODOS_PAGO, null=True, blank=True)
    
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_pagada = models.DateTimeField(null=True, blank=True)
    notas_internas = models.TextField(blank=True, null=True)

    # ── Totales (cálculos) ─────────────────────────────────────────────
    @property
    def bruto(self):
        """Mano de obra + repuestos − descuento, sin desglosar IVA todavía."""
        return _q((self.costo_mano_obra or 0) + (self.costo_repuestos or 0) - (self.descuento or 0))

    @property
    def total_general(self):
        """Lo que paga el cliente (con IVA incluido siempre, para mostrar al final)."""
        if self.iva_incluido:
            return self.bruto
        return _q(self.bruto * (Decimal('1') + self.tasa_iva))

    @property
    def total_sin_iva(self):
        """Base imponible (antes de IVA)."""
        if self.iva_incluido:
            return _q(self.bruto / (Decimal('1') + self.tasa_iva))
        return self.bruto

    @property
    def monto_iva(self):
        """Cuota de IVA sobre la base imponible."""
        return _q(self.total_general - self.total_sin_iva)

    @property
    def subtotal(self):
        """Alias retrocompatible: antes devolvía mano_obra + repuestos."""
        return self.total_sin_iva
    # ───────────────────────────────────────────────────────────────────

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
