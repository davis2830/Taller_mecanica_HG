from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import OrdenTrabajo, OrdenRepuesto
from inventario.models import Producto, MovimientoInventario
from .api_serializers import (
    OrdenTrabajoKanbanSerializer,
    OrdenTrabajoDetalleSerializer,
    ProductoMiniSerializer
)

from django.db import transaction
from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, DecimalField, Q
from django.utils.dateparse import parse_date
from decimal import Decimal
import json

class KanbanBoardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Excluir tarjetas de citas canceladas, completadas o huérfanas
        ordenes = OrdenTrabajo.objects.select_related(
            'vehiculo', 
            'cita__cliente', 
            'cita__servicio', 
            'mecanico_asignado'
        ).exclude(
            cita__estado__in=['CANCELADA', 'COMPLETADA', 'PENDIENTE']
        ).order_by('-fecha_creacion')
        
        # Agrupar por columnas (En vez de diccionarios Django, armamos la estructura DND de React)
        # React espera algo como: { "tasks": {...}, "columns": {...}, "columnOrder": [...] }
        
        tasks_dict = {}
        columns_dict = {
            'EN_ESPERA': {'id': 'EN_ESPERA', 'title': 'En Espera', 'taskIds': []},
            'EN_REVISION': {'id': 'EN_REVISION', 'title': 'En Revisión (Progreso)', 'taskIds': []},
            'COTIZACION': {'id': 'COTIZACION', 'title': 'Cotización', 'taskIds': []},
            'ESPERANDO_REPUESTOS': {'id': 'ESPERANDO_REPUESTOS', 'title': 'Esperando Repuesto', 'taskIds': []},
            'LISTO': {'id': 'LISTO', 'title': 'Listo para Entrega', 'taskIds': []},
        }
        column_order = ['EN_ESPERA', 'EN_REVISION', 'COTIZACION', 'ESPERANDO_REPUESTOS', 'LISTO']

        for orden in ordenes:
            str_id = str(orden.id)
            tasks_dict[str_id] = OrdenTrabajoKanbanSerializer(orden).data
            if orden.estado in columns_dict:
                columns_dict[orden.estado]['taskIds'].append(str_id)

        data = {
            'tasks': tasks_dict,
            'columns': columns_dict,
            'columnOrder': column_order
        }
        return Response(data)

class ActualizarEstadoOrdenView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, orden_id):
        try:
            nuevo_estado = request.data.get('nuevo_estado')
            if not nuevo_estado:
                return Response({'error': 'El estado es requerido'}, status=status.HTTP_400_BAD_REQUEST)
                
            orden = OrdenTrabajo.objects.get(id=orden_id)
            
            # Anti-Bug Rule
            if hasattr(orden, 'cita') and orden.cita and orden.cita.estado in ['CANCELADA', 'COMPLETADA']:
                return Response({'error': f'Movimiento bloqueado: La cita se encuentra {orden.cita.estado}.'}, status=status.HTTP_400_BAD_REQUEST)

            estado_anterior = orden.estado
            orden.estado = nuevo_estado
            
            # Auto-asignar mecánico (Simulando la lógica anterior en API mode)
            if nuevo_estado == 'EN_REVISION' and not orden.mecanico_asignado:
                orden.mecanico_asignado = request.user

            orden.save()

            # Disparar Celery mails asíncronamente
            if hasattr(orden, 'cita') and orden.cita and orden.cita.cliente.email:
                cita = orden.cita
                from citas.tasks import enviar_correo_cita_task
                try:
                    if nuevo_estado == 'EN_REVISION' and estado_anterior != 'EN_REVISION':
                        enviar_correo_cita_task.delay(cita.id, 'en_revision')
                    elif nuevo_estado == 'COTIZACION' and estado_anterior != 'COTIZACION':
                        enviar_correo_cita_task.delay(cita.id, 'cotizacion')
                    elif nuevo_estado == 'LISTO' and estado_anterior != 'LISTO':
                        enviar_correo_cita_task.delay(cita.id, 'listo')
                except Exception as e:
                    print(f"Celery Error: {e}")

            return Response({'success': True, 'estado': orden.estado, 'mecanico_nombre': orden.mecanico_asignado.get_full_name() if orden.mecanico_asignado else None})
            
        except OrdenTrabajo.DoesNotExist:
            return Response({'error': 'Orden no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DetalleOrdenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, orden_id):
        orden = OrdenTrabajo.objects.filter(id=orden_id).first()
        if not orden:
            return Response({'error': 'Orden no encontrada'}, status=404)
        return Response(OrdenTrabajoDetalleSerializer(orden).data)

class ActualizarDiagnosticoView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, orden_id):
        orden = OrdenTrabajo.objects.filter(id=orden_id).first()
        if not orden:
            return Response({'error': 'No encontrada'}, status=404)
        
        orden.diagnostico = request.data.get('diagnostico', '')
        orden.save()
        return Response({'success': True, 'diagnostico': orden.diagnostico})

class BuscarInventarioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '')
        if q:
            productos = Producto.objects.filter(nombre__icontains=q, activo=True).order_by('nombre')
        else:
            productos = Producto.objects.filter(activo=True).order_by('nombre')
            
        return Response(ProductoMiniSerializer(productos, many=True).data)

