# Multi-tenancy (django-tenants)

Este documento describe la arquitectura multi-tenant del sistema, que vive
en Postgres usando **schemas separados por cliente**. Introducido en PR #41b.

## Concepto

Cada taller cliente del SaaS (Fixfast, AutoRepair, etc.) es un **tenant**.
Cada tenant tiene su propio schema de Postgres dentro de la misma DB.

```
Postgres DB: taller_mecanico
├── schema "public"          ← SaaS compartido (tenants, suscripciones)
│   ├── tenancy_tenant
│   ├── tenancy_domain
│   ├── public_admin_publicuser   ← superadmin del SaaS
│   ├── django_content_type
│   └── django_migrations
│
├── schema "taller_demo"     ← un tenant (ejemplo)
│   ├── auth_user
│   ├── usuarios_perfil
│   ├── citas_cita
│   ├── taller_ordentrabajo
│   ├── facturacion_factura
│   └── ... (todas las tablas del negocio)
│
├── schema "taller_fixfast"  ← otro tenant (producción)
│   └── ... (mismas tablas que demo, datos aislados)
│
└── schema "test"            ← tenant de pruebas (pytest)
    └── ... (creado por conftest.py)
```

Las tablas de un tenant **no son accesibles desde otro tenant**. Postgres
aplica el aislamiento a nivel schema vía `SET search_path`.

## Cómo funciona el routing

1. Request llega a `demo.localhost:8000/api/v1/citas/` (subdomain `demo`).
2. `TenantMainMiddleware` (primer middleware de Django) lee el `Host` header.
3. Busca `Domain.objects.get(domain='demo.localhost')` en schema `public`.
4. Obtiene el Tenant asociado (`schema_name='taller_demo'`).
5. Setea `connection.set_schema('taller_demo')` → todas las queries
   subsecuentes van a ese schema.
6. Django ejecuta la vista normal, que hace `Cita.objects.all()` → retorna
   solo las citas del tenant `demo`.

Si el `Host` no matchea ningún `Domain`, django-tenants devuelve 404.

## Setup local (dev)

### 1. Arrancar Postgres

```bash
cd infra/postgres
docker compose up -d
```

### 2. Correr migraciones SHARED (schema `public`)

```bash
cd taller_mecanico
python manage.py migrate_schemas --shared
```

Esto crea los modelos de `SHARED_APPS` en el schema `public`.

### 3. Crear un tenant de desarrollo

```bash
python manage.py crear_tenant demo "Taller Demo" demo@test.com
```

Esto:
- Crea un row en `tenancy_tenant` con `slug='demo'`, `schema_name='taller_demo'`.
- Crea el schema Postgres `taller_demo`.
- Corre todas las migraciones de `TENANT_APPS` en ese schema.
- Crea un row en `tenancy_domain` con `domain='demo.localhost'`.

### 4. Agregar el subdomain a `/etc/hosts`

```bash
sudo sh -c 'echo "127.0.0.1 demo.localhost" >> /etc/hosts'
```

Repetí por cada tenant que crees en dev.

### 5. Correr el servidor y acceder

```bash
python manage.py runserver
```

- `http://demo.localhost:8000/` → vistas del tenant `demo`.
- `http://localhost:8000/admin/` → admin Django del tenant "default" (falla
  si no hay Domain para `localhost`; por ahora, acceder siempre vía un
  subdomain de tenant).

## Tests

Los tests usan un tenant especial `test` (schema `test`) creado una vez
por sesión de pytest. Ver `conftest.py` — todos los tests corren automáticamente
dentro del contexto de ese schema.

```bash
source venv/bin/activate
pytest
```

Si necesitás acceder al schema `public` dentro de un test (ej. para verificar
que se creó un `Tenant` o un `PublicUser`):

```python
from django_tenants.utils import schema_context

def test_creacion_de_tenant_nuevo():
    with schema_context('public'):
        Tenant.objects.create(...)
```

## Setup inicial del SaaS (PR #41c)

Para arrancar el SaaS de cero (local o prod), corré el comando orquestador
`setup_saas` que crea el superadmin (PublicUser en `public`) **y** el primer
tenant en una sola corrida — idempotente:

```bash
python manage.py setup_saas \
    --superadmin-email steed.galvez@gmail.com \
    --superadmin-nombre "Steed Gálvez" \
    --superadmin-password "tu-pass-fuerte" \
    --tenant-slug demo \
    --tenant-nombre "Demo Taller" \
    --tenant-email-contacto demo@autoservipro.com \
    --dominio-base localhost   # o autoservipro.com en prod
```

También podés correr los pasos por separado:
- `python manage.py crear_publicuser <email> <nombre> --password ...`
- `python manage.py crear_tenant <slug> <nombre> <email_contacto>`

