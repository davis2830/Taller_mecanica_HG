from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import models, transaction
from django.db.models import Q
import json
from .models import OrdenTrabajo, OrdenRepuesto
from inventario.models import Producto
from inventario.models import MovimientoInventario

from usuarios.permisos import es_admin_o_mecanico, es_staff_operativo

def es_mecanico_o_admin(user):
    return es_admin_o_mecanico(user)

def es_staff_con_acceso_taller(user):
    """Admin + Mecánico (pueden mover Kanban) + Secretaria (solo vista)."""
    return es_staff_operativo(user)

@login_required
@user_passes_test(es_staff_con_acceso_taller)
def tablero_kanban(request):
    # Excluir tarjetas de citas canceladas, completadas o huérfanas y añadir select_related para neutralizar consultas N+1
    ordenes = OrdenTrabajo.objects.select_related(
        'vehiculo', 
        'cita__cliente', 
        'cita__servicio', 
        'mecanico_asignado'
    ).exclude(
        cita__estado__in=['CANCELADA', 'COMPLETADA', 'PENDIENTE']
    ).order_by('-fecha_creacion')
    
    # Agrupar órdenes por estado
    columnas = {
        'EN_ESPERA': ordenes.filter(estado='EN_ESPERA'),
        'EN_REVISION': ordenes.filter(estado='EN_REVISION'),
        'ESPERANDO_REPUESTOS': ordenes.filter(estado='ESPERANDO_REPUESTOS'),
        'LISTO': ordenes.filter(estado='LISTO'),
    }
    
    from usuarios.permisos import es_secretaria
    return render(request, 'taller/tablero.html', {
        'columnas': columnas,
        'solo_lectura_kanban': es_secretaria(request.user),
    })

@login_required
@user_passes_test(es_mecanico_o_admin)
@transaction.atomic
def detalle_orden(request, orden_id):
    orden = get_object_or_404(OrdenTrabajo, id=orden_id)
    repuestos = orden.repuestos.select_related('producto')
    
    if request.method == 'POST':
        # Bloquear modificaciones si la orden o cita están terminadas
        if orden.estado in ['ENTREGADO', 'CANCELADO'] or (hasattr(orden, 'cita') and orden.cita and orden.cita.estado in ['CANCELADA', 'COMPLETADA']):
            return redirect('detalle_orden', orden_id=orden.id)

        if 'guardar_diagnostico' in request.POST:
            orden.diagnostico = request.POST.get('diagnostico', '')
            orden.save()
            return redirect('detalle_orden', orden_id=orden.id)
            
        elif 'agregar_repuesto' in request.POST:
            producto_id = request.POST.get('producto_id')
            cantidad = int(request.POST.get('cantidad', 1))
            
            if producto_id and cantidad > 0:
                producto = get_object_or_404(Producto, id=producto_id)
                # Verificar stock suficiente
                if producto.stock_actual >= cantidad:
                    # Descontar stock
                    producto.stock_actual -= cantidad
                    producto.save()
                    
                    # Registrar movimiento de inventario
                    MovimientoInventario.objects.create(
                        producto=producto,
                        tipo='SALIDA',
                        motivo='SERVICIO',
                        cantidad=cantidad,
                        precio_unitario=producto.precio_venta,
                        stock_anterior=producto.stock_actual + cantidad,
                        stock_nuevo=producto.stock_actual,
                        observaciones=f"Uso en Orden de Trabajo #{orden.id}",
                        usuario=request.user,
                        cita=orden.cita if hasattr(orden, 'cita') else None
                    )
                    
                    # Agregar a la orden
                    OrdenRepuesto.objects.create(
                        orden=orden,
                        producto=producto,
                        cantidad=cantidad,
                        precio_unitario=producto.precio_venta
                    )
                    
                    # Disparar alerta en tiempo real si cruzamos el umbral (Asíncrono)
                    from inventario.utils import evaluar_stock_producto
                    evaluar_stock_producto(producto)
                    
                    # Mensajes de éxito (opcional si usamos messages framework)

    # Para el buscador de productos
    productos_disponibles = Producto.objects.filter(activo=True).order_by('nombre')
    
    # Determinar si la orden está bloqueada por finalización o cancelación
    es_lectura_solo = False
    if orden.estado in ['ENTREGADO', 'CANCELADO'] or (hasattr(orden, 'cita') and orden.cita and orden.cita.estado in ['CANCELADA', 'COMPLETADA']):
        es_lectura_solo = True
    
    context = {
        'orden': orden,
        'repuestos': repuestos,
        'productos': productos_disponibles,
        'es_lectura_solo': es_lectura_solo,
    }
    return render(request, 'taller/detalle_orden.html', context)

