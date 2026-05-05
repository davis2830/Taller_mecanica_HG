#!/usr/bin/env bash
# Endurece Redis: bind solo a localhost + requiere password.
#
# Uso: sudo bash deploy/scripts/harden-redis.sh <PASSWORD>
#
# Después de correr esto, actualizá tu .env:
#   CELERY_BROKER_URL=redis://:<PASSWORD>@127.0.0.1:6379/0

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Este script requiere sudo." >&2
    exit 1
fi

if [[ $# -lt 1 ]]; then
    echo "Uso: sudo bash $0 <REDIS_PASSWORD>"
    echo
    echo "Generá una password fuerte con:"
    echo "  openssl rand -base64 32"
    exit 1
fi

PASSWORD="$1"
CONF="/etc/redis/redis.conf"

if [[ ! -f "$CONF" ]]; then
    echo "[ERROR] $CONF no existe. ¿Está instalado redis-server?"
    exit 1
fi

echo "==> Backup de $CONF → $CONF.bak"
cp "$CONF" "$CONF.bak"

echo "==> Configurando bind a 127.0.0.1 ::1..."
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "$CONF"
# Si la línea bind no existe, agregarla.
grep -q '^bind ' "$CONF" || echo "bind 127.0.0.1 ::1" >> "$CONF"

echo "==> Configurando protected-mode yes..."
sed -i 's/^protected-mode .*/protected-mode yes/' "$CONF"
grep -q '^protected-mode ' "$CONF" || echo "protected-mode yes" >> "$CONF"

echo "==> Configurando requirepass..."
# Eliminar líneas requirepass previas y agregar la nueva.
sed -i '/^requirepass /d' "$CONF"
echo "requirepass $PASSWORD" >> "$CONF"

echo "==> Deshabilitando comandos peligrosos en producción..."
# Renombrar a string vacío = deshabilitar.
for cmd in FLUSHDB FLUSHALL KEYS CONFIG SHUTDOWN DEBUG; do
    sed -i "/^rename-command $cmd /d" "$CONF"
    echo "rename-command $cmd \"\"" >> "$CONF"
done

echo "==> Reiniciando Redis..."
systemctl restart redis-server

echo "==> Verificando que escucha solo en localhost..."
sleep 2
ss -tlnp | grep ':6379' || echo "[WARN] Redis no parece estar escuchando."

echo
echo "[OK] Redis endurecido."
echo
echo "RECORDATORIO: actualizá tu .env con la nueva URL del broker:"
echo "  CELERY_BROKER_URL=redis://:$PASSWORD@127.0.0.1:6379/0"
echo
echo "Y reiniciá los servicios:"
echo "  sudo systemctl restart taller-mecanico-gunicorn taller-mecanico-celery-worker taller-mecanico-celery-beat"
