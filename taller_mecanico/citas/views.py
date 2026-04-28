# citas/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.core.exceptions import ValidationError          # FIX #4 — antes faltaba este import
from django.core.paginator import Paginator                  # FIX #9 — paginación
from .models import Vehiculo, Cita, TipoServicio, Notificacion, RecepcionVehiculo
from .forms import VehiculoForm, CitaForm, FechaHoraDisponibleForm, GestionCitaForm, RecepcionVehiculoForm, TipoServicioForm
from .utils import enviar_email_cita                         # FIX #6 — import movido al top
from .tasks import enviar_correo_cita_task
from usuarios.models import Perfil
from usuarios.permisos import es_admin_o_mecanico            # FIX #6 — import movido al top
from django.utils import timezone
import datetime
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db.models import Q
from django.db import transaction


# ---------------------------------------------------------------------------
# FIX #2 — es_staff() con caché por request
# La versión anterior hacía Perfil.objects.get() en cada llamada (una query
# por vista). Ahora el resultado se cachea en el objeto user durante el
# request, de modo que llamadas sucesivas en la misma petición no tocan la BD.
# ---------------------------------------------------------------------------
def es_staff(user):
    if not user.is_authenticated:
        return False
    # Retornar desde caché si ya fue calculado en este request
    if hasattr(user, '_es_staff_cache'):
        return user._es_staff_cache
    if getattr(user, 'is_superuser', False):
        user._es_staff_cache = True
        return True
    try:
        perfil = Perfil.objects.get(usuario=user)
        resultado = bool(
            perfil.rol and perfil.rol.nombre in ['Administrador', 'Mecánico', 'Recepcionista', 'Recepción']
        )
    except (Perfil.DoesNotExist, AttributeError):
        resultado = False
    user._es_staff_cache = resultado
    return resultado


# ---------------------------------------------------------------------------
# FIX #8 — lógica de propagación de mecánico extraída de la vista
# Así gestionar_cita() delega la responsabilidad y queda más legible.
# ---------------------------------------------------------------------------
def _propagar_mecanico_a_orden(cita):
    """
    Si la cita tiene una OrdenTrabajo asociada sin mecánico asignado,
    propaga el mecánico de la cita a la orden.
    No lanza excepciones: errores se registran en consola.
    """
    try:
        orden = cita.orden_trabajo
        if orden and not orden.mecanico_asignado and cita.atendida_por:
            from taller.models import OrdenTrabajo          # import local: evita ciclo de imports
            OrdenTrabajo.objects.filter(pk=orden.pk).update(
                mecanico_asignado=cita.atendida_por
            )
    except Exception as e:
        print(f"[_propagar_mecanico_a_orden] {e}")


# ===========================================================================
# VEHÍCULOS
# ===========================================================================

@login_required
def lista_vehiculos(request):
    es_staff_user = es_staff(request.user)

    if es_staff_user:
        vehiculos = Vehiculo.objects.select_related('propietario').all().order_by('-fecha_registro')
    else:
        vehiculos = Vehiculo.objects.filter(propietario=request.user).order_by('-fecha_registro')

    query = request.GET.get('q', '').strip()
    if query:
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

    # FIX #9 — paginación: 20 vehículos por página
    paginator = Paginator(vehiculos, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'citas/lista_vehiculos.html', {
        'vehiculos': page_obj,          # ahora es un Page, compatible con el template existente
        'page_obj': page_obj,           # para los controles de paginación en el template
        'es_staff': es_staff_user,
        'query': query,
    })


@login_required
def agregar_vehiculo(request):
    if request.method == 'POST':
        form = VehiculoForm(request.POST, user=request.user)
        if form.is_valid():
            vehiculo = form.save(commit=False)
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


# ===========================================================================
# CITAS
# ===========================================================================

@login_required
def mis_citas(request):
    if es_staff(request.user):
        return redirect('calendario_citas')

    citas = Cita.objects.select_related('vehiculo', 'servicio').filter(
        cliente=request.user
    ).order_by('-fecha', 'hora_inicio')
    return render(request, 'citas/mis_citas.html', {'citas': citas})


