# Architecture d'Orbita

Orbita est un outil personnel sur VPS. Le frontend SvelteKit consomme l'API FastAPI ; les règles métier sont regroupées par domaine dans `backend/app/modules`.

## Modules

Chaque module est indépendant et activable. Côté API, `backend/app/modules/<nom>/module.py` déclare un objet `MODULE` (`app.registry.Module`) : son routeur et ses actions de démarrage, comme la création de ses tables. Le noyau (`app/main.py`, `app/registry.py`) ne connaît aucun module par son nom : il découvre les dossiers de `app/modules`, n'importe que ceux listés dans `ORBITA_MODULES` (tous si la variable est vide) et publie la liste active sur `GET /api/modules`. Un module désactivé n'est jamais importé et ses routes n'existent pas. Un nom inconnu empêche le démarrage.

Côté interface, le code d'un module vit dans `frontend/src/lib/<nom>/` et ses pages dans `frontend/src/routes/<nom>/`. `frontend/src/lib/modules.ts` décrit les modules connus (libellé, page) ; le layout commun affiche la navigation des modules actifs et remplace la page d'un module désactivé par un message. Le tableau de bord (`overview`) est servi par la page d'accueil.

Un module n'importe jamais un autre module, ni côté API ni côté interface ; il peut utiliser le noyau (`app.registry`, `$lib/modules`). `scripts/quality.py` le vérifie, ainsi que la présence de `module.py`. Les tests `backend/tests/test_modules.py` démarrent l'API avec chaque module seul. Pour ajouter un module : créer `backend/app/modules/<nom>/` avec `module.py`, ses dossiers frontend et son entrée dans `frontend/src/lib/modules.ts`.

Les traitements futurs seront exécutés par un worker indépendant de l'interface.

## Domaines

Le module social gère la connexion OAuth Meta pour Instagram professionnel et les Pages Facebook. Il stocke les jetons chiffrés dans PostgreSQL et n'expose que les noms et identifiants des comptes à l'interface. La publication n'est pas encore implémentée. Les données SportCooks, la surveillance, les notifications, l'authentification et le worker ne sont pas encore implémentés. Une réponse `not_configured` n'est pas un contrôle de disponibilité.

PostgreSQL conserve les données futures dans un volume persistant. Les accès aux services restent locaux dans la configuration de développement. Avant un déploiement réel : authentification, HTTPS, secrets serveur, sauvegardes testées et gestion des accès sont nécessaires. Les actions externes exigeront une validation et une stratégie contre les répétitions, y compris après une réponse incertaine.

Les jetons Meta sont chiffrés avec `pgcrypto`; la clé `META_TOKEN_ENCRYPTION_KEY` doit être sauvegardée séparément et rester stable, faute de quoi les comptes devront être reconnectés. L'API sociale est destinée au déploiement personnel derrière HTTPS et une authentification. L'authentification Orbita n'étant pas encore implémentée, ne pas exposer l'application directement sur Internet.

Les contrôles de qualité portent sur les fichiers maintenus : moins de 300 lignes par fichier de code, 11 fichiers directs maximum par dossier, aucun `any` dans les sources TypeScript/Svelte, formatage, vérifications statiques et dépendances directes déclarées avec versions exactes. Les répertoires et fichiers générés sont exclus. Le contrôle d'architecture interdit les imports entre modules, côté backend comme côté frontend ; le seul contrat partagé est le registre des modules.
