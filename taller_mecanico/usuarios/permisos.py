# usuarios/permisos.py
"""
Módulo centralizado de helpers de permisos.
Usar estos helpers en todas las vistas y templates para consistencia.
"""

def get_rol_nombre(user):
    """Retorna el nombre del rol del usuario o 'Cliente' si no tiene."""
    if not user.is_authenticated:
        return None
    if user.is_superuser:
        return 'Administrador'
    try:
        return user.perfil.rol.nombre
    except Exception:
        return 'Cliente'


def es_admin(user):
    """Administrador o superusuario."""
    return user.is_authenticated and (
        user.is_superuser or get_rol_nombre(user) == 'Administrador'
    )


def es_secretaria(user):
    """Recepcionista / Secretaria."""
    return user.is_authenticated and get_rol_nombre(user) in ['Recepcionista', 'Recepción', 'Secretaria']


def es_mecanico(user):
    """Mecánico."""
    return user.is_authenticated and get_rol_nombre(user) == 'Mecánico'


def es_admin_o_secretaria(user):
    """Admin o Secretaria."""
    return es_admin(user) or es_secretaria(user)


def es_admin_o_mecanico(user):
    """Admin o Mecánico."""
    return es_admin(user) or es_mecanico(user)


def es_staff_operativo(user):
    """Cualquier usuario del staff: Admin + Secretaria + Mecánico."""
    return user.is_authenticated and (
        user.is_superuser or
        get_rol_nombre(user) in ['Administrador', 'Mecánico', 'Recepcionista', 'Recepción', 'Secretaria']
    )