@login_required
def seleccionar_fecha_hora(request):
    if request.method == 'POST':
        form = FechaHoraDisponibleForm(request.POST)
        if form.is_valid():
            fecha = form.cleaned_data['fecha']
            categoria = form.cleaned_data['categoria_servicio']
            return redirect('nueva_cita', fecha=fecha.strftime('%Y-%m-%d'), categoria=categoria)
    else:
        form = FechaHoraDisponibleForm()

    return render(request, 'citas/seleccionar_fecha_hora.html', {'form': form})


@login_required
def horas_disponibles(request):
    fecha_str = request.GET.get('fecha')
    categoria = request.GET.get('categoria')

    if not fecha_str or not categoria:
        return JsonResponse({'error': 'Parámetros incompletos'}, status=400)

    try:
        fecha = datetime.datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Formato de fecha inválido'}, status=400)

    if fecha < datetime.date.today():
        return JsonResponse({'error': 'No se pueden agendar citas en fechas pasadas'}, status=400)

    inicio_jornada = datetime.time(8, 0)
    fin_jornada = datetime.time(17, 0)
    intervalo_minutos = 30

    horarios_posibles = []
    hora_actual = inicio_jornada
    while hora_actual < fin_jornada:
        horarios_posibles.append(hora_actual)
        hora_dt = datetime.datetime.combine(datetime.date.today(), hora_actual)
        hora_dt += datetime.timedelta(minutes=intervalo_minutos)
        hora_actual = hora_dt.time()

    citas_existentes = Cita.objects.filter(
        fecha=fecha,
        estado__in=['PENDIENTE', 'CONFIRMADA'],
        servicio__categoria=categoria
    )

    horarios_ocupados = set()
    for cita in citas_existentes:
        for horario in horarios_posibles:
            horario_dt = datetime.datetime.combine(datetime.date.today(), horario)
            horario_fin = (horario_dt + datetime.timedelta(minutes=intervalo_minutos)).time()
            if cita.hora_inicio < horario_fin and cita.hora_fin > horario:
                horarios_ocupados.add(horario)

    horarios_disponibles = [h for h in horarios_posibles if h not in horarios_ocupados]

    if fecha == datetime.date.today():
        hora_ahora = datetime.datetime.now().time()
        horarios_disponibles = [h for h in horarios_disponibles if h > hora_ahora]

    horarios_json = [{'hora': h.strftime('%H:%M'), 'valor': h.strftime('%H:%M')}
                     for h in horarios_disponibles]

    return JsonResponse({'horarios': horarios_json})


@login_required
def nueva_cita(request, fecha, categoria):
    try:
        fecha_obj = datetime.datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        messages.error(request, 'Formato de fecha inválido.')
        return redirect('seleccionar_fecha_hora')

    # FIX #5 — la variable local se llamaba igual que la función global (shadowing).
    # Renombrada a `usuario_es_staff` para no ocultar es_staff().
    usuario_es_staff = es_staff(request.user)

    if not usuario_es_staff and not Vehiculo.objects.filter(propietario=request.user).exists():
        messages.warning(request, 'Debes registrar al menos un vehículo antes de agendar una cita.')
        return redirect('agregar_vehiculo')

    if request.method == 'POST':
        form = CitaForm(request.POST, user=request.user, categoria=categoria)
        if form.is_valid():
            cita = form.save(commit=False)
            cita.cliente = cita.vehiculo.propietario
            cita.fecha = fecha_obj

            inicio_dt = datetime.datetime.combine(fecha_obj, cita.hora_inicio)
            fin_dt = inicio_dt + datetime.timedelta(minutes=cita.servicio.duracion)
            cita.hora_fin = fin_dt.time()

            try:
                cita.save()

                Notificacion.objects.create(
                    cita=cita,
                    tipo='CONFIRMACION',
                    mensaje=(
                        f'Su cita para {cita.servicio.nombre} ha sido agendada '
                        f'para el {cita.fecha} a las {cita.hora_inicio}.'
                    ),
                    enviado=False
                )

                # Migrado a Tarea Asíncrona (Celery).
                # No gateamos por email: la tarea despacha también WhatsApp,
                # así que clientes con teléfono pero sin email igual reciben
                # la notificación. `enviar_email_cita` omite el correo
                # internamente cuando no hay email registrado.
                cliente_email = cita.cliente.email if cita.cliente else None
                if cita.cliente:
                    enviar_correo_cita_task.delay(cita.id, 'confirmacion')

                    # Como es asíncrono, daremos por hecho que Celery enviará la confirmación
                    # y marcamos la notificación de antemano para UX.
                    notificacion = Notificacion.objects.filter(cita=cita, tipo='CONFIRMACION').first()
                    if notificacion:
                        notificacion.enviado = True
                        notificacion.save()
                if cliente_email:
                    messages.success(request, f'Cita agendada correctamente. Confirmación enviada a {cliente_email}.')
                else:
                    messages.success(request, 'Cita agendada correctamente.')
                    if usuario_es_staff:
                        messages.info(request, 'El cliente no tiene email registrado; se intentará enviar confirmación por WhatsApp si está habilitado.')
                    else:
                        messages.info(request, 'No tienes email registrado. Actualiza tu perfil para recibir confirmaciones por correo.')

                return redirect('mis_citas')

            except ValidationError as e:           # FIX #4 — ahora sí está importada
                for error in e.messages:
                    messages.error(request, error)
            except Exception as e:
                messages.error(request, f'Error al agendar la cita: {str(e)}')
    else:
        form = CitaForm(
            initial={'fecha': fecha_obj},
            user=request.user,
            categoria=categoria
        )

    context = {
        'form': form,
        'fecha': fecha_obj,
        'categoria': dict(TipoServicio.CATEGORIAS).get(categoria, categoria),
        'categoria_key': categoria,
    }
    return render(request, 'citas/nueva_cita.html', context)


