# citas/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Vehiculo, Cita, TipoServicio, Notificacion, RecepcionVehiculo
from .forms import VehiculoForm, CitaForm, FechaHoraDisponibleForm, GestionCitaForm, RecepcionVehiculoForm, TipoServicioForm
from django.utils import timezone
import datetime
from django.core.mail import send_mail
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db.models import Q
from django.db import transaction
from usuarios.models import Perfil

def es_staff(user):
    if not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    try:
        perfil = Perfil.objects.get(usuario=user)
        return perfil.rol and perfil.rol.nombre in ['Administrador', 'Mecánico', 'Recepcionista', 'Recepción']
    except (Perfil.DoesNotExist, AttributeError):
        return False

# Vistas para vehículos
@login_required
def lista_vehiculos(request):
    es_staff_user = es_staff(request.user)
    
    if es_staff_user:
        vehiculos = Vehiculo.objects.select_related('propietario').all().order_by('-fecha_registro')
    else:
        vehiculos = Vehiculo.objects.filter(propietario=request.user).order_by('-fecha_registro')
        
    query = request.GET.get('q', '').strip()
    if query:
        from django.db.models import Q
        if es_staff_user:
            vehiculos = vehiculos.filter(
                Q(placa__icontains=query) | 
                Q(marca__icontains=query) | 
                Q(modelo__icontains=query) |
                Q(propietario__first_name__icontains=query) |
                Q(propietario__last_name__icontains=query) |
                Q(propietario__username__icontains=query) |
                Q(propietario__email__icontains=query)
            )
        else:
            vehiculos = vehiculos.filter(
                Q(placa__icontains=query) | 
                Q(marca__icontains=query) | 
                Q(modelo__icontains=query)
            )
            
    return render(request, 'citas/lista_vehiculos.html', {
        'vehiculos': vehiculos,
        'es_staff': es_staff_user,
        'query': query
    })

@login_required
def agregar_vehiculo(request):
    if request.method == 'POST':
        form = VehiculoForm(request.POST, user=request.user)
        if form.is_valid():
            vehiculo = form.save(commit=False)
            
            # Si el usuario NO es staff, forzosamente atarlo a él. 
            # Si es staff, el `propietario` viaja en el `vehiculo` desde el form.
            if not es_staff(request.user):
                vehiculo.propietario = request.user
            elif getattr(vehiculo, 'propietario', None) is None:
                vehiculo.propietario = request.user
                
            vehiculo.save()
            messages.success(request, 'Vehículo agregado correctamente.')
            return redirect('lista_vehiculos')
    else:
        form = VehiculoForm(user=request.user)
    
    return render(request, 'citas/agregar_vehiculo.html', {'form': form})

@login_required
def editar_vehiculo(request, vehiculo_id):
    if es_staff(request.user):
        vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id)
    else:
        vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id, propietario=request.user)
    
    if request.method == 'POST':
        form = VehiculoForm(request.POST, instance=vehiculo, user=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Vehículo actualizado correctamente.')
            return redirect('lista_vehiculos')
    else:
        form = VehiculoForm(instance=vehiculo, user=request.user)
    
    return render(request, 'citas/editar_vehiculo.html', {'form': form, 'vehiculo': vehiculo})

@login_required
def eliminar_vehiculo(request, vehiculo_id):
    if es_staff(request.user):
        vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id)
    else:
        vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id, propietario=request.user)
    
    if request.method == 'POST':
        vehiculo.delete()
        messages.success(request, 'Vehículo eliminado correctamente.')
        return redirect('lista_vehiculos')
    
    return render(request, 'citas/eliminar_vehiculo.html', {'vehiculo': vehiculo})

# Vistas para citas
@login_required
def mis_citas(request):
    if es_staff(request.user):
        # El staff (Mecánico/Recepción/Admin) no necesita "Mis Citas", su panel central es el Calendario
        return redirect('calendario_citas')
    
    citas = Cita.objects.select_related('vehiculo', 'servicio').filter(cliente=request.user).order_by('-fecha', 'hora_inicio')
    return render(request, 'citas/mis_citas.html', {'citas': citas})

