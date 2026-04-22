from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'clientes', api_views.ClienteViewSet, basename='cliente')

urlpatterns = [
    path('me/', api_views.CurrentUserView.as_view(), name='api_current_user'),
    path('registro/', api_views.RegistroUsuarioView.as_view(), name='api_registro_usuario'),
    path('', include(router.urls)),
]
