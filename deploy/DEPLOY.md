# Deploy a Producción — GCP Compute Engine + gctorque.com

Guía paso a paso para desplegar el SaaS en una instancia de **Google Cloud Compute Engine** con dominio `gctorque.com` y subdominios para cada tenant (`fixfast.gctorque.com`, `taller-juan.gctorque.com`, etc.) más soporte opcional de **dominios custom** para clientes premium.

> **Pre-requisitos**: VM de Compute Engine con Ubuntu 22.04+ ya provisionada, SSH activo, dominio `gctorque.com` registrado. Plan ~30-90 min para despliegue inicial.

---

## Arquitectura

```
                Internet
                   │
                   ▼
        ┌──────────────────────────┐
        │    Nginx (80/443)        │
        │  - SSL via Let's Encrypt │
        │  - server_name           │
        │    *.gctorque.com        │
        │    custom (per tenant)   │
        │  - sirve dist/ frontend  │
        │  - proxy /api → Gunicorn │
        └────┬─────────────────────┘
             │ proxy_pass + Host preservado
             ▼
        Gunicorn :8000  (3-4 workers, systemd-managed)
             │
        ┌────┴─────────────────────┐
        ▼                          ▼
   PostgreSQL 16              Redis 7
   (django-tenants)           (Celery broker)
        ▲
        │
   Celery worker + beat (systemd-managed)
```

---

## Paso 0 — Configuración GCP previa

### 0.1 Reservar IP estática

En Cloud Console o `gcloud`:
```bash
gcloud compute addresses create gctorque-prod-ip \
    --region=<TU_REGION> \
    --project=<TU_PROYECTO>
gcloud compute addresses describe gctorque-prod-ip \
    --region=<TU_REGION> --format='value(address)'
# Anotá la IP (ej. 34.123.45.67)
```

Asignala a tu VM si todavía no:
```bash
gcloud compute instances delete-access-config <NOMBRE_VM> --zone=<ZONA>
gcloud compute instances add-access-config <NOMBRE_VM> --zone=<ZONA> \
    --address=34.123.45.67
```

### 0.2 Reglas de firewall

Asegurate que estos puertos estén abiertos:
```bash
gcloud compute firewall-rules create gctorque-allow-http-https \
    --direction=INGRESS --action=ALLOW \
    --rules=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server,https-server
gcloud compute instances add-tags <NOMBRE_VM> --zone=<ZONA> \
    --tags=http-server,https-server
```

### 0.3 DNS — apuntar gctorque.com a la VM

Esto depende de dónde tenés el DNS:

**Opción recomendada — Cloudflare** (gratis, API simple para wildcard SSL):
1. Apuntá el dominio gctorque.com a los nameservers de Cloudflare.
2. Agregá los registros DNS:
   - `A`     `gctorque.com`         → `34.123.45.67` (IP VM, **proxy=DNS only**)
   - `A`     `*.gctorque.com`       → `34.123.45.67` (idem)
3. Generá un API token: Cloudflare dashboard → My Profile → API Tokens → Create Token → Template "Edit zone DNS" → Permitir `gctorque.com`. Guardalo seguro.

**Opción alternativa — Google Cloud DNS**:
```bash
gcloud dns managed-zones create gctorque-zone \
    --dns-name=gctorque.com. \
    --description="Zona DNS gctorque"
gcloud dns record-sets create gctorque.com. --zone=gctorque-zone \
    --type=A --ttl=300 --rrdatas=34.123.45.67
gcloud dns record-sets create '*.gctorque.com.' --zone=gctorque-zone \
    --type=A --ttl=300 --rrdatas=34.123.45.67
```
Después actualizá los nameservers en tu registrar para que apunten a los de Google.

> Verificá con `dig admin.gctorque.com +short` desde cualquier máquina antes de seguir. Debe devolver `34.123.45.67`.

---

## Paso 1 — Setup base de la VM (una sola vez)

SSH a la VM y ejecutá:

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y \
    nginx postgresql-16 redis-server \
    python3.12 python3.12-venv python3-dev \
    build-essential libpq-dev \
    git curl ufw fail2ban \
    certbot python3-certbot-nginx