@login_required
def seleccionar_fecha_hora(request):
    """Vista para seleccionar la fecha y ver horarios disponibles"""
    if request.method == 'POST':
        form = FechaHoraDisponibleForm(request.POST)
        if form.is_valid():
            fecha = form.cleaned_data['fecha']
            categoria = form.cleaned_data['categoria_servicio']
            
            # Redirigir a la página para crear la cita
            return redirect('nueva_cita', fecha=fecha.strftime('%Y-%m-%d'), categoria=categoria)
    else:
        form = FechaHoraDisponibleForm()
    
    return render(request, 'citas/seleccionar_fecha_hora.html', {'form': form})

@login_required
def horas_disponibles(request):
    """API para obtener horas disponibles en una fecha específica"""
    fecha_str = request.GET.get('fecha')
    categoria = request.GET.get('categoria')
    
    if not fecha_str or not categoria:
        return JsonResponse({'error': 'Parámetros incompletos'}, status=400)
    
    try:
        fecha = datetime.datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Formato de fecha inválido'}, status=400)
    
    # Verificar que la fecha no sea en el pasado
    if fecha < datetime.date.today():
        return JsonResponse({'error': 'No se pueden agendar citas en fechas pasadas'}, status=400)
    
    # Horario de atención (8:00 AM a 5:00 PM)
    inicio_jornada = datetime.time(8, 0)  # 8:00 AM
    fin_jornada = datetime.time(17, 0)    # 5:00 PM
    
    # Intervalo de citas (cada 30 minutos)
    intervalo_minutos = 30
    
    # Generar todos los horarios posibles
    horarios_posibles = []
    hora_actual = inicio_jornada
    while hora_actual < fin_jornada:
        horarios_posibles.append(hora_actual)
        # Sumar intervalo_minutos
        hora_dt = datetime.datetime.combine(datetime.date.today(), hora_actual)
        hora_dt = hora_dt + datetime.timedelta(minutes=intervalo_minutos)
        hora_actual = hora_dt.time()
    
    # Obtener citas existentes en esa fecha y categoría
    citas_existentes = Cita.objects.filter(
        fecha=fecha,
        estado__in=['PENDIENTE', 'CONFIRMADA'],
        servicio__categoria=categoria
    )
    
    # Marcar horarios ocupados
    horarios_ocupados = set()
    for cita in citas_existentes:
        hora_inicio_cita = cita.hora_inicio
        hora_fin_cita = cita.hora_fin
        
        # Marcar como ocupados todos los horarios que se solapan con esta cita
        for horario in horarios_posibles:
            horario_dt = datetime.datetime.combine(datetime.date.today(), horario)
            horario_fin_dt = horario_dt + datetime.timedelta(minutes=intervalo_minutos)
            horario_fin = horario_fin_dt.time()
            
            # Si hay solapamiento, marcar como ocupado
            if hora_inicio_cita < horario_fin and hora_fin_cita > horario:
                horarios_ocupados.add(horario)
    
    # Filtrar solo horarios disponibles
    horarios_disponibles = [h for h in horarios_posibles if h not in horarios_ocupados]
    
    # Si es hoy, filtrar horarios que ya pasaron
    if fecha == datetime.date.today():
        hora_actual = datetime.datetime.now().time()
        horarios_disponibles = [h for h in horarios_disponibles if h > hora_actual]
    
    # Convertir a formato JSON compatible
    horarios_json = [{'hora': h.strftime('%H:%M'), 'valor': h.strftime('%H:%M')} 
                     for h in horarios_disponibles]
    
    return JsonResponse({'horarios': horarios_json})

