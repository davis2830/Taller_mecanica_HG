"""
Helpers compartidos para correos transaccionales.

Provee `get_email_context()`, que arma el contexto base para todos los
templates de email (bajo `templates/emails/base.html`):

  - marca:        nombre_empresa + logo_url (de ConfiguracionTaller)
  - taller:       capacidad/horario/etc (la misma fila singleton)
  - frontend_url: URL absoluta para botones que apunten al SPA
  - logo_url_abs: URL absoluta del logo (necesario porque los clientes de
                  correo no resuelven rutas relativas; siempre prefijamos
                  con FRONTEND_URL si el logo no es ya absoluto)
  - ahora:        timezone-aware now() para footers

Uso:
    from taller_mecanico.email_helpers import get_email_context
    contexto = get_email_context() | {'cita': cita, ...}
    html = render_to_string('citas/emails/cita_recordatorio.html', contexto)
"""
from __future__ import annotations

from django.conf import settings
from django.utils import timezone


def _abs_logo_url(logo_field) -> str | None:
    """
    Devuelve URL absoluta del logo. Si el ImageField está vacío, None.
    Si la URL ya es absoluta (empieza con http), la devuelve tal cual.
    Si es relativa, la prefija con FRONTEND_URL para que los clientes
    de correo (Gmail, Outlook) puedan resolverla.
    """
    if not logo_field:
        return None
    try:
        url = logo_field.url
    except Exception:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        return url
    base = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    if not base:
        # Sin FRONTEND_URL, devolvemos relativa — el correo igual puede
        # mostrar el nombre del taller como fallback en el header.
        return url
    return f"{base}{url}"


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

    frontend_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')

    ctx = {
        'marca': {
            'nombre_empresa': marca_nombre,
            'logo_url': logo_url,
        },
        'taller': cfg,
        'frontend_url': frontend_url,
        'ahora': timezone.now(),
    }
    if extra:
        ctx.update(extra)
    return ctx
