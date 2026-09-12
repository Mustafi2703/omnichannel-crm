#!/usr/bin/env bash
set -euo pipefail
backup_dir="${BACKUP_DIR:-/var/backups/omnicrm}"
retention_days="${BACKUP_RETENTION_DAYS:-7}"
mkdir -p "$backup_dir"
docker compose exec -T postgres pg_dump -U omnicrm -Fc omnicrm > "$backup_dir/omnicrm-$(date +%F-%H%M%S).dump"
find "$backup_dir" -type f -name 'omnicrm-*.dump' -mtime +"$retention_days" -delete
