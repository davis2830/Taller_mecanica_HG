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

class ClienteListSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)
    vehiculos_count = serializers.SerializerMethodField()
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'date_joined', 'perfil', 'vehiculos_count', 'nombre_completo']
    
    def get_vehiculos_count(self, obj):
        return obj.vehiculos.count() if hasattr(obj, 'vehiculos') else 0
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}" or obj.username
    

    