@login_required
def nueva_cita(request, fecha, categoria):
    """Vista para crear una nueva cita"""
    try:
        fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        messages.error(request, 'Formato de fecha inválido.')
        return redirect('seleccionar_fecha_hora')
    
    # Verificar que el usuario tenga al menos un vehículo
    es_staff = request.user.is_superuser or (hasattr(request.user, 'perfil') and request.user.perfil.rol and request.user.perfil.rol.nombre in ['Administrador', 'Recepcionista', 'Recepción', 'Mecánico'])
    if not es_staff and not Vehiculo.objects.filter(propietario=request.user).exists():
        messages.warning(request, 'Debes registrar al menos un vehículo antes de agendar una cita.')
        return redirect('agregar_vehiculo')
    
    if request.method == 'POST':
        form = CitaForm(request.POST, user=request.user, categoria=categoria)
        if form.is_valid():
            cita = form.save(commit=False)
            # El cliente será el dueño del vehículo, no quien llena el formulario (para que el Admin no quede como cliente)
            cita.cliente = cita.vehiculo.propietario
            cita.fecha = fecha_obj  # Asegurar que se use la fecha seleccionada
            
            # Calcular la hora de fin basada en la duración del servicio
            inicio_dt = datetime.datetime.combine(
                fecha_obj, 
                cita.hora_inicio
            )
            fin_dt = inicio_dt + datetime.timedelta(minutes=cita.servicio.duracion)
            cita.hora_fin = fin_dt.time()
            
            try:
                cita.save()
                
                # Crear notificación de confirmación
                Notificacion.objects.create(
                    cita=cita,
                    tipo='CONFIRMACION',
                    mensaje=f'Su cita para {cita.servicio.nombre} ha sido agendada para el {cita.fecha} a las {cita.hora_inicio}.',
                    enviado=False  # Se marcará como enviado después del email
                )
                
                # Enviar email de confirmación (solicitud)
                from .utils import enviar_email_cita
                dominio = request.get_host()
                
                try:
                    cliente_email = cita.cliente.email if cita.cliente else None
                    if cliente_email and enviar_email_cita(cita, 'confirmacion', dominio=dominio):
                        # Marcar la notificación como enviada
                        notificacion = Notificacion.objects.filter(
                            cita=cita,
                            tipo='CONFIRMACION'
                        ).first()
                        if notificacion:
                            notificacion.enviado = True
                            notificacion.save()
                        
                        messages.success(request, f'Cita agendada correctamente. Se ha enviado una confirmación de correo electrónico al cliente ({cliente_email}).')
                    else:
                        messages.success(request, 'Cita agendada correctamente.')
                        if not cliente_email:
                            if es_staff:
                                messages.info(request, 'El cliente no tiene email registrado; no se envió confirmación por correo.')
                            else:
                                messages.info(request, 'No tienes email registrado. Por favor actualiza tu perfil para recibir confirmaciones.')
                        
                except Exception as e:
                    print(f"Error al enviar email de confirmación: {e}")
                    messages.success(request, 'Cita agendada correctamente.')
                    messages.warning(request, 'No se pudo enviar la confirmación por email.')
                
                return redirect('mis_citas')
                
            except ValidationError as e:
                for error in e.messages:
                    messages.error(request, error)
            except Exception as e:
                messages.error(request, f'Error al agendar la cita: {str(e)}')
    else:
        # Inicializar el formulario con la fecha seleccionada
        form = CitaForm(
            initial={'fecha': fecha_obj},
            user=request.user,
            categoria=categoria
        )
    
    context = {
        'form': form,
        'fecha': fecha_obj,
        'categoria': dict(TipoServicio.CATEGORIAS).get(categoria, categoria),
        'categoria_key': categoria
    }
    return render(request, 'citas/nueva_cita.html', context)

def confirmar_cita_email(request, token):
    """
    Vista que recibe un clic desde el correo electrónico
    para confirmar una cita en estado Pendiente.
    """
    from django.core.signing import Signer, BadSignature
    signer = Signer()
    
    try:
        cita_id = signer.unsign(token)
        cita = get_object_or_404(Cita, id=cita_id)
        
        if cita.estado == 'PENDIENTE':
            cita.estado = 'CONFIRMADA'
            cita.save()
            messages.success(request, f'¡Excelente! Tu cita para {cita.servicio.nombre} ha sido confirmada.')
        elif cita.estado == 'CONFIRMADA':
            messages.info(request, 'Tu cita ya se encontraba confirmada previamente. ¡Te esperamos!')
        else:
            messages.warning(request, f'Tu cita se encuentra en estado: {cita.get_estado_display()} y ya no puede ser confirmada.')
            
    except BadSignature:
        messages.error(request, 'El enlace de confirmación es inválido o está corrupto.')
        
    return redirect('mis_citas') if request.user.is_authenticated else redirect('login')

@login_required
def detalle_cita(request, cita_id):
    """Vista para ver detalles de una cita"""
    cita = get_object_or_404(Cita, id=cita_id)
    
    # Verificar que el usuario es el dueño de la cita o es staff
    if cita.cliente != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para ver esta cita.')
        return redirect('mis_citas')
    
    return render(request, 'citas/detalle_cita.html', {'cita': cita})

