"""
Tests del magic-link de confirmación de cita (`citas.views.confirmar_cita_email`).

El flujo crítico:
  1. Cliente crea cita → recibe correo con link firmado.
  2. Click al link → vista valida token → cita pasa a CONFIRMADA.
  3. Se despacha el evento `cita_confirmada` (correo + WhatsApp).

Estos tests validan los 3 pasos sin Celery real ni Twilio.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.signing import Signer
from django.test import Client
from django.urls import reverse


pytestmark = pytest.mark.django_db


class TestMagicLinkConfirmacion:
    def test_token_valido_confirma_cita_pendiente(self, cita_pendiente):
        """Happy path: cita PENDIENTE → token firmado → CONFIRMADA."""
        token = Signer().sign(str(cita_pendiente.id))
        client = Client()

        url = reverse('confirmar_cita_email', kwargs={'token': token})
        # Parcheamos el enqueue de notificación — no es lo que testeamos aquí,
        # pero si falla la task real contaminaría la aserción de estado.
        with patch('citas.views.enviar_correo_cita_task.delay'):
            response = client.get(url)

        assert response.status_code == 200
        assert b'Cita confirmada' in response.content or b'confirmada' in response.content

        cita_pendiente.refresh_from_db()
        assert cita_pendiente.estado == 'CONFIRMADA'

    def test_token_valido_dispara_evento_cita_confirmada(self, cita_pendiente):
        """
        Regresión PR #38: el magic-link debía disparar `cita_confirmada` — antes
        del fix, la cita pasaba a CONFIRMADA pero NO se enviaba notificación.
        """
        token = Signer().sign(str(cita_pendiente.id))

        with patch('citas.views.enviar_correo_cita_task.delay') as mock_delay:
            response = Client().get(
                reverse('confirmar_cita_email', kwargs={'token': token})
            )

        assert response.status_code == 200
        mock_delay.assert_called_once_with(cita_pendiente.id, 'confirmacion')

    def test_token_invalido_devuelve_html_amigable(self, rf):
        """
        Si el token está corrupto, la vista devuelve 400 con una página HTML
        que explica el error — NO la 404 default de Django ni un traceback.

        Llamamos a la vista directamente con `RequestFactory` porque pasar por
        el URL resolver con tokens que contienen ':' activa una respuesta 400
        del test client antes de llegar a la vista.
        """
        from citas.views import confirmar_cita_email
        # Token bien formado pero firma inválida → la vista lo captura con
        # `BadSignature` y renderiza la página de error.
        token = Signer().sign('999')
        payload, sig = token.rsplit(':', 1)
        token_corrupto = f'{payload}:{sig[::-1]}'

        request = rf.get(f'/citas/confirmar-email/{token_corrupto}/')
        response = confirmar_cita_email(request, token_corrupto)

        # Status 400 es intencional (diferencia feedback del happy path 200),
        # pero el body es HTML renderizado — no un 404 Django ni un traceback.
        assert response.status_code == 400
        body = response.content.decode().lower()
        assert '<html' in body
        assert 'inv' in body or 'expir' in body

    def test_cita_ya_confirmada_no_re_dispara_evento(self, cliente, vehiculo, servicio_mecanico):
        """Si la cita ya estaba CONFIRMADA, el link no re-dispara la notificación."""
        from tests.factories import CitaFactory
        cita = CitaFactory(
            cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
            estado='CONFIRMADA',
        )
        token = Signer().sign(str(cita.id))

        with patch('citas.views.enviar_correo_cita_task.delay') as mock_delay:
            Client().get(reverse('confirmar_cita_email', kwargs={'token': token}))

        mock_delay.assert_not_called()

    def test_cta_apunta_al_spa(self, cita_pendiente, settings):
        """
        El botón de la página de confirmación debe apuntar al SPA React, no al
        backend Django (regresión PR #39).
        """
        settings.FRONTEND_URL = 'http://spa.test'
        settings.BACKEND_URL = 'http://api.test'
        token = Signer().sign(str(cita_pendiente.id))

        with patch('citas.views.enviar_correo_cita_task.delay'):
            resp = Client().get(
                reverse('confirmar_cita_email', kwargs={'token': token})
            )

        body = resp.content.decode()
        assert 'http://spa.test/citas' in body
