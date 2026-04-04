from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from .models import Factura
from taller.models import OrdenTrabajo
from usuarios.permisos import es_admin_o_secretaria
from django.utils import timezone

@login_required
@user_passes_test(es_admin_o_secretaria)
def lista_facturas(request):
    facturas = Factura.objects.all()
    q = request.GET.get('q', '')
    if q:
        facturas = facturas.filter(numero_factura__icontains=q)
    return render(request, 'facturacion/lista_facturas.html', {'facturas': facturas, 'query': q})

@login_required
@user_passes_test(es_admin_o_secretaria)
def generar_pre_factura(request, orden_id):
    """
    Toma una orden de trabajo (idealmente LISTO o ENTREGADO) y
    crea un BORRADOR de factura calculando los costos actuales de la BD,
    o recupera el borrador si ya existe pero asegurando que los costos estén sincronizados 
    con lo que tiene la Orden de Trabajo hoy.
    """
    orden = get_object_or_404(OrdenTrabajo, id=orden_id)
    
    # Validar que al menos la cita exista (de donde sale el costo principal)
    if not orden.cita:
        messages.error(request, "La orden no tiene una Cita vinculada. No se puede generar factura.")
        return redirect('detalle_orden', orden_id=orden.id)
    
    # Costos en vivo desde la base de datos
    costo_mo = orden.cita.servicio.precio
    costo_rep  = orden.total_repuestos
    
    # Busca la factura o crea el borrador
    factura, created = Factura.objects.get_or_create(
        orden=orden,
        defaults={
            'costo_mano_obra': costo_mo,
            'costo_repuestos': costo_rep,
            'estado': 'BORRADOR'
        }
    )
    
    # Si la factura está en BORRADOR, actualizamos los números para que 
    # si agregaron un repuesto hace 5 min, se vea reflejado en la pre-factura (Sincronización Viva)
    if factura.estado == 'BORRADOR':
        factura.costo_mano_obra = costo_mo # mano de obra
        factura.costo_repuestos = costo_rep # repuestos
        factura.save()
        
    return render(request, 'facturacion/pre_factura.html', {'factura': factura, 'orden': orden})

@login_required
@user_passes_test(es_admin_o_secretaria)
def emitir_factura(request, factura_id):
    """
    Procesa el checkout: Bloquea los montos garantizando su inmutabilidad,
    asigna número de factura, marca método de pago y cierra el flujo.
    """
    factura = get_object_or_404(Factura, id=factura_id)
    
    if factura.estado == 'EMITIDA':
        messages.warning(request, "Esta factura ya fue emitida previamente.")
        return redirect('factura_print', factura_id=factura.id)
        
    if request.method == 'POST':
        metodo = request.POST.get('metodo_pago')
        descuento = request.POST.get('descuento', 0)
        notas = request.POST.get('notas_internas', '')
        
        try:
            descuento = float(descuento)
        except ValueError:
            descuento = 0
            
        factura.metodo_pago = metodo
        factura.descuento = descuento
        factura.notas_internas = notas
        factura.estado = 'EMITIDA'
        factura.fecha_pagada = timezone.now()
        
        # Bloquear precios permanentemente generando el folio
        factura.generar_numero() # esto hace el save del numero
        factura.save()
        
        # Opcional: Cuando se emite la factura, marcar Cita como Completada y Orden como Entregada
        orden = factura.orden
        if orden.estado != 'ENTREGADO':
            orden.estado = 'ENTREGADO'
            orden.save()
            
        if orden.cita and orden.cita.estado != 'COMPLETADA':
            orden.cita.estado = 'COMPLETADA'
            orden.cita.save()
            
        messages.success(request, f"¡Factura {factura.numero_factura} emitida correctamente con pago en {factura.get_metodo_pago_display()}!")
        return redirect('factura_print', factura_id=factura.id)
        
    # Método directo via POST solamente
    return redirect('generar_pre_factura', orden_id=factura.orden.id)

@login_required
@user_passes_test(es_admin_o_secretaria)
def factura_print(request, factura_id):
    """
    Template preparado 100% para impresion A4 o termica de ser necesario.
    """
    factura = get_object_or_404(Factura, id=factura_id)
    return render(request, 'facturacion/factura_print.html', {'factura': factura})
