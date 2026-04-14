from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .api_serializers import UserSerializer
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework import generics
from django.contrib.auth.models import User
from .api_serializers import ClienteSerializer
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

from rest_framework import viewsets, status
from rest_framework.decorators import action

class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminOrSecretariaPermission] 

    def get_queryset(self):
        return User.objects.filter(
            perfil__rol__nombre__iexact='cliente'
        ).order_by('-date_joined')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.get_full_name() or instance.username
        try:
            from django.db.models.deletion import ProtectedError, RestrictedError
            instance.delete()
            return Response({'message': f'Cliente {nombre} eliminado correctamente.'}, status=status.HTTP_200_OK)
        except (ProtectedError, RestrictedError) as e:
            return Response(
                {'error': f'No se puede eliminar a {nombre} porque tiene registros en el sistema (como Facturas u Órdenes pagadas). Usa la opción deshabilitar en su lugar.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def toggle_estado(self, request, pk=None):
        cliente = self.get_object()
        
        if cliente.id == request.user.id:
            return Response({'error': 'No puedes deshabilitar tu propia cuenta activa.'}, status=status.HTTP_400_BAD_REQUEST)
            
        cliente.is_active = not cliente.is_active
        cliente.save()
        return Response({'is_active': cliente.is_active, 'message': 'Estado modificado.'}, status=status.HTTP_200_OK)