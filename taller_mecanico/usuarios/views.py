# usuarios/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth.decorators import user_passes_test
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings

from .forms import UserRegisterForm, UserUpdateForm, PerfilUpdateForm, RolForm, AsignarRolForm
from .models import Rol, Perfil

def _redirect_spa_login(request, query=''):
    """
    Redirige al login del SPA React. Si FRONTEND_URL no está configurado,
    cae al login de Django como último recurso (no debería pasar en runtime).
    `query` se concatena al final, ej. '?verificado=true'.
    """
    base = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    if base:
        return redirect(f"{base}/login{query}")
    # Fallback: si no está FRONTEND_URL, intentamos construirla con el host de
    # la request (útil cuando el SPA está servido detrás del mismo origen).
    return redirect(f"{request.build_absolute_uri('/').rstrip('/')}/login{query}")


def es_admin(user):
    if not user.is_authenticated:
        return False
    # Los superusuarios siempre son considerados administradores
    if user.is_superuser:
        return True
    try:
        perfil = Perfil.objects.get(usuario=user)
        return perfil.rol and perfil.rol.nombre == 'Administrador'
    except (Perfil.DoesNotExist, AttributeError):
        return False

def register(request):
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            try:
                # Crear el usuario
                user = form.save()
                
                # Verificar si ya tiene perfil (por las señales)
                try:
                    perfil = user.perfil
                except Perfil.DoesNotExist:
                    # Si no tiene perfil, crearlo manualmente
                    rol_cliente, _ = Rol.objects.get_or_create(
                        nombre='Cliente',
                        defaults={'descripcion': 'Usuario que solicita servicios'}
                    )
                    
                    Perfil.objects.create(
                        usuario=user,
                        rol=rol_cliente
                    )
                
                # Enviar correo de activación con Token criptográfico
                from django.urls import reverse
                from taller_mecanico.email_helpers import get_email_context
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                activar_path = reverse('activar_cuenta', kwargs={'uidb64': uid, 'token': token})
                ctx = get_email_context({
                    'user': user,
                    'base_url': (settings.FRONTEND_URL or '').rstrip('/'),
                    'activar_url': activar_path,
                })
                mail_subject = f"Activa tu cuenta en {ctx['marca']['nombre_empresa']}"
                message = render_to_string('usuarios/email_activacion.html', ctx)
                
                send_mail(
                    mail_subject,
                    "", # mensaje original en texto plano
                    None, # usa DEFAULT_FROM_EMAIL
                    [form.cleaned_data.get('email')],
                    html_message=message,
                    fail_silently=False,
                )
                
                nombre = form.cleaned_data.get('first_name', '') or form.cleaned_data.get('email', '')
                messages.success(request, f'¡Casi listo {nombre}! Te hemos enviado un correo electrónico. Por favor revisa tu bandeja de entrada o SPAM para poder iniciar sesión.')
                return _redirect_spa_login(request)
                
            except Exception as e:
                # Si hay error, eliminar el usuario creado para evitar inconsistencias
                if 'user' in locals():
                    user.delete()
                messages.error(request, f'Error al crear la cuenta: {str(e)}')
    else:
        form = UserRegisterForm()
    return render(request, 'usuarios/register.html', {'form': form})

