from django.urls import path
from . import views

urlpatterns = [
    path('tablero/', views.tablero_kanban, name='tablero_kanban'),
    path('orden/<int:orden_id>/', views.detalle_orden, name='detalle_orden'),
    path('api/actualizar-estado/', views.actualizar_estado_orden, name='actualizar_estado_orden'),
    path('orden/quitar-repuesto/<int:repuesto_id>/', views.eliminar_repuesto_orden, name='eliminar_repuesto_orden'),
    path('orden/crear-desde-cita/<int:cita_id>/', views.crear_orden_desde_cita, name='crear_orden_desde_cita'),
]
