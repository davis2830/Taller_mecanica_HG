"""URLconf del schema ``public`` (dashboard superadmin SaaS).

django-tenants rutea requests según el Host:

- Si el Host matchea un ``Domain`` en la DB → schema del tenant + ``ROOT_URLCONF``
  (``taller_mecanico/urls.py``, que expone las URLs del taller).
- Si el Host NO matchea ningún Domain → schema ``public`` + este URLconf
  (``PUBLIC_SCHEMA_URLCONF`` en settings).

Qué exponemos acá:

- ``/api/v1/public-admin/*`` — el panel superadmin SaaS (ver
  ``public_admin/api_urls.py``).
- ``/admin/`` — Django admin (útil para debug; solo staff puede entrar).
- Static/media en DEBUG.

Qué NO exponemos:

- ``/api/v1/citas/``, ``/api/v1/ot/``, ``/api/v1/usuarios/me/``, etc. —
  esos son de TENANT_APPS y solo deben responder en subdomains de tenant.
  Si alguien les pega en ``admin.*`` obtiene 404 (defensa por diseño).

Esto le da al sistema 3 capas de separación:

    1. DNS/hosts (admin → public, demo → taller_demo).
    2. ``PUBLIC_SCHEMA_URLCONF`` limita qué URLs existen en public.
    3. ``IsPublicAdmin`` permission rechaza tokens de ``auth.User``.
"""
from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/public-admin/', include('public_admin.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
