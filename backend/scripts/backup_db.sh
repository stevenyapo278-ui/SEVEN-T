#!/bin/bash
# Script de sauvegarde automatique PostgreSQL
# À configurer dans crontab (ex: 0 3 * * * /chemin/vers/backup_db.sh)

DB_USER="postgres"
DB_NAME="seven_t"
BACKUP_DIR="/var/backups/seven_t"
DATE=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Démarrage de la sauvegarde de $DB_NAME vers $BACKUP_FILE"
docker exec seven_t-db-1 pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Conserver seulement les 7 dernières sauvegardes
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;

echo "Sauvegarde terminée."
