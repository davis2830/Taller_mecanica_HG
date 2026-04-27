from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'clientes',  api_views.ClienteViewSet,  basename='cliente')
router.register(r'usuarios',  api_views.UsuarioViewSet,  basename='usuario')
router.register(r'roles',     api_views.RolViewSet,      basename='rol')
router.register(r'empresas',  api_views.EmpresaViewSet,  basename='empresa')
router.register(r'tareas-programadas', api_views.TareaProgramadaViewSet, basename='tarea-programada')

urlpatterns = [
    path('me/',                          api_views.CurrentUserView.as_view(),     name='api_current_user'),
    path('me/perfil/',                   api_views.MiPerfilView.as_view(),        name='api_mi_perfil'),
    path('me/avatar/',                   api_views.MiPerfilAvatarView.as_view(),  name='api_mi_avatar'),
    path('me/cambiar-password/',         api_views.MiPerfilCambiarPasswordView.as_view(), name='api_mi_cambiar_password'),
    path('me/email/solicitar/',          api_views.MiPerfilSolicitarCambioEmailView.as_view(), name='api_mi_email_solicitar'),
    path('me/email/verificar/<str:token>/', api_views.VerificarEmailView.as_view(), name='api_mi_email_verificar'),
    path('registro/',                    api_views.RegistroUsuarioView.as_view(), name='api_registro_usuario'),
    path('',                             include(router.urls)),
]
