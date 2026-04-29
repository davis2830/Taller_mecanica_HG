"""Permission classes DRF para los endpoints del panel superadmin SaaS.

Estas permissions validan que ``request.user`` sea una instancia de ``PublicUser``
(no un ``auth.User`` del taller). Así, aunque un taller logree y obtenga un
JWT válido de ``auth.User``, ninguno de sus endpoints aceptaría ese token si
está protegido por ``IsPublicAdmin``.
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from public_admin.models import PublicUser


class IsPublicAdmin(BasePermission):
    """Permite acceso solo a un ``PublicUser`` autenticado y activo."""

    message = 'Se requiere autenticación de superadmin SaaS.'

    def has_permission(self, request, view) -> bool:
        user = getattr(request, 'user', None)
        return isinstance(user, PublicUser) and user.is_authenticated and user.activo


class IsSuperadmin(IsPublicAdmin):
    """Además requiere rol ``superadmin`` (no soporte ni ventas).

    Usado para operaciones críticas: crear/desactivar tenants, gestionar otros
    PublicUsers. Soporte y ventas pueden listar pero no mutar.
    """

    message = 'Se requiere rol de superadmin SaaS (no solo staff).'

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        return request.user.es_superadmin
