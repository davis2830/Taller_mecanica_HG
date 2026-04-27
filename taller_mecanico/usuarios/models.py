# usuarios/models.py
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import User


class Empresa(models.Model):
    """
    Cliente corporativo (B2B) que paga a crédito. Distinto de los clientes
    individuales (User/Perfil) que pagan al contado.

    Una empresa puede tener una flota de vehículos (varios `Vehiculo` con
    `empresa_id` apuntando aquí) y se factura a su NIT/razón social.
    """

    DIAS_CREDITO_CHOICES = [
        (0, 'Contado (0 días)'),
        (8, '8 días'),
        (15, '15 días'),
        (30, '30 días'),
        (45, '45 días'),
        (60, '60 días'),
        (90, '90 días'),
    ]

    nit = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="NIT de la empresa (sin espacios). Único en el sistema.",
    )
    razon_social = models.CharField(
        max_length=255,
        help_text="Razón social como aparece en el RTU de SAT.",
    )
    nombre_comercial = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Nombre comercial / fantasía. Si está vacío se usa la razón social.",
    )
    direccion_fiscal = models.CharField(
        max_length=500,
        help_text="Dirección que aparece en el RTU.",
    )

    # ── Contacto ──
    email_cobro = models.EmailField(
        blank=True,
        default='',
        help_text="Correo donde se envían facturas, estados de cuenta y recordatorios de cobro.",
    )
    contacto_principal = models.CharField(max_length=255, blank=True, default='')
    telefono = models.CharField(max_length=20, blank=True, default='')

    # ── Crédito ──
    dias_credito = models.PositiveIntegerField(
        default=30,
        choices=DIAS_CREDITO_CHOICES,
        help_text="Días de plazo desde la emisión hasta el vencimiento de cada factura.",
    )
    limite_credito = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto máximo de saldo pendiente permitido. 0 = sin límite.",
    )
    recordatorios_activos = models.BooleanField(
        default=True,
        help_text="Si está activo, se envían correos automáticos de recordatorio de cobro.",
    )
    activo = models.BooleanField(
        default=True,
        help_text="Si está inactivo, no se permiten nuevas facturas a crédito (solo override de admin).",
    )

    notas = models.TextField(blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Empresa (Cliente Corporativo)'
        verbose_name_plural = 'Empresas (Clientes Corporativos)'
        ordering = ['razon_social']

    def __str__(self):
        return f'{self.razon_social} ({self.nit})'

    @property
    def nombre_mostrar(self):
        return self.nombre_comercial or self.razon_social

    @property
    def saldo_pendiente_total(self):
        """Suma de saldos pendientes de todas las facturas de esta empresa."""
        # Import local para evitar import circular con facturacion.
        from facturacion.models import Factura
        total = Decimal('0.00')
        facturas = Factura.objects.filter(
            empresa=self,
            estado='EMITIDA',
            pago_estado__in=['PENDIENTE', 'PARCIAL', 'VENCIDA'],
        )
        for f in facturas:
            total += f.saldo_pendiente
        return total

    @property
    def tiene_vencimientos(self):
        """¿Tiene al menos una factura VENCIDA?"""
        from facturacion.models import Factura
        return Factura.objects.filter(empresa=self, pago_estado='VENCIDA').exists()

    @property
    def excede_limite(self):
        """¿Su saldo pendiente excede el límite de crédito? (0 = sin límite)"""
        if self.limite_credito <= 0:
            return False
        return self.saldo_pendiente_total > self.limite_credito

    def puede_facturar_a_credito(self):
        """
        Devuelve (puede: bool, motivo: str).
        Se usa para gating: operador no puede emitir, admin sí puede con override.
        """
        if not self.activo:
            return False, "La empresa está marcada como inactiva."
        if self.tiene_vencimientos:
            return False, "La empresa tiene al menos una factura vencida sin pagar."
        if self.excede_limite:
            saldo = self.saldo_pendiente_total
            return False, (
                f"La empresa excede su límite de crédito "
                f"(saldo pendiente Q{saldo:,.2f} sobre límite Q{self.limite_credito:,.2f})."
            )
        return True, ""


class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.nombre

class Perfil(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)

    # ── Avatar / foto de perfil ──
    avatar = models.ImageField(
        upload_to='usuarios/avatares/',
        blank=True, null=True,
        help_text="Foto de perfil del usuario.",
    )

    # ── Cambio de email con verificación ──
    # Cuando el usuario solicita cambiar su email, guardamos el nuevo email
    # aquí + un token. El cambio en `usuario.email` solo se aplica cuando
    # el usuario confirma desde el link enviado al email NUEVO.
    email_pendiente = models.EmailField(blank=True, default='')
    email_token = models.CharField(max_length=64, blank=True, default='')
    email_token_expira = models.DateTimeField(null=True, blank=True)

    # ── Datos fiscales del cliente (SAT Guatemala) ──
    # NIT receptor. 'CF' = Consumidor Final (default, permite facturar sin NIT formal).
    nit = models.CharField(
        max_length=20,
        default='CF',
        blank=True,
        help_text="NIT del cliente. 'CF' para Consumidor Final (facturación sin NIT nominal).",
    )
    nombre_fiscal = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Razón social o nombre como aparece en el NIT. Si está vacío se usa el nombre del usuario.",
    )
    direccion_fiscal = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="Dirección que aparece en el RTU del cliente. Si está vacía se usa 'direccion'.",
    )

    def __str__(self):
        return f'Perfil de {self.usuario.username}'

    @property
    def nit_normalizado(self):
        """Devuelve NIT sin espacios, en mayúsculas; 'CF' si está vacío."""
        v = (self.nit or '').strip().upper()
        return v or 'CF'

    @property
    def nombre_fiscal_o_nombre(self):
        """Fallback seguro al nombre del usuario si no hay razón social."""
        if self.nombre_fiscal:
            return self.nombre_fiscal
        u = self.usuario
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    @property
    def direccion_fiscal_o_direccion(self):
        return self.direccion_fiscal or self.direccion or 'Ciudad'

