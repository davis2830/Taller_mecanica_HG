# Tests del backend

Suite de tests automatizados con `pytest` + `pytest-django`. La filosofía es:

- **Sin I/O real**: el correo va a `locmem`, Twilio se mockea, Celery corre en
  modo `EAGER` (síncrono). Esto hace los tests rápidos (~5s) y deterministas.
- **Smoke tests**: cubren los flujos críticos del negocio (notificaciones,
  magic-link, kanban, registro). NO buscamos 100% de cobertura todavía.
- **Factories en lugar de fixtures hardcodeadas**: `tests/factories.py` usa
  `factory_boy` para generar Cliente, Cita, OT, etc. sin escribir SQL ni JSON.

## Cómo correr los tests

```bash
# Desde la raíz de `taller_mecanico/`:
pip install -r requirements-dev.txt   # primera vez
pytest                                  # corre todo
pytest tests/test_magic_link.py -v      # un solo archivo
pytest -m whatsapp                      # solo tests de WhatsApp
pytest --cov=. --cov-report=html        # con cobertura
```

O con Make:

```bash
make test-backend     # pytest
make test-cov         # pytest --cov
make test             # backend + frontend
```

## Estructura

| Archivo | Cubre |
|---|---|
| `test_url_helpers.py` | `spa_url()`, `backend_url()`, `redirect_to_spa()` (PR #39) |
| `test_notificaciones_citas.py` | Despacho email + WhatsApp en `enviar_email_cita`, regresión PR #38 (cliente sin email recibe WhatsApp). |
| `test_magic_link.py` | Vista `confirmar_cita_email`: token válido confirma cita y dispara evento; token corrupto muestra HTML amigable. |
| `test_registro_activacion.py` | `POST /usuarios/register/` envía email; click al link activa la cuenta y redirige al SPA. |
| `test_kanban_transitions.py` | API `/api/v1/taller/orden/<id>/mover/` cambia estado y dispara `enviar_correo_cita_task` con el `tipo_email` correcto. |

## Fixtures globales (`conftest.py`)

| Fixture | Devuelve |
|---|---|
| `cliente` | User con email + Perfil con teléfono. |
| `cliente_sin_email` | User con email vacío y teléfono. Usado para regresión PR #38. |
| `vehiculo` | `citas.Vehiculo` del cliente default. |
| `servicio_mecanico` | `citas.TipoServicio` típico. |
| `cita_pendiente` | Cita estado=PENDIENTE (para tests de magic-link). |
| `canales_todos_activos` | Crea `CanalNotificacion` con email+WhatsApp ON para todos los eventos. |

Y autouse (aplicados a CADA test sin importarlos):

- `_fast_test_settings`: `EMAIL_BACKEND=locmem`, `CELERY_TASK_ALWAYS_EAGER=True`,
  `WHATSAPP_BACKEND='mock'`, URLs de test.
- `_clean_mail_outbox`: limpia `mail.outbox` antes/después de cada test.

## Cómo agregar un test nuevo

1. Si el flujo aún no está cubierto, crea `tests/test_<flujo>.py`.
2. Reusa fixtures de `conftest.py` o agrégalas allí si son compartidas.
3. Para mockear un task de Celery: `with patch('modulo.task.delay') as m:`.
4. Para tests que invocan vistas con `transaction.on_commit`: agrega
   `pytestmark = pytest.mark.django_db(transaction=True)`. Sin esto, el
   `on_commit` se queda en el savepoint y no dispara los efectos.

## Markers

- `slow`: tests > 1s. Filtrar con `-m "not slow"`.
- `integration`: tests que tocan múltiples capas (vista + DB + Celery).
- `whatsapp`: tests de flujos de WhatsApp (mock Twilio).
- `email`: tests que validan envío de correos (locmem backend).
