from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.db import transaction
from .api_serializers import UserSerializer, ClienteSerializer
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

class RegistroUsuarioView(APIView):
    permission_classes = [] 

    @transaction.atomic
    def post(self, request):
        from .forms import UserRegisterForm
        from .models import Rol, Perfil
        from django.contrib.sites.shortcuts import get_current_site
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.contrib.auth.tokens import default_token_generator
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings

        # Reutilizamos el form original para mantener las validaciones nativas de User
        form = UserRegisterForm(request.data)
        if form.is_valid():
            try:
                user = form.save(commit=True)
                
                # Crear Perfil si no existe (algunos signals pueden fallar en rest)
                try:
                    perfil = user.perfil
                except Perfil.DoesNotExist:
                    rol_cliente, _ = Rol.objects.get_or_create(
                        nombre='Cliente',
                        defaults={'descripcion': 'Usuario que solicita servicios'}
                    )
                    Perfil.objects.create(
                        usuario=user,
                        rol=rol_cliente
                    )

                # Generar el enlace
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)

                mail_subject = 'Activa tu cuenta en AutoServi Pro'
                message = render_to_string('usuarios/email_activacion.html', {
                    'user': user,
                    'base_url': settings.FRONTEND_URL.rstrip('/'),
                    'uid': uid,
                    'token': token,
                })
                
                # Usar Celery de forma sincrónica o standard mail
                send_mail(
                    mail_subject,
                    "", # mensaje plano vacío
                    None,
                    [form.cleaned_data.get('email')],
                    html_message=message,
                    fail_silently=False,
                )

                return Response({
                    'success': True,
                    'message': '¡Tu cuenta ha sido creada con éxito! Por favor revisa tu correo para activarla.'
                }, status=status.HTTP_201_CREATED)

            except Exception as e:
                # Rollback se maneja mediante transaction.atomic si levantamos una excepción, o devolvemos error
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Format custom dictionary of errors
            errors = {}
            for field, err_list in form.errors.items():
                errors[field] = err_list[0]
            return Response({'error': 'Errores de validación', 'details': errors}, status=status.HTTP_400_BAD_REQUEST)