class TareaProgramada(models.Model):
    """
    Configuración runtime de las tareas programadas (APScheduler) del sistema.

    Existe una fila por cada job registrado en código. La hora y el toggle
    `habilitada` se editan desde la UI Sistema → Tareas Programadas y se
    aplican al scheduler en caliente sin reiniciar Django.

    Las filas se siembran vía data-migration con valores por defecto.
    """

    TAREA_CITAS_RECORDATORIOS = 'citas_recordatorios_diario'
    TAREA_CXC_RECORDATORIOS = 'cxc_recordatorios_diario'
    TAREA_INVENTARIO_RESUMEN_AM = 'inventario_resumen_am'
    TAREA_INVENTARIO_RESUMEN_PM = 'inventario_resumen_pm'

    TAREAS_CHOICES = [
        (TAREA_CITAS_RECORDATORIOS, 'Recordatorios de citas'),
        (TAREA_CXC_RECORDATORIOS, 'Recordatorios de cobro CxC'),
        (TAREA_INVENTARIO_RESUMEN_AM, 'Resumen de inventario (AM)'),
        (TAREA_INVENTARIO_RESUMEN_PM, 'Resumen de inventario (PM)'),
    ]

    STATUS_OK = 'OK'
    STATUS_ERROR = 'ERROR'
    STATUS_CHOICES = [
        (STATUS_OK, 'Éxito'),
        (STATUS_ERROR, 'Error'),
    ]

    tarea_id = models.CharField(
        max_length=64,
        unique=True,
        choices=TAREAS_CHOICES,
        help_text="Identificador interno del job (estable).",
    )
    nombre = models.CharField(
        max_length=128,
        help_text="Nombre legible para mostrar en la UI.",
    )
    descripcion = models.TextField(
        blank=True,
        default='',
        help_text="Descripción de qué hace la tarea cuando se ejecuta.",
    )
    hora = models.TimeField(
        help_text="Hora local (America/Guatemala) en que la tarea corre cada día.",
    )
    habilitada = models.BooleanField(
        default=True,
        help_text="Si está deshabilitada, el job se remueve del scheduler.",
    )
    ultima_ejecucion = models.DateTimeField(null=True, blank=True)
    ultima_ejecucion_status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        blank=True,
        default='',
    )
    ultima_ejecucion_mensaje = models.TextField(
        blank=True,
        default='',
        help_text="Mensaje breve del último intento (error o resumen).",
    )

    class Meta:
        verbose_name = "Tarea Programada"
        verbose_name_plural = "Tareas Programadas"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.hora.strftime('%H:%M')})"


class Notificacion(models.Model):
    TIPOS = (
        ('INFO', 'Información'),
        ('WARNING', 'Advertencia'),
        ('CRITICAL', 'Crítico'),
        ('SUCCESS', 'Éxito'),
    )
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPOS, default='INFO')
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    enlace = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.titulo} - {self.usuario.username}"