"""
Tests de `taller_mecanico.url_helpers`. Este módulo es base para TODO el
sistema de emails y redirects — un bug aquí rompe notificaciones, magic-links
y activación de cuenta. Por eso se testea primero.
"""
from __future__ import annotations

import pytest
from django.test import RequestFactory

from taller_mecanico.url_helpers import backend_url, redirect_to_spa, spa_url


pytestmark = pytest.mark.django_db


# ───────────────────────────────────────────────────────────────────────────
# spa_url
# ───────────────────────────────────────────────────────────────────────────

class TestSpaUrl:
    def test_usa_frontend_url_cuando_esta_seteado(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        assert spa_url('/citas') == 'http://spa.test/citas'

    def test_agrega_slash_si_path_no_lo_tiene(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        assert spa_url('citas') == 'http://spa.test/citas'

    def test_elimina_trailing_slash_del_base(self, settings):
        settings.FRONTEND_URL = 'http://spa.test/'
        assert spa_url('/citas') == 'http://spa.test/citas'

    def test_fallback_a_host_de_request_si_no_hay_setting(self, settings):
        settings.FRONTEND_URL = ''
        req = RequestFactory().get('/', HTTP_HOST='ejemplo.com')
        assert spa_url('/citas', request=req) == 'http://ejemplo.com/citas'

    def test_path_vacio_devuelve_base_o_slash(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        assert spa_url('') == 'http://spa.test'


# ───────────────────────────────────────────────────────────────────────────
# backend_url
# ───────────────────────────────────────────────────────────────────────────

class TestBackendUrl:
    def test_es_independiente_de_frontend_url(self, settings):
        """Regresión de PR #39: el logo en correos usaba FRONTEND_URL, lo que
        rompía cuando SPA y backend estaban en hosts distintos. `backend_url`
        no debe colapsar a FRONTEND_URL bajo ninguna circunstancia."""
        settings.FRONTEND_URL = 'http://spa.test'
        settings.BACKEND_URL = 'http://api.test'
        assert backend_url('/media/logo.png') == 'http://api.test/media/logo.png'
        assert spa_url('/') == 'http://spa.test/'

    def test_path_activacion(self, settings):
        settings.BACKEND_URL = 'http://api.test'
        assert (
            backend_url('/usuarios/activar/uidb64/token')
            == 'http://api.test/usuarios/activar/uidb64/token'
        )


# ───────────────────────────────────────────────────────────────────────────
# redirect_to_spa
# ───────────────────────────────────────────────────────────────────────────

class TestRedirectToSpa:
    def test_devuelve_302_al_spa(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        resp = redirect_to_spa('/citas')
        assert resp.status_code == 302
        assert resp.url == 'http://spa.test/citas'

    def test_concatena_query_string(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        resp = redirect_to_spa('/login', query='?verificado=true')
        assert resp.url == 'http://spa.test/login?verificado=true'