# Para wildcard SSL automatizado (elegí UNA según tu DNS):
sudo apt install -y python3-certbot-dns-cloudflare    # si usás Cloudflare
# o
sudo apt install -y python3-certbot-dns-google        # si usás Google Cloud DNS

# Node.js LTS (para `npm run build` del frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Habilitar servicios base
sudo systemctl enable --now postgresql redis-server nginx
```

### 1.1 Crear usuario de servicio

Por seguridad, los procesos NO corren como `root` ni como tu user de SSH:

```bash
sudo useradd -r -s /bin/bash -d /srv/taller-mecanico -m taller
sudo chown -R taller:taller /srv/taller-mecanico
```

### 1.2 PostgreSQL — crear DB y usuario

```bash
sudo -u postgres psql <<'SQL'
CREATE USER taller_meca WITH PASSWORD 'CAMBIAME_PASSWORD_FUERTE_AQUI' CREATEDB;
CREATE DATABASE taller_mecanico OWNER taller_meca;
SQL
```

> Anotá el password — va al `.env` después.
>
> **CREATEDB es obligatorio** porque django-tenants crea schemas vía `CREATE SCHEMA` que requiere ese permiso o ser owner. Más simple darle CREATEDB.

---

## Paso 2 — Clonar y configurar la app

```bash
sudo -u taller bash <<'BASH'
cd /srv/taller-mecanico
git clone https://github.com/davis2830/Taller_mecanica_HG.git .
cd taller_mecanico

# Crear venv y deps
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Frontend build
cd frontend
npm ci
npm run build
cd ..
BASH
```

### 2.1 Copiar y configurar `.env`

```bash
sudo -u taller cp /srv/taller-mecanico/deploy/.env.production.example \
    /srv/taller-mecanico/taller_mecanico/.env

sudo -u taller nano /srv/taller-mecanico/taller_mecanico/.env
# Editá:
# - SECRET_KEY (generala con `python -c "import secrets; print(secrets.token_urlsafe(64))"`)
# - DB_PASSWORD (el que pusiste en Paso 1.2)
# - ALLOWED_HOSTS=gctorque.com,*.gctorque.com,127.0.0.1
# - FRONTEND_URL=https://gctorque.com
# - BACKEND_URL=https://gctorque.com
# - EMAIL_HOST_PASSWORD (si usás SMTP real)
# - TWILIO_* (si usás WhatsApp real)
# - PROD_DOMAIN=gctorque.com   (usado por settings para CORS/CSRF dinámico)
```

Asegurate de los permisos:
```bash
sudo chmod 600 /srv/taller-mecanico/taller_mecanico/.env
sudo chown taller:taller /srv/taller-mecanico/taller_mecanico/.env
```

### 2.2 Migrar y crear el tenant público + superadmin

```bash
sudo -u taller bash <<'BASH'
cd /srv/taller-mecanico/taller_mecanico
source venv/bin/activate

# Migrar schema public (tablas SHARED_APPS)
python manage.py migrate_schemas --shared

# Crear superadmin SaaS + primer tenant demo
python manage.py setup_saas \
    --superadmin-email steed.galvez@gmail.com \
    --superadmin-nombre "Steed Galvez" \
    --superadmin-password "CAMBIAME_PASSWORD_SUPERADMIN" \
    --tenant-slug demo \
    --tenant-nombre "Taller Demo" \
    --tenant-email-contacto demo@gctorque.com

# Registrar el tenant publico + Domain admin.gctorque.com
python manage.py setup_admin_domain --host admin.gctorque.com

# Registrar el Domain del tenant demo
python manage.py shell <<'PY'
from tenancy.models import Tenant, Domain
demo = Tenant.objects.get(schema_name='taller_demo')
Domain.objects.get_or_create(
    domain='demo.gctorque.com',
    defaults={'tenant': demo, 'is_primary': True},
)
print("OK")
PY

# Recolectar archivos estáticos (Django admin, DRF browsable API, etc.)
python manage.py collectstatic --noinput
BASH
```

---

## Paso 3 — Gunicorn + systemd

```bash
sudo cp /srv/taller-mecanico/deploy/gunicorn/gunicorn.conf.py \
    /srv/taller-mecanico/taller_mecanico/

