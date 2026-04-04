from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_facturas, name='lista_facturas'),
    path('generar/<int:orden_id>/', views.generar_pre_factura, name='generar_pre_factura'),
    path('emitir/<int:factura_id>/', views.emitir_factura, name='emitir_factura'),
    path('imprimir/<int:factura_id>/', views.factura_print, name='factura_print'),
]
