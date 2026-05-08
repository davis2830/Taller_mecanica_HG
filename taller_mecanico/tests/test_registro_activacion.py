"""
Smoke tests del flujo de registro + activación de cuenta.

Flujo:
  1. `POST /api/v1/usuarios/registro/` con datos válidos → crea User
     inactivo + envía email (endpoint JSON consumido por el SPA).
  2. Email contiene link `/api/v1/usuarios/activar/<uidb64>/<token>/` en BACKEND_URL.
  3. Click al link → User.is_active=True → redirect al SPA `/login?verificado=true`.

Estos tests son los que cubren el evento `usuario_activacion`, que está en
EVENTOS_EMAIL_OBLIGATORIO (nunca se puede desactivar por UI).

Nota: la URL legacy ``/usuarios/register/`` todavía existe pero ahora
es un ``RedirectView`` al SPA (``/register``), por eso los tests pegan
directo al endpoint API.
"""
from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import Client
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


pytestmark = [pytest.mark.django_db, pytest.mark.email]


class TestRegistro:
    def test_crea_usuario_inactivo_y_envia_email_de_activacion(self, settings):
        # En multi-tenant, el link de activación apunta al subdominio del
        # tenant que registró al usuario. ``tenant_backend_url`` deriva el
        # scheme/puerto de ``BACKEND_URL`` y el host del Domain primario
        # del tenant actual.
        settings.BACKEND_URL = 'http://api.test'
        settings.FRONTEND_URL = 'http://spa.test'
        # Campos del `UserRegisterForm` real (ver usuarios/forms.py):
        #   first_name, last_name, email, password, password_confirm.
        data = {
            'first_name': 'Pepe',
            'last_name': 'Pruebas',
            'email': 'nuevo@test.taller',
            'password': 'SuperSegura2024!',
            'password_confirm': 'SuperSegura2024!',
        }

        response = Client().post('/api/v1/usuarios/registro/', data=data)

        # El endpoint API devuelve 201 con JSON, no un redirect.
        assert response.status_code == 201, response.content
        body = response.json()
        assert body.get('success') is True

        # Usuario creado con ese email.
        user = User.objects.get(email='nuevo@test.taller')
        assert user.email == 'nuevo@test.taller'

        # Email enviado.
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert 'nuevo@test.taller' in email.to
        # Link de activación usa tenant_backend_url → host del Domain primario
        # del tenant actual (``testserver`` en conftest), scheme de BACKEND_URL.
        # NUNCA debe apuntar al SPA (FRONTEND_URL=spa.test).
        email_body = email.alternatives[0][0] if email.alternatives else email.body
        assert 'http://testserver/api/v1/usuarios/activar/' in email_body
        assert 'http://spa.test/api/v1/usuarios/activar/' not in email_body

    def test_url_legacy_register_redirige_al_spa(self):
        """La URL vieja /usuarios/register/ ahora es un redirect al SPA."""
        response = Client().get(reverse('register'))
        assert response.status_code in (301, 302)
        assert response.url == '/register'


class TestActivacion:
    def test_token_valido_activa_y_redirige_al_spa(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'

        # Usuario creado sin pasar por el form — simula usuario recién registrado.
        user = User.objects.create_user(
            username='ana', email='ana@test.taller',
            password='secret', is_active=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        url = reverse('api_activar_cuenta', kwargs={'uidb64': uid, 'token': token})
        response = Client().get(url)

        assert response.status_code == 302
        assert 'http://spa.test/login' in response.url
        assert 'verificado=true' in response.url

        user.refresh_from_db()
        assert user.is_active is True

    def test_token_invalido_redirige_con_flag_error(self, settings):
        settings.FRONTEND_URL = 'http://spa.test'
        user = User.objects.create_user(
            username='bob', email='bob@test.taller',
            password='secret', is_active=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        url = reverse('api_activar_cuenta', kwargs={
            'uidb64': uid, 'token': 'token-falso-xyz',
        })
        response = Client().get(url)

        assert response.status_code == 302
        assert 'http://spa.test/login' in response.url
        assert 'verificado=error' in response.url

        user.refresh_from_db()
        assert user.is_active is False

    def test_url_legacy_activar_redirige_a_api(self):
        """La URL vieja /usuarios/activar/… redirige a /api/v1/usuarios/activar/…"""
        url = reverse('activar_cuenta', kwargs={
            'uidb64': 'MQ', 'token': 'fake-token',
        })
        response = Client().get(url)
        assert response.status_code == 302
        assert '/api/v1/usuarios/activar/MQ/fake-token/' in response.url
