#!/usr/bin/env bash
# Première installation d'Orbita sur Debian 12, en root, depuis /opt/orbita :
#   apt-get install -y git && git clone https://github.com/GiovanniCarre/Orbita.git /opt/orbita
#   /opt/orbita/deploy/install.sh
# Relançable sans risque : les secrets existants de /etc/orbita/orbita.env sont conservés.
set -euo pipefail

DOMAIN="${ORBITA_DOMAIN:-srv732542.hstgr.cloud}"
LOGIN_EMAIL="${ORBITA_LOGIN_EMAIL:-giovannicarre49@gmail.com}"
APP=/opt/orbita
ENV_DIR=/etc/orbita
ENV_FILE="$ENV_DIR/orbita.env"
NODE_DIR=/opt/node

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'Erreur : %s\n' "$*" >&2; exit 1; }
secret() { python3 -c 'import secrets; print(secrets.token_hex(32))'; }

[ "$(id -u)" -eq 0 ] || die "lancer ce script en root."
[ -d "$APP/.git" ] || die "cloner d'abord le dépôt dans $APP."
grep -q 'VERSION_CODENAME=bookworm' /etc/os-release || echo "Attention : prévu pour Debian 12 (bookworm)."

log "Paquets système (Python 3.11, PostgreSQL, Caddy)"
apt-get update -q
apt-get install -y -q --no-install-recommends \
  git curl ca-certificates xz-utils python3 python3-venv postgresql caddy

log "Utilisateur système orbita"
id orbita >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin orbita
chown -R orbita:orbita "$APP"

log "Node.js 24 (archive officielle vérifiée par SHA-256)"
if ! "$NODE_DIR/bin/node" --version 2>/dev/null | grep -q '^v24\.'; then
  base=https://nodejs.org/dist/latest-v24.x
  tmp=$(mktemp -d)
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  archive=$(grep -o 'node-v24[^ ]*-linux-x64\.tar\.xz' "$tmp/SHASUMS256.txt" | head -n 1)
  [ -n "$archive" ] || die "archive Node.js introuvable."
  curl -fsSL "$base/$archive" -o "$tmp/$archive"
  (cd "$tmp" && grep " $archive\$" SHASUMS256.txt | sha256sum -c --quiet -)
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$tmp/$archive" -C "$NODE_DIR" --strip-components=1
  rm -rf "$tmp"
fi
"$NODE_DIR/bin/node" --version

log "Environnement Python"
[ -x "$APP/.venv/bin/python" ] || runuser -u orbita -- python3 -m venv "$APP/.venv"
runuser -u orbita -- "$APP/.venv/bin/pip" install --quiet --upgrade pip
runuser -u orbita -- "$APP/.venv/bin/pip" install --quiet -r "$APP/backend/requirements.txt"

log "Configuration $ENV_FILE"
install -d -m 750 -o root -g orbita "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  echo "Choisir le mot de passe de $LOGIN_EMAIL (12 caractères minimum) :"
  hash_line=$(cd "$APP/backend" && runuser -u orbita -- "$APP/.venv/bin/python" -m app.auth.password)
  umask 027
  cat >"$ENV_FILE" <<EOF
# Généré par deploy/install.sh. Garder une copie hors du serveur (gestionnaire de mots de passe).
ORBITA_LOGIN_EMAIL=$LOGIN_EMAIL
$hash_line
ORBITA_SESSION_SECRET=$(secret)
ORBITA_API_PUBLIC_URL=https://$DOMAIN
ORBITA_FRONTEND_PUBLIC_URL=https://$DOMAIN
ORBITA_STATIC_DIR=$APP/frontend/build
ORBITA_MODULES=

DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=orbita
DATABASE_USER=orbita
DATABASE_PASSWORD=$(secret)

# Sans cette clé, les jetons Meta sauvegardés sont illisibles : la conserver hors du serveur.
META_TOKEN_ENCRYPTION_KEY=$(secret)
META_GRAPH_API_VERSION=v26.0
META_FACEBOOK_APP_ID=
META_FACEBOOK_APP_SECRET=
META_INSTAGRAM_APP_ID=
META_INSTAGRAM_APP_SECRET=
EOF
  chown root:orbita "$ENV_FILE"
  chmod 640 "$ENV_FILE"
fi
db_password=$(sed -n 's/^DATABASE_PASSWORD=//p' "$ENV_FILE")
[ -n "$db_password" ] || die "DATABASE_PASSWORD manquant dans $ENV_FILE."

log "PostgreSQL : rôle et base orbita"
systemctl enable --now postgresql
runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 -v password="$db_password" <<'SQL'
SELECT format('CREATE ROLE orbita LOGIN PASSWORD %L', :'password')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'orbita') \gexec
SELECT format('ALTER ROLE orbita LOGIN PASSWORD %L', :'password') \gexec
SELECT 'CREATE DATABASE orbita OWNER orbita'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'orbita') \gexec
SQL
runuser -u postgres -- psql -q -d orbita -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto'

log "Services systemd"
install -m 644 "$APP/deploy/orbita.service" /etc/systemd/system/orbita.service
install -m 644 "$APP/deploy/orbita-backup.service" /etc/systemd/system/orbita-backup.service
install -m 644 "$APP/deploy/orbita-backup.timer" /etc/systemd/system/orbita-backup.timer
systemctl daemon-reload
systemctl enable orbita.service orbita-backup.timer
systemctl start orbita-backup.timer

log "Construction et démarrage"
"$APP/deploy/update.sh" --no-pull

log "Caddy (HTTPS automatique pour $DOMAIN)"
server_ip=$(curl -fsS4 --max-time 10 https://api.ipify.org || true)
domain_ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR == 1 { print $1 }' || true)
if [ -n "$server_ip" ] && [ "$server_ip" != "$domain_ip" ]; then
  echo "Attention : $DOMAIN pointe vers '${domain_ip:-rien}', ce serveur est $server_ip."
  echo "Le certificat HTTPS ne pourra pas être obtenu tant que le DNS n'est pas corrigé."
fi
[ -f /etc/caddy/Caddyfile.orig ] || cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.orig
sed "s/ORBITA_DOMAIN/$DOMAIN/" "$APP/deploy/Caddyfile" >/etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy
systemctl reload-or-restart caddy

log "Terminé : https://$DOMAIN"
echo "Secrets : $ENV_FILE (à copier hors du serveur). Mise à jour : $APP/deploy/update.sh"
