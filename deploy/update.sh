#!/usr/bin/env bash
# Met à jour Orbita sur le serveur, en root : récupère main, reconstruit, redémarre.
#   /opt/orbita/deploy/update.sh            (avec git pull)
#   /opt/orbita/deploy/update.sh --no-pull  (reconstruit le code présent)
set -euo pipefail

APP=/opt/orbita
as_orbita() {
  runuser -u orbita -- env HOME="$APP" PATH="/opt/node/bin:/usr/bin:/bin" "$@"
}

[ "$(id -u)" -eq 0 ] || { echo "Lancer ce script en root." >&2; exit 1; }

if [ "${1:-}" != "--no-pull" ]; then
  echo "==> git pull"
  as_orbita git -C "$APP" pull --ff-only
fi

echo "==> Dépendances Python"
as_orbita "$APP/.venv/bin/pip" install --quiet -r "$APP/backend/requirements.txt"

echo "==> Construction de l'interface"
as_orbita npm --prefix "$APP/frontend" ci --no-audit --no-fund --loglevel=error
as_orbita npm --prefix "$APP/frontend" run build --silent

echo "==> Redémarrage"
systemctl restart orbita
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    echo "Orbita fonctionne ($(git -C "$APP" log -1 --format='%h %s'))."
    exit 0
  fi
  sleep 1
done
echo "Orbita ne répond pas. Derniers journaux :" >&2
journalctl -u orbita -n 40 --no-pager >&2
exit 1
