# usuarios/urls.py
from django.urls import path
from django.shortcuts import redirect
from django.views.generic import RedirectView
from . import views

# Rutas legacy: apuntaban a vistas Django con templates HTML (login,
# register, logout, reenviar-activacion). El SPA React ahora maneja
# toda la UI de auth, así que estas URLs redirigen al SPA para preservar
# bookmarks y links viejos. Ver PR de limpieza legacy.
urlpatterns = [
    # Auth flows — todos redirigen al SPA.
    path('login/',                RedirectView.as_view(url='/login', permanent=True), name='login'),
    path('logout/',               RedirectView.as_view(url='/login', permanent=True), name='logout'),
    path('register/',             RedirectView.as_view(url='/register', permanent=True), name='register'),
    path('reenviar-activacion/',  RedirectView.as_view(url='/resend-activation', permanent=True), name='reenviar_activacion'),

    # La activación ahora vive en /api/v1/usuarios/activar/… para que
    # Nginx la proxee a Django. Redirigimos la URL legacy por si quedan
    # correos viejos con el enlace anterior.
    path('activar/<uidb64>/<token>/',
         lambda req, uidb64, token: redirect(f'/api/v1/usuarios/activar/{uidb64}/{token}/'),
         name='activar_cuenta'),
    path('verificar-email/<str:token>/',
         lambda req, token: redirect(f'/perfil/verificar-email/{token}'),
         name='verificar_email'),

    # Paneles server-side que todavía usa Django (SPA tiene sus propios
    # equivalentes pero no se limpian en este PR).
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
