from django.urls import path
from . import api_views

urlpatterns = [
    path('configuracion/', api_views.ConfiguracionFacturacionView.as_view(), name='api_facturacion_config'),
    path('documentos/<int:doc_id>/xml/', api_views.DocumentoXMLAPIView.as_view(), name='api_documento_xml'),
    path('', api_views.ListaFacturasAPIView.as_view(), name='api_facturacion_lista'),
    path('<int:factura_id>/', api_views.FacturaDetailAPIView.as_view(), name='api_facturacion_detalle'),
    path('<int:factura_id>/certificar/', api_views.FacturaCertificarAPIView.as_view(), name='api_facturacion_certificar'),
    path('<int:factura_id>/anular/', api_views.FacturaAnularAPIView.as_view(), name='api_facturacion_anular'),
    path('<int:factura_id>/documentos/', api_views.FacturaDocumentosAPIView.as_view(), name='api_facturacion_documentos'),
    path('<int:factura_id>/reenviar-correo/', api_views.FacturaReenviarCorreoAPIView.as_view(), name='api_facturacion_reenviar'),
]
