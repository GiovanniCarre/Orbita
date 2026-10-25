# Livraison 0.1 — Premier espace de travail

Cette livraison applique la demande Java/Maven du ticket #7 et commence le
produit du cahier des charges fonctionnel v1.0 du 25 octobre 2026.
Le document source emploie Orbito ; le dépôt et l'application conservent Orbita.

## Ce qui fonctionne

| Parcours | Comportement livré |
| --- | --- |
| Comptes et espaces | Inscription, connexion/déconnexion, BCrypt, plusieurs espaces et rôles |
| Membres | Ajout d'un compte déjà inscrit, rôle selon droits, révocation immédiate |
| Projets | Création, modification, objectif, couleur, site, dépôt, archivage et réactivation |
| Tâches | Tableau à cinq états, déplacement/sélecteur, priorité, blocage, responsable, échéance et critères |
| CRM | Contacts, entreprise, adresse, provenance en notes, étape, recherche, filtre et CSV |
| Opposition | Exclusion persistante, conservée après changement d'adresse et réimport |
| Notes | Privées ou partagées, projet, recherche, édition et contrôle des versions |
| IA | OpenAI/Ollama, contexte limité, plan structuré, historique personnel et acceptation unique après édition |
| Mails | Brouillons CRM, SMTP limité à un espace, confirmation de la version relue et résultat fournisseur |
| GitHub | Lecture explicite des 20 derniers tickets/PR d'un dépôt associé |
| Pilotage | Indicateurs réels, progression par projet, priorités et fil d'activité |
| Rapports | Instantanés manuels, bilan quotidien serveur, historique, impression/PDF |
| Exports | JSON et CSV administrateurs, sans notes privées d'autrui |
| Mobile | Navigation responsive, manifeste, repli hors connexion sans cache métier |

Les intégrations ne sont pas activées automatiquement. Un fournisseur absent
est affiché comme non configuré ; aucune réponse IA ni donnée de performance
n'est simulée dans le produit.

## Correspondance avec le cahier des charges

| Famille | État de cette tranche | Suite nécessaire |
| --- | --- | --- |
| ORG, DAT, SEC | Socle livré | Invitations, vérification mail, récupération, MFA, conservation et durcissement |
| PRJ, UX, OPS | Projets et tâches livrés | Modules activables, calendrier, dépendances, demandes et incidents |
| CRM | Contacts et suivi livrés | Opportunités distinctes, import guidé et fusion des doublons |
| AI, KB | Plans et contexte partagé livrés | Documents indexés, citations, budgets et outils autorisés |
| PRO | Non livré | Découverte sourcée, campagnes, relances et rebonds |
| MAIL | Sortant SMTP livré | OAuth Gmail, réception, fils et pièces jointes |
| NOTE | Notes livrées | Comptes rendus structurés, historique de versions et vocal |
| MET, RPT | Indicateurs internes et instantanés livrés | Sources externes, synthèse IA, envoi et périodes comparées |
| CON, PAY, ADS, TRA | GitHub en lecture | Stripe, AdSense, GA4, CDN et adaptateur Sportcooks |
| ACT, AUT | Validation IA et rapport quotidien | Actions métier, mandats, file persistante et règles configurables |
| NTF | Centre de suivi interne | Push, préférences par appareil et escalade |
| SAAS, PRIV, NFR | Préparation technique | Abonnements, support, contrats, suppression et recette d'exploitation |

Aucun compte Gmail, Stripe, AdSense ou Analytics n'est connecté par cette
livraison et aucun site externe n'est modifié. Le ticket #5 reste nécessaire
pour la synchronisation bidirectionnelle GitHub.

## Validation

Tests HTTP d'intégration, adaptateurs IA contre un serveur HTTP local,
sélecteurs frontend et règles de contribution. Cas importants :

- Authentification, CSRF, BCrypt et révocation.
- Cloisonnement et refus des références entre espaces.
- Notes privées exclues des listes, exports, activité et contexte IA.
- Conflits de version, archivage avec conservation et quotas IA.
- Acceptation d'un plan modifié une seule fois, sans création anticipée.
- Opposition persistante et envoi interdit bloqué.
- Double envoi, version modifiée après relecture et résultat incertain.
- Reprise après redémarrage sans répétition d'une action externe.
- Rapports quotidiens sans doublons et protection des cellules CSV.

Les tests ne font aucun appel IA payant et n'envoient aucun mail réel.
Les permissions et la configuration des fournisseurs restent à valider avec
les comptes du pilote.

La recette navigateur utilise des données fictives dans un volume séparé :
compte, projets, tâches, contacts, notes, bilans, navigation, états sans
intégration, lecture GitHub et largeurs bureau/mobile. Le serveur livré démarre
avec une base vide.

## Ordre de revue

La PR de socle #6 reste distincte et peut être fusionnée en premier.
La branche du ticket #7 reprend ce socle et cible `main`. Aucune de ces PR
n'est fusionnée automatiquement par l'agent.
