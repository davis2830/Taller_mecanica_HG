"""Tests para los helpers tenant-aware: URL helpers + Celery base task.

Cubre lo crítico de PR #41c:
- ``tenant_backend_url`` / ``tenant_spa_url`` resuelven al subdominio del
  tenant actual y caen al global en schema ``public``.
- ``TenantAwareTask`` captura ``connection.schema_name`` al despachar y lo
  restaura al ejecutar — sin esto, un ``.delay()`` desde un tenant correría
  en el worker en otro schema y mezclaría datos.
"""
from __future__ import annotations

import pytest
from celery import shared_task
from django.db import connection
from django_tenants.utils import schema_context

from taller_mecanico.celery_helpers import TenantAwareTask
from taller_mecanico.url_helpers import (
    backend_url,
    spa_url,
    tenant_backend_url,
    tenant_spa_url,
)
from tenancy.models import Domain, Tenant


pytestmark = pytest.mark.django_db


# ──────────────────────────────────────────────────────────────────────
# tenant_backend_url / tenant_spa_url
# ──────────────────────────────────────────────────────────────────────

class TestTenantBackendUrl:
    def test_usa_dominio_primario_del_tenant_actual(self, settings):
        # El test corre dentro del tenant ``test`` (ver conftest.py). Su
        # primary domain es ``testserver``.
        settings.BACKEND_URL = 'http://localhost:8000'
        url = tenant_backend_url('/citas/confirmar-email/abc/')
        # Hereda scheme + puerto de BACKEND_URL, pero el host es el del tenant.
        assert url == 'http://testserver:8000/citas/confirmar-email/abc/'

    def test_no_inventa_puerto_si_backend_url_no_lo_trae(self, settings):
        settings.BACKEND_URL = 'https://api.autoservipro.com'
        url = tenant_backend_url('/x')
        assert url == 'https://testserver/x'

    def test_normaliza_path_sin_slash_inicial(self, settings):
        settings.BACKEND_URL = 'http://localhost:8000'
        url = tenant_backend_url('citas/abc')
        assert url == 'http://localhost:8000/citas/abc'.replace(
            'localhost', 'testserver'
        )

    def test_cae_a_backend_url_si_no_hay_tenant(self, settings):
        # En schema ``public`` (sin tenant), debe caer al global.
        settings.BACKEND_URL = 'http://localhost:8000'
        with schema_context('public'):
            url = tenant_backend_url('/x')
        assert url == backend_url('/x')

    def test_usa_dominio_primario_cuando_hay_varios(self, settings):
        # Crear otro tenant con 2 domains, el primary es el segundo.
        settings.BACKEND_URL = 'http://localhost:8000'
        # Operar sobre el schema public para crear el tenant.
        with schema_context('public'):
            tenant, _ = Tenant.objects.get_or_create(
                schema_name='taller_helper_test',
                defaults={
                    'slug': 'helper-test',
                    'nombre': 'Helper Test',
                    'email_contacto': 'helper@test.com',
                },
            )
            Domain.objects.get_or_create(
                domain='primario.localhost',
                defaults={'tenant': tenant, 'is_primary': True},
            )
            Domain.objects.get_or_create(
                domain='alias.localhost',
                defaults={'tenant': tenant, 'is_primary': False},
            )
        url = tenant_backend_url('/x', tenant=tenant)
        assert url == 'http://primario.localhost:8000/x'


class TestTenantSpaUrl:
    def test_usa_frontend_url_para_scheme_y_puerto(self, settings):
        settings.FRONTEND_URL = 'http://localhost:5173'
        url = tenant_spa_url('/citas')
        # Tenant ``test`` → primary domain ``testserver``.
        assert url == 'http://testserver:5173/citas'

    def test_cae_a_spa_url_si_no_hay_tenant(self, settings):
        settings.FRONTEND_URL = 'http://localhost:5173'
        with schema_context('public'):
            url = tenant_spa_url('/x')
        assert url == spa_url('/x')


# ──────────────────────────────────────────────────────────────────────
# TenantAwareTask
# ──────────────────────────────────────────────────────────────────────

# Variable a nivel de módulo para capturar el schema visto por la task.
_SCHEMAS_VISTOS: list[str] = []


@shared_task(base=TenantAwareTask)
def _capturar_schema_task(marker):
    """Task de prueba: registra el schema en el que se ejecuta."""
    _SCHEMAS_VISTOS.append((marker, connection.schema_name))
    return connection.schema_name


class TestTenantAwareTask:
    def setup_method(self):
        _SCHEMAS_VISTOS.clear()

    def test_task_corre_en_el_schema_que_la_despacho(self, settings):
        # Forzamos modo eager — el override de apply_async corre, capturando
        # el schema actual y pasándolo como kwarg ``_tenant_schema``.
        settings.CELERY_TASK_ALWAYS_EAGER = True
        # Estamos dentro del tenant ``test`` (autouse fixture en conftest).
        result = _capturar_schema_task.delay('A')
        assert result.get() == 'test'
        assert _SCHEMAS_VISTOS == [('A', 'test')]

    def test_task_despachada_desde_public_corre_en_public(self, settings):
        settings.CELERY_TASK_ALWAYS_EAGER = True
        with schema_context('public'):
            result = _capturar_schema_task.delay('B')
            assert result.get() == 'public'

    def test_task_despachada_desde_otro_tenant(self, settings):
        # Crear un tenant adicional; despachar desde adentro y verificar que
        # la task corre en ESE schema, no en el actual.
        settings.CELERY_TASK_ALWAYS_EAGER = True
        with schema_context('public'):
            tenant, _ = Tenant.objects.get_or_create(
                schema_name='taller_celery_test',
                defaults={
                    'slug': 'celery-test',
                    'nombre': 'Celery Test',
                    'email_contacto': 'celery@test.com',
                },
            )
            Domain.objects.get_or_create(
                domain='celery.localhost',
                defaults={'tenant': tenant, 'is_primary': True},
            )

        with schema_context('taller_celery_test'):
            result = _capturar_schema_task.delay('C')

        assert result.get() == 'taller_celery_test'
        assert ('C', 'taller_celery_test') in _SCHEMAS_VISTOS

    def test_header_explicito_tiene_precedencia(self, settings):
        # Caso edge: si el caller ya puso ``_tenant_schema`` en headers (uso
        # avanzado, ej. retry desde otro contexto), debemos respetarlo.
        settings.CELERY_TASK_ALWAYS_EAGER = True
        result = _capturar_schema_task.apply_async(
            args=('D',),
            headers={'_tenant_schema': 'public'},
        )
        assert result.get() == 'public'
