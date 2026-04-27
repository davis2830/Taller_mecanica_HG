# citas/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
import datetime

class ConfiguracionTaller(models.Model):
    """
    Configuración global del taller (capacidad, horarios, días laborales).
    Singleton: siempre se usa la instancia pk=1.
    """
    DIAS_CHOICES = [
        (0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'), (3, 'Jueves'),
        (4, 'Viernes'), (5, 'Sábado'), (6, 'Domingo'),
    ]
    GRANULARIDAD_CHOICES = [
        (15, '15 minutos'),
        (30, '30 minutos'),
        (60, '60 minutos'),
    ]

    capacidad_mecanico = models.PositiveIntegerField(
        default=3,
        help_text="Número de vehículos de mecánica que se pueden atender en paralelo (un 'slot' por cada mecánico disponible)."
    )
    capacidad_carwash = models.PositiveIntegerField(
        default=1,
        help_text="Número de vehículos de lavado que se pueden atender en paralelo."
    )
    hora_apertura = models.TimeField(
        default='08:00',
        help_text="Hora a la que el taller empieza a recibir citas."
    )
    hora_cierre = models.TimeField(
        default='18:00',
        help_text="Última hora a la que puede iniciar una cita (la cita puede terminar después, según su duración)."
    )
    granularidad_slot = models.PositiveIntegerField(
        default=30, choices=GRANULARIDAD_CHOICES,
        help_text="Cada cuántos minutos se ofrece un slot en la agenda."
    )
    # JSON list con los números de día de la semana (0=Lun, 6=Dom) en que se trabaja.
    dias_laborales = models.JSONField(
        default=list,
        help_text="Lista de días laborales (0=Lunes, 6=Domingo). Por defecto: Lun–Sáb."
    )

    # Flujo Recepción del Vehículo
    requerir_recepcion_antes_trabajo = models.BooleanField(
        default=True,
        help_text="Si está activo, se pide confirmación al mover una OT de 'En Espera' a 'En Revisión' sin recepción registrada."
    )
    permitir_re_recepcion = models.BooleanField(
        default=False,
        help_text="Si está activo, una misma cita puede tener más de una recepción (por ejemplo, si el vehículo volvió a ingresar)."
    )

    # Marca / branding del taller
    nombre_empresa = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text="Nombre comercial del taller; se muestra en sidebar, login y facturas. Si está vacío se usa 'AutoServi'."
    )
    logo = models.ImageField(
        upload_to='taller/logos/',
        blank=True,
        null=True,
        help_text="Logo del taller (PNG/JPG). Aparece en sidebar, login y facturas. Idealmente cuadrado o transparente."
    )

    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración del Taller"
        verbose_name_plural = "Configuración del Taller"

    def __str__(self):
        return "Configuración del Taller"

    def save(self, *args, **kwargs):
        # Forzar singleton: siempre pk=1
        self.pk = 1
        # Default días laborales: L-S
        if not self.dias_laborales:
            self.dias_laborales = [0, 1, 2, 3, 4, 5]
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={'dias_laborales': [0, 1, 2, 3, 4, 5]},
        )
        return obj

    def capacidad_para(self, categoria):
        """Capacidad paralela para una categoría de servicio ('MECANICO' | 'CARWASH')."""
        return self.capacidad_carwash if categoria == 'CARWASH' else self.capacidad_mecanico


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
    empresa = models.ForeignKey(
        'usuarios.Empresa',
        on_delete=models.SET_NULL,
        related_name='vehiculos',
        null=True,
        blank=True,
        help_text=(
            "Empresa a la que pertenece este vehículo (flota corporativa). "
            "Si se establece, las facturas pueden emitirse a la empresa en lugar del propietario."
        ),
    )
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    año = models.PositiveIntegerField()
    placa = models.CharField(max_length=10, unique=True)
    color = models.CharField(max_length=30)
    
    # Identidad Técnica
    vin_chasis = models.CharField(max_length=50, blank=True, null=True, help_text="VIN / Número de Chasis")
    numero_motor = models.CharField(max_length=50, blank=True, null=True)
    
    # Especificaciones
    cilindrada_motor = models.CharField(max_length=20, blank=True, null=True, help_text="Ej: 2.0L o 2000cc")
    
    COMBUSTIBLE_CHOICES = (
        ('GASOLINA', 'Gasolina'),
        ('DIESEL', 'Diesel'),
        ('HIBRIDO', 'Híbrido'),
        ('ELECTRICO', 'Eléctrico'),
    )
    tipo_combustible = models.CharField(max_length=15, choices=COMBUSTIBLE_CHOICES, blank=True, null=True)
    
    TRANSMISION_CHOICES = (
        ('AUTOMATICA', 'Automática'),
        ('MECANICA', 'Mecánica'),
        ('CVT', 'CVT'),
    )
    transmision = models.CharField(max_length=15, choices=TRANSMISION_CHOICES, blank=True, null=True)
    
    # Control de Odómetro
    UNIDAD_KM_CHOICES = (
        ('KM', 'Kilómetros'),
        ('MI', 'Millas'),
    )
    unidad_medida_kilometraje = models.CharField(max_length=2, choices=UNIDAD_KM_CHOICES, default='KM')
    kilometraje_actual = models.PositiveIntegerField(blank=True, null=True, help_text="Último kilometraje/millaje registrado")

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
                # Capacidad paralela configurable (ej. N mecánicos atendiendo al mismo tiempo).
                config = ConfiguracionTaller.get()
                capacidad = config.capacidad_para(self.servicio.categoria)

                citas_mismo_dia = Cita.objects.filter(
                    fecha=self.fecha,
                    estado__in=['PENDIENTE', 'CONFIRMADA'],
                    servicio__categoria=self.servicio.categoria,
                ).exclude(id=self.id)

                # Contamos cuántas citas se solapan con nuestro bloque [hora_inicio, hora_fin)
                ocupadas = sum(
                    1 for c in citas_mismo_dia
                    if self.hora_inicio < c.hora_fin and self.hora_fin > c.hora_inicio
                )

                if ocupadas >= capacidad:
                    fecha_str = self.fecha.strftime('%d/%m/%Y') if hasattr(self.fecha, 'strftime') else str(self.fecha)
                    raise ValidationError({
                        'hora_inicio': (
                            f"No hay disponibilidad para {self.servicio.get_categoria_display().lower()} "
                            f"el {fecha_str} de {self.hora_inicio.strftime('%H:%M')} a {self.hora_fin.strftime('%H:%M')} "
                            f"(capacidad máxima de {capacidad} en ese horario). Por favor elige otro horario."
                        )
                    })

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


