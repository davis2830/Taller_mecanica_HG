#!/usr/bin/env bash
# Configura UFW (firewall del SO) con la política mínima necesaria para
# producción: SSH + HTTP + HTTPS, todo lo demás bloqueado.
#
# Uso: sudo bash deploy/scripts/setup-firewall.sh
#
# IDEMPOTENTE — podés correrlo varias veces sin efectos colaterales.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Este script requiere sudo." >&2
    exit 1
fi

echo "==> Instalando UFW si no está..."
apt-get install -y ufw

echo "==> Reseteando reglas a estado limpio..."
ufw --force reset

echo "==> Política default: deny incoming, allow outgoing..."
ufw default deny incoming
ufw default allow outgoing

echo "==> Permitiendo SSH (22), HTTP (80), HTTPS (443)..."
# IMPORTANTE: si cambiás el puerto SSH, ajustá esto antes de habilitar UFW
# o te dejás afuera del server.
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo "==> Rate limit de SSH (max 6 intentos en 30s desde la misma IP)..."
ufw limit ssh

echo "==> Habilitando UFW..."
ufw --force enable

echo
echo "==> Estado final:"
ufw status verbose

echo
echo "[OK] Firewall configurado."
echo
echo "Comandos útiles:"
echo "  sudo ufw status verbose     # ver reglas"
echo "  sudo ufw status numbered    # ver reglas numeradas"
echo "  sudo ufw delete <num>       # borrar una regla"
echo "  sudo ufw allow from 1.2.3.4 # whitelistear una IP"
