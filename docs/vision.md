# Vision d'Orbita

Orbita aide Giovanni à piloter ses projets avec une IA. Le parcours visé est :

1. Décrire un projet et le résultat souhaité.
2. Obtenir une proposition de plan, de priorités et de tickets.
3. Relire et ajuster ces propositions avant de les créer.
4. Suivre les tâches, leurs blocages et leurs merge requests.
5. Savoir quelle action entreprendre ensuite et ce qui a été livré.

## MVP

- Projets et objectifs conservés après redémarrage.
- Tâches avec priorité, état, dépendances et critères d'acceptation.
- Vue de l'avancement et des prochaines actions.
- Propositions IA structurées avec validation humaine avant création.
- Connexion GitHub reliant les tâches aux issues et aux PR.

GitHub est la source de vérité pour les issues publiées, les PR, les checks CI et
les fusions. Orbita conserve le contexte du projet, les brouillons et l'historique
des propositions IA. La synchronisation doit permettre de reprendre après erreur
sans créer de doublons.

## Limites de la première version

Usage personnel, intégration GitHub et un fournisseur IA configuré explicitement.
Pas de fusion autonome des PR, d'exécution de code par l'IA, de facturation ou de
gestion d'équipe dans le premier périmètre.

## Décisions à prendre au ticket #2

Le choix de la stack, du stockage et du mode de lancement fait partie de la
première livraison applicative. Documenter un choix adapté à l'usage local et
à la persistance avant de développer. Le fournisseur IA sera choisi au ticket #4.

Le présent socle ne fournit pas encore d'interface ni de service IA.
