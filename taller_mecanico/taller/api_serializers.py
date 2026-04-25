from rest_framework import serializers
from .models import OrdenTrabajo, OrdenRepuesto
from citas.models import Cita, Vehiculo, TipoServicio
from inventario.models import Producto
from django.contrib.auth.models import User
from django.contrib.auth.models import User

class MecanicoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'username']

class ClienteMiniSerializer(serializers.ModelSerializer):
    telefono = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'telefono']

    def get_telefono(self, obj):
        if hasattr(obj, 'perfil') and obj.perfil:
            return obj.perfil.telefono or None
        return None

class TipoServicioMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ['id', 'nombre', 'precio']

class VehiculoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id', 'marca', 'modelo', 'placa', 'color', 'año']

class CitaMiniSerializer(serializers.ModelSerializer):
    cliente = ClienteMiniSerializer(read_only=True)
    servicio = TipoServicioMiniSerializer(read_only=True)
    class Meta:
        model = Cita
        fields = ['id', 'estado', 'cliente', 'servicio', 'notas', 'fecha']

class OrdenTrabajoKanbanSerializer(serializers.ModelSerializer):
    vehiculo = VehiculoMiniSerializer(read_only=True)
    cita = CitaMiniSerializer(read_only=True)
    mecanico_asignado = MecanicoMiniSerializer(read_only=True)
    cita_id = serializers.SerializerMethodField()
    factura_id = serializers.SerializerMethodField()
    factura_numero = serializers.SerializerMethodField()
    factura_estado = serializers.SerializerMethodField()
    recepcion_id = serializers.SerializerMethodField()
    recepcion_fecha = serializers.SerializerMethodField()
    tiene_recepcion = serializers.SerializerMethodField()

    class Meta:
        model = OrdenTrabajo
        fields = [
            'id', 'estado', 'diagnostico', 'fecha_creacion', 'fecha_actualizacion',
            'vehiculo', 'cita', 'mecanico_asignado', 'costo_total',
            'cita_id', 'factura_id', 'factura_numero', 'factura_estado',
            'recepcion_id', 'recepcion_fecha', 'tiene_recepcion',
        ]

    def get_cita_id(self, obj):
        return obj.cita_id if obj.cita_id else None

    def get_factura_id(self, obj):
        if hasattr(obj, 'factura') and obj.factura:
            return obj.factura.id
        return None

    def get_factura_numero(self, obj):
        if hasattr(obj, 'factura') and obj.factura:
            return obj.factura.numero_factura
        return None

    def get_factura_estado(self, obj):
        if hasattr(obj, 'factura') and obj.factura:
            return obj.factura.estado
        return None

    def _recepcion_vigente(self, obj):
        """Recepción más reciente asociada a la cita de la OT (si existe)."""
        cita = getattr(obj, 'cita', None)
        if not cita:
            return None
        return cita.recepciones.order_by('-fecha_ingreso').first()

    def get_recepcion_id(self, obj):
        r = self._recepcion_vigente(obj)
        return r.id if r else None

    def get_recepcion_fecha(self, obj):
        r = self._recepcion_vigente(obj)
        return r.fecha_ingreso.isoformat() if r else None

    def get_tiene_recepcion(self, obj):
        return self._recepcion_vigente(obj) is not None

class ProductoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'codigo', 'precio_venta', 'stock_actual']

class OrdenRepuestoSerializer(serializers.ModelSerializer):
    producto = ProductoMiniSerializer(read_only=True)
    
    class Meta:
        model = OrdenRepuesto
        fields = ['id', 'producto', 'cantidad', 'precio_unitario', 'en_transito', 'fecha_agregado']

class OrdenTrabajoDetalleSerializer(OrdenTrabajoKanbanSerializer):
    repuestos = OrdenRepuestoSerializer(many=True, read_only=True)
    
    class Meta(OrdenTrabajoKanbanSerializer.Meta):
        fields = OrdenTrabajoKanbanSerializer.Meta.fields + ['repuestos']
