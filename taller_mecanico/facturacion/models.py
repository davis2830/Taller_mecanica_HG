from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models
from django.utils import timezone

from taller.models import OrdenTrabajo


# IVA por defecto para Guatemala (Contribuyente General = 12%).
# Se guarda por factura para soportar, a futuro, Pequeño Contribuyente (5%) u otros.
TASA_IVA_DEFAULT = Decimal('0.12')


class ConfiguracionFacturacion(models.Model):
    """
    Datos fiscales del emisor (tu taller) y configuración del certificador FEL.
    Singleton: siempre pk=1. Editable solo por administradores.

    En Fase 2 solo se almacenan los datos; en Fase 3+ se usarán para generar
    los XML DTE y llamar al certificador.
    """
    AFILIACION_CHOICES = [
        ('GEN', 'Contribuyente General (IVA 12%)'),
        ('PEQ', 'Pequeño Contribuyente (IVA 5%)'),
    ]
    AMBIENTE_CHOICES = [
        ('PRUEBAS', 'Pruebas (sandbox del certificador)'),
        ('PRODUCCION', 'Producción (factura real ante SAT)'),
    ]
    CERTIFICADOR_CHOICES = [
        ('', 'Sin definir'),
        ('INFILE', 'INFILE'),
        ('DIGIFACT', 'Digifact'),
        ('GUATEFACT', 'Guatefact'),
        ('MEGAPRINT', 'Megaprint'),
        ('OTRO', 'Otro'),
    ]

    # ── Datos del emisor ──────────────────────────────────────────────
    nit_emisor = models.CharField(
        max_length=20,
        default='1234567-8',
        help_text="NIT del taller ante SAT (sin espacios, con guion si lo tiene). Ej: 1234567-8.",
    )
    nombre_fiscal = models.CharField(
        max_length=255,
        default='AutoServi Pro',
        help_text="Razón social exacta como aparece en tu RTU de SAT.",
    )
    nombre_comercial = models.CharField(
        max_length=255,
        default='AutoServi Pro',
        blank=True,
        help_text="Nombre comercial (si es diferente de la razón social).",
    )
    direccion_fiscal = models.CharField(
        max_length=500,
        default='123 Calle Taller, Ciudad de Guatemala',
    )
    telefono = models.CharField(max_length=30, default='+502 1234 5678', blank=True)
    correo = models.EmailField(blank=True, default='')

    # ── Afiliación SAT ────────────────────────────────────────────────
    afiliacion_iva = models.CharField(
        max_length=3,
        choices=AFILIACION_CHOICES,
        default='GEN',
        help_text="Tipo de contribuyente. General usa IVA 12%, Pequeño usa 5%.",
    )
    establecimiento_codigo = models.PositiveIntegerField(
        default=1,
        help_text="Código del establecimiento dentro del NIT (normalmente 1 si solo tienes un local).",
    )

    # ── FEL ──────────────────────────────────────────────────────────
    serie_fel = models.CharField(
        max_length=20,
        default='A',
        help_text="Serie que asigna el certificador a tu emisor (la devuelve el proveedor al enrolarte).",
    )
    ambiente = models.CharField(
        max_length=10,
        choices=AMBIENTE_CHOICES,
        default='PRUEBAS',
        help_text="Mientras estés integrando, mantén PRUEBAS. Solo cambia a PRODUCCION con el certificador listo.",
    )

    # ── Certificador (placeholders — se usan en Fase 4) ───────────────
    certificador = models.CharField(
        max_length=15,
        choices=CERTIFICADOR_CHOICES,
        default='',
        blank=True,
        help_text="Proveedor que firma y envía tus DTE a SAT.",
    )
    certificador_api_url = models.URLField(
        blank=True,
        default='',
        help_text="URL base del API del certificador (te la da el proveedor).",
    )
    certificador_usuario = models.CharField(max_length=120, blank=True, default='')
    certificador_api_key = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Token / API key del certificador. Se usará al integrar Fase 4.",
    )

    # ── Automatizaciones ──────────────────────────────────────────────
    envio_automatico_factura = models.BooleanField(
        default=True,
        help_text="Si está activo, al certificar una factura se envía por correo automáticamente al cliente o empresa.",
    )
    recordatorios_cobro_auto = models.BooleanField(
        default=True,
        help_text="Si está activo, el sistema envía recordatorios de cobro automáticos a empresas con facturas a crédito (3 días antes / día / cada 7 días post-vencimiento).",
    )

    # ── Metadatos ─────────────────────────────────────────────────────
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración de Facturación"
        verbose_name_plural = "Configuración de Facturación"

    def __str__(self):
        return f"Configuración Facturación ({self.nombre_fiscal} — {self.ambiente})"

    def save(self, *args, **kwargs):
        self.pk = 1  # singleton
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def tasa_iva_default(self):
        """Devuelve la tasa que corresponde según afiliación."""
        return Decimal('0.05') if self.afiliacion_iva == 'PEQ' else Decimal('0.12')


