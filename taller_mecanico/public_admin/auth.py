"""Autenticación JWT para PublicUser (superadmin SaaS).

El `PublicUser` vive en el schema ``public`` y NO es un ``auth.User`` de Django
— son modelos separados por diseño (ver ``public_admin/models.py``). Esto
significa que ``rest_framework_simplejwt`` por default NO sabe cómo autenticar
a un ``PublicUser``, porque asume ``AUTH_USER_MODEL``.

Este módulo provee:

1. ``PublicAdminTokenSerializer``: recibe ``email`` + ``password``, busca el
   ``PublicUser`` en el schema ``public``, valida password y emite un par
   access/refresh con el claim ``user_type='public_admin'``.

2. ``PublicAdminJWTAuthentication``: clase de autenticación DRF que, ante un
   Bearer token con ``user_type='public_admin'``, resuelve el ``PublicUser``
   correspondiente. El request queda con ``request.user = <PublicUser>`` y el
   ``IsAuthenticated`` default de DRF funciona sin cambios.

Seguridad:
    - Siempre se consulta ``PublicUser`` dentro de ``schema_context('public')``,
      aunque el request entre por un subdomain de tenant. Esto evita que un
      atacante cree un ``PublicUser`` fake en un schema de tenant.
    - El token incluye ``user_type`` para que la permission class
      ``IsPublicAdmin`` pueda diferenciar de un JWT de ``auth.User`` que
      comparte endpoint de token.
"""
from __future__ import annotations

from typing import Any

from django.utils import timezone
from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from public_admin.models import PublicUser


USER_TYPE_PUBLIC_ADMIN = 'public_admin'


def _get_public_user(email: str) -> PublicUser | None:
    """Busca un PublicUser activo por email, siempre dentro del schema public.

    Retorna ``None`` si no existe o está desactivado; nunca lanza DoesNotExist.
    """
    with schema_context(get_public_schema_name()):
        try:
            return PublicUser.objects.get(email__iexact=email, activo=True)
        except PublicUser.DoesNotExist:
            return None


class PublicAdminTokenSerializer(serializers.Serializer):
    """Emite JWT para un PublicUser.

    Usa email + password. Agrega ``user_type='public_admin'``, ``public_user_id``
    y ``role`` al payload para que ``PublicAdminJWTAuthentication`` pueda
    resolver el user sin hitear la DB en cada request (lo hace igual, pero los
    claims sirven para permisos livianos).
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        email = attrs['email']
        password = attrs['password']

        user = _get_public_user(email)
        if user is None or not user.check_password(password):
            # Mensaje genérico — no revelamos si el email existe o no.
            raise AuthenticationFailed(
                'Credenciales inválidas o usuario desactivado.',
                code='invalid_credentials',
            )

        # Actualizar último login (dentro de public explícitamente).
        with schema_context(get_public_schema_name()):
            user.ultimo_login = timezone.now()
            user.save(update_fields=['ultimo_login'])

        refresh = RefreshToken()
        refresh['user_type'] = USER_TYPE_PUBLIC_ADMIN
        refresh['public_user_id'] = user.pk
        refresh['email'] = user.email
        refresh['role'] = user.rol

        access = refresh.access_token
        # Los access tokens heredan claims del refresh por default, pero lo
        # hacemos explícito para que sea fácil debuggear con jwt.io.
        access['user_type'] = USER_TYPE_PUBLIC_ADMIN
        access['public_user_id'] = user.pk
        access['email'] = user.email
        access['role'] = user.rol

        return {
            'refresh': str(refresh),
            'access': str(access),
            'user': {
                'id': user.pk,
                'email': user.email,
                'nombre': user.nombre,
                'rol': user.rol,
                'user_type': USER_TYPE_PUBLIC_ADMIN,
            },
        }


class PublicAdminJWTAuthentication(JWTAuthentication):
    """Resuelve un Bearer JWT a su PublicUser correspondiente.

    A diferencia de ``JWTAuthentication`` standard (que resuelve a
    ``auth.User``), este backend resuelve a ``PublicUser`` cuando el token
    tiene ``user_type='public_admin'``. Si el claim no existe o es otro,
    devuelve None desde ``authenticate()`` para que el siguiente backend de
    DRF (el JWT estándar) procese el token como ``auth.User``.
    """

    def authenticate(self, request):  # type: ignore[override]
        header = self.get_header(request)
        if header is None:
            return None
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)

        # Si no es un token de PublicUser, dejamos que el siguiente backend
        # (JWTAuthentication estándar) lo procese.
        if validated_token.get('user_type') != USER_TYPE_PUBLIC_ADMIN:
            return None

        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):  # type: ignore[override]
        public_user_id = validated_token.get('public_user_id')
        if public_user_id is None:
            raise InvalidToken('Token sin public_user_id.')

        user = _get_public_user_by_id(public_user_id)
        if user is None:
            raise AuthenticationFailed(
                'Usuario del token no existe o está desactivado.',
                code='user_not_found',
            )
        return user


def _get_public_user_by_id(pk: int) -> PublicUser | None:
    with schema_context(get_public_schema_name()):
        try:
            return PublicUser.objects.get(pk=pk, activo=True)
        except PublicUser.DoesNotExist:
            return None
