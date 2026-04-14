from django.urls import path
from . import api_views

urlpatterns = [
    # Citas
    path('citas/calendario/', api_views.CalendarioCitasView.as_view(), name='api_citas_calendario'),
    path('citas/mis/', api_views.MisCitasView.as_view(), name='api_citas_mis'),
    path('citas/nueva/', api_views.NuevaCitaView.as_view(), name='api_citas_nueva'),
    path('citas/<int:pk>/cancelar/', api_views.CancelarCitaView.as_view(), name='api_citas_cancelar'),
    path('citas/vehiculos/', api_views.MisVehiculosView.as_view(), name='api_citas_vehiculos'),
    path('citas/servicios/', api_views.ServicioListView.as_view(), name='api_citas_servicios'),

    # Vehículos CRUD
    path('vehiculos/', api_views.VehiculosView.as_view(), name='api_vehiculos_list'),
    path('vehiculos/<int:pk>/', api_views.VehiculoDetailView.as_view(), name='api_vehiculo_detail'),
    path('vehiculos/<int:pk>/historial/', api_views.VehiculoHistorialView.as_view(), name='api_vehiculo_historial'),

    # Recepción
    path('recepciones/', api_views.RecepcionCreateView.as_view(), name='api_recepcion_list_create'),
    path('recepciones/<int:pk>/', api_views.RecepcionDetailView.as_view(), name='api_recepcion_detail'),

    # Clientes
    path('clientes/', api_views.ClientesListView.as_view(), name='api_clientes_list'),
]
