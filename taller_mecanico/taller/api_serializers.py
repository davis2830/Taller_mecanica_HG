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
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']

class TipoServicioMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ['id', 'nombre', 'precio']

class VehiculoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id', 'marca', 'modelo', 'placa', 'color']

class CitaMiniSerializer(serializers.ModelSerializer):
    cliente = ClienteMiniSerializer(read_only=True)
    servicio = TipoServicioMiniSerializer(read_only=True)
    class Meta:
        model = Cita
        fields = ['id', 'estado', 'cliente', 'servicio']

class OrdenTrabajoKanbanSerializer(serializers.ModelSerializer):
    vehiculo = VehiculoMiniSerializer(read_only=True)
    cita = CitaMiniSerializer(read_only=True)
    mecanico_asignado = MecanicoMiniSerializer(read_only=True)
    
    class Meta:
        model = OrdenTrabajo
        fields = [
            'id', 'estado', 'diagnostico', 'fecha_creacion', 'fecha_actualizacion',
            'vehiculo', 'cita', 'mecanico_asignado', 'costo_total'
        ]

class ProductoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'codigo', 'precio_venta', 'stock_actual']

class OrdenRepuestoSerializer(serializers.ModelSerializer):
    producto = ProductoMiniSerializer(read_only=True)
    
    class Meta:
        model = OrdenRepuesto
        fields = ['id', 'producto', 'cantidad', 'precio_unitario', 'subtotal']

class OrdenTrabajoDetalleSerializer(OrdenTrabajoKanbanSerializer):
    repuestos = OrdenRepuestoSerializer(many=True, read_only=True)
    
    class Meta(OrdenTrabajoKanbanSerializer.Meta):
        fields = OrdenTrabajoKanbanSerializer.Meta.fields + ['repuestos']
