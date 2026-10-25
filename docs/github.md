# Configuration GitHub

## Protection de main

Le fichier [main-protection.json](../.github/main-protection.json) contient la
configuration attendue. Elle s'applique dans les paramètres GitHub ; sa seule
présence dans Git ne protège pas la branche.

Après création de `main` et exécution des checks sur la première PR, un
administrateur authentifié peut l'appliquer :

```sh
gh api --method PUT repos/GiovanniCarre/Orbita/branches/main/protection --input .github/main-protection.json
```

Vérification :

```sh
gh api repos/GiovanniCarre/Orbita/branches/main/protection
```

La configuration exige une PR, les deux checks de CI et une branche à jour,
résout les conversations avant fusion et interdit le force push et la suppression.
Les administrateurs sont concernés. Aucun quota d'approbation externe n'est
imposé à ce dépôt personnel, afin que Giovanni puisse fusionner ses propres PR.

## Paramètres de fusion

Seule la fusion par squash est utilisée ; la branche de travail est supprimée
automatiquement après fusion. Ces paramètres sont distincts de la protection :

```sh
gh api --method PATCH repos/GiovanniCarre/Orbita -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false -F delete_branch_on_merge=true -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

## Contrôle des PR

Le workflow utilise l'événement `pull_request` avec un jeton limité à la lecture
du contenu et des issues. Le code des PR n'obtient aucun secret applicatif.
Le contrôle refuse une branche mal nommée, un titre invalide, l'absence de
`Closes #<numero>` correspondant, une issue absente, fermée ou un numéro de PR
utilisé à la place d'une issue.

Un événement JSON peut être validé localement, sans appel réseau :

```sh
python scripts/check_pr.py --event chemin/vers/evenement.json
```

L'option `--verify-issue` vérifie aussi l'issue sur GitHub et nécessite un
`GH_TOKEN` ou `GITHUB_TOKEN` autorisé en lecture des issues.

## Références officielles

- [Modèles de tickets et de PR](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)
- [API de protection des branches](https://docs.github.com/en/rest/branches/branch-protection)

Les modèles deviennent disponibles dans le dépôt lorsqu'ils sont fusionnés sur
la branche par défaut, `main`.
