from django.urls import path
from . import api_views

urlpatterns = [
    path('dashboard/', api_views.DashboardView.as_view(), name='api_taller_dashboard'),
    path('kanban/', api_views.KanbanBoardView.as_view(), name='api_taller_kanban'),
    path('historial/', api_views.HistorialOrdenesView.as_view(), name='api_taller_historial'),
    path('vehiculo/<int:vehiculo_id>/historial/', api_views.HistorialVehiculoView.as_view(), name='api_taller_historial_vehiculo'),
    path('orden/<int:orden_id>/', api_views.DetalleOrdenView.as_view(), name='api_taller_detalle_orden'),
    path('orden/<int:orden_id>/mover/', api_views.ActualizarEstadoOrdenView.as_view(), name='api_taller_mover_orden'),
    path('orden/<int:orden_id>/diagnostico/', api_views.ActualizarDiagnosticoView.as_view(), name='api_taller_diagnostico_orden'),
    path('orden/<int:orden_id>/repuesto/', api_views.AgregarRepuestoView.as_view(), name='api_taller_agregar_repuesto'),
    path('orden/<int:orden_id>/repuesto/<int:rep_id>/', api_views.EliminarRepuestoView.as_view(), name='api_taller_eliminar_repuesto'),
    path('orden/<int:orden_id>/facturar/', api_views.ProcesarFacturaView.as_view(), name='api_taller_facturar'),
    path('orden/crear-desde-cita/<int:cita_id>/', api_views.CrearOrdenDesdeCitaView.as_view(), name='api_taller_crear_orden_cita'),
    path('inventario/buscar/', api_views.BuscarInventarioView.as_view(), name='api_taller_buscar_inventario'),
    # Reportes
    path('reportes/utilidades/', api_views.ReporteUtilidadesView.as_view(), name='api_reporte_utilidades'),
]

