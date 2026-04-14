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
            'ESPERANDO_REPUESTOS': {'id': 'ESPERANDO_REPUESTOS', 'title': 'Esperando Repuesto', 'taskIds': []},
            'LISTO': {'id': 'LISTO', 'title': 'Listo para Entrega', 'taskIds': []},
        }
        column_order = ['EN_ESPERA', 'EN_REVISION', 'ESPERANDO_REPUESTOS', 'LISTO']

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
