from django.db import models
from citas.models import Cita, Vehiculo
from inventario.models import Producto
from django.contrib.auth.models import User

class OrdenTrabajo(models.Model):
    ESTADO_CHOICES = [
        ('EN_ESPERA', 'En Espera'),
        ('EN_REVISION', 'En Revisión'),
        ('ESPERANDO_REPUESTOS', 'Esperando Repuestos'),
        ('LISTO', 'Listo para Entrega'),
    ]

    cita = models.OneToOneField(Cita, on_delete=models.SET_NULL, null=True, blank=True, related_name='orden_trabajo')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='ordenes_trabajo')
    mecanico_asignado = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_asignadas')
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='EN_ESPERA')
    diagnostico = models.TextField(blank=True, null=True, help_text="Diagnóstico oficial del mecánico")
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_finalizacion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Orden #{self.id} - {self.vehiculo.placa} ({self.get_estado_display()})"

    @property
    def total_repuestos(self):
        return sum(item.subtotal for item in self.repuestos.all())

class OrdenRepuesto(models.Model):
    orden = models.ForeignKey(OrdenTrabajo, on_delete=models.CASCADE, related_name='repuestos')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='usos_orden')
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio al momento de usar el repuesto")
    fecha_agregado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en Orden #{self.orden.id}"

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario
