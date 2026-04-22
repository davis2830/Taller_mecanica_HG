from rest_framework import viewsets, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Producto, CategoriaProducto, Proveedor, MovimientoInventario, AlertaInventario
from .api_serializers import (
    ProductoSerializer, ProductoListSerializer, 
    CategoriaProductoSerializer, ProveedorMiniSerializer,
    MovimientoInventarioSerializer, AlertaInventarioSerializer
)
from django.db.models import Sum, F, Q

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProducto.objects.all().order_by('nombre')
    serializer_class = CategoriaProductoSerializer
    permission_classes = [IsAuthenticated]

class ProveedorMiniViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Proveedor.objects.filter(activo=True).order_by('nombre')
    serializer_class = ProveedorMiniSerializer
    permission_classes = [IsAuthenticated]

class ProductoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['codigo', 'nombre', 'descripcion', 'categoria__nombre']
    
    def get_queryset(self):
        qs = Producto.objects.all().select_related('categoria', 'proveedor_principal')
        
        # Filtros opcionales
        stock_bajo = self.request.query_params.get('stock_bajo')
        if stock_bajo == 'true':
            qs = qs.filter(stock_actual__lte=F('stock_minimo'), activo=True)
            
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria_id=categoria)
            
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=(activo.lower() == 'true'))
            
        return qs.order_by('nombre')
        
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductoListSerializer
        return ProductoSerializer

from django.db import transaction

class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = MovimientoInventario.objects.all().select_related('producto', 'usuario')
        
        # Filtros
        producto_id = self.request.query_params.get('producto')
        if producto_id:
            qs = qs.filter(producto_id=producto_id)
            
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)
            
        return qs.order_by('-fecha')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Sobreescribimos el create para ajustar el stock del producto
        data = request.data
        producto_id = data.get('producto')
        tipo = data.get('tipo')
        cantidad = int(data.get('cantidad', 0))
        
        producto = Producto.objects.select_for_update().get(id=producto_id)
        
        stock_anterior = producto.stock_actual
        if tipo == 'ENTRADA':
            stock_nuevo = stock_anterior + cantidad
        elif tipo == 'SALIDA':
            stock_nuevo = stock_anterior - cantidad
            if stock_nuevo < 0:
                stock_nuevo = 0 # No permitir stock negativo
        elif tipo == 'AJUSTE':
            # Para ajustes, "cantidad" viene como la diferencia o stock_nuevo directamente
            # Asumamos que el UI manda la "nueva" cantidad deseada como "cantidad" para que sea más fácil, o manda la diferencia.
            # Veamos cómo diseñamos el frontend: mejor si el frontend manda la cantidad EXACTA nueva.
            # O si manda la diferencia. Asumamos que para AJUSTE, cantidad es la variación (+ o -).
            stock_nuevo = stock_anterior + cantidad
            if stock_nuevo < 0: stock_nuevo = 0
            
        # Actualizamos el producto
        producto.stock_actual = stock_nuevo
        producto.save()
        
        # Guardamos el movimiento
        data['stock_anterior'] = stock_anterior
        data['stock_nuevo'] = stock_nuevo
        
        # Inyectar el log de usuario
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(usuario=request.user)
        
        # Al producto bajar el stock, checkear trigger de alerta no es estrictamente necesario aquí si hay signals, 
        # pero podemos chequear:
        from inventario.utils import verificar_stock_producto
        verificar_stock_producto(producto)
        
        return Response(serializer.data, status=201)

from rest_framework.decorators import action

class AlertaInventarioViewSet(viewsets.ModelViewSet):
    serializer_class = AlertaInventarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = AlertaInventario.objects.all().select_related('producto', 'resuelto_por')
        # Por defecto solo mostramos las activas a menos que se pida todo
        if self.request.query_params.get('todas') != 'true':
            qs = qs.filter(activa=True)
        return qs.order_by('-fecha_creacion')

    @action(detail=True, methods=['patch'])
    def resolver(self, request, pk=None):
        alerta = self.get_object()
        alerta.marcar_como_resuelta(usuario=request.user)
        # Retornamos el estado actualizado
        serializer = self.get_serializer(alerta)
        return Response(serializer.data)

