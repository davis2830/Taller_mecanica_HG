# usuarios/models.py
from django.db import models
from django.contrib.auth.models import User

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