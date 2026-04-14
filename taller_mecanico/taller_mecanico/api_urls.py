from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Autenticación JWT genérica
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Aquí iremos añadiendo las rutas de los distintos módulos:
    path('usuarios/', include('usuarios.api_urls')),
    path('taller/', include('taller.api_urls')),
    # Citas, Vehículos, Recepciones (prefijos definidos dentro de citas/api_urls.py)
    path('', include('citas.api_urls')),
]
