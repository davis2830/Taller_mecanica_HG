from rest_framework import serializers
from django.contrib.auth.models import User
from usuarios.models import Perfil, Rol
from citas.models import Vehiculo

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id', 'nombre', 'descripcion']

class PerfilSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    
    class Meta:
        model = Perfil
        fields = ['telefono', 'direccion', 'rol']

class UserSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined', 'perfil']

class ClienteSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
    vehiculos_count = serializers.SerializerMethodField(read_only=True)
    nombre_completo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'telefono', 'is_active', 'date_joined', 'perfil', 'vehiculos_count', 'nombre_completo']
        read_only_fields = ['id', 'username', 'is_active', 'date_joined']
    
    def get_vehiculos_count(self, obj):
        return obj.vehiculos.count() if hasattr(obj, 'vehiculos') else 0
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def create(self, validated_data):
        telefono = validated_data.pop('telefono', '')
        
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

        # Update Perfil telephone
        if hasattr(user, 'perfil'):
            user.perfil.telefono = telefono
            user.perfil.save()
            
        return user

    def update(self, instance, validated_data):
        telefono = validated_data.pop('telefono', None)

        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()

        if telefono is not None and hasattr(instance, 'perfil'):
            instance.perfil.telefono = telefono
            instance.perfil.save()
            
        return instance