## Helpers tenant-aware en código

PR #41c agrega dos piezas que TODA la app debe usar para no romperse en
multi-tenant:

### 1. URLs en correos / WhatsApp

Cuando un tenant manda un correo, el link tiene que volver a SU subdominio,
no al `BACKEND_URL` global. Si fixfast manda un magic-link a
`autoservipro.com/citas/abc/`, el middleware no encuentra el tenant y la
confirmación falla.

```python
# ❌ INCORRECTO en multi-tenant — usa el host global:
from taller_mecanico.url_helpers import backend_url
link = backend_url('/citas/abc/')

# ✅ CORRECTO — usa el dominio primario del tenant actual:
from taller_mecanico.url_helpers import tenant_backend_url, tenant_spa_url
link = tenant_backend_url('/citas/abc/')
spa_link = tenant_spa_url('/dashboard')
```

`tenant_backend_url`/`tenant_spa_url` heredan scheme/puerto de
`BACKEND_URL`/`FRONTEND_URL` y reemplazan el host por el primary `Domain`
del tenant actual. Si no hay tenant en contexto (schema `public`, CLI),
caen al helper global.

### 2. Celery tasks cross-tenant

Una task despachada con `.delay()` corre en el worker SIN saber de qué
tenant viene. Sus queries irían al schema actual del worker (random,
posiblemente `public`), mezclando datos.

Solución: `TenantAwareTask` captura `connection.schema_name` al despachar
(via `apply_async`) y lo restaura al ejecutar (via `__call__`).

```python
from celery import shared_task
from taller_mecanico.celery_helpers import TenantAwareTask

@shared_task(base=TenantAwareTask)
def enviar_correo(cita_id):
    # Adentro: connection.schema_name es el del tenant que despachó.
    Cita.objects.get(id=cita_id)  # va al schema correcto.
```

Toda task nueva DEBE usar `base=TenantAwareTask`. Las existentes ya están
migradas en PR #41c (`citas/`, `taller/`, `inventario/`, `facturacion/`,
`usuarios/`, `whatsapp.py`).

## Agregar un tenant en producción

```bash
ssh user@tu-vps
cd /app/taller_mecanico
source venv/bin/activate
python manage.py crear_tenant fixfast "Fixfast Pro" admin@fixfast.com \
    --dominio-base autoservipro.com \
    --trial-dias 14
```

Después, en tu DNS (Cloudflare / Namecheap / lo que uses), asegurate de
tener un registro wildcard:

```
*.autoservipro.com    A    <IP_DEL_VPS>
```

Con eso, `fixfast.autoservipro.com` resuelve automáticamente a tu VPS y
django-tenants hace el ruteo.

## SHARED_APPS vs TENANT_APPS

**SHARED_APPS** (schema `public`, compartido):
- `django_tenants`
- `tenancy` — modelos `Tenant` + `Domain`.
- `public_admin` — modelo `PublicUser` (superadmin SaaS).
- `django.contrib.contenttypes` — Django requiere que esté aquí.

**TENANT_APPS** (schema por tenant, aislado):
- `django.contrib.admin`
- `django.contrib.auth` — cada tenant tiene sus propios usuarios.
- `django.contrib.sessions`
- Todas las apps del taller: `usuarios`, `citas`, `taller`, `facturacion`,
  `inventario`, `django_celery_results`, `django_apscheduler`.

## Subdomains reservados

Los siguientes slugs NO pueden usarse como nombre de tenant:
- `public` — schema compartido.
- `admin` — dashboard superadmin SaaS.
- `www`, `api`, `mail`, `static` — convenciones web reservadas.

Ver `tenancy/models.py::SLUGS_RESERVADOS`.

## Troubleshooting

### "DoesNotExist: No tenant for hostname 'X'"

El `Host` header de la request no matchea ningún `Domain`. Verificá:
1. Que el tenant exista (`python manage.py shell → Tenant.objects.all()`).
2. Que el dominio esté registrado (`Domain.objects.all()`).
3. Que tu `/etc/hosts` mapee el subdomain a `127.0.0.1`.

### "relation 'auth_user' does not exist"

Estás queryando un modelo TENANT desde el schema `public`. Usá
`schema_context('taller_demo')` o asegurate de que el tenant middleware
esté activo.

### Tests fallan con "cannot truncate a table referenced in a foreign key"

Tests con `@pytest.mark.django_db(transaction=True)` fallan porque
`auth_permission` (tenant) referencia `django_content_type` (public).
Usá `TestCase.captureOnCommitCallbacks(execute=True)` en vez de
`transaction=True` — ver `tests/test_kanban_transitions.py` de ejemplo.
