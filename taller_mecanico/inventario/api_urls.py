from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'productos', api_views.ProductoViewSet, basename='producto')
router.register(r'categorias', api_views.CategoriaViewSet, basename='categoria')
router.register(r'proveedores-mini', api_views.ProveedorMiniViewSet, basename='proveedor-mini')
router.register(r'proveedores', api_views.ProveedorViewSet, basename='proveedor')
router.register(r'movimientos', api_views.MovimientoInventarioViewSet, basename='movimiento')
router.register(r'alertas', api_views.AlertaInventarioViewSet, basename='alerta')
router.register(r'ordenes-compra', api_views.OrdenCompraViewSet, basename='orden-compra')
router.register(r'cuentas-pagar', api_views.CuentaProveedorViewSet, basename='cuenta-pagar')
router.register(r'precios-proveedor', api_views.PrecioProveedorViewSet, basename='precio-proveedor')

urlpatterns = [
    path('', include(router.urls)),
    path('resumen/', api_views.InventarioResumenAPI.as_view(), name='api_inventario_resumen'),
]
