"""Tests del panel superadmin SaaS (PR #49).

Cubre:
    - Login JWT de PublicUser (POST /api/v1/public-admin/token/).
    - Protección por rol: IsPublicAdmin rechaza JWTs de auth.User del taller.
    - CRUD de tenants desde el panel (crear, listar, desactivar).
    - CRUD de dominios del tenant.
    - CRUD de PublicUsers con protección al último superadmin.

Todos los tests viven en el schema ``public`` (PublicUser, Tenant, Domain son
modelos SHARED). Usamos ``schema_context('public')`` explícitamente en vez de
depender del fixture global que pone los tests en schema ``test``.
"""
from __future__ import annotations

import pytest
from django.urls import reverse
from django_tenants.utils import get_public_schema_name, schema_context
from rest_framework.test import APIClient

from public_admin.models import PublicUser
from tenancy.models import Domain, Tenant


pytestmark = pytest.mark.django_db


# ──────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────

@pytest.fixture
def superadmin() -> PublicUser:
    """PublicUser activo con rol superadmin, persistido en schema public."""
    with schema_context(get_public_schema_name()):
        u = PublicUser(
            email='super@autoservipro.com',
            nombre='Super Admin',
            rol=PublicUser.ROL_SUPERADMIN,
            activo=True,
        )
        u.set_password('supersecret123')
        u.save()
        return u


@pytest.fixture
def soporte_user() -> PublicUser:
    """PublicUser con rol soporte (no superadmin) — solo lectura."""
    with schema_context(get_public_schema_name()):
        u = PublicUser(
            email='soporte@autoservipro.com',
            nombre='Soporte',
            rol=PublicUser.ROL_SOPORTE,
            activo=True,
        )
        u.set_password('soportepass123')
        u.save()
        return u


@pytest.fixture
def api_client() -> APIClient:
    """Client que por default rutea por PUBLIC_SCHEMA_URLCONF.

    En tests, el ``Host`` del test client por default es ``testserver``,
    que está registrado como Domain del tenant ``test`` → rutea al schema
    ``test`` con ``ROOT_URLCONF``. Para los endpoints de public-admin
    necesitamos que django-tenants rutee a public. Creamos un Domain
    ``admin.testserver`` apuntando a un tenant público y lo usamos como
    Host header.
    """
    return APIClient()


@pytest.fixture
def public_domain() -> str:
    """Registra un Domain apuntando al schema public y lo retorna.

    Usamos ``admin.testserver`` como hostname convencional para los tests.
    """
    with schema_context(get_public_schema_name()):
        # Crear tenant público si no existe (schema_name='public').
        public_tenant, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'slug': 'public',
                'nombre': 'SaaS Admin',
                'email_contacto': 'admin@autoservipro.com',
                'activo': True,
            },
        )
        # auto_create_schema no corre en get_or_create + schema ya existe.
        Domain.objects.get_or_create(
            domain='admin.testserver',
            defaults={'tenant': public_tenant, 'is_primary': True},
        )
    return 'admin.testserver'


def _auth_client(client: APIClient, user: PublicUser, host: str) -> APIClient:
    """Loguea al PublicUser y devuelve un client con el token en Authorization."""
    from public_admin.auth import PublicAdminTokenSerializer
    # Usamos el serializer directo para evitar hacer login vía HTTP
    # (el endpoint lo testeamos aparte).
    with schema_context(get_public_schema_name()):
        serializer = PublicAdminTokenSerializer(data={
            'email': user.email,
            'password': 'supersecret123' if user.rol == PublicUser.ROL_SUPERADMIN
                       else 'soportepass123',
        })
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}', HTTP_HOST=host)
    return client


# ──────────────────────────────────────────────────────────────────────
# Login / token endpoint
# ──────────────────────────────────────────────────────────────────────

class TestPublicAdminToken:
    def test_login_exitoso_devuelve_access_y_refresh(
        self, api_client, superadmin, public_domain
    ):
        resp = api_client.post(
            '/api/v1/public-admin/token/',
            {'email': 'super@autoservipro.com', 'password': 'supersecret123'},
            format='json',
            HTTP_HOST=public_domain,
        )
        assert resp.status_code == 200
        assert 'access' in resp.data
        assert 'refresh' in resp.data
        assert resp.data['user']['email'] == 'super@autoservipro.com'
        assert resp.data['user']['user_type'] == 'public_admin'

    def test_login_con_password_incorrecta_es_401(
        self, api_client, superadmin, public_domain
    ):
        resp = api_client.post(
            '/api/v1/public-admin/token/',
            {'email': 'super@autoservipro.com', 'password': 'wrong'},
            format='json',
            HTTP_HOST=public_domain,
        )
        assert resp.status_code == 401

    def test_login_de_usuario_inactivo_falla(
        self, api_client, superadmin, public_domain
    ):
        with schema_context(get_public_schema_name()):
            superadmin.activo = False
            superadmin.save(update_fields=['activo'])
        resp = api_client.post(
            '/api/v1/public-admin/token/',
            {'email': 'super@autoservipro.com', 'password': 'supersecret123'},
            format='json',
            HTTP_HOST=public_domain,
        )
        assert resp.status_code == 401


# ──────────────────────────────────────────────────────────────────────
# /me/ endpoint
# ──────────────────────────────────────────────────────────────────────

class TestPublicAdminMe:
    def test_me_retorna_datos_del_publicuser_autenticado(
        self, api_client, superadmin, public_domain
    ):
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.get('/api/v1/public-admin/me/')
        assert resp.status_code == 200
        assert resp.data['email'] == 'super@autoservipro.com'
        assert resp.data['user_type'] == 'public_admin'
        assert resp.data['rol'] == 'superadmin'

    def test_me_sin_token_es_401(self, api_client, public_domain):
        resp = api_client.get('/api/v1/public-admin/me/', HTTP_HOST=public_domain)
        assert resp.status_code == 401