sudo cp /srv/taller-mecanico/deploy/systemd/taller-mecanico-gunicorn.service \
    /etc/systemd/system/
sudo cp /srv/taller-mecanico/deploy/systemd/taller-mecanico-celery-worker.service \
    /etc/systemd/system/
sudo cp /srv/taller-mecanico/deploy/systemd/taller-mecanico-celery-beat.service \
    /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now taller-mecanico-gunicorn
sudo systemctl enable --now taller-mecanico-celery-worker
sudo systemctl enable --now taller-mecanico-celery-beat

# Verificar que arrancaron OK
sudo systemctl status taller-mecanico-gunicorn --no-pager
sudo systemctl status taller-mecanico-celery-worker --no-pager
```

> Logs: `sudo journalctl -u taller-mecanico-gunicorn -f`

---

## Paso 4 — Nginx + SSL

### 4.1 Config Nginx

```bash
sudo cp /srv/taller-mecanico/deploy/nginx/gctorque.conf \
    /etc/nginx/sites-available/gctorque
sudo ln -sf /etc/nginx/sites-available/gctorque /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t   # debe salir "syntax is ok / test is successful"
sudo systemctl reload nginx
```

### 4.2 SSL Wildcard via Let's Encrypt (DNS-01 challenge)

> El wildcard `*.gctorque.com` requiere DNS-01 challenge (no funciona con HTTP-01). De ahí la importancia del API token de DNS.

**Si usás Cloudflare**:
```bash
sudo mkdir -p /root/.secrets
sudo tee /root/.secrets/cloudflare.ini > /dev/null <<'EOF'
dns_cloudflare_api_token = TU_API_TOKEN_AQUI
EOF
sudo chmod 600 /root/.secrets/cloudflare.ini

sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
    -d 'gctorque.com' -d '*.gctorque.com' \
    --email steed.galvez@gmail.com --agree-tos --no-eff-email
```

**Si usás Google Cloud DNS**:
```bash
# Crear service account con rol "DNS Administrator" y descargar key JSON
sudo mkdir -p /root/.secrets
sudo cp /tmp/sa-key.json /root/.secrets/google-dns.json
sudo chmod 600 /root/.secrets/google-dns.json

sudo certbot certonly \
    --dns-google \
    --dns-google-credentials /root/.secrets/google-dns.json \
    -d 'gctorque.com' -d '*.gctorque.com' \
    --email steed.galvez@gmail.com --agree-tos --no-eff-email
```

Una vez emitido el cert, recargar Nginx:
```bash
sudo systemctl reload nginx
```

Certbot configura un timer systemd que renueva automático cada 60 días. Verificá:
```bash
sudo systemctl list-timers | grep certbot
```

---

## Paso 5 — Validación

### 5.1 Smoke tests

```bash
# Backend up
curl -I https://admin.gctorque.com/admin/login/  # debe ser 200

# Login admin SaaS
curl -X POST https://admin.gctorque.com/api/v1/public-admin/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"steed.galvez@gmail.com","password":"TU_PASSWORD"}'
# debe devolver {"access":"...","refresh":"..."}

# Tenant demo
curl -I https://demo.gctorque.com/   # debe ser 200 con HTML del SPA
```

### 5.2 Login real

Abrí en browser:
- `https://admin.gctorque.com/login` → panel SaaS, login con superadmin
- `https://demo.gctorque.com/login` → app del taller, login con `auth.User` que tengas en `taller_demo`

---

## Paso 6 — Custom domains (clientes premium)

Cuando un cliente quiera usar SU PROPIO dominio (ej. `tallerjuan.com.ar`):

1. **Cliente apunta DNS**: `tallerjuan.com.ar A 34.123.45.67`
2. **Vos registrás el Domain en Django**:
   ```bash
   sudo -u taller bash -c "cd /srv/taller-mecanico/taller_mecanico && \
       source venv/bin/activate && \
       python manage.py shell <<'PY'
   from tenancy.models import Tenant, Domain
   t = Tenant.objects.get(slug='tallerjuan')
   Domain.objects.create(domain='tallerjuan.com.ar', tenant=t, is_primary=True)
   PY"
   ```
