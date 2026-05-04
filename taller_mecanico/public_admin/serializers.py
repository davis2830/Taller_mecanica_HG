"""Serializers DRF para el panel superadmin SaaS.

Exponen los modelos globales (``Tenant``, ``Domain``, ``PublicUser``) que
viven en el schema ``public`` — nunca exponen modelos de tenant.
"""
from __future__ import annotations

from rest_framework import serializers

from public_admin.models import PublicUser
from tenancy.models import SLUGS_RESERVADOS, Domain, Tenant


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ('id', 'domain', 'is_primary', 'tenant')
        read_only_fields = ('id',)


class TenantSerializer(serializers.ModelSerializer):
    """Tenant con sus dominios anidados (read-only) + contador.

    El ``schema_name`` se deriva del slug automáticamente (ver ``Tenant.save``),
    así que no lo exponemos como input.
    """

    dominios = DomainSerializer(source='domains', many=True, read_only=True)
    dominio_principal = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = (
            'id',
            'schema_name',
            'nombre',
            'slug',
            'email_contacto',
            'activo',
            'trial_hasta',
            'fecha_creacion',
            'fecha_actualizacion',
            'dominios',
            'dominio_principal',
        )
        read_only_fields = (
            'id',
            'schema_name',
            'fecha_creacion',
            'fecha_actualizacion',
        )

    def get_dominio_principal(self, obj: Tenant) -> str | None:
        primary = obj.domains.filter(is_primary=True).first()
        return primary.domain if primary else None

    def validate_slug(self, value: str) -> str:
        slug = (value or '').lower().strip()
        if slug in SLUGS_RESERVADOS:
            raise serializers.ValidationError(
                f'"{slug}" es un slug reservado del sistema.'
            )
        # Evita el doble prefijo "taller_taller_<slug>" en el schema: el
        # `taller_` lo agrega `Tenant.save()`, así que el slug ya no debería
        # incluirlo. Damos una sugerencia útil al usuario.
        if slug.startswith(('taller-', 'taller_')):
            sugerencia = slug.split('-', 1)[-1].split('_', 1)[-1]
            raise serializers.ValidationError(
                f'No usar el prefijo "taller-"/"taller_" — se agrega '
                f'automáticamente al schema. Usá "{sugerencia}" en su lugar.'
            )
        return slug


class TenantCreateSerializer(TenantSerializer):
    """Versión de creación: acepta opcionalmente un dominio inicial."""

    dominio_inicial = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text='Si se provee, crea un Domain primary con ese valor al crear el tenant.',
    )

    class Meta(TenantSerializer.Meta):
        fields = TenantSerializer.Meta.fields + ('dominio_inicial',)


class PublicUserSerializer(serializers.ModelSerializer):
    """PublicUser serializer. Password write-only, nunca se expone el hash."""

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
        min_length=8,
        help_text='Requerido al crear. Opcional al editar (vacío = no cambiar).',
    )

    class Meta:
        model = PublicUser
        fields = (
            'id',
            'email',
            'nombre',
            'rol',
            'activo',
            'ultimo_login',
            'fecha_creacion',
            'password',
        )
        read_only_fields = ('id', 'ultimo_login', 'fecha_creacion')

    def create(self, validated_data: dict) -> PublicUser:
        password = validated_data.pop('password', '')
        if not password:
            raise serializers.ValidationError(
                {'password': 'Requerido al crear un PublicUser.'}
            )
        user = PublicUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance: PublicUser, validated_data: dict) -> PublicUser:
        password = validated_data.pop('password', '')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