def _q(value):
    """Redondea a 2 decimales usando banca redondeo HALF_UP (estándar SAT)."""
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class Factura(models.Model):
    ESTADOS = (
        ('BORRADOR', 'Borrador (Pre-factura)'),
        ('EMITIDA', 'Emitida'),
        ('ANULADA', 'Anulada'),
    )

    METODOS_PAGO = (
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta (Crédito/Débito)'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('OTROS', 'Otros (Cheque, Cripto, etc.)'),
    )

    CONDICION_PAGO_CHOICES = (
        ('CONTADO', 'Contado'),
        ('CREDITO', 'Crédito (B2B)'),
    )

    PAGO_ESTADO_CHOICES = (
        ('NO_APLICA', 'No aplica (contado)'),
        ('PENDIENTE', 'Pendiente de pago'),
        ('PARCIAL', 'Pago parcial recibido'),
        ('PAGADA', 'Pagada en su totalidad'),
        ('VENCIDA', 'Vencida (no pagada a tiempo)'),
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

    # ── Cuentas por Cobrar (B2B) ──────────────────────────────────────
    empresa = models.ForeignKey(
        'usuarios.Empresa',
        on_delete=models.SET_NULL,
        related_name='facturas',
        null=True,
        blank=True,
        help_text="Empresa cliente cuando la factura es a crédito B2B. Null para clientes individuales (contado).",
    )
    condicion_pago = models.CharField(
        max_length=10,
        choices=CONDICION_PAGO_CHOICES,
        default='CONTADO',
        help_text="CONTADO: pago inmediato. CREDITO: a plazo (solo permitido para Empresas).",
    )
    dias_credito = models.PositiveIntegerField(
        default=0,
        help_text="Días de plazo desde fecha_emision (snapshot del valor en la empresa al momento de emitir).",
    )
    fecha_vencimiento = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha calculada al emitir = fecha_emision + dias_credito. Solo aplica si condicion_pago=CREDITO.",
    )
    pago_estado = models.CharField(
        max_length=15,
        choices=PAGO_ESTADO_CHOICES,
        default='NO_APLICA',
        help_text=(
            "Estado de cobro. NO_APLICA = factura de contado. "
            "PENDIENTE/PARCIAL/PAGADA/VENCIDA = factura a crédito."
        ),
    )

    # ── Override de superadmin (auditoría) ──
    override_motivo = models.TextField(
        blank=True,
        default='',
        help_text="Motivo registrado por el superadmin que aprobó facturar a crédito a pesar de que la empresa estaba bloqueada.",
    )
    override_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facturas_override',
        help_text="Superadmin que aprobó el override.",
    )
    override_at = models.DateTimeField(null=True, blank=True)
    # ───────────────────────────────────────────────────────────────────

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

    # ── Cuentas por Cobrar (saldo / aging) ────────────────────────────
    @property
    def total_pagado(self):
        """Suma de pagos registrados para esta factura."""
        agg = self.pagos.aggregate(s=models.Sum('monto'))
        return _q(agg['s'] or 0)

    @property
    def saldo_pendiente(self):
        """total_general − total_pagado. 0 si está pagada o anulada."""
        if self.estado == 'ANULADA':
            return Decimal('0.00')
        return _q(self.total_general - self.total_pagado)

    @property
    def dias_atraso(self):
        """Días desde fecha_vencimiento hasta hoy. 0 si no vence o aún no pasa."""
        if not self.fecha_vencimiento or self.pago_estado in ('PAGADA', 'NO_APLICA'):
            return 0
        delta = (timezone.now().date() - self.fecha_vencimiento).days
        return max(0, delta)

    @property
    def esta_vencida(self):
        return self.dias_atraso > 0 and self.saldo_pendiente > 0

    def recalcular_pago_estado(self, save=True):
        """
        Recalcula `pago_estado` y `fecha_pagada` según los pagos registrados.
        Se llama después de crear/editar/eliminar un PagoFactura.

        - CONTADO → siempre NO_APLICA
        - CREDITO sin pagos → PENDIENTE (o VENCIDA si pasó la fecha)
        - CREDITO con pago < total → PARCIAL (o VENCIDA si pasó la fecha)
        - CREDITO con pago >= total → PAGADA
        """
        if self.estado == 'ANULADA':
            return

        if self.condicion_pago == 'CONTADO':
            self.pago_estado = 'NO_APLICA'
            if save:
                self.save(update_fields=['pago_estado'])
            return

        pagado = self.total_pagado
        total = self.total_general

        if pagado >= total and total > 0:
            self.pago_estado = 'PAGADA'
            if not self.fecha_pagada:
                self.fecha_pagada = timezone.now()
        elif self.fecha_vencimiento and timezone.now().date() > self.fecha_vencimiento:
            self.pago_estado = 'VENCIDA'
        elif pagado > 0:
            self.pago_estado = 'PARCIAL'
        else:
            self.pago_estado = 'PENDIENTE'

        if save:
            self.save(update_fields=['pago_estado', 'fecha_pagada'])

    def calcular_fecha_vencimiento(self):
        """Calcula y asigna fecha_vencimiento basado en fecha_emision + dias_credito."""
        if self.condicion_pago != 'CREDITO' or self.dias_credito <= 0:
            self.fecha_vencimiento = None
            return
        base = (self.fecha_emision or timezone.now()).date()
        self.fecha_vencimiento = base + timedelta(days=self.dias_credito)
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