@login_required
@transaction.atomic
def cancelar_cita(request, cita_id):
    """Vista para cancelar una cita"""
    cita = get_object_or_404(Cita, id=cita_id)
    
    # Verificar que el usuario tenga permisos (Dueño de la cita o Staff/Mecánico)
    if cita.cliente != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para cancelar esta cita.')
        return redirect('mis_citas')
    
    # Solo se pueden cancelar citas pendientes o confirmadas
    if cita.estado not in ['PENDIENTE', 'CONFIRMADA']:
        messages.error(request, 'No se puede cancelar una cita que ya ha sido completada o cancelada.')
        return redirect('mis_citas')
    
    if request.method == 'POST':
        cita.estado = 'CANCELADA'
        cita.save()
        
        # Crear notificación
        Notificacion.objects.create(
            cita=cita,
            tipo='CAMBIO_ESTADO',
            mensaje=f'Su cita para {cita.servicio.nombre} del {cita.fecha} a las {cita.hora_inicio} ha sido cancelada.',
            enviado=False
        )
        
        messages.success(request, 'Cita cancelada correctamente.')
        return redirect('mis_citas')
    
    return render(request, 'citas/cancelar_cita.html', {'cita': cita})

# Vistas para personal (admin, mecánicos, recepcionistas)
@login_required
def calendario_citas(request):
    """Vista de calendario para ver todas las citas"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    # Filtrar por datos
    fecha = request.GET.get('fecha')
    categoria = request.GET.get('categoria')
    estado = request.GET.get('estado')
    
    # N+1 Optimization + Orden
    citas = Cita.objects.select_related('cliente', 'vehiculo', 'servicio').all().order_by('fecha', 'hora_inicio')
    
    if fecha:
        try:
            fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
            citas = citas.filter(fecha=fecha_obj)
        except ValueError:
            messages.error(request, 'Formato de fecha inválido.')
    
    if categoria:
        citas = citas.filter(servicio__categoria=categoria)
        
    if estado:
        citas = citas.filter(estado=estado)
    else:
        # Default: Ocultar canceladas en la Master Agenda
        citas = citas.exclude(estado='CANCELADA')
    
    return render(request, 'citas/calendario_citas.html', {
        'citas': citas,
        'fecha_filtro': fecha,
        'categoria_filtro': categoria,
        'estado_filtro': estado,
    })

@login_required
@transaction.atomic
def gestionar_cita(request, cita_id):
    """Vista para que el personal gestione una cita"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    cita = get_object_or_404(Cita, id=cita_id)
    # IMPORTANTE: capturar estado desde BD antes de que el form lo mute en memoria
    estado_anterior_bd = Cita.objects.values_list('estado', flat=True).get(pk=cita.pk)
    
    # Detectar si existe mecánico del Kanban (fuente de verdad)
    mecanico_kanban = None
    try:
        orden = cita.orden_trabajo
        if orden and orden.mecanico_asignado:
            mecanico_kanban = orden.mecanico_asignado
    except Exception:
        pass

    if request.method == 'POST':
        form = GestionCitaForm(request.POST, instance=cita)
        if form.is_valid():
            cita = form.save(commit=False)

            # ── Fuente de verdad única del mecánico ──
            # Si hay mecánico del Kanban, ese siempre gana (ignoramos lo que
            # envió el form para evitar discrepancias entre historial y cita).
            # Si NO hay mecánico del Kanban, usamos lo que eligió la secretaria.
            if mecanico_kanban:
                cita.atendida_por = mecanico_kanban
            elif not cita.atendida_por:
                # Fallback: asignar al usuario actual si es mecánico/admin
                from usuarios.permisos import es_admin_o_mecanico
                if es_admin_o_mecanico(request.user):
                    cita.atendida_por = request.user

            cita.save()

            # Propagar a la orden de trabajo si no tenía mecánico
            try:
                orden = cita.orden_trabajo
                if orden and not orden.mecanico_asignado and cita.atendida_por:
                    from taller.models import OrdenTrabajo
                    OrdenTrabajo.objects.filter(pk=orden.pk).update(
                        mecanico_asignado=cita.atendida_por
                    )
            except Exception:
                pass

            # Si cambió el estado, crear notificación y enviar email
            if estado_anterior_bd != cita.estado:
                Notificacion.objects.create(
                    cita=cita,
                    tipo='CAMBIO_ESTADO',
                    mensaje=f'Su cita para {cita.servicio.nombre} ha cambiado de estado a {cita.get_estado_display()}.',
                    enviado=False
                )
                from .utils import enviar_email_cita
                try:
                    if cita.cliente.email:
                        print(f"[Email] Estado nuevo: {cita.estado} | Email del cliente: {cita.cliente.email}")
                        if cita.estado == 'COMPLETADA':
                            enviado = enviar_email_cita(cita, 'encuesta')
                            print(f"[Email] Encuesta enviada: {enviado}")
                        else:
                            enviado = enviar_email_cita(cita, 'cambio_estado')
                            print(f"[Email] cambio_estado enviado: {enviado}")
                        if enviado:
                            notificacion = Notificacion.objects.filter(
                                cita=cita, tipo='CAMBIO_ESTADO'
                            ).last()
                            if notificacion:
                                notificacion.enviado = True
                                notificacion.save()
                except Exception as e:
                    print(f"[Email ERROR] {e}")

            messages.success(request, 'Cita actualizada correctamente.')
            return redirect('calendario_citas')
    else:
        # ── GET: pre-poblar mecánico ──
        if not cita.atendida_por:
            if mecanico_kanban:
                cita.atendida_por = mecanico_kanban
            else:
                from usuarios.permisos import es_admin_o_mecanico
                if es_admin_o_mecanico(request.user):
                    cita.atendida_por = request.user
        form = GestionCitaForm(instance=cita)

    return render(request, 'citas/gestionar_cita.html', {
        'form': form,
        'cita': cita,
        'mecanico_kanban': mecanico_kanban,  # Para bloquear el campo en el template
    })