def confirmar_cita_email(request, token):
    """
    Endpoint público al que llega el cliente desde el correo de confirmación.
    Renderiza una página HTML autocontenida con el resultado y un botón que
    lleva al SPA React (FRONTEND_URL/citas) — NO redirige a vistas Django
    legacy.
    """
    from django.core.signing import Signer, BadSignature
    from django.conf import settings
    from django.http import HttpResponse
    from django.utils.html import escape
    signer = Signer()

    estado = 'ok'
    titulo = 'Cita confirmada'
    mensaje = ''

    try:
        cita_id = signer.unsign(token)
    except BadSignature:
        cita_id = None

    cita = Cita.objects.filter(id=cita_id).first() if cita_id else None

    if cita is None:
        # Token corrupto o cita eliminada después de enviar el correo. En
        # ambos casos queremos mostrar la página HTML autocontenida — NO la
        # 404 default de Django.
        estado = 'error'
        titulo = 'Enlace inválido'
        mensaje = 'El enlace de confirmación es inválido o ya expiró.'
    elif cita.estado == 'PENDIENTE':
        cita.estado = 'CONFIRMADA'
        cita.save()
        # Disparar evento `cita_confirmada` (correo + WhatsApp). Como ya
        # cambiamos `cita.estado` a CONFIRMADA, `_evento_para_tipo` lo
        # resuelve correctamente. Si Celery está caído, no rompemos la
        # confirmación visual al cliente — solo logueamos.
        try:
            enviar_correo_cita_task.delay(cita.id, 'confirmacion')
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                f"[magic-link] No se pudo encolar cita_confirmada para cita {cita.id}: {exc}"
            )
        titulo = '¡Cita confirmada!'
        mensaje = f'Tu cita para {cita.servicio.nombre} quedó confirmada. Te esperamos.'
    elif cita.estado == 'CONFIRMADA':
        titulo = 'Cita ya confirmada'
        mensaje = 'Tu cita ya se encontraba confirmada previamente. ¡Te esperamos!'
    else:
        estado = 'error'
        titulo = 'Cita no confirmable'
        mensaje = (
            f'Tu cita se encuentra en estado: {cita.get_estado_display()} '
            'y ya no puede ser confirmada.'
        )

    color_principal = '#10b981' if estado == 'ok' else '#dc2626'
    icono = '✓' if estado == 'ok' else '✗'

    # En estado 'ok' llevamos al usuario a su listado de citas.
    # En error, al inicio del SPA — el label "Ir al inicio" debe ir a "/".
    from taller_mecanico.url_helpers import spa_url
    cta_url = spa_url('/citas' if estado == 'ok' else '/', request=request)
    cta_label = 'Ver mis citas' if estado == 'ok' else 'Ir al inicio'

    # Escapar TODO valor que se interpole en el HTML. `titulo` y `mensaje`
    # contienen valores DB-source (cita.servicio.nombre, get_estado_display)
    # editables por staff — sin escape sería un stored XSS. `cta_url` viene
    # de FRONTEND_URL (settings) pero lo escapamos también por defensa en
    # profundidad. `color_principal` e `icono` son literales hardcoded.
    titulo_esc = escape(titulo)
    mensaje_esc = escape(mensaje)
    cta_url_esc = escape(cta_url)
    cta_label_esc = escape(cta_label)

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>{titulo_esc} — AutoServiPro</title>
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
            <h1>{titulo_esc}</h1>
            <p>{mensaje_esc}</p>
            <a class="btn" href="{cta_url_esc}">{cta_label_esc}</a>
        </div>
    </body>
    </html>
    """
    status_code = 200 if estado == 'ok' else 400
    return HttpResponse(html, status=status_code)


@login_required
def detalle_cita(request, cita_id):
    cita = get_object_or_404(Cita, id=cita_id)

    if cita.cliente != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para ver esta cita.')
        return redirect('mis_citas')

    return render(request, 'citas/detalle_cita.html', {'cita': cita})


@login_required
@transaction.atomic
def cancelar_cita(request, cita_id):
    cita = get_object_or_404(Cita, id=cita_id)

    if cita.cliente != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para cancelar esta cita.')
        return redirect('mis_citas')

    if cita.estado not in ['PENDIENTE', 'CONFIRMADA']:
        messages.error(request, 'No se puede cancelar una cita que ya ha sido completada o cancelada.')
        return redirect('mis_citas')

    if request.method == 'POST':
        cita.estado = 'CANCELADA'
        cita.save()

        Notificacion.objects.create(
            cita=cita,
            tipo='CAMBIO_ESTADO',
            mensaje=(
                f'Su cita para {cita.servicio.nombre} del {cita.fecha} '
                f'a las {cita.hora_inicio} ha sido cancelada.'
            ),
            enviado=False
        )

        messages.success(request, 'Cita cancelada correctamente.')
        return redirect('mis_citas')

    return render(request, 'citas/cancelar_cita.html', {'cita': cita})


# ===========================================================================
# VISTAS PARA PERSONAL (admin, mecánicos, recepcionistas)
# ===========================================================================

@login_required
def calendario_citas(request):
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')

    fecha = request.GET.get('fecha')
    categoria = request.GET.get('categoria')
    estado = request.GET.get('estado')

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
        citas = citas.exclude(estado='CANCELADA')

    # FIX #9 — paginación: 25 citas por página
    paginator = Paginator(citas, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'citas/calendario_citas.html', {
        'citas': page_obj,
        'page_obj': page_obj,
        'fecha_filtro': fecha,
        'categoria_filtro': categoria,
        'estado_filtro': estado,
    })


@login_required
@transaction.atomic
def gestionar_cita(request, cita_id):
    if not es_staff(request.user):
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')

    cita = get_object_or_404(Cita, id=cita_id)
    estado_anterior_bd = Cita.objects.values_list('estado', flat=True).get(pk=cita.pk)

    # Detectar mecánico del Kanban (fuente de verdad)
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

            # Fuente de verdad única del mecánico
            if mecanico_kanban:
                cita.atendida_por = mecanico_kanban
            elif not cita.atendida_por:
                if es_admin_o_mecanico(request.user):       # FIX #6 — ya importado al top
                    cita.atendida_por = request.user

            cita.save()

            # FIX #8 — propagación extraída a función auxiliar
            _propagar_mecanico_a_orden(cita)

            if estado_anterior_bd != cita.estado:
                Notificacion.objects.create(
                    cita=cita,
                    tipo='CAMBIO_ESTADO',
                    mensaje=(
                        f'Su cita para {cita.servicio.nombre} ha cambiado '
                        f'de estado a {cita.get_estado_display()}.'
                    ),
                    enviado=False
                )
                # No gateamos por email: la tarea despacha también WhatsApp.
                # Si la cita pasa de PENDIENTE a CONFIRMADA usamos
                # 'confirmacion' (que `_evento_para_tipo` resuelve como
                # `cita_confirmada` cuando `cita.estado != PENDIENTE`).
                try:
                    if cita.cliente:
                        print(f"[Celery Queue] Encolando Estado nuevo: {cita.estado} | Email: {cita.cliente.email or '(sin email)'}")
                        if cita.estado == 'COMPLETADA':
                            tipo_email = 'encuesta'
                        elif (
                            estado_anterior_bd == 'PENDIENTE'
                            and cita.estado == 'CONFIRMADA'
                        ):
                            tipo_email = 'confirmacion'
                        else:
                            tipo_email = 'cambio_estado'
                        # Despachar tarea asíncrona
                        enviar_correo_cita_task.delay(cita.id, tipo_email)
                        # Pre-marcar la notificación como enviada para mejorar la UI
                        notificacion = Notificacion.objects.filter(cita=cita, tipo='CAMBIO_ESTADO').last()
                        if notificacion:
                            notificacion.enviado = True
                            notificacion.save()
                except Exception as e:
                    print(f"[Queue ERROR] {e}")

            messages.success(request, 'Cita actualizada correctamente.')
            return redirect('calendario_citas')
    else:
        if not cita.atendida_por:
            if mecanico_kanban:
                cita.atendida_por = mecanico_kanban
            elif es_admin_o_mecanico(request.user):         # FIX #6 — ya importado al top
                cita.atendida_por = request.user
        form = GestionCitaForm(instance=cita)

    return render(request, 'citas/gestionar_cita.html', {
        'form': form,
        'cita': cita,
        'mecanico_kanban': mecanico_kanban,
    })


# ===========================================================================
# TIPOS DE SERVICIO
# FIX #3 — eliminadas las primeras definiciones duplicadas (sin form, manuales).
#           Solo quedan estas, que usan TipoServicioForm correctamente.
# ===========================================================================

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
        'categorias': TipoServicio.CATEGORIAS,
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
        'categorias': TipoServicio.CATEGORIAS,
    })


@login_required
@user_passes_test(es_staff)
def eliminar_servicio(request, servicio_id):
    # FIX #7 — el bare except: estaba en la versión duplicada eliminada.
    #           Esta versión usa except Exception: correctamente.
    servicio = get_object_or_404(TipoServicio, id=servicio_id)

    if request.method == 'POST':
        try:
            servicio.delete()
            messages.success(request, 'Servicio eliminado correctamente.')
        except Exception:
            messages.error(
                request,
                'No se pudo eliminar el servicio porque ya está asociado a citas existentes.'
            )
        return redirect('lista_servicios')

    return render(request, 'citas/eliminar_servicio.html', {'servicio': servicio})


# ===========================================================================
# RECEPCIÓN / HISTORIAL
# ===========================================================================

@login_required
def nueva_recepcion(request, vehiculo_id=None, cita_id=None):
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
            return redirect('boleta_ingreso_pdf', recepcion_id=recepcion.id)
    else:
        form = RecepcionVehiculoForm(initial=initial_data)

    return render(request, 'citas/nueva_recepcion.html', {
        'form': form,
        'vehiculo': vehiculo_obj,
        'cita': cita_obj,
    })


@login_required
def historial_vehiculo(request, vehiculo_id):
    vehiculo = get_object_or_404(Vehiculo, id=vehiculo_id)

    if vehiculo.propietario != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso para ver este vehículo.')
        return redirect('dashboard')

    recepciones = vehiculo.recepciones.all().order_by('-fecha_ingreso')
    citas_historicas = vehiculo.citas.filter(estado__in=['COMPLETADA']).order_by('-fecha')

    return render(request, 'citas/historial_vehiculo.html', {
        'vehiculo': vehiculo,
        'recepciones': recepciones,
        'citas_historicas': citas_historicas,
    })


@login_required
def boleta_ingreso_pdf(request, recepcion_id):
    recepcion = get_object_or_404(RecepcionVehiculo, id=recepcion_id)

    if recepcion.vehiculo.propietario != request.user and not es_staff(request.user):
        messages.error(request, 'No tienes permiso.')
        return redirect('dashboard')

    return render(request, 'citas/boleta_ingreso_pdf.html', {'recepcion': recepcion})