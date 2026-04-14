from django.urls import path
from . import api_views

urlpatterns = [
    path('me/', api_views.CurrentUserView.as_view(), name='api_current_user'),
    path('clientes/', api_views.ClienteListView.as_view(), name='api_clientes_list'),
]
