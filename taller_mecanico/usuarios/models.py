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
    
    def __str__(self):
        return f'Perfil de {self.usuario.username}'

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