# Vistas para tipos de servicio
@login_required
def lista_servicios(request):
    """Vista para listar todos los tipos de servicio"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    servicios = TipoServicio.objects.all()
    return render(request, 'citas/lista_servicios.html', {'servicios': servicios})

@login_required
def agregar_servicio(request):
    """Vista para agregar un nuevo tipo de servicio"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        descripcion = request.POST.get('descripcion')
        duracion = request.POST.get('duracion')
        precio = request.POST.get('precio')
        categoria = request.POST.get('categoria')
        
        try:
            TipoServicio.objects.create(
                nombre=nombre,
                descripcion=descripcion,
                duracion=duracion,
                precio=precio,
                categoria=categoria
            )
            messages.success(request, 'Servicio agregado correctamente.')
            return redirect('lista_servicios')
        except Exception as e:
            messages.error(request, f'Error al agregar servicio: {e}')
    
    return render(request, 'citas/agregar_servicio.html', {'categorias': TipoServicio.CATEGORIAS})

@login_required
def editar_servicio(request, servicio_id):
    """Vista para editar un tipo de servicio"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    servicio = get_object_or_404(TipoServicio, id=servicio_id)
    
    if request.method == 'POST':
        servicio.nombre = request.POST.get('nombre')
        servicio.descripcion = request.POST.get('descripcion')
        servicio.duracion = request.POST.get('duracion')
        servicio.precio = request.POST.get('precio')
        servicio.categoria = request.POST.get('categoria')
        
        try:
            servicio.save()
            messages.success(request, 'Servicio actualizado correctamente.')
            return redirect('lista_servicios')
        except Exception as e:
            messages.error(request, f'Error al actualizar servicio: {e}')
    
    return render(request, 'citas/editar_servicio.html', {
        'servicio': servicio,
        'categorias': TipoServicio.CATEGORIAS
    })

@login_required
def eliminar_servicio(request, servicio_id):
    """Vista para eliminar un tipo de servicio"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
    
    servicio = get_object_or_404(TipoServicio, id=servicio_id)
    
    if request.method == 'POST':
        servicio.delete()
        messages.success(request, 'Servicio eliminado correctamente.')
    return render(request, 'citas/eliminar_servicio.html', {'servicio': servicio})

# =======================================================================
# HOJA DE RECEPCIÓN (CHECK-IN) E HISTORIAL CLÍNICO
# =======================================================================

