from django.urls import path
from . import api_views

urlpatterns = [
    path('kanban/', api_views.KanbanBoardView.as_view(), name='api_taller_kanban'),
    path('orden/<int:orden_id>/', api_views.DetalleOrdenView.as_view(), name='api_taller_detalle_orden'),
    path('orden/<int:orden_id>/mover/', api_views.ActualizarEstadoOrdenView.as_view(), name='api_taller_mover_orden'),
    path('orden/<int:orden_id>/diagnostico/', api_views.ActualizarDiagnosticoView.as_view(), name='api_taller_diagnostico_orden'),
    path('orden/<int:orden_id>/repuesto/', api_views.AgregarRepuestoView.as_view(), name='api_taller_agregar_repuesto'),
    path('inventario/buscar/', api_views.BuscarInventarioView.as_view(), name='api_taller_buscar_inventario'),
    # Reportes
    path('reportes/utilidades/', api_views.ReporteUtilidadesView.as_view(), name='api_reporte_utilidades'),
]
