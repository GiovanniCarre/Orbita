# Orbita

Assistant personnel d'exploitation et de gestion, organisé en modules. Orbita fournit un tableau de bord, une préparation de contenu pour les réseaux sociaux et la connexion OAuth Meta pour les comptes Instagram professionnels et les Pages Facebook. La publication sociale, le reporting SportCooks, le suivi VPS et les notifications restent à développer.

## Démarrage Windows

Installer Python 3.12, Node 24 et Docker Desktop, puis lancer `scripts\run.cmd`. L'application est accessible sur http://localhost:5173. Pour arrêter les services, utiliser `docker compose down` ; le volume PostgreSQL reste conservé.

Les scripts `scripts\format.cmd`, `scripts\test.cmd`, `scripts\e2e.cmd` et `scripts\quality.cmd` installent les dépendances locales nécessaires. Playwright nécessite une installation initiale du navigateur : `cd frontend && npx playwright install chromium`. `scripts\agent.cmd` affiche les règles du projet.

Pour les autres systèmes : `python scripts/tasks.py run|format|test|e2e|quality|agent`.

Voir [l'architecture](docs/architecture.md), [les règles de contribution](CONTRIBUTING.md) et [la feuille de route](docs/backlog.md). Le projet ne prétend pas livrer les intégrations futures ni migrer les données de l'ancienne branche Java.
