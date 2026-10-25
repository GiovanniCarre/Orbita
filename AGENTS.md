# Travailler sur Orbita

## Produit

Orbita est le gestionnaire IA de projets de Giovanni. Lire `docs/vision.md`,
`docs/backlog.md` et le ticket concerné avant d'implémenter une fonctionnalité.
Ne pas présenter une fonctionnalité prévue comme déjà disponible.

## Tickets et branches

- Chaque livraison correspond à un ticket GitHub avec des critères d'acceptation.
- Partir d'un `main` à jour et travailler sur `codex/<numero>-<description>`.
- Ne pas développer ni pousser directement sur `main`.
- Une PR cible `main` et ferme son ticket avec une ligne `Closes #<numero>`.
- Garder les PR petites et cohérentes ; éviter les refontes sans lien avec le ticket.
- Présenter la PR à Giovanni et la laisser ouverte jusqu'à sa demande de fusion.

## Qualité

- Choisir une architecture simple et documenter les décisions structurantes.
- Nommer le code en anglais ; rédiger les textes utilisateur et la documentation en français.
- Pour un changement de comportement, vérifier les scénarios significatifs et les erreurs.
- Pour une modification de documentation, vérifier les liens et la cohérence ; ne pas ajouter de tests artificiels.
- Exécuter les contrôles adaptés avant de publier la PR et mentionner toute limite réelle.
- Ne jamais stocker de secrets ni de données personnelles de projets dans le dépôt.
- Ne pas remplacer une intégration IA absente par des réponses simulées présentées comme réelles.

## Outils actuels

Le dépôt utilise Python 3.12+ sans dépendances externes pour contrôler les PR.
Cela ne préjuge pas de la stack du futur produit.

```sh
python -m unittest discover -s tests -v
```

Toute évolution du flux de contribution doit conserver l'accord entre
`CONTRIBUTING.md`, `.github/workflows/ci.yml`, `.github/main-protection.json`
et les contrôles de `scripts/check_pr.py`.
