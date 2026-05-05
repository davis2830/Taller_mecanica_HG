#!/usr/bin/env bash
# Backup diario de PostgreSQL para Taller Mecánico SaaS.
#
# Instalación:
#   sudo cp deploy/scripts/postgres-backup.sh /usr/local/bin/taller-backup.sh
#   sudo chmod +x /usr/local/bin/taller-backup.sh
#   sudo mkdir -p /backups && sudo chown postgres:postgres /backups
#   echo "0 3 * * * /usr/local/bin/taller-backup.sh" | sudo tee -a /etc/crontab
#
# Output: /backups/taller_mecanico-YYYYMMDD-HHMMSS.sql.gz
# Retención: 30 días (configurable abajo).

set -euo pipefail

DB_NAME="${DB_NAME:-taller_mecanico}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

echo "[$(date)] Iniciando backup de $DB_NAME → $BACKUP_FILE"

# pg_dump con --clean para que el restore drop+create las tablas.
# Como user postgres para evitar problemas de password.
sudo -u postgres pg_dump --clean --if-exists "$DB_NAME" | gzip -9 > "$BACKUP_FILE"

# Validar que el dump no esté vacío.
if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "[ERROR] Backup file está vacío!"
    exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completado: $BACKUP_FILE ($SIZE)"

# Limpiar backups viejos.
echo "[$(date)] Eliminando backups > $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

# Opcional: subir a Google Cloud Storage.
# Descomenta y configurá:
# GCS_BUCKET="${GCS_BUCKET:-gs://gctorque-backups}"
# if command -v gsutil &> /dev/null; then
#     echo "[$(date)] Subiendo a $GCS_BUCKET..."
#     gsutil cp "$BACKUP_FILE" "$GCS_BUCKET/$(basename "$BACKUP_FILE")"
# fi

echo "[$(date)] Backup completado exitosamente."
