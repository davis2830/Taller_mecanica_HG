# Hardening de seguridad — Taller Mecánico SaaS (gctorque.com)

Esta guía endurece tu VM de producción contra los ataques más comunes
sobre un VPS Ubuntu expuesto a Internet:

- **Brute-force al login** (SSH y panel admin)
- **Scraping / scanners** que buscan `wp-admin`, `.env`, `.git`, etc.
- **Slowloris / DoS L7** básico
- **Man-in-the-middle / cookie hijacking** (cookies sin Secure flag)
- **Vulnerabilidades del SO** sin patchear

> Este documento complementa `DEPLOY.md`. Aplicalo después del primer
> deploy, una vez que hayas verificado que la app funciona.

## Capas de defensa

```
   Internet
      │
      ▼
   ┌──────────────────────────────────────────────┐
   │ 1. UFW + fail2ban   ← capa SO/red            │
   ├──────────────────────────────────────────────┤
   │ 2. Nginx (rate limit, headers, SSL hardened) │
   ├──────────────────────────────────────────────┤
   │ 3. Django (SECURE_*, throttle, HSTS)         │
   ├──────────────────────────────────────────────┤
   │ 4. Apps internas (Postgres, Redis bind LOC)  │
   └──────────────────────────────────────────────┘
```

---

## Paso 1 — Firewall (UFW)

Ejecutá el script:

```bash
sudo bash /srv/taller-mecanico/deploy/scripts/setup-firewall.sh
```

Esto deja **solo** SSH/HTTP/HTTPS abiertos. Confirmá con:

```bash
sudo ufw status verbose
```

Si tenés IP fija desde la oficina y querés permitir SSH solo desde ahí:
```bash
sudo ufw delete allow OpenSSH
sudo ufw allow from <TU_IP_FIJA> to any port 22 proto tcp
```

---

## Paso 2 — fail2ban (anti brute-force)

Instalación:

```bash
sudo apt-get install -y fail2ban sendmail
sudo cp /srv/taller-mecanico/deploy/fail2ban/jail.local /etc/fail2ban/jail.local
sudo cp /srv/taller-mecanico/deploy/fail2ban/filter.d/*.conf /etc/fail2ban/filter.d/
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban
```

Verificá las jails:

```bash
sudo fail2ban-client status
# Esperás ver: sshd, nginx-limit-req, nginx-badbots
```

Ver IPs banneadas en una jail:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-limit-req
```

Si te bloqueás solo, desbaneá tu IP:

```bash
sudo fail2ban-client set sshd unbanip <TU_IP>
```

---

## Paso 3 — SSH hardening (key-only, no root)

> **Hacelo SOLO si ya tenés clave SSH funcionando.** Si te equivocás te
> dejás afuera y necesitás consola del proveedor para entrar.

### 3.1 Generá tu clave (desde tu máquina local)

```powershell
# Windows PowerShell
ssh-keygen -t ed25519 -C "tu@email.com"
# Aceptá los defaults. Dejá passphrase si querés más seguridad.

# Copiá la clave pública al server:
ssh-copy-id dgalvez@<IP_DEL_SERVER>
# Si ssh-copy-id no está, alternativa manual:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh dgalvez@<IP> "cat >> ~/.ssh/authorized_keys"
```

### 3.2 Verificá que entrás SIN password

Abrí OTRA terminal (no cierres la actual) y probá:

```powershell
ssh dgalvez@<IP_DEL_SERVER>
```

Si entra sin pedir password, seguí. Si pide password, NO sigas.

### 3.3 Deshabilitá password login

En el server:

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Validá la sintaxis ANTES de reiniciar (importante).
sudo sshd -t

# Si no hay errores:
sudo systemctl restart ssh
```

Verificá desde otra terminal que tu sesión actual sigue funcionando.

---

## Paso 4 — Updates automáticos del SO

```bash
sudo bash /srv/taller-mecanico/deploy/scripts/setup-unattended-upgrades.sh
```

Esto aplica los patches de seguridad automáticamente cada noche. Mira
los logs:

```bash
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log
```

---

## Paso 5 — Hardening de Nginx

### 5.1 Copiar archivos de configuración