class AgregarRepuestoView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, orden_id):
        orden = OrdenTrabajo.objects.filter(id=orden_id).first()
        if not orden: return Response({'error': '404'}, status=404)

        producto_id = request.data.get('producto_id')
        cantidad = int(request.data.get('cantidad', 1))
        
        producto = Producto.objects.filter(id=producto_id).first()
        if not producto or producto.stock_actual < cantidad:
            return Response({'error': 'Stock insuficiente o inválido'}, status=400)
            
        producto.stock_actual -= cantidad
        producto.save()
        
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
        
        OrdenRepuesto.objects.create(
            orden=orden,
            producto=producto,
            cantidad=cantidad,
            precio_unitario=producto.precio_venta
        )
        
        from inventario.utils import evaluar_stock_producto
        evaluar_stock_producto(producto)
        
        return Response(OrdenTrabajoDetalleSerializer(orden).data)


class HistorialVehiculoView(APIView):
    """
    GET /api/v1/taller/vehiculo/<vehiculo_id>/historial/
    Devuelve todas las órdenes de trabajo de un vehículo, ordeadas por fecha desc.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vehiculo_id):
        ordenes = OrdenTrabajo.objects.filter(
            vehiculo_id=vehiculo_id
        ).select_related(
            'cita', 'cita__servicio', 'mecanico_asignado'
        ).prefetch_related('repuestos__producto').order_by('-fecha_creacion')

        return Response(OrdenTrabajoDetalleSerializer(ordenes, many=True).data)


class HistorialOrdenesView(APIView):
    """
    GET /api/v1/taller/historial/
    Params: q (texto libre), estado, page, page_size (default 20)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

        ordenes = OrdenTrabajo.objects.select_related(
            'cita', 'cita__cliente', 'cita__servicio',
            'vehiculo', 'mecanico_asignado'
        ).prefetch_related('repuestos__producto').order_by('-fecha_creacion')

        estado = request.query_params.get('estado', '')
        q     = request.query_params.get('q', '')

        if estado:
            ordenes = ordenes.filter(estado=estado)

        if q:
            ordenes = ordenes.filter(
                Q(vehiculo__placa__icontains=q)      |
                Q(cita__cliente__first_name__icontains=q) |
                Q(cita__cliente__last_name__icontains=q)  |
                Q(diagnostico__icontains=q)
            )

        page_size = int(request.query_params.get('page_size', 20))
        paginator = Paginator(ordenes, page_size)
        page_num  = request.query_params.get('page', 1)

        try:
            page = paginator.page(page_num)
        except (EmptyPage, PageNotAnInteger):
            page = paginator.page(1)

        return Response({
            'count':    paginator.count,
            'pages':    paginator.num_pages,
            'page':     page.number,
            'results':  OrdenTrabajoDetalleSerializer(page.object_list, many=True).data,
        })


