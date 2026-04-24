from rest_framework import serializers
from .models import Proveedor, CategoriaProducto, Producto, MovimientoInventario, AlertaInventario

class ProveedorMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'contacto']

class CategoriaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProducto
        fields = '__all__'

class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor_principal.nombre', read_only=True)
    necesita_reposicion = serializers.BooleanField(read_only=True)
    valor_inventario = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Producto
        fields = '__all__'

class ProductoListSerializer(ProductoSerializer):
    class Meta(ProductoSerializer.Meta):
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'marca', 'calidad', 'tipo',
            'precio_venta', 'precio_compra',
            'stock_actual', 'stock_minimo', 'unidad_medida', 'necesita_reposicion',
            'activo', 'categoria', 'categoria_nombre',
            'proveedor_principal', 'proveedor_nombre', 'valor_inventario'
        ]

class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = MovimientoInventario
        fields = '__all__'
        
    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.username
        return "Sistema"

class AlertaInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    resuelto_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = AlertaInventario
        fields = '__all__'
        
    def get_resuelto_por_nombre(self, obj):
        if obj.resuelto_por:
            return f"{obj.resuelto_por.first_name} {obj.resuelto_por.last_name}".strip() or obj.resuelto_por.username
        return None

# ==========================================
#     COMPRAS Y PROVEEDORES
# ==========================================

from .models import OrdenCompra, DetalleOrdenCompra, CuentaProveedor, PagoProveedor, PrecioProveedor

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

class DetalleOrdenCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    producto_calidad = serializers.CharField(source='producto.calidad', read_only=True)
    producto_marca = serializers.CharField(source='producto.marca', read_only=True)
    
    class Meta:
        model = DetalleOrdenCompra
        fields = ['id', 'producto', 'producto_nombre', 'producto_codigo', 'producto_calidad', 'producto_marca', 'cantidad_solicitada', 'cantidad_recibida', 'precio_unitario', 'subtotal']
        read_only_fields = ['subtotal', 'cantidad_recibida']

class OrdenCompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    detalles = DetalleOrdenCompraSerializer(many=True, read_only=True)
    creada_por_nombre = serializers.SerializerMethodField()
    cancelada_por_nombre = serializers.SerializerMethodField()
    cita_taller_descripcion = serializers.SerializerMethodField()

    class Meta:
        model = OrdenCompra
        fields = '__all__'
        read_only_fields = ['total', 'estado', 'fecha_recepcion', 'creada_por', 'cancelada_por']
        
    def get_creada_por_nombre(self, obj):
        if obj.creada_por:
            return f"{obj.creada_por.first_name} {obj.creada_por.last_name}".strip() or obj.creada_por.username
        return "Sistema"

    def get_cancelada_por_nombre(self, obj):
        if obj.cancelada_por:
            return f"{obj.cancelada_por.first_name} {obj.cancelada_por.last_name}".strip() or obj.cancelada_por.username
        return None

    def get_cita_taller_descripcion(self, obj):
        if obj.cita_taller:
            return f"OT-{obj.cita_taller.id:04d} ({obj.cita_taller.vehiculo.placa})"
        return None

class PagoProveedorSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = PagoProveedor
        fields = '__all__'
        read_only_fields = ['registrado_por']
        
    def get_registrado_por_nombre(self, obj):
        if obj.registrado_por:
            return f"{obj.registrado_por.first_name} {obj.registrado_por.last_name}".strip() or obj.registrado_por.username
        return "Sistema"

class CuentaProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    pagos = PagoProveedorSerializer(many=True, read_only=True)
    orden_compra_codigo = serializers.SerializerMethodField()
    saldo_pendiente = serializers.ReadOnlyField()
    
    class Meta:
        model = CuentaProveedor
        fields = '__all__'
        
    def get_orden_compra_codigo(self, obj):
        if obj.orden_compra:
            return f"OC-{obj.orden_compra.id:04d}"
        return None

class PrecioProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = PrecioProveedor
        fields = '__all__'

