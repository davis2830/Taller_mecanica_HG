"""
Configuración global de pytest — fixtures y overrides de settings que aplican
a TODOS los tests, sin importar en qué módulo vivan.

Principios:
  1. Un test NUNCA hace I/O externo de verdad (ni Twilio, ni SMTP, ni HTTP).
  2. Celery corre `EAGER` → las `.delay()` se ejecutan síncronamente en el
     mismo proceso; así los tests validan el comportamiento end-to-end sin
     necesitar un worker levantado.
  3. Email backend es `locmem` → los mails quedan en `django.core.mail.outbox`
     para asertar contenido/destinatario.
  4. WhatsApp backend es `mock` → `enviar_whatsapp_task` loguea pero no llama
     a Twilio. Tests que quieran probar el path Twilio usan `responses` para
     mockear la API a nivel HTTP.
"""
from __future__ import annotations

import pytest
from django.core import mail


# ───────────────────────────────────────────────────────────────────────────
# Settings overrides globales
# ───────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _fast_test_settings(settings):
    """
    Overrides aplicados a CADA test automáticamente. No requieren pedir la
    fixture explícitamente — de ahí `autouse=True`.
    """
    # Email → locmem (no intenta conectar a smtp.gmail.com).
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    # Celery síncrono — las tasks corren in-process cuando se hace .delay().
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

    # WhatsApp en modo mock (solo loguea). Tests específicos de Twilio lo
    # pueden sobrescribir con `settings.WHATSAPP_BACKEND = 'twilio'`.
    settings.WHATSAPP_BACKEND = 'mock'
    settings.TWILIO_ACCOUNT_SID = 'ACtest000000000000000000000000000'
    settings.TWILIO_AUTH_TOKEN = 'fake-token-for-tests'
    settings.TWILIO_WHATSAPP_FROM = '+14155238886'
    settings.WHATSAPP_DEFAULT_COUNTRY_CODE = '502'

    # URLs conocidas para los tests de url_helpers.
    settings.FRONTEND_URL = 'http://spa.test'
    settings.BACKEND_URL = 'http://api.test'

    # DEBUG False en tests (más cercano a producción, evita output ruidoso).
    settings.DEBUG = False


@pytest.fixture(autouse=True)
def _clean_mail_outbox():
    """
    Limpia el outbox de correo antes de cada test. `locmem` lo acumula entre
    tests dentro del mismo proceso — sin esto, un test podría ver mails de
    tests anteriores.
    """
    mail.outbox = []
    yield
    mail.outbox = []


# ───────────────────────────────────────────────────────────────────────────
# Fixtures de dominio (los importamos desde factories para que estén siempre
# disponibles sin `import` explícito en cada test).
# ───────────────────────────────────────────────────────────────────────────

@pytest.fixture
def cliente(db):
    """Cliente con teléfono + email (el caso feliz)."""
    from tests.factories import ClienteFactory
    return ClienteFactory()


@pytest.fixture
def cliente_sin_email(db):
    """
    Cliente SIN email pero CON teléfono — caso típico de taller donde
    muchos dueños de vehículo solo tienen WhatsApp. Históricamente el
    sistema bloqueaba notificaciones para este caso (bug de PR #38).
    """
    from tests.factories import ClienteFactory
    return ClienteFactory(email='', perfil__telefono='+50254000001')


@pytest.fixture
def cliente_sin_telefono(db):
    """Cliente con email pero sin teléfono (solo recibe correo)."""
    from tests.factories import ClienteFactory
    return ClienteFactory(perfil__telefono='')


@pytest.fixture
def vehiculo(db, cliente):
    from tests.factories import VehiculoFactory
    return VehiculoFactory(propietario=cliente)


@pytest.fixture
def servicio_mecanico(db):
    from tests.factories import TipoServicioFactory
    return TipoServicioFactory(categoria='MECANICO', duracion=60)


@pytest.fixture
def cita_pendiente(db, cliente, vehiculo, servicio_mecanico):
    """Cita en estado PENDIENTE — típico post-solicitud del cliente."""
    from tests.factories import CitaFactory
    return CitaFactory(
        cliente=cliente, vehiculo=vehiculo, servicio=servicio_mecanico,
        estado='PENDIENTE',
    )


@pytest.fixture
def canales_todos_activos(db):
    """
    Crea `CanalNotificacion` con email+whatsapp activos para todos los
    eventos. Sin esto, los tests reciben el default de la capa (solo email).
    """
    from citas.models import CanalNotificacion
    from taller_mecanico.notification_channels import EVENTOS_REGISTRADOS
    for evento, label, desc, grupo, orden in EVENTOS_REGISTRADOS:
        CanalNotificacion.objects.update_or_create(
            evento=evento,
            defaults={
                'email_activo': True,
                'whatsapp_activo': True,
                'label': label,
                'descripcion': desc,
                'grupo': grupo,
                'orden': orden,
            },
        )
