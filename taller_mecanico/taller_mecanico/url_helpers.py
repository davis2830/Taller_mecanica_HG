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


# ──────────────────────────────────────────────────────────────────────
# Helpers tenant-aware
#
# En un setup multi-tenant (django-tenants), el correo o WhatsApp que
# manda un tenant tiene que apuntar al subdominio de ESE tenant, no al
# ``BACKEND_URL`` global. Si fixfast manda un magic-link y la URL apunta
# a ``autoservipro.com`` en vez de ``fixfast.autoservipro.com``, el
# middleware no encuentra el tenant y la confirmación falla.
#
# ``tenant_backend_url()`` y ``tenant_spa_url()`` resuelven esto:
#   1. Detectan el tenant actual via ``connection.tenant`` (django-tenants).
#   2. Buscan su dominio primario (modelo ``tenancy.Domain``).
#   3. Construyen URL combinando scheme/puerto de ``BACKEND_URL``/``FRONTEND_URL``
#      con el dominio del tenant.
#   4. Si no hay tenant (schema ``public``) o no hay dominio cargado, caen al
#      helper "global" — útil para emails del SaaS owner (steed.galvez) y para
#      tests/CLI que corren fuera de tenant context.
# ──────────────────────────────────────────────────────────────────────

def _current_tenant():
    """Obtiene el tenant actual o ``None`` si estamos en schema ``public``.

    Devuelve un objeto Tenant "real" del modelo ``tenancy.Tenant`` (con
    relación a ``domains``), no el ``FakeTenant`` que setea
    ``schema_context()``. Si la conexión está en ``public`` o el lookup
    falla (DB no migrada, Tenant no existe), devuelve ``None``.

    Usa ``connection.schema_name`` que django-tenants setea via
    ``TenantMainMiddleware`` (en requests) o ``schema_context()`` (en CLI/
    Celery workers).
    """
    try:
        from django.db import connection
        from django_tenants.utils import get_public_schema_name, schema_context
    except ImportError:
        return None
    schema_name = getattr(connection, 'schema_name', None)
    if not schema_name or schema_name == get_public_schema_name():
        return None
    # El Tenant vive en el schema ``public``; cambiar contexto solo para
    # el lookup y volver al schema actual al salir.
    try:
        from tenancy.models import Tenant
        with schema_context(get_public_schema_name()):
            return Tenant.objects.filter(schema_name=schema_name).first()
    except Exception:
        return None


def _tenant_primary_domain(tenant) -> str:
    """Devuelve el dominio primario del tenant, o vacío si no tiene domains.

    El lookup de Domain corre dentro del schema ``public`` (donde vive el
    modelo); fuera de él, ``tenant.domains`` no existe.
    """
    if tenant is None:
        return ''
    try:
        from django_tenants.utils import get_public_schema_name, schema_context
        with schema_context(get_public_schema_name()):
            domain_obj = (
                tenant.domains.filter(is_primary=True).first()
                or tenant.domains.first()
            )
    except Exception:
        return ''
    return domain_obj.domain if domain_obj else ''


def _scheme_and_port(base: str) -> tuple[str, str]:
    """Extrae ``(scheme, ':puerto')`` de una URL como ``http://localhost:8000``.

    Si la URL no trae puerto explícito, devuelve cadena vacía para evitar
    ``:80``/``:443`` redundantes que rompen matching de cookies/CORS.
    """
    from urllib.parse import urlparse

    parsed = urlparse(base or '')
    scheme = parsed.scheme or 'http'
    port = f":{parsed.port}" if parsed.port else ''
    return scheme, port


def tenant_backend_url(path: str = '/', tenant=None, request=None) -> str:
    """Construye URL absoluta al backend Django apuntando al tenant actual.

    Si no se pasa ``tenant`` explícito, se usa ``connection.tenant``. Si no hay
    tenant en contexto (schema ``public``) o el tenant no tiene Domain
    registrado, cae a ``backend_url()`` global.

    Útil para magic-links de confirmación, links de activación y cualquier
    URL que mande el correo del tenant — tienen que volver al subdominio
    correcto para que el middleware identifique al tenant en la respuesta.
    """
    tenant = tenant if tenant is not None else _current_tenant()
    domain = _tenant_primary_domain(tenant)
    if not domain:
        return backend_url(path, request=request)
    scheme, port = _scheme_and_port(_resolve_base('BACKEND_URL', request))
    if not path.startswith('/'):
        path = f"/{path}"
    return f"{scheme}://{domain}{port}{path}"


def tenant_spa_url(path: str = '/', tenant=None, request=None) -> str:
    """Construye URL absoluta al SPA React apuntando al tenant actual.

    Mismo flujo que ``tenant_backend_url`` pero usando ``FRONTEND_URL`` para
    derivar scheme/puerto. Útil para botones de "Ver mis citas" en correos,
    que tienen que abrir el SPA del tenant correcto.

    Asunción: el SPA del tenant vive en el mismo dominio que el backend
    (clásico setup donde Vite/Nginx sirve el SPA en ``/`` y el backend en
    ``/api``, ``/admin``, etc.). Si en el futuro el SPA usa subdominios
    distintos por tenant (ej. ``app.fixfast.autoservipro.com``), este helper
    es el único punto a cambiar.
    """
    tenant = tenant if tenant is not None else _current_tenant()
    domain = _tenant_primary_domain(tenant)
    if not domain:
        return spa_url(path, request=request)
    scheme, port = _scheme_and_port(_resolve_base('FRONTEND_URL', request))
    if not path.startswith('/'):
        path = f"/{path}"
    return f"{scheme}://{domain}{port}{path}"
