from rest_framework import serializers
from django.contrib.auth.models import User
from usuarios.models import Perfil, Rol, Empresa, TareaProgramada
from citas.models import Vehiculo


class TareaProgramadaSerializer(serializers.ModelSerializer):
    proxima_ejecucion = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TareaProgramada
        fields = [
            'id', 'tarea_id', 'nombre', 'descripcion',
            'hora', 'habilitada',
            'ultima_ejecucion', 'ultima_ejecucion_status',
            'ultima_ejecucion_mensaje', 'proxima_ejecucion',
        ]
        read_only_fields = [
            'id', 'tarea_id', 'nombre', 'descripcion',
            'ultima_ejecucion', 'ultima_ejecucion_status',
            'ultima_ejecucion_mensaje', 'proxima_ejecucion',
        ]

    def get_proxima_ejecucion(self, obj):
        from usuarios.scheduler import get_next_run_time
        nrt = get_next_run_time(obj.tarea_id)
        return nrt.isoformat() if nrt else None


class EmpresaSerializer(serializers.ModelSerializer):
    saldo_pendiente_total = serializers.SerializerMethodField(read_only=True)
    tiene_vencimientos = serializers.SerializerMethodField(read_only=True)
    excede_limite = serializers.SerializerMethodField(read_only=True)
    facturas_count = serializers.SerializerMethodField(read_only=True)
    vehiculos_count = serializers.SerializerMethodField(read_only=True)
    nombre_mostrar = serializers.CharField(read_only=True)

    class Meta:
        model = Empresa
        fields = [
            'id',
            'nit', 'razon_social', 'nombre_comercial', 'nombre_mostrar',
            'direccion_fiscal',
            'email_cobro', 'contacto_principal', 'telefono',
            'dias_credito', 'limite_credito',
            'recordatorios_activos', 'activo',
            'notas',
            'saldo_pendiente_total', 'tiene_vencimientos', 'excede_limite',
            'facturas_count', 'vehiculos_count',
            'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']

    def get_saldo_pendiente_total(self, obj):
        return str(obj.saldo_pendiente_total)

    def get_tiene_vencimientos(self, obj):
        return obj.tiene_vencimientos

    def get_excede_limite(self, obj):
        return obj.excede_limite

    def get_facturas_count(self, obj):
        return obj.facturas.count()

    def get_vehiculos_count(self, obj):
        return obj.vehiculos.count()

    def validate_nit(self, value):
        normalized = (value or '').strip().upper().replace(' ', '')
        if not normalized:
            raise serializers.ValidationError("El NIT es obligatorio.")
        return normalized

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'descripcion']

class PerfilSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Perfil
        fields = [
            'telefono', 'direccion', 'rol',
            'nit', 'nombre_fiscal', 'direccion_fiscal',
            'avatar', 'avatar_url',
        ]
        extra_kwargs = {'avatar': {'write_only': True, 'required': False}}

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        # Devolvemos siempre URL relativa para que el navegador la resuelva
        # contra el origen de la página (compatible con SPA + proxy /media/).
        return obj.avatar.url

class UserSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'perfil',
        ]


class MiPerfilSerializer(serializers.ModelSerializer):
    """
    Vista propia del usuario logueado: GET para mostrar / PATCH para
    editar nombre, apellido, teléfono, dirección y datos fiscales. El
    cambio de email tiene su endpoint propio (con verificación) y el
    avatar también (multipart aparte). El password idem.
    """
    telefono = serializers.CharField(source='perfil.telefono', allow_blank=True, required=False)
    direccion = serializers.CharField(source='perfil.direccion', allow_blank=True, required=False)
    nit = serializers.CharField(source='perfil.nit', allow_blank=True, required=False)
    nombre_fiscal = serializers.CharField(source='perfil.nombre_fiscal', allow_blank=True, required=False)
    direccion_fiscal = serializers.CharField(source='perfil.direccion_fiscal', allow_blank=True, required=False)
    rol = serializers.SerializerMethodField(read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    email_pendiente = serializers.CharField(source='perfil.email_pendiente', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_superuser',
            'telefono', 'direccion',
            'nit', 'nombre_fiscal', 'direccion_fiscal',
            'rol', 'avatar_url', 'email_pendiente',
        ]
        read_only_fields = ['id', 'username', 'email', 'is_superuser', 'rol', 'avatar_url', 'email_pendiente']

    def get_rol(self, obj):
        try:
            r = obj.perfil.rol
        except Perfil.DoesNotExist:
            return None
        return r.nombre if r else None

    def get_avatar_url(self, obj):
        try:
            avatar = obj.perfil.avatar
        except Perfil.DoesNotExist:
            return None
        if not avatar:
            return None
        # Devolvemos siempre URL relativa para que el navegador la resuelva
        # contra el origen de la página (compatible con SPA + proxy /media/).
        return avatar.url

    def update(self, instance, validated_data):
        perfil_data = validated_data.pop('perfil', {})
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if perfil_data:
            perfil, _ = Perfil.objects.get_or_create(usuario=instance)
            for k, v in perfil_data.items():
                setattr(perfil, k, v)
            perfil.save()
        return instance

class ClienteSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nit = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nombre_fiscal = serializers.CharField(write_only=True, required=False, allow_blank=True)
    direccion_fiscal = serializers.CharField(write_only=True, required=False, allow_blank=True)
    vehiculos_count = serializers.SerializerMethodField(read_only=True)
    nombre_completo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'telefono', 'nit', 'nombre_fiscal', 'direccion_fiscal',
            'is_active', 'date_joined', 'perfil',
            'vehiculos_count', 'nombre_completo',
        ]
        read_only_fields = ['id', 'username', 'is_active', 'date_joined']
    
    def get_vehiculos_count(self, obj):
        return obj.vehiculos.count() if hasattr(obj, 'vehiculos') else 0
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def create(self, validated_data):
        telefono = validated_data.pop('telefono', '')
        nit = validated_data.pop('nit', '')
        nombre_fiscal = validated_data.pop('nombre_fiscal', '')
        direccion_fiscal = validated_data.pop('direccion_fiscal', '')

        email = validated_data.get('email', '')
        base_username = email.split('@')[0] if email else 'cliente'
        username = base_username
        counter = 1
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        validated_data['username'] = username
        user = User.objects.create(**validated_data)
        user.set_unusable_password()
        user.save()

        if hasattr(user, 'perfil'):
            p = user.perfil
            p.telefono = telefono
            if nit:
                p.nit = nit
            if nombre_fiscal:
                p.nombre_fiscal = nombre_fiscal
            if direccion_fiscal:
                p.direccion_fiscal = direccion_fiscal
            p.save()

        return user

    def update(self, instance, validated_data):
        telefono = validated_data.pop('telefono', None)
        nit = validated_data.pop('nit', None)
        nombre_fiscal = validated_data.pop('nombre_fiscal', None)
        direccion_fiscal = validated_data.pop('direccion_fiscal', None)

        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()

        if hasattr(instance, 'perfil'):
            p = instance.perfil
            if telefono is not None:
                p.telefono = telefono
            if nit is not None:
                p.nit = nit or 'CF'
            if nombre_fiscal is not None:
                p.nombre_fiscal = nombre_fiscal
            if direccion_fiscal is not None:
                p.direccion_fiscal = direccion_fiscal
            p.save()

        return instance
