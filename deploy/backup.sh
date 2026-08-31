#!/usr/bin/env bash
# ============================================================
# Backup de AuditFlow (producción): PostgreSQL + documentos
# Uso:   ./deploy/backup.sh [ruta_de_respaldo]
# Ejemplo de cron (diario a las 02:30):
#   30 2 * * * /opt/auditflow/deploy/backup.sh /opt/auditflow/backups >> /var/log/auditflow-backup.log 2>&1
# ============================================================
set -euo pipefail

BACKUP_ROOT="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="${BACKUP_ROOT}/${STAMP}"
mkdir -p "${DEST}"

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "[auditflow-backup] Iniciando respaldo en ${DEST}"

# 1. Base de datos (PostgreSQL vía contenedor)
echo "[auditflow-backup] Volcando PostgreSQL..."
docker compose -f "${COMPOSE_DIR}/${COMPOSE_FILE}" exec -T db \
  pg_dump -U "${POSTGRES_USER:-auditflow}" "${POSTGRES_DB:-auditflow}" \
  | gzip > "${DEST}/database.sql.gz"

# 2. Documentos subidos (volumen uploads_data)
echo "[auditflow-backup] Respaldando documentos..."
docker run --rm \
  -v "auditflow-prod_uploads_data:/data:ro" \
  -v "${DEST}:/backup" \
  alpine tar czf "/backup/uploads.tar.gz" -C /data .

# 3. Retención: conservar los últimos 14 respaldos
echo "[auditflow-backup] Aplicando retención (14 días)..."
ls -1dt "${BACKUP_ROOT}"/*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf

echo "[auditflow-backup] Respaldo completado: ${DEST}"
echo "[auditflow-backup] Restaurar con: gunzip -c database.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U ${POSTGRES_USER:-auditflow} ${POSTGRES_DB:-auditflow}"
