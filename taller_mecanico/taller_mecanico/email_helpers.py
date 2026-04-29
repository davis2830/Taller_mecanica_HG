"""
Helpers compartidos para correos transaccionales.

Provee `get_email_context()`, que arma el contexto base para todos los
templates de email (bajo `templates/emails/base.html`):

  - marca:        nombre_empresa + logo_url (de ConfiguracionTaller)
  - taller:       capacidad/horario/etc (la misma fila singleton)
  - frontend_url: URL absoluta del SPA (botones que apuntan al SPA)
  - logo_url_abs: URL absoluta del logo (los clientes de correo no resuelven
                  rutas relativas, por eso prefijamos con BACKEND_URL —
                  el logo está bajo `/media/` que sirve Django, no el SPA)
  - ahora:        timezone-aware now() para footers

Uso:
    from taller_mecanico.email_helpers import get_email_context
    contexto = get_email_context() | {'cita': cita, ...}
    html = render_to_string('citas/emails/cita_recordatorio.html', contexto)
"""
from __future__ import annotations

from django.utils import timezone

from taller_mecanico.url_helpers import (
    backend_url,
    spa_url,
    tenant_backend_url,
    tenant_spa_url,
)


def _abs_logo_url(logo_field) -> str | None:
    """
    Devuelve URL absoluta del logo. Si el ImageField está vacío, None.
    Si la URL ya es absoluta (empieza con http), la devuelve tal cual.
    Si es relativa, la prefija con la URL del tenant — el logo está en
    /media/ que sirve Django, y cada tenant lo tiene en su subdominio.
    """
    if not logo_field:
        return None
    try:
        url = logo_field.url
    except Exception:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        return url
    return tenant_backend_url(url)


def get_email_context(extra: dict | None = None) -> dict:
    """
    Arma el contexto base para cualquier email transaccional.

    Carga ConfiguracionTaller del singleton; si hay error en DB o todavía
    no se ha creado la fila, devuelve valores por defecto seguros.
    """
    from citas.models import ConfiguracionTaller  # import lazy

    try:
        cfg = ConfiguracionTaller.get()
    except Exception:
        cfg = None

    marca_nombre = (cfg.nombre_empresa if cfg else '') or 'AutoServi Pro'
    logo_url = _abs_logo_url(cfg.logo) if cfg else None

    ctx = {
        'marca': {
            'nombre_empresa': marca_nombre,
            'logo_url': logo_url,
        },
        'taller': cfg,
        # `frontend_url` apunta al SPA (botones tipo "Ver mis citas").
        # `backend_url` apunta al backend (links a vistas Django como
        # admin o magic-links). Los templates eligen según corresponda.
        # En multi-tenant, ambos resuelven al subdominio del tenant actual
        # (ej. ``fixfast.autoservipro.com``); fuera de tenant context
        # (schema ``public``, CLI), caen al global.
        'frontend_url': tenant_spa_url('/').rstrip('/'),
        'backend_url': tenant_backend_url('/').rstrip('/'),
        'ahora': timezone.now(),
    }
    if extra:
        ctx.update(extra)
    return ctx