class PagoFactura(models.Model):
    """
    Pago aplicado a una factura a crédito. Permite múltiples pagos parciales.
    Al guardar/eliminar, recalcula `factura.pago_estado` automáticamente.
    """
    METODOS = (
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('CHEQUE', 'Cheque'),
        ('DEPOSITO', 'Depósito Bancario'),
        ('TARJETA', 'Tarjeta'),
        ('OTRO', 'Otro'),
    )

    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='pagos',
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo = models.CharField(max_length=15, choices=METODOS, default='TRANSFERENCIA')
    referencia = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Número de cheque, ID de transferencia, etc.",
    )
    fecha_pago = models.DateField(
        default=timezone.now,
        help_text="Fecha en la que el cliente realizó el pago (no la fecha en la que se registra).",
    )
    nota = models.TextField(blank=True, default='')

    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pagos_registrados',
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pago de Factura"
        verbose_name_plural = "Pagos de Facturas"
        ordering = ['-fecha_pago', '-fecha_creacion']

    def __str__(self):
        ref = f" ({self.referencia})" if self.referencia else ""
        return f"Q{self.monto} {self.get_metodo_display()}{ref} → {self.factura}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalcula el estado de la factura tras el pago.
        self.factura.recalcular_pago_estado(save=True)

    def delete(self, *args, **kwargs):
        factura = self.factura
        super().delete(*args, **kwargs)
        factura.recalcular_pago_estado(save=True)


class DocumentoElectronico(models.Model):
    """
    Un DTE (Documento Tributario Electrónico) asociado a una factura.
    Puede ser FACT (factura), NCRE (nota de crédito), etc.

    Cada intento de certificación crea uno nuevo — así queda el historial
    completo de envíos, rechazos, reintentos y anulaciones.
    """
    TIPO_CHOICES = [
        ('FACT', 'Factura (FACT)'),
        ('NCRE', 'Nota de Crédito (NCRE)'),
        ('FCAM', 'Factura Cambiaria (FCAM)'),
        ('NDEB', 'Nota de Débito (NDEB)'),
        ('FPEQ', 'Factura Pequeño Contribuyente (FPEQ)'),
    ]
    ESTADO_CHOICES = [
        ('PENDIENTE',   'Pendiente de certificar'),
        ('CERTIFICADO', 'Certificado por SAT'),
        ('ANULADO',     'Anulado ante SAT'),
        ('RECHAZADO',   'Rechazado por el certificador'),
        ('ERROR',       'Error en la comunicación'),
    ]

    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='documentos',
    )
    documento_original = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referenciado_por',
        help_text="Para NCRE, apunta al FACT original que se corrige.",
    )

    tipo_dte = models.CharField(max_length=5, choices=TIPO_CHOICES, default='FACT')
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='PENDIENTE')

    # ── Identificadores SAT (los devuelve el certificador) ──
    uuid_sat = models.CharField(max_length=50, blank=True, default='')
    serie = models.CharField(max_length=20, blank=True, default='')
    numero_autorizacion = models.CharField(max_length=50, blank=True, default='')

    # ── XML ──
    xml_generado = models.TextField(blank=True, default='', help_text="XML que enviamos al certificador.")
    xml_certificado = models.TextField(blank=True, default='', help_text="XML firmado que devuelve el certificador.")

    # ── Metadatos del envío ──
    certificador_usado = models.CharField(max_length=20, blank=True, default='')
    ambiente = models.CharField(max_length=10, blank=True, default='PRUEBAS')
    errores = models.TextField(blank=True, default='')

    motivo_anulacion = models.TextField(blank=True, default='')

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_certificacion = models.DateTimeField(null=True, blank=True)
    fecha_anulacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Documento Electrónico (DTE)"
        verbose_name_plural = "Documentos Electrónicos (DTE)"
        ordering = ['-fecha_creacion']

    def __str__(self):
        ref = self.uuid_sat or f"BORR-{self.id}"
        return f"{self.tipo_dte} {ref} ({self.get_estado_display()})"

    @property
    def serie_numero(self):
        """Devuelve 'SERIE-NUMERO' formato humano. Vacío si no certificado."""
        if self.serie and self.numero_autorizacion:
            return f"{self.serie}-{self.numero_autorizacion}"
        return ''