class EliminarRepuestoView(APIView):
    """DELETE /api/v1/taller/orden/<id>/repuesto/<rep_id>/"""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, orden_id, rep_id):
        from taller.models import OrdenRepuesto
        rep = OrdenRepuesto.objects.filter(id=rep_id, orden_id=orden_id).first()
        if not rep:
            return Response({'error': 'No encontrado'}, status=404)

        # Devolver stock
        producto = rep.producto
        producto.stock_actual += rep.cantidad
        producto.save()

        rep.delete()
        orden = OrdenTrabajo.objects.get(id=orden_id)
        return Response(OrdenTrabajoDetalleSerializer(orden).data)


class ProcesarFacturaView(APIView):
    """
    POST /api/v1/taller/orden/<id>/facturar/
    Body: { metodo_pago: 'EFECTIVO|TARJETA|TRANSFERENCIA|OTROS', descuento: 0 }
    Crea o actualiza el BORRADOR de factura y lo EMITE.
    Solo admins y staff con permiso.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, orden_id):
        from facturacion.models import Factura
        from django.utils import timezone
        from citas.models import Notificacion

        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Solo el personal administrativo puede emitir facturas.'}, status=403)

        orden = OrdenTrabajo.objects.filter(id=orden_id).first()
        if not orden:
            return Response({'error': 'Orden no encontrada'}, status=404)

        if orden.estado not in ['LISTO', 'ENTREGADO']:
            return Response({'error': f'No se puede facturar una orden en estado "{orden.get_estado_display()}". Debe estar Listo o Entregado.'}, status=400)

        if not orden.cita:
            return Response({'error': 'La orden no tiene una cita vinculada.'}, status=400)

        metodo  = request.data.get('metodo_pago', 'EFECTIVO')
        descuento = Decimal(str(request.data.get('descuento', 0)))
        notas   = request.data.get('notas_internas', '')

        costo_mo  = orden.cita.servicio.precio if orden.cita.servicio else Decimal('0')
        costo_rep = orden.total_repuestos

        # get_or_create borrador
        factura, created = Factura.objects.get_or_create(
            orden=orden,
            defaults={
                'costo_mano_obra': costo_mo,
                'costo_repuestos': costo_rep,
                'estado': 'BORRADOR'
            }
        )

        if factura.estado == 'EMITIDA':
            return Response({
                'error': 'Esta orden ya tiene una factura emitida.',
                'numero_factura': factura.numero_factura,
                'total': float(factura.total_general)
            }, status=400)

        # Actualizar y emitir
        factura.costo_mano_obra = costo_mo
        factura.costo_repuestos = costo_rep
        factura.metodo_pago     = metodo
        factura.descuento       = descuento
        factura.notas_internas  = notas
        factura.estado          = 'EMITIDA'
        factura.fecha_pagada    = timezone.now()
        factura.save()
        factura.generar_numero()

        # Marcar orden y cita como ENTREGADO / COMPLETADA
        if orden.estado != 'ENTREGADO':
            orden.estado = 'ENTREGADO'
            orden.save()
        if orden.cita and orden.cita.estado != 'COMPLETADA':
            orden.cita.estado = 'COMPLETADA'
            orden.cita.save()

        # Disparar correos async (si están configurados)
        try:
            from facturacion.tasks import enviar_factura_task
            from citas.tasks import enviar_correo_cita_task
            cliente = orden.cita.cliente if orden.cita else None
            if cliente and cliente.email:
                enviar_factura_task.delay(factura.id, cliente.email)
                enviar_correo_cita_task.delay(orden.cita.id, 'encuesta')
        except Exception as e:
            print(f'[INFO] Celery email skipped: {e}')

        return Response({
            'success': True,
            'id': factura.id,
            'numero_factura': factura.numero_factura,
            'total_general': float(factura.total_general),
            'costo_mano_obra': float(factura.costo_mano_obra),
            'costo_repuestos': float(factura.costo_repuestos),
            'descuento': float(factura.descuento),
            'metodo_pago': factura.get_metodo_pago_display(),
            'estado_orden': orden.estado,
        })


# ═══════════════════════════════════════════════════════════════
#   REPORTE DE UTILIDADES
# ═══════════════════════════════════════════════════════════════

class ReporteUtilidadesView(APIView):
    """
    GET /api/v1/taller/reportes/utilidades/
    Query params opcionales:
      - fecha_inicio: YYYY-MM-DD
      - fecha_fin:    YYYY-MM-DD
      - categoria:    ID de CategoriaProducto (opcional)
    
    Retorna ganancia por repuesto y por servicio de las facturas EMITIDAS.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Acceso restringido al personal.'}, status=status.HTTP_403_FORBIDDEN)

        from facturacion.models import Factura
        from django.utils import timezone
        import datetime

        # ── Filtros de fecha ──────────────────────────────────────
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin    = request.query_params.get('fecha_fin')
        categoria_id = request.query_params.get('categoria')

        facturas_qs = Factura.objects.filter(estado='EMITIDA').select_related(
            'orden', 'orden__cita', 'orden__cita__servicio'
        )

        if fecha_inicio:
            d = parse_date(fecha_inicio)
            if d:
                dt_inicio = timezone.make_aware(datetime.datetime.combine(d, datetime.time.min))
                facturas_qs = facturas_qs.filter(fecha_pagada__gte=dt_inicio)
        if fecha_fin:
            d = parse_date(fecha_fin)
            if d:
                dt_fin = timezone.make_aware(datetime.datetime.combine(d, datetime.time.max))
                facturas_qs = facturas_qs.filter(fecha_pagada__lte=dt_fin)

        # IDs de órdenes que corresponden a facturas emitidas en el rango
        orden_ids = list(facturas_qs.values_list('orden_id', flat=True))

        # ── Repuestos usados en esas órdenes ──────────────────────
        repuestos_qs = OrdenRepuesto.objects.filter(
            orden_id__in=orden_ids
        ).select_related('producto', 'producto__categoria')

        if categoria_id:
            repuestos_qs = repuestos_qs.filter(producto__categoria_id=categoria_id)

        # Agrupamos por producto
        # Necesitamos: precio_compra del producto, precio_unitario (venta) y cantidad
        producto_map = {}
        for r in repuestos_qs:
            pid = r.producto_id
            if pid not in producto_map:
                producto_map[pid] = {
                    'producto_id':    pid,
                    'nombre':         r.producto.nombre,
                    'codigo':         r.producto.codigo,
                    'categoria':      r.producto.categoria.nombre if r.producto.categoria else 'Sin categoría',
                    'precio_compra':  float(r.producto.precio_compra),
                    'cantidad_total': 0,
                    'ingreso_total':  Decimal('0'),
                    'costo_total':    Decimal('0'),
                }
            pc = r.producto.precio_compra
            pv = r.precio_unitario
            qty = r.cantidad
            producto_map[pid]['cantidad_total'] += qty
            producto_map[pid]['ingreso_total']  += pv * qty
            producto_map[pid]['costo_total']    += pc * qty

        repuestos_resultado = []
        for d in producto_map.values():
            ingreso  = d['ingreso_total']
            costo    = d['costo_total']
            ganancia = ingreso - costo
            margen   = float(ganancia / ingreso * 100) if ingreso else 0
            precio_venta_prom = float(ingreso / d['cantidad_total']) if d['cantidad_total'] else 0
            repuestos_resultado.append({
                'producto_id':           d['producto_id'],
                'nombre':                d['nombre'],
                'codigo':                d['codigo'],
                'categoria':             d['categoria'],
                'cantidad_total':        d['cantidad_total'],
                'precio_compra':         round(d['precio_compra'], 2),
                'precio_venta_promedio': round(precio_venta_prom, 2),
                'costo_total':           round(float(costo), 2),
                'ingreso_total':         round(float(ingreso), 2),
                'ganancia':              round(float(ganancia), 2),
                'margen_pct':            round(margen, 1),
            })

        # Ordenar por ganancia descendente
        repuestos_resultado.sort(key=lambda x: x['ganancia'], reverse=True)

        # ── Servicios (Mano de Obra) ──────────────────────────────
        servicios_map = {}
        for f in facturas_qs:
            nombre_srv = 'Sin servicio'
            if f.orden.cita and f.orden.cita.servicio:
                nombre_srv = f.orden.cita.servicio.nombre

            if nombre_srv not in servicios_map:
                servicios_map[nombre_srv] = {
                    'servicio':          nombre_srv,
                    'cantidad_ordenes':  0,
                    'ingreso_mano_obra': Decimal('0'),
                }
            servicios_map[nombre_srv]['cantidad_ordenes']  += 1
            servicios_map[nombre_srv]['ingreso_mano_obra'] += f.costo_mano_obra

        servicios_resultado = [
            {**v, 'ingreso_mano_obra': round(float(v['ingreso_mano_obra']), 2)}
            for v in servicios_map.values()
        ]
        servicios_resultado.sort(key=lambda x: x['ingreso_mano_obra'], reverse=True)

        # ── Resumen general ──────────────────────────────────────
        total_ingreso_repuestos = sum(r['ingreso_total']  for r in repuestos_resultado)
        total_costo_repuestos   = sum(r['costo_total']    for r in repuestos_resultado)
        total_mano_obra         = sum(s['ingreso_mano_obra'] for s in servicios_resultado)
        ganancia_bruta          = (total_ingreso_repuestos - total_costo_repuestos) + total_mano_obra
        total_ingresos          = total_ingreso_repuestos + total_mano_obra
        margen_global           = (ganancia_bruta / total_ingresos * 100) if total_ingresos else 0

        resumen = {
            'total_facturas':          len(orden_ids),
            'total_ingresos':          round(total_ingresos, 2),
            'total_ingreso_repuestos': round(total_ingreso_repuestos, 2),
            'total_costo_repuestos':   round(total_costo_repuestos, 2),
            'total_mano_obra':         round(total_mano_obra, 2),
            'ganancia_bruta':          round(ganancia_bruta, 2),
            'margen_global_pct':       round(margen_global, 1),
        }

        return Response({
            'resumen':    resumen,
            'repuestos':  repuestos_resultado,
            'servicios':  servicios_resultado,
            'filtros': {
                'fecha_inicio': fecha_inicio,
                'fecha_fin':    fecha_fin,
                'categoria_id': categoria_id,
            }
        })


