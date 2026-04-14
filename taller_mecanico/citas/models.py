# citas/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
import datetime

class TipoServicio(models.Model):
    CATEGORIAS = (
        ('MECANICO', 'Servicio Mecánico'),
        ('CARWASH', 'Servicio de Lavado'),
    )
    
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    duracion = models.IntegerField(help_text="Duración en minutos")
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.CharField(max_length=10, choices=CATEGORIAS)
    
    def __str__(self):
        return f"{self.nombre} ({self.get_categoria_display()})"

class Vehiculo(models.Model):
    propietario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehiculos')
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    año = models.PositiveIntegerField()
    placa = models.CharField(max_length=10, unique=True)
    color = models.CharField(max_length=30)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.placa})"

class Cita(models.Model):
    ESTADOS = (
        ('PENDIENTE', 'Pendiente'),
        ('CONFIRMADA', 'Confirmada'),
        ('LISTO', 'Listo para Recoger'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    )
    
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='citas')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='citas')
    servicio = models.ForeignKey(TipoServicio, on_delete=models.CASCADE)
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    estado = models.CharField(max_length=10, choices=ESTADOS, default='PENDIENTE')
    notas = models.TextField(blank=True, null=True)
    creada_el = models.DateTimeField(auto_now_add=True)
    actualizada_el = models.DateTimeField(auto_now=True)
    atendida_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='citas_atendidas'
    )
    
    def clean(self):
        # Verificar que la fecha no sea en el pasado (solo para citas nuevas o si cambian la fecha)
        if hasattr(self, 'fecha') and self.fecha:
            if not self.pk:
                if self.fecha < datetime.date.today():
                    raise ValidationError("No se pueden agendar nuevas citas en fechas pasadas.")
            else:
                try:
                    original = Cita.objects.get(pk=self.pk)
                    if self.fecha != original.fecha and self.fecha < datetime.date.today():
                        raise ValidationError("No se puede mover la cita a una fecha pasada.")
                except Cita.DoesNotExist:
                    pass
        
        # Calcular hora_fin basada en la duración del servicio
        if self.hora_inicio and self.servicio:
            inicio_dt = datetime.datetime.combine(datetime.date.today(), self.hora_inicio)
            fin_dt = inicio_dt + datetime.timedelta(minutes=self.servicio.duracion)
            self.hora_fin = fin_dt.time()
        
        # Verificar disponibilidad — SOLO si es una cita nueva o si cambió su fecha/hora
        # (Si solo cambia el estado, no revalidar horario para no bloquear COMPLETADA, CANCELADA, etc.)
        if self.fecha and self.hora_inicio and self.hora_fin:
            fecha_cambio = True
            if self.pk:
                try:
                    original = Cita.objects.get(pk=self.pk)
                    fecha_cambio = (self.fecha != original.fecha or self.hora_inicio != original.hora_inicio)
                except Cita.DoesNotExist:
                    pass

            if fecha_cambio:
                citas_en_conflicto = Cita.objects.filter(
                    fecha=self.fecha,
                    estado__in=['PENDIENTE', 'CONFIRMADA'],
                    servicio__categoria=self.servicio.categoria,  # Solo misma categoría
                ).exclude(id=self.id)
                
                for cita in citas_en_conflicto:
                    # Conflicto real solo si los bloques de tiempo se superponen
                    if (self.hora_inicio < cita.hora_fin and self.hora_fin > cita.hora_inicio):
                        fecha_str = self.fecha.strftime('%d/%m/%Y') if hasattr(self.fecha, 'strftime') else str(self.fecha)
                        raise ValidationError(
                            f"Ya existe una cita de {cita.servicio.get_categoria_display()} "
                            f"el {fecha_str} de {cita.hora_inicio.strftime('%H:%M')} a {cita.hora_fin.strftime('%H:%M')}. "
                            f"Por favor elige otro horario."
                        )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        
        # Sincronización Reversa: Citas -> Kanban
        if hasattr(self, 'orden_trabajo') and self.orden_trabajo:
            if self.estado == 'COMPLETADA' and self.orden_trabajo.estado != 'ENTREGADO':
                self.orden_trabajo.estado = 'ENTREGADO'
                self.orden_trabajo.save()
            elif self.estado == 'CANCELADA' and self.orden_trabajo.estado != 'CANCELADO':
                self.orden_trabajo.estado = 'CANCELADO'
                self.orden_trabajo.save()
    
    def __str__(self):
        return f"Cita {self.id} - {self.cliente.username} - {self.fecha} {self.hora_inicio}"

class Notificacion(models.Model):
    TIPOS = (
        ('RECORDATORIO', 'Recordatorio de Cita'),
        ('CONFIRMACION', 'Confirmación de Cita'),
        ('CAMBIO_ESTADO', 'Cambio de Estado'),
    )
    
    cita = models.ForeignKey(Cita, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=15, choices=TIPOS)
    mensaje = models.TextField()
    fecha_envio = models.DateTimeField(auto_now_add=True)
    enviado = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.get_tipo_display()} - Cita {self.cita.id}"

# =======================================================================
# HOJA DE RECEPCIÓN (CHECK-IN) E HISTORIAL CLÍNICO
# =======================================================================

class RecepcionVehiculo(models.Model):
    NIVEL_GASOLINA = (
        ('VACIO', 'Reserva / Vacío'),
        ('CUARTO', '1/4 de Tanque'),
        ('MEDIO', '1/2 Tanque'),
        ('TRESCUARTOS', '3/4 de Tanque'),
        ('LLENO', 'Tanque Lleno'),
    )

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='recepciones')
    cita = models.OneToOneField(Cita, on_delete=models.SET_NULL, null=True, blank=True, related_name='recepcion')
    
    # 1. Datos del Ingreso
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    kilometraje = models.PositiveIntegerField(help_text="Kilometraje o Millaje actual")
    nivel_gasolina = models.CharField(max_length=20, choices=NIVEL_GASOLINA, default='MEDIO')
    
    # 2. Motivo y Diagnóstico
    motivo_ingreso = models.TextField(help_text="¿Qué reporta el cliente que le falla al vehículo?")
    diagnostico_inicial = models.TextField(blank=True, null=True, help_text="Observación inicial del mecánico/recepcionista")
    
    # 3. Inspección Visual (Checklist de Daños)
    danos_previos = models.TextField(blank=True, null=True, help_text="Rayones, abolladuras, golpes, pintura en mal estado, etc.")
    
    # 4. Inventario Abordo
    tiene_llanta_repuesto = models.BooleanField(default=False)
    tiene_gata_herramientas = models.BooleanField(default=False)
    tiene_radio = models.BooleanField(default=False)
    tiene_documentos = models.BooleanField(default=False)
    otros_objetos = models.CharField(max_length=255, blank=True, null=True, help_text="Ej: Lentes de sol, cargadores, etc.")
    
    # 5. Firmas y Responsables
    recibido_por = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='vehiculos_recibidos')
    firma_cliente_text = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre escrito como firma de conformidad del cliente.")
    
    def __str__(self):
        return f"Recepción {self.id:05d} - {self.vehiculo} - {self.fecha_ingreso.strftime('%d/%m/%Y')}"

    class Meta:
        ordering = ['-fecha_ingreso']
        verbose_name = "Recepción de Vehículo"
        verbose_name_plural = "Recepciones de Vehículos"