class CanalNotificacion(models.Model):
    """
    Configuración por evento del taller: ¿se manda por correo? ¿por WhatsApp?

    Cada fila representa un tipo de notificación que el sistema puede emitir
    (ej. 'cita_recordatorio'). El taller controla qué canales están activos
    para cada evento. Si NO existe fila para un evento, el default es
    correo=True / whatsapp=False (manteniendo compatibilidad con el comportamiento
    anterior a este PR).

    El cliente NO puede sobreescribir estas preferencias — control 100% del taller.
    """
    evento = models.SlugField(
        max_length=64, unique=True,
        help_text="Identificador interno del evento (ej. 'cita_recordatorio')."
    )
    label = models.CharField(
        max_length=120,
        help_text="Nombre humano del evento, mostrado en el panel de configuración."
    )
    descripcion = models.CharField(
        max_length=255, blank=True, default='',
        help_text="Descripción opcional para el panel."
    )
    grupo = models.CharField(
        max_length=32, default='General',
        help_text="Agrupa eventos en la UI (ej. 'Citas', 'Facturación', 'Inventario')."
    )
    email_activo = models.BooleanField(
        default=True,
        help_text="Si está activo, el evento dispara correo a destinatarios."
    )
    whatsapp_activo = models.BooleanField(
        default=False,
        help_text="Si está activo, el evento dispara mensaje WhatsApp (Twilio)."
    )
    orden = models.PositiveIntegerField(
        default=0,
        help_text="Orden de aparición en el panel."
    )
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Canal de notificación"
        verbose_name_plural = "Canales de notificación"
        ordering = ['grupo', 'orden', 'label']

    def __str__(self):
        return f"{self.label} ({self.evento})"

    @classmethod
    def get_config(cls, evento):
        """Devuelve (email_activo, whatsapp_activo) para un evento.

        Si no hay fila — significa que la migración inicial aún no creó el
        registro o que el evento es nuevo: default → email=True, whatsapp=False.
        """
        try:
            row = cls.objects.only('email_activo', 'whatsapp_activo').get(evento=evento)
            return bool(row.email_activo), bool(row.whatsapp_activo)
        except cls.DoesNotExist:
            return True, False


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
    # Permite más de una recepción por cita si ConfiguracionTaller.permitir_re_recepcion == True.
    # La recepción "vigente" para efectos de UI/cards es la más reciente (ordering por -fecha_ingreso).
    cita = models.ForeignKey(Cita, on_delete=models.SET_NULL, null=True, blank=True, related_name='recepciones')
    
    # 1. Datos del Ingreso
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    kilometraje = models.PositiveIntegerField(help_text="Kilometraje o Millaje actual")
    unidad_distancia = models.CharField(max_length=10, default='km', choices=[('km', 'Kilómetros'), ('mi', 'Millas')])
    gasolina_pct = models.PositiveIntegerField(default=50, help_text="Porcentaje de gasolina (0-100)")
    
    # === ESTADO MECÁNICO Y FLUIDOS ===
    luces_tablero = models.JSONField(default=dict, blank=True, help_text="Ej: {'check_engine': true, 'abs': false}")
    estado_fluidos = models.JSONField(default=dict, blank=True, help_text="Ej: {'aceite': 'Nivel Bajo', 'refrigerante': 'OK'}")
    estado_cristales = models.CharField(max_length=255, blank=True, null=True, help_text="Ej: Parabrisas estrellado")
    
    # 2. Motivo y Diagnóstico
    motivo_ingreso = models.TextField(help_text="¿Qué reporta el cliente que le falla al vehículo?")
    diagnostico_inicial = models.TextField(blank=True, null=True, help_text="Observación inicial del mecánico/recepcionista")
    
    # 3. Inspección Visual (Checklist de Daños)
    danos_previos = models.TextField(blank=True, null=True, help_text="Notas adicionales de daños")
    diagrama_danos = models.TextField(blank=True, null=True, help_text="Base64 del diagrama táctil trazado")

    
    # 4. Inventario Abordo
    tiene_llanta_repuesto = models.BooleanField(default=False)
    tiene_gata_herramientas = models.BooleanField(default=False)
    tiene_radio = models.BooleanField(default=False)
    tiene_documentos = models.BooleanField(default=False)
    otros_objetos = models.CharField(max_length=255, blank=True, null=True, help_text="Ej: Lentes de sol, cargadores, etc.")
    
    # 5. Firmas y Responsables
    recibido_por = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='vehiculos_recibidos')
    firma_cliente_text = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre escrito como firma de conformidad.")
    firma_digital = models.TextField(blank=True, null=True, help_text="Base64 de la firma táctil digital del cliente")
    firma_mecanico = models.TextField(blank=True, null=True, help_text="Base64 de la firma táctil digital del mecánico")
    
    def clean(self):
        super().clean()
        if self.vehiculo and self.kilometraje:
            if self.vehiculo.kilometraje_actual and self.kilometraje < self.vehiculo.kilometraje_actual:
                raise ValidationError({"kilometraje": f"El kilometraje o millaje ingresado ({self.kilometraje}) es menor al último registrado en este vehículo ({self.vehiculo.kilometraje_actual}). Revíselo."})

    def save(self, *args, **kwargs):
        self.clean()
        # Verificar si es creación y no actualización
        is_new = not self.pk
        super().save(*args, **kwargs)
        
        if is_new and self.vehiculo and self.kilometraje:
            self.vehiculo.kilometraje_actual = self.kilometraje
            if self.unidad_distancia:
                # Normalizar km vs mi a KM vs MI
                self.vehiculo.unidad_medida_kilometraje = 'KM' if self.unidad_distancia.lower() == 'km' else 'MI'
            self.vehiculo.save(update_fields=['kilometraje_actual', 'unidad_medida_kilometraje'])
            
    def __str__(self):
        return f"Recepción {self.id:05d} - {self.vehiculo} - {self.fecha_ingreso.strftime('%d/%m/%Y')}"

    class Meta:
        ordering = ['-fecha_ingreso']
        verbose_name = "Recepción de Vehículo"
        verbose_name_plural = "Recepciones de Vehículos"

class RecepcionFoto(models.Model):
    recepcion = models.ForeignKey(RecepcionVehiculo, on_delete=models.CASCADE, related_name='fotos')
    imagen = models.ImageField(upload_to='recepciones/fotos/')
    descripcion = models.CharField(max_length=150, blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto de {self.recepcion}"