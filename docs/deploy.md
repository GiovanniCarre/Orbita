# Déploiement sur le VPS

Cible : VPS Hostinger KVM 1, Debian 12, `srv732542.hstgr.cloud` (46.202.171.38). Sans Docker : l'interface est compilée en fichiers statiques et servie par l'API.

```
Internet ──HTTPS──> Caddy :443 ──> uvicorn 127.0.0.1:8000 (service orbita) ──> PostgreSQL 127.0.0.1:5432
                    certificat       API + interface compilée                    base orbita
                    automatique      (frontend/build)
```

| Élément | Emplacement |
|---|---|
| Code (clone Git, utilisateur `orbita`) | `/opt/orbita` |
| Environnement Python (Python 3.11 de Debian) | `/opt/orbita/.venv` |
| Node.js 24 (construction de l'interface) | `/opt/node` |
| Secrets et réglages | `/etc/orbita/orbita.env` (root:orbita, 640) |
| Service | `orbita.service` |
| Sauvegardes quotidiennes, 14 jours | `/var/backups/orbita`, `orbita-backup.timer` à 3 h 30 |
| HTTPS | Caddy, `/etc/caddy/Caddyfile` |

## Première installation

Depuis un terminal (PowerShell suffit) :

```sh
ssh root@46.202.171.38
apt-get update && apt-get install -y git
git clone https://github.com/GiovanniCarre/Orbita.git /opt/orbita
/opt/orbita/deploy/install.sh
```

Le script demande le mot de passe de connexion à Orbita (12 caractères minimum), puis installe les paquets, Node.js 24 (archive officielle vérifiée), l'environnement Python, la base, les services et Caddy. Il génère dans `/etc/orbita/orbita.env` le secret de session, le mot de passe de la base et la clé de chiffrement Meta. Il peut être relancé : la configuration existante est conservée.

Ouvrir ensuite https://srv732542.hstgr.cloud et se connecter avec `giovannicarre49@gmail.com`.

**Copier `/etc/orbita/orbita.env` hors du serveur** (gestionnaire de mots de passe) : sans `META_TOKEN_ENCRYPTION_KEY`, les jetons Meta d'une sauvegarde sont illisibles.

Les ports 80 et 443 doivent être ouverts (pare-feu Hostinger compris) pour que Caddy obtienne le certificat. Le script signale si le nom d'hôte ne pointe pas vers le serveur.

## Mettre à jour

Après un push sur `main` :

```sh
ssh root@46.202.171.38 /opt/orbita/deploy/update.sh
```

Le script fait `git pull`, installe les dépendances, reconstruit l'interface, redémarre le service et vérifie `/api/health`. En cas d'échec, il affiche les derniers journaux.

## Exploitation

```sh
systemctl status orbita            # état du service
journalctl -u orbita -f            # journaux en direct
nano /etc/orbita/orbita.env && systemctl restart orbita   # modifier un réglage
systemctl start orbita-backup      # sauvegarde immédiate
```

Changer le mot de passe : `cd /opt/orbita/backend && runuser -u orbita -- ../.venv/bin/python -m app.auth.password`, remplacer `ORBITA_PASSWORD_HASH` dans `orbita.env`, redémarrer. Toutes les sessions sont alors fermées.

Restaurer une sauvegarde :

```sh
systemctl stop orbita
runuser -u postgres -- pg_restore --clean --if-exists -d orbita /var/backups/orbita/orbita-AAAA-MM-JJ.dump
systemctl start orbita
```

Les sauvegardes restent sur le serveur. Les instantanés hebdomadaires Hostinger couvrent la perte du disque ; pour plus de sûreté, copier régulièrement `/var/backups/orbita` ailleurs (`scp`).

## Connexion Meta en production

Renseigner les identifiants `META_*` dans `orbita.env`, redémarrer, et déclarer dans l'application Meta :

- `https://srv732542.hstgr.cloud/api/social/meta/instagram/callback`
- `https://srv732542.hstgr.cloud/api/social/meta/facebook/callback`

## Sécurité

- Seul Caddy est exposé ; l'API et PostgreSQL n'écoutent qu'en local.
- Le service tourne sous l'utilisateur `orbita`, avec un système de fichiers en lecture seule (`ProtectSystem=strict`).
- uvicorn lit l'adresse IP réelle transmise par Caddy : le blocage après 5 échecs de connexion vise l'attaquant, pas tout le monde.
- Recommandé en plus, côté SSH : clé SSH plutôt que mot de passe root, puis `PasswordAuthentication no`.