```bash
sudo cp /srv/taller-mecanico/deploy/nginx/limits.conf      /etc/nginx/conf.d/
sudo cp /srv/taller-mecanico/deploy/nginx/hardening.conf   /etc/nginx/conf.d/
sudo cp /srv/taller-mecanico/deploy/nginx/gctorque.conf    /etc/nginx/sites-available/
# Si todavía no enlazaste, hacelo:
sudo ln -sf /etc/nginx/sites-available/gctorque.conf /etc/nginx/sites-enabled/gctorque.conf
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.2 Generar Diffie-Hellman params (~3-5 minutos)

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
sudo chmod 600 /etc/nginx/ssl/dhparam.pem
```

### 5.3 Validar y recargar

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.4 Verificar el resultado

```bash
# Headers de seguridad — deberías ver Strict-Transport-Security, etc.
curl -sI https://admin.gctorque.com | grep -E '^(Strict|X-|Referrer|Permissions|Content-Security)'

# Rate limit del login — el primer request pasa, el séptimo da 429.
for i in 1 2 3 4 5 6 7 8; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
        -d '{"email":"x","password":"y"}' https://admin.gctorque.com/api/v1/public-admin/token/)
    echo "intento $i → HTTP $code"
done
```

Test online completo:
- **SSL Labs**: https://www.ssllabs.com/ssltest/analyze.html?d=admin.gctorque.com — esperás A o A+
- **Security Headers**: https://securityheaders.com/?q=admin.gctorque.com — esperás A o B

---

## Paso 6 — Hardening de Django (settings + .env)

### 6.1 Activar SECURE_PROD en `.env`

Editá `/srv/taller-mecanico/taller_mecanico/.env` y asegurate de tener:

```bash
SECURE_PROD=True
SECURE_HSTS_SECONDS=60          # subí a 31536000 (1 año) cuando estés seguro
SECURE_HSTS_PRELOAD=False       # solo activá cuando registres en hstspreload.org
THROTTLE_ANON=60/min
THROTTLE_USER=600/min
THROTTLE_LOGIN=10/min
```

### 6.2 Reiniciar Gunicorn

```bash
sudo systemctl restart taller-mecanico-gunicorn
```

### 6.3 Validar con `manage.py check --deploy`

```bash
sudo -u taller bash -c "cd /srv/taller-mecanico/taller_mecanico && \
    source venv/bin/activate && \
    python manage.py check --deploy --fail-level WARNING"
```

Esperás 0 warnings (o solo warnings que entendés y aceptás).

---

## Paso 7 — Endurecer Redis

Generá una password fuerte y aplicala:

```bash
PASS=$(openssl rand -base64 32)
echo "Tu password: $PASS  ←  guardala en tu password manager"
sudo bash /srv/taller-mecanico/deploy/scripts/harden-redis.sh "$PASS"
```

Después editá `.env` y agregá la password al broker URL:

```
CELERY_BROKER_URL=redis://:LA_PASSWORD@127.0.0.1:6379/0
```

Reiniciá los servicios:

```bash
sudo systemctl restart taller-mecanico-gunicorn \
                       taller-mecanico-celery-worker \
                       taller-mecanico-celery-beat
```

Verificá que Celery sigue procesando tasks:

```bash
sudo journalctl -u taller-mecanico-celery-worker -n 30 --no-pager
```

---

## Paso 8 — Endurecer Postgres

Por default, en GCP/Ubuntu Postgres ya escucha solo en `127.0.0.1`. Verificá:

```bash
sudo ss -tlnp | grep 5432
# Esperás: 127.0.0.1:5432 (NO 0.0.0.0:5432)
```

Si por algún motivo estuviera en `0.0.0.0`:

```bash
sudo sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf
sudo systemctl restart postgresql
```

### Password fuerte para `taller_meca`

Si la password fue débil al crear el user:

```bash
sudo -u postgres psql -c "ALTER USER taller_meca PASSWORD 'PASSWORD_FUERTE_AQUI';"
# Después actualizá DB_PASSWORD en .env y reiniciá Gunicorn.
```

---

## Paso 9 — Backups automáticos de PostgreSQL

```bash
sudo cp /srv/taller-mecanico/deploy/scripts/postgres-backup.sh /usr/local/bin/taller-backup.sh
sudo chmod +x /usr/local/bin/taller-backup.sh
sudo mkdir -p /backups
sudo chown postgres:postgres /backups

# Cron a las 3am todos los días
echo "0 3 * * * postgres /usr/local/bin/taller-backup.sh >> /var/log/taller-backup.log 2>&1" | sudo tee /etc/cron.d/taller-backup
```

