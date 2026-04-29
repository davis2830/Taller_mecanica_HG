"""
Smoke tests de las transiciones del Kanban de taller (OT = Orden de Trabajo).

El Kanban es la cola visual donde los mecánicos mueven órdenes:
    EN_ESPERA → EN_REVISION → COTIZACION → (ESPERANDO_REPUESTOS) → LISTO → ENTREGADO

Cada transición debe disparar una notificación al cliente (correo + WhatsApp
si el canal está habilitado). Regresión crítica PR #38.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient


# La vista `ActualizarEstadoOrdenView` envuelve todo en `@transaction.atomic`
# y despacha la task con `transaction.on_commit`. En tests con django_db
# normal (SAVEPOINT/ROLLBACK) los callbacks de `on_commit` NUNCA se disparan.
# Antes de PR #41b usábamos `transaction=True` pero con django-tenants
# hacer TRUNCATE cross-schema falla por FK constraints (auth_permission en
# el schema del tenant referencia django_content_type en public).
#
# Solución: usar `TestCase.captureOnCommitCallbacks(execute=True)` que fuerza
# a Django a ejecutar los callbacks al cerrar el context manager, aunque
# estemos dentro de un SAVEPOINT. Así mantenemos el rollback rápido y el
# test sigue validando el dispatch de la task.
pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.fixture
def staff_user(db):
    """Staff para poder llamar al endpoint PATCH (IsAuthenticated)."""
    user = User.objects.create_user(
        username='mecanico_test', email='mec@taller.test',
        password='secret', is_staff=True,
    )
    return user


@pytest.fixture
def orden_con_cita(db, cliente, vehiculo, servicio_mecanico):
    """OT con su cita confirmada; punto de partida típico del Kanban."""
    from tests.factories import CitaFactory, OrdenTrabajoFactory
    cita = CitaFactory(
        cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
        estado='CONFIRMADA',
    )
    return OrdenTrabajoFactory(cita=cita, vehiculo=vehiculo)


class TestKanbanTransiciones:
    def _mover(self, staff_user, orden, nuevo_estado):
        client = APIClient()
        client.force_authenticate(user=staff_user)
        from django.urls import reverse
        url = reverse('api_taller_mover_orden', kwargs={'orden_id': orden.id})
        return client.patch(url, data={'nuevo_estado': nuevo_estado}, format='json')

    def test_mover_a_en_revision_dispara_notificacion(self, staff_user, orden_con_cita):
        """EN_ESPERA → EN_REVISION → `enviar_correo_cita_task('en_revision')`."""
        with patch('citas.tasks.enviar_correo_cita_task.delay') as mock_delay:
            with TestCase.captureOnCommitCallbacks(execute=True):
                resp = self._mover(staff_user, orden_con_cita, 'EN_REVISION')

        assert resp.status_code == 200, resp.content
        mock_delay.assert_called_once_with(orden_con_cita.cita.id, 'en_revision')
        orden_con_cita.refresh_from_db()
        assert orden_con_cita.estado == 'EN_REVISION'
        # Auto-asignación del mecánico que la movió.
        assert orden_con_cita.mecanico_asignado_id == staff_user.id

    def test_mover_a_cotizacion_dispara_notificacion(self, staff_user, orden_con_cita):
        orden_con_cita.estado = 'EN_REVISION'
        orden_con_cita.save()
        with patch('citas.tasks.enviar_correo_cita_task.delay') as mock_delay:
            with TestCase.captureOnCommitCallbacks(execute=True):
                resp = self._mover(staff_user, orden_con_cita, 'COTIZACION')

        assert resp.status_code == 200
        mock_delay.assert_called_once_with(orden_con_cita.cita.id, 'cotizacion')

    def test_mover_a_listo_dispara_notificacion(self, staff_user, orden_con_cita):
        orden_con_cita.estado = 'COTIZACION'
        orden_con_cita.save()
        with patch('citas.tasks.enviar_correo_cita_task.delay') as mock_delay:
            with TestCase.captureOnCommitCallbacks(execute=True):
                resp = self._mover(staff_user, orden_con_cita, 'LISTO')

        assert resp.status_code == 200
        mock_delay.assert_called_once_with(orden_con_cita.cita.id, 'listo')

    def test_mismo_estado_no_re_dispara_notificacion(self, staff_user, orden_con_cita):
        """
        Si la OT ya está en el estado destino, no re-enviamos notificación —
        evita spam al cliente si el staff hace click múltiples veces.
        """
        orden_con_cita.estado = 'EN_REVISION'
        orden_con_cita.save()

        with patch('citas.tasks.enviar_correo_cita_task.delay') as mock_delay:
            with TestCase.captureOnCommitCallbacks(execute=True):
                resp = self._mover(staff_user, orden_con_cita, 'EN_REVISION')

        assert resp.status_code == 200
        mock_delay.assert_not_called()
