# Architecture d'Orbita

Orbita est un outil personnel sur VPS. Le frontend SvelteKit consomme l'API FastAPI ; les règles métier sont regroupées par domaine dans `backend/app/modules`. Chaque module expose ses propres routes et évite d'importer les détails internes d'un autre module. Les traitements futurs seront exécutés par un worker indépendant de l'interface.

Le module social gère la connexion OAuth Meta pour Instagram professionnel et les Pages Facebook. Il stocke les jetons chiffrés dans PostgreSQL et n'expose que les noms et identifiants des comptes à l'interface. La publication n'est pas encore implémentée. Les données SportCooks, la surveillance, les notifications, l'authentification et le worker ne sont pas encore implémentés. Une réponse `not_configured` n'est pas un contrôle de disponibilité.

PostgreSQL conserve les données futures dans un volume persistant. Les accès aux services restent locaux dans la configuration de développement. Avant un déploiement réel : authentification, HTTPS, secrets serveur, sauvegardes testées et gestion des accès sont nécessaires. Les actions externes exigeront une validation et une stratégie contre les répétitions, y compris après une réponse incertaine.

Les jetons Meta sont chiffrés avec `pgcrypto`; la clé `META_TOKEN_ENCRYPTION_KEY` doit être sauvegardée séparément et rester stable, faute de quoi les comptes devront être reconnectés. L'API sociale est destinée au déploiement personnel derrière HTTPS et une authentification. L'authentification Orbita n'étant pas encore implémentée, ne pas exposer l'application directement sur Internet.

Les contrôles de qualité portent sur les fichiers maintenus : moins de 300 lignes par fichier de code, 11 fichiers directs maximum par dossier, aucun `any` dans les sources TypeScript/Svelte, formatage, vérifications statiques et dépendances directes déclarées avec versions exactes. Les répertoires et fichiers générés sont exclus. Le contrôle d'architecture interdit les imports statiques entre modules backend ; un futur contrat partagé devra être conçu explicitement.