Probá una corrida manual:

```bash
sudo -u postgres /usr/local/bin/taller-backup.sh
ls -lh /backups/
```

> **Recomendado**: configurá tambien la subida a Google Cloud Storage
> editando el script (sección `GCS_BUCKET`) o configurá un disco persistente
> separado para `/backups` así no se pierde si la VM muere.

---

## Paso 10 — Monitoreo mínimo

### 10.1 Healthcheck endpoint

Django ya expone `/api/v1/health/` (si no, agregalo). Configurá UptimeRobot
o BetterStack (gratis hasta cierto límite) con un ping HTTP cada 5 minutos.

### 10.2 Alertas systemd

Configurá `OnFailure=` en cada unit para recibir email cuando un servicio
muere. Agregá al final de cada `.service`:

```ini
[Unit]
OnFailure=email-on-failure@%n.service
```

(requiere crear el template `email-on-failure@.service` con sendmail).

### 10.3 Logs centralizados

Para empezar, journald + logrotate alcanzan:

```bash
sudo tail -f /var/log/nginx/gctorque-access.log
sudo journalctl -u taller-mecanico-gunicorn -f
```

Cuando crezca, considerá Loki + Grafana o Google Cloud Logging.

---

## Checklist final

- [ ] UFW: solo 22, 80, 443 abiertos
- [ ] fail2ban: jails sshd + nginx-* corriendo
- [ ] SSH: key-only, no root, password disabled
- [ ] unattended-upgrades: corriendo
- [ ] Nginx: `nginx -t` OK, headers de seguridad presentes, rate limit funciona (HTTP 429)
- [ ] Django: `SECURE_PROD=True`, `manage.py check --deploy` sin errores
- [ ] Redis: bind a localhost, requirepass configurada
- [ ] Postgres: bind a localhost, password fuerte
- [ ] Backups: cron diario funcionando + retención de 30 días
- [ ] Monitoreo: UptimeRobot pingueando `/api/v1/health/` cada 5 min
- [ ] Tests externos:
    - SSL Labs: A o A+
    - SecurityHeaders.com: A o B
    - Mozilla Observatory: B o más

---

## Qué NO está en este hardening (decidí cuándo agregar)

- **Cloudflare WAF** — agregá un proxy DDoS L7 cuando tengas tráfico real.
  Plan gratis cubre el 90% de los ataques script-kiddie. Activalo poniendo
  el DNS de gctorque.com en Cloudflare con proxy ON (nube naranja).
- **Secret manager** (GCP Secret Manager / HashiCorp Vault) — cuando seas
  un equipo o tengas múltiples ambientes. Por ahora `.env` con permisos
  `600` es razonable para un solo deploy.
- **Centralized logs** (Loki/Grafana, ELK, Cloud Logging) — útil con +5
  máquinas o varios servicios distribuidos.
- **Intrusion Detection** (Wazuh, OSSEC) — overkill hasta que tengas
  problemas concretos; fail2ban + auditd cubren lo básico.
- **MFA en SSH** — google-authenticator-libpam si querés 2FA.

---

## Si algo se rompe después del hardening

| Síntoma | Causa probable | Fix rápido |
|---|---|---|
| 400 Bad Request en login | `SECURE_SSL_REDIRECT=True` pero proxy no setea X-Forwarded-Proto | Verificá que Nginx tiene `proxy_set_header X-Forwarded-Proto $scheme;` |
| Cookies no se setean | `SESSION_COOKIE_SECURE=True` y estás probando en HTTP | Usá HTTPS, o desactivá temporalmente `SECURE_PROD` para debug |
| 429 Too Many Requests al testear | Throttle disparado | Reiniciá Gunicorn (limpia cache local) o subí `THROTTLE_LOGIN` |
| No puedo entrar por SSH | UFW bloquea o sshd_config rompió | Consola del proveedor → revertir cambios → reiniciar ssh |
| HSTS quedó en 1 año y querés revertir | No se puede para browsers que ya cachearon | Esperar a que expire, o usar otro dominio mientras tanto |
