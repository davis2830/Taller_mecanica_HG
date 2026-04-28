"""
Helpers compartidos para construir URLs y redirecciones que apuntan al SPA
React. Toda la app debe pasar por aquí en lugar de armar URLs sueltas con
``settings.FRONTEND_URL`` en cada vista — así si mañana cambia el host del
frontend (puerto, dominio, esquema), se cambia en un único lugar (`.env`).

Uso típico:

    from taller_mecanico.url_helpers import spa_url, redirect_to_spa

    # Construir URL absoluta al SPA:
    boleta_url = spa_url(f"/citas/recepcion/{rec.id}/boleta")

    # Redireccionar al usuario al SPA desde una vista Django:
    return redirect_to_spa("/citas")
    return redirect_to_spa("/login", query="?verificado=true")
"""
from __future__ import annotations

from django.conf import settings
from django.shortcuts import redirect


def _resolve_base(setting_name: str, request=None) -> str:
    """
    Resuelve una URL base configurada en ``settings`` (ej. ``FRONTEND_URL``,
    ``BACKEND_URL``). Si no está, intenta construirla con el host de la
    request actual (mismo origen). Nunca devuelve cadena con slash final.
    """
    base = (getattr(settings, setting_name, '') or '').strip().rstrip('/')
    if base:
        return base
    if request is not None:
        return request.build_absolute_uri('/').rstrip('/')
    return ''


def _join(base: str, path: str) -> str:
    if not path:
        return base or '/'
    if not path.startswith('/'):
        path = f"/{path}"
    return f"{base}{path}" if base else path


def spa_url(path: str = '/', request=None) -> str:
    """
    Construye una URL absoluta al SPA React (``settings.FRONTEND_URL``).

    ``path`` debe empezar con ``/`` (ej. ``"/citas"``). Si llega vacío o
    sin slash, se normaliza.
    """
    return _join(_resolve_base('FRONTEND_URL', request), path)


def backend_url(path: str = '/', request=None) -> str:
    """
    Construye una URL absoluta al backend Django (``settings.BACKEND_URL``).

    Útil para enlaces de email que apuntan a vistas server-side (activación
    de cuenta, magic-link de confirmación, verificación de email). Esos
    endpoints viven en Django y necesitan su URL propia, distinta del SPA.
    """
    return _join(_resolve_base('BACKEND_URL', request), path)


def redirect_to_spa(path: str = '/', query: str = '', request=None):
    """
    Devuelve un ``HttpResponseRedirect`` apuntando al SPA. ``query`` se
    concatena tal cual al final (ej. ``"?verificado=true"``).
    """
    target = spa_url(path, request=request)
    if query:
        target = f"{target}{query}"
    return redirect(target)