class InventarioResumenAPI(APIView):
    """Devuelve los KPIs globales del inventario"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        productos_activos = Producto.objects.filter(activo=True)
        
        # Total valorizado = Sumatoria de (stock_actual * precio_compra)
        valorizado_agregrate = productos_activos.aggregate(
            total=Sum(F('stock_actual') * F('precio_compra'))
        )
        total_valorizado = valorizado_agregrate['total'] or 0
        
        # Stock bajo
        bajo_stock = productos_activos.filter(stock_actual__lte=F('stock_minimo')).count()
        
        # Alertas activas
        alertas = AlertaInventario.objects.filter(activa=True).count()
        
        return Response({
            'total_productos': productos_activos.count(),
            'total_valorizado': total_valorizado,
            'productos_stock_bajo': bajo_stock,
            'alertas_activas': alertas
        })

# ==========================================
#     COMPRAS Y PROVEEDORES
# ==========================================

from .models import OrdenCompra, DetalleOrdenCompra, CuentaProveedor, PagoProveedor, PrecioProveedor
from .api_serializers import (
    ProveedorSerializer, OrdenCompraSerializer, DetalleOrdenCompraSerializer, 
    CuentaProveedorSerializer, PagoProveedorSerializer, PrecioProveedorSerializer
)
from django.utils import timezone

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all().order_by('nombre')
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]

class PrecioProveedorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PrecioProveedor.objects.select_related('proveedor', 'producto').order_by('producto__nombre', 'precio_ofrecido')
    serializer_class = PrecioProveedorSerializer
    permission_classes = [IsAuthenticated]

class CuentaProveedorViewSet(viewsets.ModelViewSet):
    queryset = CuentaProveedor.objects.select_related('proveedor', 'orden_compra').prefetch_related('pagos').order_by('-fecha_emision')
    serializer_class = CuentaProveedorSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def registrar_pago(self, request, pk=None):
        cuenta = self.get_object()
        
        if cuenta.estado == 'PAGADO':
            return Response({'error': 'La cuenta ya está pagada.'}, status=400)
            
        monto = float(request.data.get('monto', 0))
        if monto <= 0:
            return Response({'error': 'El monto debe ser mayor a 0.'}, status=400)
            
        if monto > cuenta.saldo_pendiente:
            return Response({'error': f'El monto excede el saldo pendiente (Q{cuenta.saldo_pendiente}).'}, status=400)
            
        metodo = request.data.get('metodo_pago', 'EFECTIVO')
        referencia = request.data.get('referencia', '')
        
        # Registrar pago
        pago = PagoProveedor.objects.create(
            cuenta=cuenta,
            monto=monto,
            metodo_pago=metodo,
            referencia=referencia,
            registrado_por=request.user
        )
        # El save del PagoProveedor llama a actualizar_saldos en la cuenta automáticamente.
        
        # Recargar la cuenta para el serializer
        cuenta.refresh_from_db()
        return Response(self.get_serializer(cuenta).data)

class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.select_related('proveedor', 'creada_por').prefetch_related('detalles__producto').order_by('-fecha_creacion')
    serializer_class = OrdenCompraSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Sobreescribimos para guardar anidado
        detalles_data = request.data.pop('detalles', [])
        if not detalles_data:
            return Response({'error': 'Una orden de compra debe tener al menos un detalle.'}, status=400)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        orden = serializer.save(creada_por=request.user, estado='SOLICITADA')
        
        for d in detalles_data:
            DetalleOrdenCompra.objects.create(
                orden=orden,
                producto_id=d.get('producto'),
                cantidad_solicitada=d.get('cantidad_solicitada'),
                precio_unitario=d.get('precio_unitario')
            )
            
        orden.recalcular_total()
        return Response(self.get_serializer(orden).data, status=201)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def recibir(self, request, pk=None):
        orden = self.get_object()
        
        if orden.estado in ['COMPLETA', 'CANCELADA']:
            return Response({'error': 'Esta orden no puede recibir mercancía.'}, status=400)
            
        # Procesar recepciones de todo lo pendiente
        for detalle in orden.detalles.all():
            pendiente = detalle.cantidad_solicitada - detalle.cantidad_recibida
            if pendiente > 0:
                detalle.cantidad_recibida += pendiente
                detalle.save()
                
                producto = detalle.producto
                stock_anterior = producto.stock_actual
                stock_nuevo = stock_anterior + pendiente
                
                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo='ENTRADA',
                    motivo='COMPRA',
                    cantidad=pendiente,
                    precio_unitario=detalle.precio_unitario,
                    stock_anterior=stock_anterior,
                    stock_nuevo=stock_nuevo,
                    observaciones=f"Recepción OC-{orden.id:04d}",
                    usuario=request.user
                )
                
                producto.stock_actual = stock_nuevo
                producto.save()
                
                PrecioProveedor.objects.update_or_create(
                    proveedor=orden.proveedor,
                    producto=producto,
                    defaults={'precio_ofrecido': detalle.precio_unitario}
                )
        
        orden.estado = 'COMPLETA'
        orden.fecha_recepcion = timezone.now()
        orden.save()
        
        # Generar cuenta por pagar si mayor a 0
        if orden.total > 0:
            CuentaProveedor.objects.get_or_create(
                orden_compra=orden,
                defaults={
                    'proveedor': orden.proveedor,
                    'monto_total': orden.total,
                    'monto_pagado': 0,
                    'estado': 'PENDIENTE',
                    'observaciones': f'Cuenta generada automáticamente por recepción de la OC-{orden.id:04d}',
                }
            )
            
        return Response(self.get_serializer(orden).data)