# ─── Dashboard Operativo ───────────────────────────────────────────────────────
class DashboardView(APIView):
    """
    Endpoint de agregación que calcula todos los KPIs del dashboard en
    una sola llamada. Optimizado con aggregate() para evitar N+1 queries.
    GET /api/v1/taller/dashboard/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from django.db.models import DurationField
        from citas.models import Cita
        from facturacion.models import Factura
        from inventario.models import Producto, OrdenCompra, CuentaProveedor

        now   = timezone.now()
        today = now.date()
        mes   = now.month
        anio  = now.year

        # ── 1. Órdenes activas en taller ─────────────────────────────────────
        estados_activos = ['EN_ESPERA', 'EN_REVISION', 'COTIZACION', 'ESPERANDO_REPUESTOS']
        ordenes_activas = OrdenTrabajo.objects.filter(estado__in=estados_activos).count()
        listos_entrega  = OrdenTrabajo.objects.filter(estado='LISTO').count()

        # ── 2. Pipeline: distribución por estado ──────────────────────────────
        pipeline_qs = (
            OrdenTrabajo.objects
            .exclude(estado__in=['ENTREGADO', 'CANCELADO'])
            .values('estado')
            .annotate(total=Count('id'))
        )
        pipeline = {item['estado']: item['total'] for item in pipeline_qs}

        ORDEN_PIPELINE = ['EN_ESPERA', 'EN_REVISION', 'COTIZACION', 'ESPERANDO_REPUESTOS', 'LISTO']
        LABELS_PIPELINE = {
            'EN_ESPERA':            'Recibido',
            'EN_REVISION':          'Diagnóstico',
            'COTIZACION':           'Cotización',
            'ESPERANDO_REPUESTOS':  'Esperando Repuestos',
            'LISTO':                'Listo',
        }
        pipeline_data = [
            {'estado': e, 'label': LABELS_PIPELINE[e], 'total': pipeline.get(e, 0)}
            for e in ORDEN_PIPELINE
        ]

        # ── 3. Promedio de días en taller (activas) ───────────────────────────
        promedio_dias = 0
        try:
            ots_activas = OrdenTrabajo.objects.filter(estado__in=estados_activos)
            if ots_activas.exists():
                total_dias = sum(
                    (now - ot.fecha_creacion).days
                    for ot in ots_activas.only('fecha_creacion')
                )
                promedio_dias = round(total_dias / ots_activas.count(), 1)
        except Exception:
            promedio_dias = 0

        # ── 4. Citas de hoy ───────────────────────────────────────────────────
        citas_hoy_qs = (
            Cita.objects
            .filter(fecha=today, estado__in=['PENDIENTE', 'CONFIRMADA'])
            .select_related('vehiculo', 'cliente', 'servicio')
            .order_by('hora_inicio')
        )
        citas_hoy = [
            {
                'id':        c.id,
                'hora':      c.hora_inicio.strftime('%H:%M'),
                'cliente':   f"{c.cliente.first_name} {c.cliente.last_name}".strip() or c.cliente.username,
                'vehiculo':  f"{c.vehiculo.marca} {c.vehiculo.modelo} ({c.vehiculo.placa})",
                'servicio':  c.servicio.nombre,
                'estado':    c.estado,
            }
            for c in citas_hoy_qs
        ]

        # ── 5. Ingresos del mes (facturas emitidas) ───────────────────────────
        ingresos_mes_agg = Factura.objects.filter(
            estado='EMITIDA',
            fecha_emision__year=anio,
            fecha_emision__month=mes
        ).aggregate(
            total=Sum(F('costo_mano_obra') + F('costo_repuestos') - F('descuento'))
        )
        ingresos_mes = float(ingresos_mes_agg['total'] or 0)

        # ── 6. OC pendientes ──────────────────────────────────────────────────
        oc_pendiente_agg = OrdenCompra.objects.filter(
            estado__in=['BORRADOR', 'SOLICITADA', 'PARCIAL']
        ).aggregate(
            count=Count('id'),
            valor=Sum('total')
        )
        oc_count = oc_pendiente_agg['count'] or 0
        oc_valor = float(oc_pendiente_agg['valor'] or 0)

        # ── 7. Deuda total a proveedores (CuentaProveedor) ────────────────────
        deuda_agg = CuentaProveedor.objects.filter(
            estado__in=['PENDIENTE', 'PARCIAL']
        ).aggregate(
            total_deuda=Sum(F('monto_total') - F('monto_pagado'))
        )
        deuda_proveedores = float(deuda_agg['total_deuda'] or 0)

        # ── 8. Inventario ─────────────────────────────────────────────────────
        productos_activos = Producto.objects.filter(activo=True)

        # Valor total en bodega
        valor_inventario_agg = productos_activos.aggregate(
            valor=Sum(ExpressionWrapper(F('stock_actual') * F('precio_compra'), output_field=DecimalField()))
        )
        valor_inventario = float(valor_inventario_agg['valor'] or 0)

        # Productos bajo stock mínimo (top 10 para la lista)
        stock_bajo_qs = (
            productos_activos
            .filter(stock_actual__lte=F('stock_minimo'))
            .only('codigo', 'nombre', 'stock_actual', 'stock_minimo', 'unidad_medida')
            .order_by('stock_actual')[:10]
        )
        stock_bajo = [
            {
                'codigo':       p.codigo,
                'nombre':       p.nombre,
                'stock_actual': p.stock_actual,
                'stock_minimo': p.stock_minimo,
                'unidad':       p.unidad_medida,
                'pct':          round((p.stock_actual / p.stock_minimo * 100) if p.stock_minimo > 0 else 0),
            }
            for p in stock_bajo_qs
        ]
        total_alertas_stock = productos_activos.filter(stock_actual__lte=F('stock_minimo')).count()

        # ── Respuesta unificada ───────────────────────────────────────────────
        return Response({
            'meta': {
                'generado_en': now.isoformat(),
                'fecha_hoy':   str(today),
                'mes':         f"{mes}/{anio}",
            },
            'kpis': {
                'ordenes_activas':   ordenes_activas,
                'listos_entrega':    listos_entrega,
                'promedio_dias':     promedio_dias,
                'citas_hoy_count':   len(citas_hoy),
                'ingresos_mes':      ingresos_mes,
                'oc_count':          oc_count,
                'oc_valor':          oc_valor,
                'deuda_proveedores': deuda_proveedores,
                'valor_inventario':  valor_inventario,
                'alertas_stock':     total_alertas_stock,
            },
            'pipeline':   pipeline_data,
            'citas_hoy':  citas_hoy,
            'stock_bajo': stock_bajo,
        })