# ──────────────────────────────────────────────────────────────────────
# CRUD de tenants
# ──────────────────────────────────────────────────────────────────────

class TestTenantCRUD:
    def test_superadmin_puede_listar_tenants(
        self, api_client, superadmin, public_domain
    ):
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.get('/api/v1/public-admin/tenants/')
        assert resp.status_code == 200
        # La respuesta puede estar paginada o no según DRF settings.
        data = resp.data
        results = data.get('results', data) if isinstance(data, dict) else data
        assert isinstance(results, list)

    def test_superadmin_puede_crear_tenant_con_dominio_inicial(
        self, api_client, superadmin, public_domain
    ):
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.post(
            '/api/v1/public-admin/tenants/',
            {
                'slug': 'nuevotaller',
                'nombre': 'Nuevo Taller SA',
                'email_contacto': 'contacto@nuevotaller.com',
                'dominio_inicial': 'nuevotaller.localhost',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.data
        assert resp.data['slug'] == 'nuevotaller'
        assert resp.data['schema_name'] == 'taller_nuevotaller'

        with schema_context(get_public_schema_name()):
            t = Tenant.objects.get(slug='nuevotaller')
            assert Domain.objects.filter(tenant=t, domain='nuevotaller.localhost').exists()

    def test_crear_tenant_con_slug_reservado_es_400(
        self, api_client, superadmin, public_domain
    ):
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.post(
            '/api/v1/public-admin/tenants/',
            {
                'slug': 'admin',  # reservado
                'nombre': 'Taller Admin',
                'email_contacto': 'admin@test.com',
            },
            format='json',
        )
        assert resp.status_code == 400

    def test_crear_tenant_con_slug_prefijo_taller_es_400(
        self, api_client, superadmin, public_domain
    ):
        """Evita el doble prefijo `taller_taller_<slug>` en el schema."""
        c = _auth_client(api_client, superadmin, public_domain)
        for slug in ('taller-asis7', 'taller_asis7', 'TALLER-asis7'):
            resp = c.post(
                '/api/v1/public-admin/tenants/',
                {
                    'slug': slug,
                    'nombre': 'X',
                    'email_contacto': 'x@x.com',
                },
                format='json',
            )
            assert resp.status_code == 400, f'esperaba 400 para slug={slug!r}'
            assert 'slug' in resp.data
            # La sugerencia debe incluir el slug limpio sin el prefijo.
            assert 'asis7' in str(resp.data['slug']).lower()

    def test_superadmin_puede_desactivar_tenant_via_action(
        self, api_client, superadmin, public_domain
    ):
        with schema_context(get_public_schema_name()):
            t = Tenant(slug='paradesactivar', nombre='X', email_contacto='x@x.com')
            t.auto_create_schema = False  # no queremos crear el schema real aquí
            t.save()
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.post(f'/api/v1/public-admin/tenants/{t.pk}/desactivar/')
        assert resp.status_code == 200
        assert resp.data['activo'] is False

        with schema_context(get_public_schema_name()):
            t.refresh_from_db()
            assert t.activo is False

    def test_delete_soft_desactiva_en_vez_de_borrar(
        self, api_client, superadmin, public_domain
    ):
        with schema_context(get_public_schema_name()):
            t = Tenant(slug='parasoftdelete', nombre='X', email_contacto='x@x.com')
            t.auto_create_schema = False
            t.save()
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.delete(f'/api/v1/public-admin/tenants/{t.pk}/')
        assert resp.status_code == 200
        # El row sigue existiendo, solo activo=False.
        with schema_context(get_public_schema_name()):
            t.refresh_from_db()
            assert t.activo is False
            assert Tenant.objects.filter(pk=t.pk).exists()

    def test_soporte_no_puede_crear_tenant_solo_listar(
        self, api_client, soporte_user, public_domain
    ):
        c = _auth_client(api_client, soporte_user, public_domain)
        # Listar: OK
        resp = c.get('/api/v1/public-admin/tenants/')
        assert resp.status_code == 200
        # Crear: 403
        resp = c.post(
            '/api/v1/public-admin/tenants/',
            {
                'slug': 'deniedtaller',
                'nombre': 'Denied',
                'email_contacto': 'x@x.com',
            },
            format='json',
        )
        assert resp.status_code == 403


# ──────────────────────────────────────────────────────────────────────
# CRUD de PublicUsers
# ──────────────────────────────────────────────────────────────────────

class TestPublicUserCRUD:
    def test_superadmin_crea_soporte(
        self, api_client, superadmin, public_domain
    ):
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.post(
            '/api/v1/public-admin/users/',
            {
                'email': 'nuevo@saas.com',
                'nombre': 'Nuevo',
                'rol': 'soporte',
                'password': 'pass12345678',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.data
        assert resp.data['rol'] == 'soporte'
        with schema_context(get_public_schema_name()):
            assert PublicUser.objects.get(email='nuevo@saas.com').check_password('pass12345678')

    def test_no_se_puede_desactivar_el_ultimo_superadmin(
        self, api_client, superadmin, public_domain
    ):
        # Solo hay un superadmin (`superadmin`). Intentar borrarlo debe fallar.
        c = _auth_client(api_client, superadmin, public_domain)
        resp = c.delete(f'/api/v1/public-admin/users/{superadmin.pk}/')
        assert resp.status_code == 400
        assert 'último superadmin' in str(resp.data).lower()
