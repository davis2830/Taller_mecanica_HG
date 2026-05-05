#!/usr/bin/env bash
# Configura unattended-upgrades para que el SO aplique patches de seguridad
# automáticamente cada noche.
#
# Uso: sudo bash deploy/scripts/setup-unattended-upgrades.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Este script requiere sudo." >&2
    exit 1
fi

echo "==> Instalando unattended-upgrades..."
apt-get install -y unattended-upgrades apt-listchanges

echo "==> Habilitando actualizaciones automáticas..."
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Download-Upgradeable-Packages "1";
EOF

echo "==> Configurando políticas de unattended-upgrades..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
    "${distro_id}:${distro_codename}-updates";
};

Unattended-Upgrade::Package-Blacklist {
    // Agregá paquetes que NO querés que se actualicen automático,
    // ej. "nginx" si tenés mods custom compilados.
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Mail "steed.galvez@gmail.com";
Unattended-Upgrade::MailReport "on-change";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";

Unattended-Upgrade::SyslogEnable "true";
EOF

echo "==> Probando configuración (dry-run)..."
unattended-upgrade --dry-run --debug 2>&1 | tail -10

echo
echo "[OK] unattended-upgrades configurado."
echo
echo "Logs: /var/log/unattended-upgrades/unattended-upgrades.log"
echo "Editar config: sudo nano /etc/apt/apt.conf.d/50unattended-upgrades"
