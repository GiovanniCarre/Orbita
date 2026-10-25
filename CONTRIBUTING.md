# Contribuer à Orbita

## Avant de coder

Créer ou prendre un [ticket GitHub](https://github.com/GiovanniCarre/Orbita/issues).
Le ticket décrit le besoin, le périmètre, les dépendances et des critères
d'acceptation vérifiables. Les bugs précisent comment reproduire le problème.

Créer une branche liée à son numéro :

```sh
git switch main
git pull --ff-only origin main
git switch -c codex/2-project-management
```

Le numéro `2` est un exemple : utiliser celui du ticket réellement traité.
Le nom de branche suit `codex/<numero>-<description-en-minuscules>`.

## Pendant le développement

Privilégier une livraison utile par PR. Documenter les décisions importantes et
tester les comportements modifiés ainsi que leurs erreurs significatives.
Ne pas ajouter de dépendance sans besoin concret ni commettre de secrets.

Pour le socle actuel :

```sh
python -m unittest discover -s tests -v
```

Les futurs tickets applicatifs ajouteront leurs commandes de lancement et de test.

## Ouvrir une MR / PR

Sur GitHub, une merge request s'appelle une pull request. Cibler `main` et utiliser
un titre de la forme `type: description` ou `type(scope): description`.
Types acceptés : `feat`, `fix`, `docs`, `chore`, `ci`, `test`, `refactor`, `perf`,
`build`, `style`. Exemple : `feat(projects): créer et modifier un projet`.

Le corps de la PR contient, sur une ligne dédiée :

```text
Closes #2
```

Le numéro doit correspondre à la branche et à une issue ouverte du dépôt.
Les références dans un commentaire HTML ou un bloc de code ne comptent pas.
Une simple mention `Refs #2` ne ferme pas le ticket et ne suffit donc pas.

Expliquer le problème résolu, le comportement obtenu et la validation effectuée.
Joindre des captures lorsque l'interface évolue. Une PR encore incomplète reste
en brouillon. Giovanni relit la PR avant de demander sa fusion.

## Fusion

`main` exige une PR, les checks `Repository checks` et `PR policy`, une branche
à jour et la résolution des conversations. La règle s'applique aussi aux
administrateurs. Les force pushes et la suppression de `main` sont interdits.

Utiliser le squash pour garder une entrée lisible par livraison. Le ticket lié
se ferme automatiquement lorsque la PR est fusionnée sur `main`.

Le dépôt étant individuel, le quota d'approbations GitHub est fixé à zéro :
Giovanni peut relire et fusionner ses propres PR. La revue reste une étape du
processus, avec une fusion explicitement demandée aux agents.

Le seul commit direct initial a créé le README dans le dépôt alors vide, afin
d'établir la branche cible de la première PR. Il ne contient aucune fonctionnalité.
