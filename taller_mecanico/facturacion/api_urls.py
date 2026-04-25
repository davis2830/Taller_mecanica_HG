from django.urls import path
from . import api_views

urlpatterns = [
    path('configuracion/', api_views.ConfiguracionFacturacionView.as_view(), name='api_facturacion_config'),
    path('documentos/<int:doc_id>/xml/', api_views.DocumentoXMLAPIView.as_view(), name='api_documento_xml'),
    # ── Cuentas por Cobrar (B2B) ──
    path('reportes/cuentas-por-cobrar/', api_views.CuentasPorCobrarReporteAPIView.as_view(), name='api_cxc_reporte'),
    path('empresas/<int:empresa_id>/estado-cuenta/', api_views.EmpresaEstadoCuentaAPIView.as_view(), name='api_empresa_estado_cuenta'),
    path('pagos/<int:pago_id>/', api_views.PagoFacturaDetailAPIView.as_view(), name='api_pago_detalle'),
    # ── Lista y detalle ──
    path('', api_views.ListaFacturasAPIView.as_view(), name='api_facturacion_lista'),
    path('<int:factura_id>/', api_views.FacturaDetailAPIView.as_view(), name='api_facturacion_detalle'),
    path('<int:factura_id>/certificar/', api_views.FacturaCertificarAPIView.as_view(), name='api_facturacion_certificar'),
    path('<int:factura_id>/anular/', api_views.FacturaAnularAPIView.as_view(), name='api_facturacion_anular'),
    path('<int:factura_id>/documentos/', api_views.FacturaDocumentosAPIView.as_view(), name='api_facturacion_documentos'),
    path('<int:factura_id>/reenviar-correo/', api_views.FacturaReenviarCorreoAPIView.as_view(), name='api_facturacion_reenviar'),
    path('<int:factura_id>/asignar-credito/', api_views.FacturaAsignarCreditoAPIView.as_view(), name='api_facturacion_asignar_credito'),
    path('<int:factura_id>/pagos/', api_views.FacturaPagosAPIView.as_view(), name='api_facturacion_pagos'),
]
