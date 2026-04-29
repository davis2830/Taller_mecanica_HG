"""
Smoke tests del despacho de notificaciones de citas (correo + WhatsApp).

Cubren el bug que arreglamos en PR #38: antes WhatsApp solo se enviaba si el
cliente tenía email (por un `if cita.cliente.email:` que dominaba el flujo).
Estos tests aseguran que ese comportamiento no regrese.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core import mail

from citas.utils import enviar_email_cita


pytestmark = [pytest.mark.django_db, pytest.mark.whatsapp]


@pytest.fixture
def capturar_whatsapp():
    """
    Patch de la task Celery de WhatsApp para capturar llamadas sin necesidad
    de Twilio ni broker. Devuelve la lista de argumentos con los que se llamó.
    """
    with patch('citas.utils.enviar_whatsapp_task.delay') as mock_delay:
        calls: list[tuple] = []
        mock_delay.side_effect = lambda *a, **kw: calls.append((a, kw))
        yield calls


class TestEnviarEmailCita:
    def test_envia_whatsapp_aunque_cliente_no_tenga_email(
        self, cliente_sin_email, vehiculo, servicio_mecanico,
        canales_todos_activos, capturar_whatsapp,
    ):
        """
        Regresión PR #38: cliente con teléfono pero sin email debe recibir
        WhatsApp. Antes el `if cita.cliente.email` bloqueaba ambos canales.
        """
        from tests.factories import CitaFactory
        cita = CitaFactory(
            cliente=cliente_sin_email,
            vehiculo=vehiculo,
            servicio=servicio_mecanico,
            estado='CONFIRMADA',
        )

        resultado = enviar_email_cita(cita, 'confirmacion')

        # Email: False (no hay destinatario)
        assert resultado is False
        assert len(mail.outbox) == 0

        # WhatsApp: sí se enqueueó
        assert len(capturar_whatsapp) == 1
        evento, telefono, params = capturar_whatsapp[0][0]
        assert evento == 'cita_confirmada'
        assert telefono.startswith('+502')
        assert params['cliente_nombre']  # no vacío

    def test_envia_email_y_whatsapp_cuando_cliente_tiene_ambos(
        self, cliente, vehiculo, servicio_mecanico,
        canales_todos_activos, capturar_whatsapp,
    ):
        from tests.factories import CitaFactory
        cita = CitaFactory(
            cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
            estado='CONFIRMADA',
        )

        resultado = enviar_email_cita(cita, 'confirmacion')

        assert resultado is True
        assert len(mail.outbox) == 1
        assert cita.cliente.email in mail.outbox[0].to

        assert len(capturar_whatsapp) == 1
        assert capturar_whatsapp[0][0][0] == 'cita_confirmada'

    def test_no_envia_whatsapp_si_canal_esta_deshabilitado(
        self, cliente, vehiculo, servicio_mecanico, capturar_whatsapp, db,
    ):
        """Si `CanalNotificacion.whatsapp_activo=False` para el evento, no se encola."""
        from citas.models import CanalNotificacion
        from tests.factories import CitaFactory
        CanalNotificacion.objects.update_or_create(
            evento='cita_confirmada',
            defaults={
                'email_activo': True, 'whatsapp_activo': False,
                'label': 'Cita confirmada',
            },
        )
        cita = CitaFactory(
            cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
            estado='CONFIRMADA',
        )

        enviar_email_cita(cita, 'confirmacion')

        assert len(capturar_whatsapp) == 0
        assert len(mail.outbox) == 1

    def test_confirmacion_con_estado_pendiente_incluye_magic_link(
        self, cliente, vehiculo, servicio_mecanico,
        canales_todos_activos, capturar_whatsapp, settings,
    ):
        """
        Cuando la cita está PENDIENTE, el correo + WhatsApp deben llevar un
        magic-link firmado a la URL backend del tenant. En multi-tenant,
        ``tenant_backend_url`` resuelve al subdominio del tenant actual
        (host ``testserver`` en conftest), heredando scheme/puerto de
        ``BACKEND_URL``. Verifica que el link NO apunte al SPA (regresión PR #39).
        """
        settings.BACKEND_URL = 'http://api.test'
        settings.FRONTEND_URL = 'http://spa.test'

        from tests.factories import CitaFactory
        cita = CitaFactory(
            cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
            estado='PENDIENTE',
        )

        enviar_email_cita(cita, 'confirmacion')

        assert len(mail.outbox) == 1
        body = mail.outbox[0].alternatives[0][0]  # HTML
        # Host del tenant ``test``; scheme heredado de BACKEND_URL.
        assert 'http://testserver/citas/confirmar-email/' in body
        # El correo NO debe incluir el link pointing al SPA en el CTA.
        assert 'http://spa.test/citas/confirmar-email' not in body

        # WhatsApp también recibe el enlace correcto.
        assert len(capturar_whatsapp) == 1
        params = capturar_whatsapp[0][0][2]
        assert params['enlace_confirmar'].startswith('http://testserver/citas/confirmar-email/')
