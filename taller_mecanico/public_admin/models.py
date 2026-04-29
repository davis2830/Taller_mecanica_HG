"""Modelos del superadmin SaaS.

Viven en el schema `public`. Representan al dueño de la plataforma (vos, Steed)
y a futuros empleados tuyos que administren la plataforma (soporte, ventas,
contabilidad del SaaS). NO son usuarios de ningún taller.

Usamos un modelo `PublicUser` separado del `auth.User` de Django (que vive
en TENANT_APPS) por dos razones:

1. **Aislamiento**: si `auth.User` está en TENANT, cada schema tiene su
   propia tabla `auth_user`. El superadmin NO tiene que existir en ningún
   schema de tenant; vive solo en `public`. Esto previene data leaks
   accidentales y simplifica la autorización.

2. **Diferentes campos y roles**: un PublicUser no tiene "teléfono" ni
   "vehículo asignado"; tiene "rol en el SaaS" (superadmin, soporte,
   ventas). Los modelos pueden evolucionar independientes.
"""

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils.translation import gettext_lazy as _


class PublicUser(models.Model):
    """Usuario de la plataforma SaaS (no de ningún taller).

    Se autentica vía `admin.autoservipro.com` (o `admin.localhost` en dev)
    y tiene acceso al dashboard de superadmin para crear/suspender tenants
    y ver métricas.

    Hoy es un modelo mínimo: email + password + es_superadmin. En futuros
    PRs (#44+) vamos a agregar roles granulares (soporte, ventas, billing).
    """

    ROL_SUPERADMIN = 'superadmin'
    ROL_SOPORTE = 'soporte'
    ROL_VENTAS = 'ventas'

    ROLES = [
        (ROL_SUPERADMIN, _('Superadmin (todo)')),
        (ROL_SOPORTE, _('Soporte técnico')),
        (ROL_VENTAS, _('Ventas / comercial')),
    ]

    email = models.EmailField(
        _('email'),
        unique=True,
        help_text=_('Email de login al panel SaaS'),
    )
    nombre = models.CharField(_('nombre completo'), max_length=150)
    # Password hasheada con el mismo algoritmo que auth.User de Django —
    # reutilizamos `make_password` / `check_password` del core.
    password = models.CharField(_('password hash'), max_length=128)
    rol = models.CharField(
        _('rol'),
        max_length=20,
        choices=ROLES,
        default=ROL_SUPERADMIN,
    )
    activo = models.BooleanField(_('activo'), default=True)
    ultimo_login = models.DateTimeField(_('último login'), null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Usuario SaaS')
        verbose_name_plural = _('Usuarios SaaS')
        ordering = ['nombre']

    def __str__(self) -> str:
        return f'{self.nombre} <{self.email}>'

    def set_password(self, raw_password: str) -> None:
        """Hashea la password en memoria (NO guarda). Llamá .save() después."""
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Valida que `raw_password` coincida con el hash almacenado."""
        return check_password(raw_password, self.password)

    @property
    def es_superadmin(self) -> bool:
        return self.rol == self.ROL_SUPERADMIN
