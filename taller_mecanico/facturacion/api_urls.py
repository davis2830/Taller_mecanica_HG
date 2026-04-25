from django.urls import path
from . import api_views

urlpatterns = [
    path('', api_views.ListaFacturasAPIView.as_view(), name='api_facturacion_lista'),
    path('<int:factura_id>/', api_views.FacturaDetailAPIView.as_view(), name='api_facturacion_detalle'),
    path('<int:factura_id>/reenviar-correo/', api_views.FacturaReenviarCorreoAPIView.as_view(), name='api_facturacion_reenviar'),
]
