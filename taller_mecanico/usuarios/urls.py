# usuarios/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .forms import TallerLoginForm

urlpatterns = [
    path('register/', views.register, name='register'),
    path('activar/<uidb64>/<token>/', views.activar_cuenta, name='activar_cuenta'),
    path('reenviar-activacion/', views.reenviar_activacion, name='reenviar_activacion'),
    path('verificar-email/<str:token>/', views.verificar_email_view, name='verificar_email'),
    path('login/', auth_views.LoginView.as_view(
        template_name='usuarios/login.html',
        authentication_form=TallerLoginForm
    ), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='usuarios/logout.html'), name='logout'),
    path('profile/', views.profile, name='profile'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('roles/', views.lista_roles, name='lista_roles'),
    path('roles/nuevo/', views.crear_rol, name='crear_rol'),
    path('usuarios/', views.lista_usuarios, name='lista_usuarios'),
    path('usuarios/<int:user_id>/asignar-rol/', views.asignar_rol, name='asignar_rol'),
    path('usuarios/<int:user_id>/toggle-estado/', views.toggle_estado_usuario, name='toggle_estado_usuario'),
    path('clientes/', views.lista_clientes, name='lista_clientes'),
    path('clientes/nuevo/', views.agregar_cliente, name='agregar_cliente'),
    path('clientes/editar/<int:cliente_id>/', views.editar_cliente, name='editar_cliente'),
    path('clientes/eliminar/<int:cliente_id>/', views.eliminar_cliente, name='eliminar_cliente'),
    # Panel de Configuración del Sistema (solo Admins)
    path('configuracion/', views.configuracion_sistema, name='configuracion_sistema'),
]