from django.urls import path
from . import api_views

urlpatterns = [
    path('', api_views.ListaFacturasAPIView.as_view(), name='api_facturacion_lista'),
]
