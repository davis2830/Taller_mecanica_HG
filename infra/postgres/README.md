# Postgres local para desarrollo

Este directorio arranca un PostgreSQL 16 local reproducible para desarrollo.
Es el motor oficial del proyecto (requerido para `django-tenants` en PR #41b).

## Arrancar

```bash
cd infra/postgres
docker compose up -d
```

Verifica que arrancó:

```bash
docker compose ps
# STATE debería ser "Up (healthy)"
```

## Conectarse

Desde el backend Django (corre nativo en tu máquina):

```bash
cd taller_mecanico
python manage.py migrate
python manage.py runserver
```

Los defaults de `settings.py` ya apuntan acá:

| Variable | Valor |
|---|---|
| `DB_ENGINE` | `django.db.backends.postgresql` |
| `DB_NAME` | `taller_mecanico` |
| `DB_USER` | `taller_meca` |
| `DB_PASSWORD` | `taller_meca_dev` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |

Podés conectarte directo al Postgres con `psql`:

```bash
PGPASSWORD=taller_meca_dev psql -h localhost -U taller_meca taller_mecanico
```

## Apagar

```bash
docker compose down        # apaga pero conserva la data
docker compose down -v     # apaga y BORRA la data (útil para DB virgen)
```

## Troubleshooting

**Puerto 5432 ocupado**: si ya tenés un Postgres nativo corriendo, cambiá el
puerto host en `docker-compose.yml` (ej. `"5433:5432"`) y en tu `.env` pon
`DB_PORT=5433`.

**Migración lenta o falla**: si el container quedó en estado raro, reseteá:
```bash
docker compose down -v && docker compose up -d
```

**Cambiar la contraseña**: la contraseña solo se aplica al crear el volumen.
Para cambiarla: `docker compose down -v` → editar el YAML → `up -d`. Es
seguro porque es la contraseña de dev, no de prod.
