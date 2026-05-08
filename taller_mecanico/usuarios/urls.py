# usuarios/urls.py
from django.urls import path
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

    # Vistas que SÍ se siguen usando: los enlaces de los emails apuntan
    # a estas URLs. NO borrar ni mover.
    path('activar/<uidb64>/<token>/', views.activar_cuenta, name='activar_cuenta'),
    path('verificar-email/<str:token>/', views.verificar_email_view, name='verificar_email'),

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
