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

from .forms import UserRegisterForm, UserUpdateForm, PerfilUpdateForm, RolForm, AsignarRolForm
from .models import Rol, Perfil

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
                current_site = get_current_site(request)
                mail_subject = 'Activa tu cuenta en AutoServi Pro'
                message = render_to_string('usuarios/email_activacion.html', {
                    'user': user,
                    'domain': current_site.domain,
                    'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                    'token': default_token_generator.make_token(user),
                })
                
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
                return redirect('login')
                
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
        return redirect('login')
    else:
        messages.error(request, '⚠️ El enlace de activación es inválido o ya expiró por seguridad. Intenta registrar tu cuenta de nuevo.')
        return redirect('login')

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
    usuarios = User.objects.all()
    return render(request, 'usuarios/lista_usuarios.html', {'usuarios': usuarios})

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
            for key in ['SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS']:
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
            'SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS',
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