@login_required
def nueva_recepcion(request, vehiculo_id=None, cita_id=None):
    """Vista para crear una nueva Boleta de Recepción (Check-in)"""
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')
        
    initial_data = {}
    vehiculo_obj = None
    cita_obj = None
    
    if vehiculo_id:
        vehiculo_obj = get_object_or_404(Vehiculo, id=vehiculo_id)
        initial_data['vehiculo'] = vehiculo_obj
        
    if cita_id:
        cita_obj = get_object_or_404(Cita, id=cita_id)
        initial_data['cita'] = cita_obj
        if not vehiculo_obj and cita_obj.vehiculo:
            initial_data['vehiculo'] = cita_obj.vehiculo
            vehiculo_obj = cita_obj.vehiculo

    if request.method == 'POST':
        form = RecepcionVehiculoForm(request.POST)
        if form.is_valid():
            recepcion = form.save(commit=False)
            recepcion.recibido_por = request.user
            recepcion.save()
            messages.success(request, 'Vehículo recibido y boleta creada con éxito.')
            # Redirigir a la vista de impresión o detalle de esta recepción
            return redirect('boleta_ingreso_pdf', recepcion_id=recepcion.id)
    else:
        form = RecepcionVehiculoForm(initial=initial_data)
        
    context = {
        'form': form,
        'vehiculo': vehiculo_obj,
        'cita': cita_obj
    }
    return render(request, 'citas/nueva_recepcion.html', context)

@login_required
def historial_vehiculo(request, vehiculo_id):
    """Ver la clínica y listado histórico de intervenciones de un vehículo"""
    vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id)
    
    # Validar permisos: Dueño o staff
    if vehiculo.propietario != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para ver este vehículo.')
        return redirect('dashboard')
        
    # Obtener recepciones (Ingresos al taller)
    recepciones = vehiculo.recepciones.all().order_by('-fecha_ingreso')
    
    # Obtener citas pasadas del carro
    citas_historicas = vehiculo.citas.filter(estado__in=['COMPLETADA']).order_by('-fecha')
    
    context = {
        'vehiculo': vehiculo,
        'recepciones': recepciones,
        'citas_historicas': citas_historicas,
    }
    return render(request, 'citas/historial_vehiculo.html', context)

@login_required
def boleta_ingreso_pdf(request, recepcion_id):
    """Vista diseñada para ser impresa físicamente o mostrada en pantalla para firma"""
    recepcion = get_object_or_404(RecepcionVehiculo, id=recepcion_id)
    
    # Validar permisos: Dueño o staff
    if recepcion.vehiculo.propietario != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso.')
        return redirect('dashboard')
        
    return render(request, 'citas/boleta_ingreso_pdf.html', {'recepcion': recepcion})

# ==========================================
# RUTAS DE SERVICIOS
# ==========================================
from django.contrib.auth.decorators import user_passes_test

@login_required
@user_passes_test(es_staff)
def lista_servicios(request):
    servicios = TipoServicio.objects.all().order_by('categoria', 'nombre')
    return render(request, 'citas/lista_servicios.html', {'servicios': servicios})

@login_required
@user_passes_test(es_staff)
def agregar_servicio(request):
    if request.method == 'POST':
        form = TipoServicioForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Servicio agregado exitosamente.')
            return redirect('lista_servicios')
    else:
        form = TipoServicioForm()
    
    return render(request, 'citas/agregar_servicio.html', {
        'form': form, 
        'categorias': TipoServicio.CATEGORIAS
    })

@login_required
@user_passes_test(es_staff)
def editar_servicio(request, servicio_id):
    servicio = get_object_or_404(TipoServicio, id=servicio_id)
    
    if request.method == 'POST':
        form = TipoServicioForm(request.POST, instance=servicio)
        if form.is_valid():
            form.save()
            messages.success(request, 'Servicio actualizado correctamente.')
            return redirect('lista_servicios')
    else:
        form = TipoServicioForm(instance=servicio)
        
    return render(request, 'citas/editar_servicio.html', {
        'form': form, 
        'servicio': servicio, 
        'categorias': TipoServicio.CATEGORIAS
    })

@login_required
@user_passes_test(es_staff)
def eliminar_servicio(request, servicio_id):
    servicio = get_object_or_404(TipoServicio, id=servicio_id)
    
    if request.method == 'POST':
        try:
            servicio.delete()
            messages.success(request, 'Servicio eliminado correctamente.')
        except:
            messages.error(request, 'No se pudo eliminar el servicio porque ya está asociado a citas existentes.')
            
        return redirect('lista_servicios')
        
    return render(request, 'citas/eliminar_servicio.html', {'servicio': servicio})