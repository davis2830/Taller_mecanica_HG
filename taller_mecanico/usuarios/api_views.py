from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .api_serializers import UserSerializer
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework import generics
from django.contrib.auth.models import User
from .api_serializers import ClienteListSerializer
from .permisos import es_admin_o_secretaria 

class IsAdminOrSecretariaPermission(BasePermission):
    message = "No tienes permiso para ver el directorio de clientes."
    
    def has_permission(self, request, view):
        return es_admin_o_secretaria(request.user)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

# Importamos tu función personalizada
from .permisos import es_admin_o_secretaria

# 1. Creamos el "Envoltorio" (Wrapper) para DRF
class IsAdminOrSecretariaPermission(BasePermission):
    message = "No tienes permiso para ver el directorio de clientes."
    
    def has_permission(self, request, view):
        # Usamos tu función para validar
        return es_admin_o_secretaria(request.user)

# 2. Creamos la vista de la API
class ClienteListView(generics.ListAPIView):
    serializer_class = ClienteListSerializer
    # Aplicamos la clase de permiso que acabamos de crear
    permission_classes = [IsAdminOrSecretariaPermission] 

    def get_queryset(self):
        # Filtramos para que SOLO devuelva usuarios con rol "Cliente"
        # Esto evita que aparezcan los mecánicos o secretarias en esta tabla
        return User.objects.filter(
            perfil__rol__nombre__iexact='cliente'
        ).order_by('-date_joined')