3. **Emitir cert SSL específico** (HTTP-01 challenge — más simple para custom domains):
   ```bash
   sudo certbot --nginx -d tallerjuan.com.ar
   ```
   Certbot agrega automáticamente el `server_name` y reload de Nginx.

> **Nota**: el custom domain puede convivir con el subdomain `tallerjuan.gctorque.com` — ambos apuntan al mismo schema, el cliente elige cuál promocionar.

---

## Operación: comandos del día a día

### Ver logs

```bash
sudo journalctl -u taller-mecanico-gunicorn -f          # backend
sudo journalctl -u taller-mecanico-celery-worker -f     # tareas async
sudo tail -f /var/log/nginx/access.log                  # http access
sudo tail -f /var/log/nginx/error.log                   # http errors
```

### Aplicar cambios después de un git pull

```bash
sudo -u taller bash <<'BASH'
cd /srv/taller-mecanico
git pull
cd taller_mecanico
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate_schemas --shared
python manage.py migrate_schemas    # migra TODOS los schemas de tenants
python manage.py collectstatic --noinput
cd frontend && npm ci && npm run build
BASH
sudo systemctl restart taller-mecanico-gunicorn taller-mecanico-celery-worker taller-mecanico-celery-beat
sudo systemctl reload nginx
```

### Backup de la DB

```bash
# Manual
sudo -u postgres pg_dump taller_mecanico | gzip > /backups/taller_mecanico-$(date +%Y%m%d).sql.gz

# Automatizá vía cron diario en /etc/cron.daily/postgres-backup
```

> Para producción seria, considerá Cloud SQL administrado de GCP en lugar de Postgres local. Te da backups automáticos, point-in-time recovery, alta disponibilidad. ~$30/mes mínimo.

### Crear nuevo tenant desde el panel

1. Login en `https://admin.gctorque.com/login` con tu cuenta de superadmin.
2. Click "Nuevo taller" → llená nombre/slug/email/dominio inicial.
3. El sistema crea el schema + corre migraciones + registra el Domain.
4. Crea un `auth.User` adentro del nuevo schema (vía shell o futuro endpoint del panel).

---

## Checklist de producción (NO saltarse)

- [ ] `DEBUG=False` en `.env`
- [ ] `SECRET_KEY` random de >=50 chars (NO la del repo)
- [ ] `ALLOWED_HOSTS` solo dominios reales (no `*`)
- [ ] DB con password fuerte (>=20 chars)
- [ ] Postgres NO escucha en `0.0.0.0` — solo `127.0.0.1`/socket local
- [ ] Redis NO escucha en `0.0.0.0` — solo `127.0.0.1`
- [ ] Firewall (`ufw`) bloqueando todo excepto 22/80/443
- [ ] `fail2ban` activo para SSH
- [ ] Backups de DB diarios + retención 30 días
- [ ] Cert SSL con auto-renovación (`certbot renew --dry-run` debe pasar)
- [ ] Logs rotando (`logrotate` para Nginx, journald para systemd está OK)
- [ ] Monitoreo básico: alerta si Gunicorn/Celery cae (Stackdriver, UptimeRobot, etc.)

---

## Troubleshooting

### "502 Bad Gateway" desde Nginx
Gunicorn caído. `sudo systemctl status taller-mecanico-gunicorn` y `sudo journalctl -u taller-mecanico-gunicorn -n 50`.

### "404 No tenant for hostname" en login
Falta el `Domain` en la tabla. Verificalo con:
```bash
python manage.py shell -c "from tenancy.models import Domain; [print(d.domain, '->', d.tenant.schema_name) for d in Domain.objects.all()]"
```

### Cert SSL expira
Certbot debería renovarlo solo. Si no, `sudo certbot renew` manual + revisar el timer (`systemctl status certbot.timer`).

### Migraciones de TODOS los tenants
Cuando corrés `migrate_schemas` sin `--shared`, migra TODOS los schemas. Útil después de un cambio en TENANT_APPS. Tarda más cuanto más tenants tengas.
