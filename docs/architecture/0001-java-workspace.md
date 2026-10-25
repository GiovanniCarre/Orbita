# ADR 0001 — Application Java et interface React

Statut : retenu pour le pilote du ticket #7.

## Contexte

Giovanni demande Java moderne, Maven et une interface agréable. Le cahier des
charges élargit le produit à plusieurs entreprises, au CRM, aux échanges et à
l'assistance IA. La première livraison doit être exécutable sans attendre les
identifiants de services externes.

## Décision

- Java 25, Spring Boot 4.1.2, Maven Wrapper 3.9.16 et threads virtuels.
- Monolithe modulaire : identité et accès, travail, IA, messagerie, rapports et
  intégrations. Les contrôleurs délèguent les règles métier aux services.
- Spring Security pour BCrypt, les sessions et la protection CSRF.
  Le frontend et l'API partagent la même origine.
- DTO en records, validation Jakarta et erreurs métier en français.
- JDBC explicite et migrations Flyway. H2 sur fichier pour le démarrage local ;
  profil PostgreSQL pour un stockage serveur séparé.
- React, TypeScript strict, Vite et CSS propre au produit. Le build est servi
  par le même JAR que l'API, sans serveur Node en production.
- Adaptateurs HTTP pour OpenAI Responses et Ollama. La sortie structurée est
  validée côté serveur ; le modèle n'obtient aucun outil d'écriture.
- SMTP et lecture GitHub facultatifs, avec identifiants rattachés à un espace.
- Docker Compose pour un lancement sans JDK ni Maven sur l'hôte.

## Invariants

Chaque requête métier contrôle l'appartenance et le rôle dans l'espace cible.
Les requêtes SQL incluent l'espace. Les relations projet/tâche/contact/note
portent une contrainte composite empêchant les liens entre espaces.

Une note privée n'est visible que par son auteur, y compris pour le propriétaire,
les exports et l'activité. Elle est exclue du contexte IA automatique.

Les mises à jour portent un numéro de version ; une ancienne version renvoie
409. L'acceptation d'un plan IA est atomique et ne crée les tâches qu'une fois.
L'envoi réserve l'état et la version du brouillon avant le contact fournisseur ;
un résultat incertain demande un rapprochement et n'est pas rejoué.

Les réponses fournisseur brutes et les secrets ne sont pas exposés au navigateur.
Les contenus externes sont affichés comme du texte ; aucune sortie IA n'est
exécutée comme code ou HTML.

## Conséquences

Le fonctionnement local est simple et les invariants sont vérifiables par de
vrais tests HTTP. Les adaptateurs externes peuvent évoluer sans changer le
cœur des projets.

Invitations avec jetons, identité commerciale, coffre de secrets par client,
facturation et travailleurs distribués restent nécessaires avant une ouverture
SaaS. Les sessions en mémoire demandent une reconnexion après redémarrage.
Le quota IA porte sur les demandes, pas sur un budget financier garanti.

La reprise et le planificateur supposent une instance. La mise à l'échelle
nécessitera des baux de travail, une file persistante et des sessions partagées.

## Références

- [Compatibilité Java / Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html)
- [Sorties structurées OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [Protocole de chat Ollama](https://docs.ollama.com/api/chat)