def activar_cuenta(request, uidb64, token):
    """Descifra el token del correo electrónico y activa al usuario si es válido"""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except(TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        messages.success(request, '¡Felicidades! Tu cuenta ha sido activada y verificada exitosamente. Ya puedes iniciar sesión.')
        return _redirect_spa_login(request, '?verificado=true')
    else:
        messages.error(request, '⚠️ El enlace de activación es inválido o ya expiró por seguridad. Intenta registrar tu cuenta de nuevo.')
        return _redirect_spa_login(request, '?verificado=error')

def reenviar_activacion(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        if email:
            try:
                user = User.objects.get(email=email)
                if getattr(user, 'is_active', False):
                    messages.info(request, 'Esta cuenta ya se encuentra activa. Puedes iniciar sesión.')
                    return _redirect_spa_login(request)
                
                # Re-enviar correo de activación
                from django.urls import reverse
                from taller_mecanico.email_helpers import get_email_context
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                activar_path = reverse('activar_cuenta', kwargs={'uidb64': uid, 'token': token})
                ctx = get_email_context({
                    'user': user,
                    'base_url': (settings.FRONTEND_URL or '').rstrip('/'),
                    'activar_url': activar_path,
                })
                mail_subject = f"Activa tu cuenta en {ctx['marca']['nombre_empresa']}"
                message = render_to_string('usuarios/email_activacion.html', ctx)
                
                send_mail(
                    mail_subject,
                    "", # mensaje original en texto plano
                    None, # usa DEFAULT_FROM_EMAIL
                    [email],
                    html_message=message,
                    fail_silently=False,
                )
                
                messages.success(request, f'¡Enlace reenviado! Hemos enviado un nuevo correo a {email}. Por favor revisa tu bandeja de entrada o SPAM.')
                return _redirect_spa_login(request)
            except User.DoesNotExist:
                messages.error(request, 'No se encontró ninguna cuenta registrada con este correo electrónico.')
        else:
            messages.error(request, 'Por favor ingresa un correo electrónico válido.')
            
    return render(request, 'usuarios/reenviar_activacion.html')

@login_required
def profile(request):
    # Asegurar que el usuario tenga un perfil
    try:
        perfil = request.user.perfil
    except Perfil.DoesNotExist:
        # Crear perfil si no existe
        rol_cliente, _ = Rol.objects.get_or_create(
            nombre='Cliente',
            defaults={'descripcion': 'Usuario que solicita servicios'}
        )
        perfil = Perfil.objects.create(
            usuario=request.user,
            rol=rol_cliente
        )
    
    if request.method == 'POST':
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = PerfilUpdateForm(request.POST, instance=perfil)
        
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            messages.success(request, 'Tu perfil ha sido actualizado!')
            return redirect('profile')
    else:
        u_form = UserUpdateForm(instance=request.user)
        p_form = PerfilUpdateForm(instance=perfil)
    
    context = {
        'u_form': u_form,
        'p_form': p_form,
    }
    return render(request, 'usuarios/profile.html', context)

@login_required
@user_passes_test(es_admin)
def crear_rol(request):
    if request.method == 'POST':
        form = RolForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Rol creado exitosamente!')
            return redirect('lista_roles')
    else:
        form = RolForm()
    return render(request, 'usuarios/rol_form.html', {'form': form})

@login_required
@user_passes_test(es_admin)
def lista_roles(request):
    roles = Rol.objects.all()
    return render(request, 'usuarios/lista_roles.html', {'roles': roles})

@login_required
@user_passes_test(es_admin)
def lista_usuarios(request):
    from django.db.models import Count
    usuarios = User.objects.select_related('perfil__rol').all().order_by('id')
    # Conteos precisos por rol para los chips de estadísticas
    conteos = {
        'total': usuarios.count(),
        'admin': usuarios.filter(perfil__rol__nombre='Administrador').count(),
        'recepcionista': usuarios.filter(perfil__rol__nombre='Recepcionista').count(),
        'mecanico': usuarios.filter(perfil__rol__nombre='Mec\u00e1nico').count(),
        'cliente': usuarios.filter(perfil__rol__nombre='Cliente').count(),
        'sin_rol': usuarios.filter(perfil__rol__isnull=True).count(),
    }
    return render(request, 'usuarios/lista_usuarios.html', {
        'usuarios': usuarios,
        'conteos': conteos,
    })

@login_required
@user_passes_test(es_admin)
def asignar_rol(request, user_id):
    usuario = get_object_or_404(User, id=user_id)
    perfil, created = Perfil.objects.get_or_create(usuario=usuario)
    
    if request.method == 'POST':
        form = AsignarRolForm(request.POST, instance=perfil)
        if form.is_valid():
            form.save()
            messages.success(request, f'Rol asignado a {usuario.username} correctamente!')
            return redirect('lista_usuarios')
    else:
        form = AsignarRolForm(instance=perfil)
    
    return render(request, 'usuarios/asignar_rol.html', {'form': form, 'usuario': usuario})
    return render(request, 'usuarios/asignar_rol.html', {'form': form, 'usuario': usuario})

# =======================================================
# DIRECTORIO DE CLIENTES (Para Staff)
# =======================================================
@login_required
def lista_clientes(request):
    # Validar permisos
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista', 'Mecánico'])
    if not es_staff:
        messages.error(request, 'No tienes permiso para acceder al Directorio de Clientes.')
        return redirect('dashboard')
        
    clientes = User.objects.filter(perfil__rol__nombre='Cliente').order_by('-date_joined')
    return render(request, 'usuarios/lista_clientes.html', {'clientes': clientes})

@login_required
def agregar_cliente(request):
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista'])
    if not es_staff:
        messages.error(request, 'No tienes permiso para registrar clientes.')
        return redirect('dashboard')
        
    if request.method == 'POST':
        from .forms import ClienteRapidoForm
        form = ClienteRapidoForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            email = form.cleaned_data.get('email')
            
            # Generar username inteligente y único
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
                
            user.username = username
            user.set_unusable_password() # El usuario no ingresará web hasta pedir reset de password
            user.save()
            
            # Signal autogenera Perfil y Rol 'Cliente'. Actualizamos el teléfono.
            telefono = form.cleaned_data.get('telefono')
            if telefono and hasattr(user, 'perfil'):
                perfil = user.perfil
                perfil.telefono = telefono
                perfil.save()
                
            messages.success(request, f'Cliente {user.get_full_name()} registrado exitosamente en el directorio.')
            return redirect('lista_clientes')
    else:
        from .forms import ClienteRapidoForm
        form = ClienteRapidoForm()
        
    return render(request, 'usuarios/agregar_cliente.html', {'form': form})

@login_required
def editar_cliente(request, cliente_id):
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista'])
    if not es_staff:
        messages.error(request, 'No tienes permiso para editar clientes.')
        return redirect('lista_clientes')
        
    cliente = get_object_or_404(User, id=cliente_id, perfil__rol__nombre='Cliente')
    
    if request.method == 'POST':
        from .forms import ClienteRapidoForm
        form = ClienteRapidoForm(request.POST, instance=cliente)
        if form.is_valid():
            user = form.save()
            telefono = form.cleaned_data.get('telefono')
            if telefono and hasattr(user, 'perfil'):
                perfil = user.perfil
                perfil.telefono = telefono
                perfil.save()
            elif not telefono and hasattr(user, 'perfil'):
                perfil = user.perfil
                perfil.telefono = ''
                perfil.save()
                
            messages.success(request, f'Cliente {user.get_full_name()} actualizado exitosamente.')
            return redirect('lista_clientes')
    else:
        from .forms import ClienteRapidoForm
        initial_data = {}
        if hasattr(cliente, 'perfil') and cliente.perfil.telefono:
            initial_data['telefono'] = cliente.perfil.telefono
        form = ClienteRapidoForm(instance=cliente, initial=initial_data)
        
    return render(request, 'usuarios/editar_cliente.html', {'form': form, 'cliente': cliente})

@login_required
def eliminar_cliente(request, cliente_id):
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista'])
    if not es_staff:
        messages.error(request, 'No tienes permiso para eliminar clientes.')
        return redirect('lista_clientes')
        
    cliente = get_object_or_404(User, id=cliente_id, perfil__rol__nombre='Cliente')
    
    if request.method == 'POST':
        nombre = cliente.get_full_name() or cliente.username
        try:
            from django.db.models.deletion import ProtectedError, RestrictedError
            cliente.delete()
            messages.success(request, f'Cliente {nombre} eliminado correctamente. Todos sus registros asociados también fueron borrados.')
        except (ProtectedError, RestrictedError) as e:
            messages.error(request, f'No se puede eliminar a {nombre} porque tiene registros en el sistema (como Facturas u Órdenes pagadas) que no pueden ser borrados por seguridad contable u operativa. Si no deseas verlo, considera deshabilitar su cuenta.')
        return redirect('lista_clientes')
        
    return redirect('lista_clientes')

@login_required
def toggle_estado_usuario(request, user_id):
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista'])
    if not es_staff:
        messages.error(request, 'No tienes permiso para modificar el estado de los usuarios.')
        return redirect(request.META.get('HTTP_REFERER', 'dashboard'))
        
    usuario = get_object_or_404(User, id=user_id)
    
    if request.method == 'POST':
        # Prevenir que un usuario se deshabilite a sí mismo
        if usuario.id == request.user.id:
            messages.error(request, 'No puedes deshabilitar tu propia cuenta activa.')
            return redirect(request.META.get('HTTP_REFERER', 'dashboard'))
            
        usuario.is_active = not usuario.is_active
        usuario.save()
        
        estado = "habilitado" if usuario.is_active else "deshabilitado"
        nombre = usuario.get_full_name() or usuario.username
        messages.success(request, f'El usuario {nombre} ha sido {estado} exitosamente.')
        
    return redirect(request.META.get('HTTP_REFERER', 'lista_clientes'))


@login_required
def dashboard(request):
    from django.utils import timezone
    from django.db.models import Count, Sum, Q, F
    from citas.models import Cita, Vehiculo, TipoServicio
    from inventario.models import Producto, AlertaInventario, MovimientoInventario

    # ─── Perfil ───
    try:
        perfil = request.user.perfil
    except Perfil.DoesNotExist:
        rol_cliente, _ = Rol.objects.get_or_create(
            nombre='Cliente',
            defaults={'descripcion': 'Usuario que solicita servicios'}
        )
        perfil = Perfil.objects.create(
            usuario=request.user,
            rol=rol_cliente
        )

    hoy = timezone.localdate()
    es_staff = (
        request.user.is_superuser
        or (hasattr(request.user, 'perfil') and request.user.perfil.rol
            and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista', 'Mecánico'])
    )

    # ─── Citas ───
    if es_staff:
        citas_hoy        = Cita.objects.filter(fecha=hoy).count()
        citas_pendientes = Cita.objects.filter(estado='PENDIENTE').count()
        citas_confirmadas= Cita.objects.filter(estado='CONFIRMADA').count()
        citas_completadas_hoy = Cita.objects.filter(fecha=hoy, estado='COMPLETADA').count()
        proximas_citas   = Cita.objects.filter(
            fecha__gte=hoy, estado__in=['PENDIENTE', 'CONFIRMADA']
        ).select_related('cliente', 'vehiculo', 'servicio').order_by('fecha', 'hora_inicio')[:5]
    else:
        citas_hoy        = Cita.objects.filter(fecha=hoy, cliente=request.user).count()
        citas_pendientes = Cita.objects.filter(cliente=request.user, estado='PENDIENTE').count()
        citas_confirmadas= Cita.objects.filter(cliente=request.user, estado='CONFIRMADA').count()
        citas_completadas_hoy = Cita.objects.filter(fecha=hoy, cliente=request.user, estado='COMPLETADA').count()
        proximas_citas   = Cita.objects.filter(
            cliente=request.user, fecha__gte=hoy, estado__in=['PENDIENTE', 'CONFIRMADA']
        ).select_related('vehiculo', 'servicio').order_by('fecha', 'hora_inicio')[:5]

    # ─── Vehículos ───
    mis_vehiculos = Vehiculo.objects.filter(propietario=request.user).count()

    # ─── Inventario (solo staff) ───
    total_productos    = 0
    productos_stock_bajo = 0
    alertas_activas    = 0
    ultimos_movimientos = []
    total_usuarios     = 0
    total_roles        = 0
    total_servicios    = 0

    if es_staff:
        total_productos      = Producto.objects.filter(activo=True).count()
        productos_stock_bajo = Producto.objects.filter(
            activo=True, stock_actual__lte=F('stock_minimo')
        ).count()
        alertas_activas      = AlertaInventario.objects.filter(activa=True).count()
        ultimos_movimientos  = MovimientoInventario.objects.select_related(
            'producto', 'usuario'
        ).order_by('-fecha')[:6]

        if (request.user.is_superuser
                or (hasattr(request.user, 'perfil') and request.user.perfil.rol
                    and request.user.perfil.rol.nombre == 'Administrador')):
            total_usuarios  = User.objects.count()
            total_roles     = Rol.objects.count()

        total_servicios = TipoServicio.objects.count()

    context = {
        'title': 'Dashboard',
        # Citas
        'citas_hoy':            citas_hoy,
        'citas_pendientes':     citas_pendientes,
        'citas_confirmadas':    citas_confirmadas,
        'citas_completadas_hoy': citas_completadas_hoy,
        'proximas_citas':       proximas_citas,
        # Vehículos
        'mis_vehiculos':        mis_vehiculos,
        # Inventario
        'total_productos':      total_productos,
        'productos_stock_bajo': productos_stock_bajo,
        'alertas_activas':      alertas_activas,
        'ultimos_movimientos':  ultimos_movimientos,
        # Admin
        'total_usuarios':       total_usuarios,
        'total_roles':          total_roles,
        'total_servicios':      total_servicios,
        # Flags
        'es_staff':             es_staff,
    }
    return render(request, 'usuarios/dashboard.html', context)

@login_required
def lista_roles(request):
    # Verificar si el usuario es administrador
    if not es_admin(request.user):
        messages.error(request, 'No tienes permisos para acceder a esta sección.')
        return redirect('dashboard')
    
    roles = Rol.objects.all()
    return render(request, 'usuarios/lista_roles.html', {'roles': roles})

@login_required
def crear_rol(request):
    # Verificar si el usuario es administrador
    if not es_admin(request.user):
        messages.error(request, 'No tienes permisos para acceder a esta sección.')
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = RolForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Rol creado exitosamente!')
            return redirect('lista_roles')
    else:
        form = RolForm()
    return render(request, 'usuarios/rol_form.html', {'form': form})

@login_required
def lista_usuarios(request):
    # Verificar si el usuario es administrador
    if not es_admin(request.user):
        messages.error(request, 'No tienes permisos para acceder a esta sección.')
        return redirect('dashboard')
    
    usuarios = User.objects.all()
    return render(request, 'usuarios/lista_usuarios.html', {'usuarios': usuarios})

@login_required
def asignar_rol(request, user_id):
    # Verificar si el usuario es administrador
    if not es_admin(request.user):
        messages.error(request, 'No tienes permisos para acceder a esta sección.')
        return redirect('dashboard')
    
    usuario = get_object_or_404(User, id=user_id)
    perfil, created = Perfil.objects.get_or_create(usuario=usuario)
    
    if request.method == 'POST':
        form = AsignarRolForm(request.POST, instance=perfil)
        if form.is_valid():
            form.save()
            messages.success(request, f'Rol asignado a {usuario.username} correctamente!')
            return redirect('lista_usuarios')
    else:
        form = AsignarRolForm(instance=perfil)
    
    return render(request, 'usuarios/asignar_rol.html', {'form': form, 'usuario': usuario})


# =====================================================================
# PANEL DE CONFIGURACIÓN DEL SISTEMA (Solo Administradores)
# =====================================================================

@login_required
@user_passes_test(es_admin)
def configuracion_sistema(request):
    """
    Vista para editar las variables de entorno del sistema (.env).
    IMPORTANTE: Solo accesible por usuarios Administradores.
    Los cambios requieren reiniciar el servidor para aplicar.
    """
    from pathlib import Path
    from django.conf import settings
    import os

    env_path = Path(settings.BASE_DIR) / '.env'

    def parse_env(path):
        """Lee el archivo .env y retorna un diccionario de clave-valor."""
        env_vars = {}
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, _, value = line.partition('=')
                        env_vars[key.strip()] = value.strip()
        return env_vars

    def write_env(path, data):
        """Escribe los cambios al archivo .env preservando los comentarios del encabezado."""
        header = """# =====================================================================
# AUTOSERVI PRO — Archivo de Variables de Entorno
# =====================================================================
# IMPORTANTE:
# - Este archivo NO debe subirse a Git o compartirse públicamente.
# - Contiene credenciales sensibles del sistema.
# =====================================================================

"""
        with open(path, 'w', encoding='utf-8') as f:
            f.write(header)
            f.write("# --- Seguridad y Django ---\n")
            for key in ['SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS', 'FRONTEND_URL']:
                if key in data:
                    f.write(f"{key}={data[key]}\n")
            f.write("\n# --- Base de Datos ---\n")
            for key in ['DB_ENGINE', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']:
                if key in data:
                    f.write(f"{key}={data[key]}\n")
            f.write("\n# --- Correo Electrónico (SMTP) ---\n")
            for key in ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USE_TLS', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'DEFAULT_FROM_EMAIL']:
                if key in data:
                    f.write(f"{key}={data[key]}\n")

    if request.method == 'POST':
        env_data = parse_env(env_path)
        
        # Actualizar con los valores del formulario
        campos = [
            'SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS', 'FRONTEND_URL',
            'DB_ENGINE', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT',
            'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USE_TLS', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'DEFAULT_FROM_EMAIL',
        ]
        for campo in campos:
            val = request.POST.get(campo, '').strip()
            if val:
                env_data[campo] = val

        write_env(env_path, env_data)
        messages.success(request, '✅ Configuración guardada exitosamente en el archivo .env. Recuerda reiniciar el servidor para que los cambios surtan efecto.')
        return redirect('configuracion_sistema')

    env_data = parse_env(env_path)
    return render(request, 'usuarios/configuracion_sistema.html', {'env': env_data})

# ===========================================================================
# Verificación de cambio de correo (vista Django, no React)
# ===========================================================================
# El correo de confirmación se envía con un link que apunta a esta vista
# (no al SPA), porque el SPA puede no estar montado en la misma URL que el
# backend. Esta vista hace la verificación y renderiza una página HTML
# autocontenida con un mensaje de éxito o error.

def verificar_email_view(request, token):
    """
    Vista pública que confirma un cambio de email cuando el usuario abre
    el link enviado al email nuevo. No requiere auth.
    """
    from django.utils import timezone
    from django.http import HttpResponse
    from .models import Perfil

    perfil = Perfil.objects.filter(email_token=token).first() if token else None

    estado = 'ok'
    titulo = 'Correo confirmado'
    mensaje = ''

    if not perfil:
        estado = 'error'
        titulo = 'Link inválido'
        mensaje = 'Este link no es válido o ya fue usado.'
    elif perfil.email_token_expira and perfil.email_token_expira < timezone.now():
        perfil.email_token = ''
        perfil.email_pendiente = ''
        perfil.email_token_expira = None
        perfil.save()
        estado = 'error'
        titulo = 'Link expirado'
        mensaje = 'El link expiró. Solicita el cambio nuevamente desde tu perfil.'
    elif not perfil.email_pendiente:
        estado = 'error'
        titulo = 'Sin cambio pendiente'
        mensaje = 'No hay un cambio de correo pendiente para esta cuenta.'
    elif User.objects.filter(email__iexact=perfil.email_pendiente).exclude(pk=perfil.usuario_id).exists():
        estado = 'error'
        titulo = 'Correo en uso'
        mensaje = 'Ese correo ya está usado por otra cuenta. Solicita el cambio con un correo diferente.'
    else:
        nuevo = perfil.email_pendiente
        u = perfil.usuario
        u.email = nuevo
        u.save()
        perfil.email_pendiente = ''
        perfil.email_token = ''
        perfil.email_token_expira = None
        perfil.save()
        mensaje = f'Tu correo se actualizó a {nuevo}. Ya puedes iniciar sesión usándolo.'

    color_principal = '#10b981' if estado == 'ok' else '#dc2626'
    icono = '✓' if estado == 'ok' else '✗'

    # Link al login del frontend React. Usamos FRONTEND_URL configurado en
    # `.env`; si no está, fallback al mismo host de la request (lo cual
    # funciona si el SPA está servido en la misma URL del backend).
    frontend = getattr(settings, 'FRONTEND_URL', '').rstrip('/') or request.build_absolute_uri('/').rstrip('/')
    login_url = f"{frontend}/login"

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>{titulo} — AutoServiPro</title>
        <style>
            body {{
                margin: 0; min-height: 100vh; display: flex;
                align-items: center; justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f8fafc; color: #0f172a; padding: 16px;
            }}
            .card {{
                background: #fff; max-width: 460px; width: 100%;
                border-radius: 16px; padding: 40px 32px;
                box-shadow: 0 10px 40px rgba(15,23,42,0.08);
                text-align: center; border: 1px solid #e2e8f0;
            }}
            .icon {{
                width: 72px; height: 72px; border-radius: 50%;
                background: {color_principal}; color: #fff;
                font-size: 38px; font-weight: 800; line-height: 72px;
                margin: 0 auto 18px;
            }}
            h1 {{ font-size: 22px; margin: 0 0 12px; }}
            p {{ color: #475569; line-height: 1.55; margin: 0 0 24px; }}
            a.btn {{
                display: inline-block; background: #0f766e; color: #fff;
                text-decoration: none; padding: 11px 22px; border-radius: 9px;
                font-weight: 600; font-size: 14px;
            }}
            a.btn:hover {{ background: #0e6b63; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">{icono}</div>
            <h1>{titulo}</h1>
            <p>{mensaje}</p>
            <a class="btn" href="{login_url}">Ir al login</a>
        </div>
    </body>
    </html>
    """
    status_code = 200 if estado == 'ok' else 400
    return HttpResponse(html, status=status_code)
