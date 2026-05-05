from django.urls import path, include
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from taller_mecanico.health import health


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login del taller con rate-limit anti brute-force.

    Aplica ``ScopedRateThrottle`` con ``throttle_scope='login'``. La tasa
    se configura en ``REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login']``
    (env var ``THROTTLE_LOGIN``, default ``10/min``).
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class ThrottledTokenRefreshView(TokenRefreshView):
    """Refresh con la misma tasa que login \u2014 evita rotacion abusiva."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


urlpatterns = [
    # Healthcheck publico (sin auth) para monitoreo externo.
    path('health/', health, name='health'),

    # Autenticación JWT genérica
    path('token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),

    # Módulos:
    path('usuarios/', include('usuarios.api_urls')),
    path('taller/', include('taller.api_urls')),
    path('facturacion/', include('facturacion.api_urls')),
    path('inventario/', include('inventario.api_urls')),
    # Citas, Vehículos, Recepciones (prefijos definidos dentro de citas/api_urls.py)
    path('', include('citas.api_urls')),
]
