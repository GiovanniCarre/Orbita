#!/usr/bin/env bash
# Sauvegarde quotidienne de la base (lancée par orbita-backup.timer). Garde 14 jours.
# Restauration : runuser -u postgres -- pg_restore --clean -d orbita <fichier>.dump
set -euo pipefail

DIR=/var/backups/orbita
install -d -m 700 "$DIR"
file="$DIR/orbita-$(date +%F).dump"
runuser -u postgres -- pg_dump --format=custom orbita >"$file.tmp"
chmod 600 "$file.tmp"
mv "$file.tmp" "$file"
find "$DIR" -name 'orbita-*.dump' -mtime +14 -delete
echo "Sauvegarde : $file"
