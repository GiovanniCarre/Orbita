# Travailler sur Orbita

## Produit

Orbita est le gestionnaire IA de projets de Giovanni. Lire `docs/vision.md`,
`docs/delivery.md`, `docs/backlog.md` et le ticket avant une fonctionnalité.
Distinguer les capacités livrées, les intégrations non configurées et le futur SaaS.

## Tickets et branches

- Chaque livraison correspond à un ticket GitHub avec des critères vérifiables.
- Partir d'un `main` à jour et travailler sur `codex/<numero>-<description>`.
- Si un socle nécessaire est encore en PR, le reprendre sans fusionner `main` et
  indiquer cette dépendance dans la PR de livraison.
- Ne pas développer ni pousser directement sur `main`.
- La PR cible `main` et contient une ligne `Closes #<numero>`.
- Garder les PR cohérentes avec le périmètre demandé ; éviter les refontes étrangères au ticket.
- Laisser la PR ouverte pour la revue de Giovanni jusqu'à sa demande de fusion.

## Architecture et qualité

- Java 25, Spring Boot, Maven Wrapper ; frontend React/TypeScript dans `frontend/`.
- Les contrôleurs contrôlent l'accès et valident les entrées ; les services portent les règles.
- Toutes les requêtes métier sont limitées à l'espace autorisé. Tester les accès entre espaces.
- Les notes privées restent privées dans l'activité, les exports et le contexte IA.
- Respecter les versions des objets et les gardes contre les actions répétées.
- Une réponse IA ne constitue pas une exécution. Vérifier les retours fournisseur.
- Pas de secrets dans Git, le navigateur, les prompts ou les messages d'erreur.
- Aucun faux modèle IA ni faux indicateur présenté comme réel.
- Code et identifiants en anglais ; interface et documentation en français.
- Tester les scénarios métier significatifs et leurs erreurs, sans tests artificiels pour la documentation.

## Commandes

~~~sh
./mvnw verify
./mvnw spotless:apply
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run format:check
npm --prefix frontend run format
python -m unittest discover -s tests -v
~~~

Sur Windows : `.\mvnw.cmd`. Node 24 est nécessaire au frontend. Docker Compose
permet la construction et le lancement sans JDK installé sur l'hôte.

Le check obligatoire `Repository checks` dépend de la réussite des jobs Java et
web. Conserver l'accord entre `CONTRIBUTING.md`, la CI, la protection de `main` et
`scripts/check_pr.py`.

Documenter les nouveaux réglages dans `.env.example` et `docs/running.md` sans
y mettre de valeurs secrètes. Pour le pilote à une instance, conserver les
données au redémarrage et ne jamais rejouer un envoi externe incertain.
