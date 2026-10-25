# Orbita

Orbita est le projet de gestionnaire IA de projets de Giovanni. Sa vocation :
transformer un objectif en plan et en tickets, rendre les priorités visibles et
suivre le développement jusqu'aux merge requests.

## État actuel

Le dépôt contient le socle de contribution, la CI et le premier backlog.
L'application, le stockage et l'intégration IA restent à implémenter.

## Développer proprement

1. Définir un ticket GitHub avec un résultat attendu et des critères d'acceptation.
2. Créer une branche `codex/<numero-du-ticket>-<description>` depuis `main`.
3. Développer une livraison ciblée et exécuter les contrôles adaptés.
4. Ouvrir une pull request vers `main`, avec `Closes #<numero>` dans son corps.
5. Relire les changements et les résultats de CI, puis fusionner par squash.

Sur GitHub, une merge request (MR) s'appelle une pull request (PR).
`main` est la branche d'intégration : les tickets sont des issues GitHub, liés aux PR.

## Vérification locale du socle

Python 3.12 ou plus récent suffit ; aucune dépendance externe n'est nécessaire.
Ce choix concerne les outils du dépôt et ne fixe pas la stack de l'application.

```sh
python -m unittest discover -s tests -v
```

La CI exécute ces tests et vérifie pour chaque PR le titre, la branche, le ticket
lié et l'existence d'une issue ouverte dans ce dépôt.

## Documentation

- [Vision et périmètre du produit](docs/vision.md)
- [Backlog et ordre de livraison](docs/backlog.md)
- [Contribution et règles de fusion](CONTRIBUTING.md)
- [Consignes pour les agents de développement](AGENTS.md)
- [Configuration de la protection de main](docs/github.md)
