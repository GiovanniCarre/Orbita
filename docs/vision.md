# Vision d'Orbita

Orbita aide Giovanni à piloter plusieurs activités depuis un même espace :
projets, contacts, travail quotidien et assistance IA contextualisée.

Le cahier des charges fonctionnel v1.0 du 25 octobre 2026 décrit la cible :
un SaaS multi-entreprises avec CRM, prospection, mails, connaissances, connecteurs,
actions autorisées, automatisations, rapports et accès mobile.

## Parcours visé

1. Définir l'entreprise, le projet et ses objectifs.
2. Relier les ressources utiles et préciser le contexte de l'IA.
3. Préparer un plan, des tâches ou des réponses avec les informations autorisées.
4. Relire avant les actions externes et suivre les résultats confirmés.
5. Consulter les priorités et les bilans pour décider de la prochaine action.

## Première tranche livrée

Le ticket #7 introduit une application Java/Maven complète et exécutable :
espaces et rôles, projets, tâches, CRM, notes, plans IA validés, brouillons SMTP,
lecture GitHub, indicateurs et rapports. Les intégrations sont facultatives et
leurs secrets restent côté serveur.

Le fonctionnement réel et les limites sont décrits dans `docs/delivery.md`.
Le produit ne présente pas les parcours futurs comme déjà disponibles.

## Suite

Les prochains lots étendront les connecteurs, la messagerie entrante,
la prospection sourcée et les campagnes, les automatisations, les push et
l'exploitation commerciale. Les droits, l'idempotence, la confidentialité et
la traçabilité doivent accompagner chaque lot, dès son implémentation.
