import secrets
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .api_serializers import (
    UserSerializer, ClienteSerializer, RolSerializer,
    EmpresaSerializer, TareaProgramadaSerializer, MiPerfilSerializer,
)
from .permisos import es_admin_o_secretaria
from .models import Rol, Perfil, Empresa, TareaProgramada


class IsAdminOrSecretariaPermission(BasePermission):
    message = "No tienes permiso para ver el directorio de clientes."
    
    def has_permission(self, request, view):
        return es_admin_o_secretaria(request.user)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


# ===========================================================================
# MI PERFIL — el usuario logueado edita sus propios datos
# ===========================================================================

class MiPerfilView(APIView):
    """
    GET   /api/v1/usuarios/me/  → datos del usuario logueado
    PATCH /api/v1/usuarios/me/  → editar nombre/apellido/tel/dirección/datos fiscales
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        Perfil.objects.get_or_create(usuario=request.user)
        ser = MiPerfilSerializer(request.user, context={'request': request})
        return Response(ser.data)

    def patch(self, request):
        Perfil.objects.get_or_create(usuario=request.user)
        ser = MiPerfilSerializer(
            request.user, data=request.data, partial=True,
            context={'request': request},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class MiPerfilAvatarView(APIView):
    """
    POST   /api/v1/usuarios/me/avatar/   → subir / reemplazar (multipart)
    DELETE /api/v1/usuarios/me/avatar/   → eliminar
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({'error': 'Falta el archivo `avatar`.'}, status=status.HTTP_400_BAD_REQUEST)
        f = request.FILES['avatar']
        if f.size > 2 * 1024 * 1024:
            return Response({'error': 'La imagen no puede pesar más de 2 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
        perfil.avatar = f
        perfil.save()
        ser = MiPerfilSerializer(request.user, context={'request': request})
        return Response(ser.data)

    def delete(self, request):
        perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
        if perfil.avatar:
            perfil.avatar.delete(save=False)
            perfil.avatar = None
            perfil.save()
        ser = MiPerfilSerializer(request.user, context={'request': request})
        return Response(ser.data)


class MiPerfilCambiarPasswordView(APIView):
    """
    POST /api/v1/usuarios/me/cambiar-password/
    Body: { password_actual, password_nueva, password_nueva_confirm }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        actual = request.data.get('password_actual') or ''
        nueva = request.data.get('password_nueva') or ''
        confirm = request.data.get('password_nueva_confirm') or ''
        if not request.user.check_password(actual):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)
        if nueva != confirm:
            return Response({'error': 'Las contraseñas nuevas no coinciden.'}, status=status.HTTP_400_BAD_REQUEST)
        if nueva == actual:
            return Response({'error': 'La contraseña nueva debe ser distinta de la actual.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(nueva, user=request.user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(nueva)
        request.user.save()
        return Response({'detail': 'Contraseña actualizada. Tu sesión actual sigue activa.'})


class MiPerfilSolicitarCambioEmailView(APIView):
    """
    POST /api/v1/usuarios/me/email/solicitar/
    Body: { email_nuevo, password_actual }

    El cambio NO se aplica de inmediato. Se envía un link de
    verificación al email **nuevo**; hasta que el usuario clickee el
    link, `usuario.email` no cambia. Adicionalmente, se notifica al
    email **viejo** que se está realizando el cambio.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email_nuevo = (request.data.get('email_nuevo') or '').strip().lower()
        password_actual = request.data.get('password_actual') or ''

        if not email_nuevo:
            return Response({'error': 'Falta el correo nuevo.'}, status=status.HTTP_400_BAD_REQUEST)
        if email_nuevo == (request.user.email or '').strip().lower():
            return Response({'error': 'Ese ya es tu correo actual.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(password_actual):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email_nuevo).exclude(pk=request.user.pk).exists():
            return Response({'error': 'Ese correo ya está usado por otra cuenta.'}, status=status.HTTP_400_BAD_REQUEST)

        perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
        perfil.email_pendiente = email_nuevo
        perfil.email_token = secrets.token_urlsafe(48)
        perfil.email_token_expira = timezone.now() + timedelta(hours=24)
        perfil.save()

        # Construye el link contra el host del backend (mismo origen que está
        # usando el cliente). Esto evita problemas con FRONTEND_URL mal seteado
        # o entornos donde el SPA no maneja /perfil/verificar-email/* directo.
        from django.urls import reverse
        link = request.build_absolute_uri(
            reverse('verificar_email', args=[perfil.email_token])
        )
        # Encolamos los correos en Celery para que el request no bloquee y
        # haya reintentos automáticos si el SMTP falla temporalmente.
        from .tasks import (
            enviar_email_verificacion_cambio_correo_task,
            enviar_aviso_cambio_correo_task,
        )
        nombre = request.user.first_name or request.user.username
        enviar_email_verificacion_cambio_correo_task.delay(email_nuevo, nombre, link)
        if request.user.email:
            enviar_aviso_cambio_correo_task.delay(request.user.email, nombre, email_nuevo)

        return Response({
            'detail': f'Te enviamos un correo de verificación a {email_nuevo}. Tu correo actual no cambió hasta que confirmes.',
            'email_pendiente': email_nuevo,
        })


class VerificarEmailView(APIView):
    """
    POST /api/v1/usuarios/me/email/verificar/<token>/
    Aplica el cambio de email si el token es válido y no expiró.
    No requiere auth (el link se manda al correo).
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        perfil = Perfil.objects.filter(email_token=token).first()
        if not perfil or not token:
            return Response({'error': 'Link inválido o ya usado.'}, status=status.HTTP_400_BAD_REQUEST)
        if perfil.email_token_expira and perfil.email_token_expira < timezone.now():
            perfil.email_token = ''
            perfil.email_pendiente = ''
            perfil.email_token_expira = None
            perfil.save()
            return Response({'error': 'Link expirado. Solicita el cambio nuevamente.'}, status=status.HTTP_400_BAD_REQUEST)

        nuevo = perfil.email_pendiente
        if not nuevo:
            return Response({'error': 'No hay cambio de correo pendiente.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=nuevo).exclude(pk=perfil.usuario_id).exists():
            return Response({'error': 'Ese correo ya está usado por otra cuenta.'}, status=status.HTTP_400_BAD_REQUEST)

        u = perfil.usuario
        u.email = nuevo
        u.save()
        perfil.email_pendiente = ''
        perfil.email_token = ''
        perfil.email_token_expira = None
        perfil.save()
        return Response({'detail': 'Correo actualizado correctamente.', 'email': nuevo})


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

                from django.urls import reverse
                from taller_mecanico.email_helpers import get_email_context
                from taller_mecanico.url_helpers import tenant_backend_url
                activar_path = reverse('activar_cuenta', kwargs={'uidb64': uid, 'token': token})
                # `activar_cuenta` es una VISTA Django (server-side); usamos
                # BACKEND_URL para que el link funcione aunque FRONTEND_URL
                # apunte a otro host (ej. SPA en :5173).
                # En multi-tenant, ``tenant_backend_url`` devuelve la URL del
                # subdominio del tenant actual (ej. ``fixfast.autoservipro.com``).
                ctx = get_email_context({
                    'user': user,
                    'base_url': tenant_backend_url('/').rstrip('/'),
                    'activar_url': activar_path,
                })
                mail_subject = f"Activa tu cuenta en {ctx['marca']['nombre_empresa']}"
                message = render_to_string('usuarios/email_activacion.html', ctx)
                
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


# ─── Tareas Programadas ───────────────────────────────────────────────────────

class IsAdministradorPermission(BasePermission):
    """Acceso restringido a superusuario o usuario con rol 'Administrador'."""
    message = "Solo los administradores pueden gestionar las tareas programadas."

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser:
            return True
        rol = getattr(getattr(u, 'perfil', None), 'rol', None)
        return bool(rol and rol.nombre.lower() == 'administrador')


class TareaProgramadaViewSet(viewsets.ModelViewSet):
    """
    GET    /api/v1/usuarios/tareas-programadas/
    PATCH  /api/v1/usuarios/tareas-programadas/<id>/
    POST   /api/v1/usuarios/tareas-programadas/<id>/run-now/

    Solo PATCH y la action run-now están habilitados; create/destroy quedan
    bloqueados — las filas se siembran vía data-migration.
    """
    serializer_class = TareaProgramadaSerializer
    permission_classes = [IsAdministradorPermission]
    queryset = TareaProgramada.objects.all().order_by('nombre')
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def create(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las tareas se siembran vía migraciones.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las tareas no se eliminan; se deshabilitan.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def perform_update(self, serializer):
        tarea = serializer.save()
        # Reprograma el job en caliente con la nueva config.
        from .scheduler import apply_db_config
        apply_db_config(tarea.tarea_id)

    @action(detail=True, methods=['post'], url_path='run-now')
    def run_now(self, request, pk=None):
        tarea = self.get_object()
        from .scheduler import run_now
        try:
            run_now(tarea.tarea_id)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Refrescar para devolver ultima_ejecucion actualizada.
        tarea.refresh_from_db()
        return Response(self.get_serializer(tarea).data)
