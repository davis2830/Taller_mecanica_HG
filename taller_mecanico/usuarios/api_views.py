from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.db import transaction
from .api_serializers import UserSerializer, ClienteSerializer, RolSerializer, EmpresaSerializer
from .permisos import es_admin_o_secretaria
from .models import Rol, Perfil, Empresa


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


# ─── Gestión de Usuarios (Admin) ─────────────────────────────────────────────
class IsAdminPermission(BasePermission):
    message = "Solo los administradores pueden realizar esta acción."
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff or
             (hasattr(request.user, 'perfil') and request.user.perfil.rol and
              request.user.perfil.rol.nombre == 'Administrador'))
        )

class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de usuarios para el panel de Sistema (solo Admins).
    GET /api/v1/usuarios/  → lista
    PATCH /api/v1/usuarios/{id}/ → editar rol
    DELETE /api/v1/usuarios/{id}/ → eliminar
    POST /api/v1/usuarios/{id}/toggle_estado/ → activar/desactivar
    POST /api/v1/usuarios/{id}/asignar_rol/ → cambiar rol
    """
    serializer_class = UserSerializer
    permission_classes = [IsAdminPermission]

    def get_queryset(self):
        return User.objects.select_related('perfil__rol').order_by('id')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response({'error': 'No puedes eliminar tu propia cuenta.'}, status=status.HTTP_400_BAD_REQUEST)
        nombre = instance.get_full_name() or instance.username
        try:
            from django.db.models.deletion import ProtectedError, RestrictedError
            instance.delete()
            return Response({'message': f'Usuario {nombre} eliminado.'}, status=status.HTTP_200_OK)
        except (ProtectedError, RestrictedError):
            return Response({'error': f'No se puede eliminar a {nombre} porque tiene registros vinculados.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def toggle_estado(self, request, pk=None):
        usuario = self.get_object()
        if usuario.id == request.user.id:
            return Response({'error': 'No puedes deshabilitarte a ti mismo.'}, status=status.HTTP_400_BAD_REQUEST)
        usuario.is_active = not usuario.is_active
        usuario.save()
        return Response({'is_active': usuario.is_active}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def asignar_rol(self, request, pk=None):
        usuario = self.get_object()
        rol_id = request.data.get('rol_id')
        try:
            # Usar update() directamente para evitar caché de instancia
            perfil, _ = Perfil.objects.get_or_create(usuario=usuario)
            if rol_id:
                rol = Rol.objects.get(id=rol_id)
                # Actualizar perfil con el nuevo rol
                Perfil.objects.filter(pk=perfil.pk).update(rol=rol)

                # Sincronizar is_staff: Administrador → staff, otros → no staff
                es_admin = rol.nombre == 'Administrador'
                User.objects.filter(pk=usuario.pk).update(is_staff=es_admin)
            else:
                Perfil.objects.filter(pk=perfil.pk).update(rol=None)
                User.objects.filter(pk=usuario.pk).update(is_staff=False)

            # Recargar el usuario fresco desde la DB (sin caché)
            usuario_fresco = User.objects.select_related('perfil__rol').get(pk=usuario.pk)
            return Response(UserSerializer(usuario_fresco).data)
        except Rol.DoesNotExist:
            return Response({'error': 'Rol no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# ─── Gestión de Roles (Admin) ─────────────────────────────────────────────────
class RolViewSet(viewsets.ModelViewSet):
    """
    CRUD de roles.
    GET    /api/v1/usuarios/roles/
    POST   /api/v1/usuarios/roles/
    PATCH  /api/v1/usuarios/roles/{id}/
    DELETE /api/v1/usuarios/roles/{id}/
    """
    queryset = Rol.objects.all().order_by('nombre')
    serializer_class = RolSerializer
    permission_classes = [IsAdminPermission]

    def list(self, request, *args, **kwargs):
        from django.db.models import Count
        roles = Rol.objects.annotate(total_usuarios=Count('perfil')).order_by('nombre')
        # Serialize manually adding total_usuarios
        data = []
        for r in roles:
            data.append({
                'id': r.id,
                'nombre': r.nombre,
                'descripcion': r.descripcion,
                'total_usuarios': r.total_usuarios,
            })
        return Response(data)

    def destroy(self, request, *args, **kwargs):
        rol = self.get_object()
        if Perfil.objects.filter(rol=rol).exists():
            return Response({'error': f'No se puede eliminar: hay usuarios con el rol "{rol.nombre}".'}, status=status.HTTP_400_BAD_REQUEST)
        rol.delete()
        return Response({'message': f'Rol "{rol.nombre}" eliminado.'}, status=status.HTTP_200_OK)

# ─── Empresas (Cuentas por Cobrar B2B) ────────────────────────────────────────
class EmpresaViewSet(viewsets.ModelViewSet):
    """
    CRUD de Empresas (clientes corporativos a crédito).

    GET    /api/v1/usuarios/empresas/
    POST   /api/v1/usuarios/empresas/
    GET    /api/v1/usuarios/empresas/{id}/
    PATCH  /api/v1/usuarios/empresas/{id}/
    DELETE /api/v1/usuarios/empresas/{id}/

    Permisos: Admin o Secretaria pueden listar/crear/editar.
    Eliminar: solo si no tiene facturas asociadas (para preservar histórico).
    """
    queryset = Empresa.objects.all().order_by('razon_social')
    serializer_class = EmpresaSerializer
    permission_classes = [IsAdminOrSecretariaPermission]

    def get_queryset(self):
        qs = Empresa.objects.all().order_by('razon_social')
        q = self.request.query_params.get('q', '').strip()
        activo = self.request.query_params.get('activo', '')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(razon_social__icontains=q) |
                Q(nombre_comercial__icontains=q) |
                Q(nit__icontains=q)
            )
        if activo in ('true', '1'):
            qs = qs.filter(activo=True)
        elif activo in ('false', '0'):
            qs = qs.filter(activo=False)
        return qs

    def destroy(self, request, *args, **kwargs):
        empresa = self.get_object()
        if empresa.facturas.exists():
            return Response(
                {
                    'error': (
                        f'No se puede eliminar "{empresa.razon_social}": tiene '
                        f'{empresa.facturas.count()} factura(s) asociada(s). '
                        f'Márcala como inactiva en su lugar.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        nombre = empresa.razon_social
        empresa.delete()
        return Response({'message': f'Empresa "{nombre}" eliminada.'}, status=status.HTTP_200_OK)
