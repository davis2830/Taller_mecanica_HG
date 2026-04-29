"""URL routing para el panel superadmin SaaS.

Montado en ``taller_mecanico/public_urls.py`` bajo el prefijo
``/api/v1/public-admin/``. Solo accesible desde el schema ``public`` (host
``admin.*`` o ``localhost`` pelado sin Domain matcheado).
"""
from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from public_admin import api_views


router = DefaultRouter()
router.register(r'tenants', api_views.TenantViewSet, basename='public-admin-tenant')
router.register(r'domains', api_views.DomainViewSet, basename='public-admin-domain')
router.register(r'users', api_views.PublicUserViewSet, basename='public-admin-user')

urlpatterns = [
    # Auth endpoints
    path('token/', api_views.PublicAdminTokenView.as_view(),
         name='public-admin-token'),
    path('token/refresh/', TokenRefreshView.as_view(),
         name='public-admin-token-refresh'),
    path('me/', api_views.PublicAdminMeView.as_view(),
         name='public-admin-me'),

    # CRUD
    path('', include(router.urls)),
]
