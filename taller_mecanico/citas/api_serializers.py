from rest_framework import serializers
from .models import Cita, Vehiculo, TipoServicio, RecepcionVehiculo, RecepcionFoto, ConfiguracionTaller
from django.contrib.auth.models import User


class ConfiguracionTallerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionTaller
        fields = [
            'capacidad_mecanico', 'capacidad_carwash',
            'hora_apertura', 'hora_cierre',
            'granularidad_slot', 'dias_laborales',
            'actualizado_el',
        ]
        read_only_fields = ['actualizado_el']

    def validate_dias_laborales(self, value):
        if not isinstance(value, list) or not all(isinstance(x, int) and 0 <= x <= 6 for x in value):
            raise serializers.ValidationError("dias_laborales debe ser una lista de enteros entre 0 y 6.")
        return sorted(set(value))

    def validate(self, attrs):
        apertura = attrs.get('hora_apertura') or getattr(self.instance, 'hora_apertura', None)
        cierre = attrs.get('hora_cierre') or getattr(self.instance, 'hora_cierre', None)
        if apertura and cierre and apertura >= cierre:
            raise serializers.ValidationError({'hora_cierre': 'La hora de cierre debe ser posterior a la de apertura.'})
        return attrs

class ClienteMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'full_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

class TipoServicioSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    
    class Meta:
        model = TipoServicio
        fields = ['id', 'nombre', 'descripcion', 'duracion', 'precio', 'categoria', 'categoria_display']

# ---------------------------------------------------------------------------
# Vehículo
# ---------------------------------------------------------------------------
class VehiculoSerializer(serializers.ModelSerializer):
    propietario = ClienteMiniSerializer(read_only=True)
    total_citas = serializers.SerializerMethodField()
    ultima_visita = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehiculo
        fields = ['id', 'propietario', 'marca', 'modelo', 'año', 'placa', 'color', 'fecha_registro', 'total_citas', 'ultima_visita',
                  'vin_chasis', 'numero_motor', 'cilindrada_motor', 'tipo_combustible', 'transmision',
                  'unidad_medida_kilometraje', 'kilometraje_actual']

    def get_total_citas(self, obj):
        return obj.citas.count()

    def get_ultima_visita(self, obj):
        ultima = obj.citas.filter(estado='COMPLETADA').order_by('-fecha').first()
        return ultima.fecha if ultima else None

class VehiculoWriteSerializer(serializers.ModelSerializer):
    """Usado para crear/editar - acepta propietario_id como entero"""
    propietario_id = serializers.IntegerField()

    class Meta:
        model = Vehiculo
        fields = ['propietario_id', 'marca', 'modelo', 'año', 'placa', 'color',
                  'vin_chasis', 'numero_motor', 'cilindrada_motor', 'tipo_combustible', 'transmision',
                  'unidad_medida_kilometraje', 'kilometraje_actual']

    def validate_propietario_id(self, value):
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Usuario no encontrado.")
        return value

    def create(self, validated_data):
        propietario_id = validated_data.pop('propietario_id')
        validated_data['propietario'] = User.objects.get(pk=propietario_id)
        return Vehiculo.objects.create(**validated_data)

    def update(self, instance, validated_data):
        propietario_id = validated_data.pop('propietario_id', None)
        if propietario_id:
            instance.propietario = User.objects.get(pk=propietario_id)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

# ---------------------------------------------------------------------------
# Recepción / Check-In
# ---------------------------------------------------------------------------
class RecepcionFotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecepcionFoto
        fields = ['id', 'imagen']

class RecepcionSerializer(serializers.ModelSerializer):
    recibido_por_nombre = serializers.SerializerMethodField(read_only=True)
    vehiculo_info = VehiculoSerializer(source='vehiculo', read_only=True)
    fotos = RecepcionFotoSerializer(many=True, read_only=True)

    class Meta:
        model = RecepcionVehiculo
        fields = [
            'id', 'vehiculo', 'vehiculo_info', 'cita',
            'fecha_ingreso', 'kilometraje', 'unidad_distancia', 'gasolina_pct',
            'motivo_ingreso', 'diagnostico_inicial', 'danos_previos',
            'tiene_llanta_repuesto', 'tiene_gata_herramientas',
            'tiene_radio', 'tiene_documentos', 'otros_objetos',
            'recibido_por', 'recibido_por_nombre', 'firma_cliente_text',
            'luces_tablero', 'estado_fluidos', 'estado_cristales',
            'firma_digital', 'firma_mecanico', 'diagrama_danos', 'fotos'
        ]
        read_only_fields = ['recibido_por', 'fecha_ingreso']

    def get_recibido_por_nombre(self, obj):
        if obj.recibido_por:
            return obj.recibido_por.get_full_name() or obj.recibido_por.username
        return None

# ---------------------------------------------------------------------------
# Cita
# ---------------------------------------------------------------------------
class CitaSerializer(serializers.ModelSerializer):
    cliente = ClienteMiniSerializer(read_only=True)
    vehiculo = VehiculoSerializer(read_only=True)
    servicio = TipoServicioSerializer(read_only=True)
    tiene_orden = serializers.SerializerMethodField()
    orden_trabajo_id = serializers.SerializerMethodField()
    atendida_por_nombre = serializers.SerializerMethodField()
    tiene_recepcion = serializers.SerializerMethodField()
    
    class Meta:
        model = Cita
        fields = [
            'id', 'cliente', 'vehiculo', 'servicio', 
            'fecha', 'hora_inicio', 'hora_fin', 'estado', 
            'notas', 'creada_el', 'tiene_orden', 'orden_trabajo_id',
            'atendida_por_nombre', 'tiene_recepcion',
        ]

    def get_tiene_orden(self, obj):
        return hasattr(obj, 'orden_trabajo') and obj.orden_trabajo is not None

    def get_orden_trabajo_id(self, obj):
        if hasattr(obj, 'orden_trabajo') and obj.orden_trabajo:
            return obj.orden_trabajo.id
        return None
        
    def get_atendida_por_nombre(self, obj):
        if obj.atendida_por:
            return obj.atendida_por.get_full_name() or obj.atendida_por.username
        return None

    def get_tiene_recepcion(self, obj):
        return hasattr(obj, 'recepcion') and obj.recepcion is not None

class CitaCreacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = ['vehiculo', 'servicio', 'fecha', 'hora_inicio', 'notas']
        
    def create(self, validated_data):
        vehiculo = validated_data.get('vehiculo')
        validated_data['cliente'] = vehiculo.propietario
        return super().create(validated_data)
