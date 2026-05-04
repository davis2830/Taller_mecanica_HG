"""API views del panel superadmin SaaS.

Todos los endpoints:

- Aceptan/emiten solo JWTs con ``user_type='public_admin'``.
- Leen/escriben siempre contra el schema ``public`` (vía ``schema_context``).
- Son el ÚNICO camino documentado para administrar tenants/dominios sin tocar
  el shell de Django.

El routing de este módulo vive en ``public_admin/api_urls.py`` y se monta en
``taller_mecanico/public_urls.py`` (el ``PUBLIC_SCHEMA_URLCONF``).
"""
from __future__ import annotations

from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from public_admin.auth import PublicAdminTokenSerializer, USER_TYPE_PUBLIC_ADMIN
from public_admin.models import PublicUser
from public_admin.permissions import IsPublicAdmin, IsSuperadmin
from public_admin.serializers import (
    DomainSerializer,
    PublicUserSerializer,
    TenantCreateSerializer,
    TenantSerializer,
)
from tenancy.models import Domain, Tenant


class PublicAdminTokenView(GenericAPIView):
    """POST /api/v1/public-admin/token/ — login de PublicUser.

    Entrada: ``{email, password}``. Salida: ``{access, refresh, user}``.

    Este endpoint es el único con ``AllowAny``; todos los demás requieren
    ``IsPublicAdmin`` (Bearer token válido de PublicUser).
    """

    permission_classes = [AllowAny]
    serializer_class = PublicAdminTokenSerializer

    def post(self, request) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class PublicAdminMeView(APIView):
    """GET /api/v1/public-admin/me/ — datos del PublicUser autenticado."""

    permission_classes = [IsPublicAdmin]

    def get(self, request) -> Response:
        user: PublicUser = request.user
        return Response({
            'id': user.pk,
            'email': user.email,
            'nombre': user.nombre,
            'rol': user.rol,
            'activo': user.activo,
            'ultimo_login': user.ultimo_login,
            'user_type': USER_TYPE_PUBLIC_ADMIN,
        })


# ─────────────────────────────────────────────────────────────────────────
# ViewSets — siempre ejecutan queries en el schema public para asegurar
# que no se vaya a mezclar con el schema del request (que para admin.*
# ya debería ser public, pero lo reforzamos por defensa en profundidad).
# ─────────────────────────────────────────────────────────────────────────


class _PublicSchemaViewSetMixin:
    """Mixin que envuelve los handlers DRF en ``schema_context('public')``."""

    def initial(self, request, *args, **kwargs):  # type: ignore[override]
        # Entramos al schema public para toda la request. django-tenants lo
        # restaura al final del request automáticamente.
        self._public_ctx = schema_context(get_public_schema_name())
        self._public_ctx.__enter__()
        try:
            super().initial(request, *args, **kwargs)  # type: ignore[misc]
        except Exception:
            self._public_ctx.__exit__(None, None, None)
            raise

    def finalize_response(self, request, response, *args, **kwargs):  # type: ignore[override]
        try:
            return super().finalize_response(request, response, *args, **kwargs)  # type: ignore[misc]
        finally:
            ctx = getattr(self, '_public_ctx', None)
            if ctx is not None:
                ctx.__exit__(None, None, None)


class TenantViewSet(_PublicSchemaViewSetMixin, viewsets.ModelViewSet):
    """CRUD de tenants (talleres clientes del SaaS).

    - ``GET /tenants/`` — lista paginada.
    - ``POST /tenants/`` — crea tenant + schema + dominio inicial opcional.
    - ``GET /tenants/{id}/`` — detalle.
    - ``PATCH /tenants/{id}/`` — edita campos no-críticos (nombre, email, trial).
    - ``DELETE /tenants/{id}/`` — NO borra el schema (safety). Desactiva.
    - ``POST /tenants/{id}/activar/`` — reactivar (solo superadmin).
    - ``POST /tenants/{id}/desactivar/`` — desactivar (solo superadmin).
    """

    queryset = Tenant.objects.all().order_by('-fecha_creacion')
    permission_classes = [IsPublicAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return TenantCreateSerializer
        return TenantSerializer

    def get_permissions(self):
        # Mutaciones solo superadmin; lectura cualquier PublicUser activo.
        if self.action in {'create', 'update', 'partial_update', 'destroy',
                           'activar', 'desactivar'}:
            return [IsSuperadmin()]
        return super().get_permissions()

    def perform_create(self, serializer) -> None:
        dominio_inicial = serializer.validated_data.pop('dominio_inicial', '')
        tenant: Tenant = serializer.save()
        if dominio_inicial:
            Domain.objects.get_or_create(
                domain=dominio_inicial,
                defaults={'tenant': tenant, 'is_primary': True},
            )

    def destroy(self, request, *args, **kwargs):  # type: ignore[override]
        tenant = self.get_object()
        tenant.activo = False
        tenant.save(update_fields=['activo'])
        return Response(
            {'detail': f'Tenant {tenant.slug} desactivado (schema preservado).'},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        tenant = self.get_object()
        tenant.activo = True
        tenant.save(update_fields=['activo'])
        return Response(TenantSerializer(tenant).data)

    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        tenant = self.get_object()
        tenant.activo = False
        tenant.save(update_fields=['activo'])
        return Response(TenantSerializer(tenant).data)


class DomainViewSet(_PublicSchemaViewSetMixin,
                    mixins.ListModelMixin,
                    mixins.CreateModelMixin,
                    mixins.RetrieveModelMixin,
                    mixins.DestroyModelMixin,
                    viewsets.GenericViewSet):
    """CRUD de dominios. Un tenant puede tener varios; solo uno ``is_primary``."""

    queryset = Domain.objects.all().select_related('tenant').order_by('domain')
    serializer_class = DomainSerializer
    permission_classes = [IsPublicAdmin]

    def get_permissions(self):
        if self.action in {'create', 'destroy'}:
            return [IsSuperadmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        tenant_id = self.request.query_params.get('tenant')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class PublicUserViewSet(_PublicSchemaViewSetMixin, viewsets.ModelViewSet):
    """CRUD de PublicUsers (otros empleados del SaaS).

    Solo superadmin puede crear/editar/borrar. Todos los PublicUsers activos
    pueden listar.
    """

    queryset = PublicUser.objects.all().order_by('nombre')
    serializer_class = PublicUserSerializer
    permission_classes = [IsPublicAdmin]

    def get_permissions(self):
        if self.action in {'create', 'update', 'partial_update', 'destroy'}:
            return [IsSuperadmin()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):  # type: ignore[override]
        """Soft-delete: desactiva en vez de borrar (auditoría)."""
        user = self.get_object()
        # Proteger al último superadmin activo.
        if user.es_superadmin:
            otros = PublicUser.objects.filter(
                rol=PublicUser.ROL_SUPERADMIN, activo=True,
            ).exclude(pk=user.pk).count()
            if otros == 0:
                return Response(
                    {'detail': 'No se puede desactivar el último superadmin.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        user.activo = False
        user.save(update_fields=['activo'])
        return Response(
            {'detail': f'{user.email} desactivado.'},
            status=status.HTTP_200_OK,
        )