@login_required
@user_passes_test(es_mecanico_o_admin)
@require_POST
@transaction.atomic
def actualizar_estado_orden(request):
    try:
        data = json.loads(request.body)
        orden_id = data.get('orden_id')
        nuevo_estado = data.get('nuevo_estado')
        
        # Validar nuevo estado
        estados_validos = [choice[0] for choice in OrdenTrabajo.ESTADO_CHOICES]
        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'error': 'Estado inválido'})
            
        orden = get_object_or_404(OrdenTrabajo, id=orden_id)
        
        # Blindaje Anti-Bug: No mover si la cita matriz fue cancelada
        if hasattr(orden, 'cita') and orden.cita and orden.cita.estado in ['CANCELADA', 'COMPLETADA']:
            return JsonResponse({'success': False, 'error': f'Movimiento bloqueado: La cita se encuentra {orden.cita.estado}.'})

        estado_anterior = orden.estado
        orden.estado = nuevo_estado

        # ── Auto-asignar mecánico cuando toma la orden ──
        # Si pasa a EN_REVISION y aún no tiene mecánico asignado,
        # se asigna automáticamente el usuario que hizo el movimiento.
        if nuevo_estado == 'EN_REVISION' and not orden.mecanico_asignado:
            orden.mecanico_asignado = request.user

        orden.save()

        # ── Notificaciones automáticas al cliente ──
        # NO gateamos por `cita.cliente.email`. La tarea despacha WhatsApp y
        # correo en paralelo: un cliente con teléfono pero sin email igual
        # debe recibir su WhatsApp. `enviar_email_cita` omite el correo
        # internamente si no hay email registrado.
        if hasattr(orden, 'cita') and orden.cita:
            cita = orden.cita
            from citas.tasks import enviar_correo_cita_task
            try:
                if nuevo_estado == 'EN_REVISION' and estado_anterior != 'EN_REVISION':
                    enviar_correo_cita_task.delay(cita.id, 'en_revision')
                elif nuevo_estado == 'LISTO' and estado_anterior != 'LISTO':
                    enviar_correo_cita_task.delay(cita.id, 'listo')
            except Exception as email_err:
                print(f"[Notificación Kanban] Error al encolar email celery: {email_err}")

        return JsonResponse({'success': True, 'estado': orden.estado})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@user_passes_test(es_mecanico_o_admin)
@require_POST
@transaction.atomic
def eliminar_repuesto_orden(request, repuesto_id):
    repuesto_orden = get_object_or_404(OrdenRepuesto, id=repuesto_id)
    orden = repuesto_orden.orden
    orden_id = orden.id
    
    # Bloquear devoluciones si la cita orden está bloqueada
    if orden.estado in ['ENTREGADO', 'CANCELADO'] or (hasattr(orden, 'cita') and orden.cita and orden.cita.estado in ['CANCELADA', 'COMPLETADA']):
        return redirect('detalle_orden', orden_id=orden_id)

    # Devolver stock al inventario
    producto = repuesto_orden.producto
    producto.stock_actual += repuesto_orden.cantidad
    producto.save()
    
    # Hacer modelo opuesto de movimiento
    MovimientoInventario.objects.create(
        producto=producto,
        tipo='ENTRADA',
        motivo='DEVOLUCION',
        cantidad=repuesto_orden.cantidad,
        precio_unitario=repuesto_orden.precio_unitario,
        stock_anterior=producto.stock_actual - repuesto_orden.cantidad,
        stock_nuevo=producto.stock_actual,
        observaciones=f"Devolución de Orden de Trabajo #{orden_id}",
        usuario=request.user,
        cita=repuesto_orden.orden.cita if hasattr(repuesto_orden.orden, 'cita') else None
    )
    
    repuesto_orden.delete()
    return redirect('detalle_orden', orden_id=orden_id)

@login_required
@user_passes_test(es_mecanico_o_admin)
@transaction.atomic
def crear_orden_desde_cita(request, cita_id):
    from citas.models import Cita
    cita = get_object_or_404(Cita, id=cita_id)
    
    # Verificar si ya existe una orden para esta cita
    if hasattr(cita, 'orden_trabajo'):
        return redirect('detalle_orden', orden_id=cita.orden_trabajo.id)
        
    # Crear la nueva orden de trabajo
    orden = OrdenTrabajo.objects.create(
        cita=cita,
        vehiculo=cita.vehiculo,
        estado='EN_ESPERA',
        diagnostico=f"Servicio solicitado por cliente: {cita.servicio.nombre}\nNotas: {cita.notas}"
    )
    
    # Redirigir al detalle de la nueva orden
    return redirect('detalle_orden', orden_id=orden.id)
@login_required
def historial_ordenes(request):
    """Historial completo de órdenes de trabajo. Admin ve todas; Mecánico y Secretaria las ven también;"""
    from usuarios.permisos import es_staff_operativo
    if not es_staff_operativo(request.user):
        from django.contrib import messages
        messages.error(request, 'No tienes permiso para acceder a esta sección.')
        return redirect('dashboard')

    ordenes = OrdenTrabajo.objects.select_related(
        'cita', 'cita__cliente', 'cita__servicio', 'vehiculo', 'mecanico_asignado'
    ).order_by('-fecha_creacion')

    # Filtros
    estado_filtro = request.GET.get('estado', '')
    busqueda = request.GET.get('q', '')

    if estado_filtro:
        ordenes = ordenes.filter(estado=estado_filtro)

    if busqueda:
        ordenes = ordenes.filter(
            Q(vehiculo__placa__icontains=busqueda) |
            Q(cita__cliente__first_name__icontains=busqueda) |
            Q(cita__cliente__last_name__icontains=busqueda) |
            Q(diagnostico__icontains=busqueda)
        )

    from django.core.paginator import Paginator
    paginator = Paginator(ordenes, 20)
    page_obj = paginator.get_page(request.GET.get('page'))

    context = {
        'page_obj': page_obj,
        'estados': OrdenTrabajo.ESTADO_CHOICES,
        'estado_filtro': estado_filtro,
        'busqueda': busqueda,
    }
    return render(request, 'taller/historial_ordenes.html', context)
