from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json
from .models import OrdenTrabajo, OrdenRepuesto
from inventario.models import Producto
from inventario.models import MovimientoInventario

def es_mecanico_o_admin(user):
    return user.is_superuser or (hasattr(user, 'perfil') and user.perfil.rol.nombre in ['Administrador', 'Mecanico'])

@login_required
@user_passes_test(es_mecanico_o_admin)
def tablero_kanban(request):
    ordenes = OrdenTrabajo.objects.all().order_by('-fecha_creacion')
    
    # Agrupar órdenes por estado
    columnas = {
        'EN_ESPERA': ordenes.filter(estado='EN_ESPERA'),
        'EN_REVISION': ordenes.filter(estado='EN_REVISION'),
        'ESPERANDO_REPUESTOS': ordenes.filter(estado='ESPERANDO_REPUESTOS'),
        'LISTO': ordenes.filter(estado='LISTO'),
    }
    
    return render(request, 'taller/tablero.html', {'columnas': columnas})

@login_required
@user_passes_test(es_mecanico_o_admin)
def detalle_orden(request, orden_id):
    orden = get_object_or_404(OrdenTrabajo, id=orden_id)
    repuestos = orden.repuestos.select_related('producto')
    
    if request.method == 'POST':
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
                        tipo_movimiento='SALIDA',
                        cantidad=cantidad,
                        referencia=f"Uso en Orden de Trabajo #{orden.id}",
                        precio_unitario=producto.precio_venta
                    )
                    
                    # Agregar a la orden
                    OrdenRepuesto.objects.create(
                        orden=orden,
                        producto=producto,
                        cantidad=cantidad,
                        precio_unitario=producto.precio_venta
                    )
                    # Mensajes de éxito (opcional si usamos messages framework)

    # Para el buscador de productos
    productos_disponibles = Producto.objects.filter(activo=True).order_by('nombre')
    
    context = {
        'orden': orden,
        'repuestos': repuestos,
        'productos': productos_disponibles,
    }
    return render(request, 'taller/detalle_orden.html', context)

@login_required
@user_passes_test(es_mecanico_o_admin)
@require_POST
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
        orden.estado = nuevo_estado
        orden.save()
        
        return JsonResponse({'success': True, 'estado': orden.estado})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@user_passes_test(es_mecanico_o_admin)
@require_POST
def eliminar_repuesto_orden(request, repuesto_id):
    repuesto_orden = get_object_or_404(OrdenRepuesto, id=repuesto_id)
    orden_id = repuesto_orden.orden.id
    
    # Devolver stock al inventario
    producto = repuesto_orden.producto
    producto.stock_actual += repuesto_orden.cantidad
    producto.save()
    
    # Borrar movimiento de salida anterior (o hacer modelo opuesto)
    MovimientoInventario.objects.create(
        producto=producto,
        tipo_movimiento='ENTRADA',
        cantidad=repuesto_orden.cantidad,
        referencia=f"Devolución de Orden de Trabajo #{orden_id}",
        precio_unitario=repuesto_orden.precio_unitario
    )
    
    repuesto_orden.delete()
    return redirect('detalle_orden', orden_id=orden_id)

@login_required
@user_passes_test(es_mecanico_o_admin)
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
