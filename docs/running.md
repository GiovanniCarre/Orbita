# Lancer Orbita

## Avec Docker : une commande

Prérequis : Docker avec Docker Compose, démarré sur votre ordinateur.

Depuis la racine du dépôt :

~~~sh
docker compose up --build -d
~~~

Ouvrir [Orbita](http://localhost:8080), créer un compte puis un espace.
Aucun compte, mot de passe ou jeu de données n'est créé automatiquement.

L'image construit le frontend, exécute les tests web, compile Java, exécute les
tests d'intégration et vérifie le formatage Java avant de produire le serveur.
Le port est publié uniquement sur l'interface locale de l'ordinateur.

~~~sh
docker compose ps
docker compose logs --tail 80 app
docker compose stop
docker compose start
~~~

Les données H2 sont dans le volume Docker nommé `orbita_orbita-data`. Arrêter ou
recréer le conteneur conserve ce volume. La suppression des volumes supprime les
données : ne pas ajouter l'option de suppression des volumes à un arrêt ordinaire.

## Configurer les intégrations

Le produit fonctionne sans fichier `.env`. Copier `.env.example` vers `.env`
pour configurer des intégrations, puis recréer le conteneur :

~~~sh
docker compose up -d --build
~~~

Les clés et mots de passe restent côté serveur. `.env` est exclu de Git et du
contexte de construction Docker. Les connexions GitHub de l'outil de
développement ne sont jamais réutilisées comme identifiants du produit.

### IA avec OpenAI

Renseigner `ORBITA_AI_PROVIDER=openai`, `ORBITA_AI_MODEL` avec le nom exact du
modèle autorisé sur votre compte, et `OPENAI_API_KEY`.

L'adaptateur utilise l'API Responses, une sortie JSON structurée et `store=false`.
Il n'utilise pas les sessions ou conversations ChatGPT personnelles.
Le modèle doit prendre en charge les sorties structurées.

Le quota `ORBITA_AI_DAILY_LIMIT` vaut 50 demandes par jour et par espace par
défaut, selon la journée de la base de données. Il compte aussi les échecs :
ce n'est pas un plafond monétaire. Configurer également les limites fournisseur.

### IA locale avec Ollama

Renseigner `ORBITA_AI_PROVIDER=ollama`, `ORBITA_AI_MODEL` avec le nom exact d'un
modèle déjà installé et `ORBITA_OLLAMA_URL`.

Dans Docker, l'adresse proposée est `http://host.docker.internal:11434`.
Pour un lancement Java directement sur l'ordinateur, utiliser
`http://localhost:11434`. Ollama doit être accessible depuis le conteneur et le
modèle choisi doit produire le schéma demandé. Orbita ne télécharge aucun modèle.

Le contexte est limité à l'espace autorisé et aux notes partagées. Les notes
privées sont exclues. Les propositions sont modifiables ; seule une validation
explicite crée les tâches, une fois par plan. Aucun outil externe ni envoi de
mail n'est déclenché par le modèle.

### Envoi SMTP

Renseigner les variables `ORBITA_SMTP_*` et `ORBITA_MAIL_FROM`.
Copier l'identifiant affiché dans Paramètres vers `ORBITA_SMTP_SPACE_ID`.
Un compte SMTP est utilisable uniquement dans cet espace.

Créer un contact avec une adresse utilisable, préparer un brouillon puis
confirmer l'envoi avec un compte propriétaire ou administrateur. L'écran montre
le destinataire, l'objet et le contenu. La version relue doit correspondre à
celle enregistrée au moment de l'envoi.

Une acceptation SMTP ne garantit pas la distribution ou la lecture. Un résultat
incertain passe à « À vérifier » et n'est pas renvoyé automatiquement.
Les oppositions sont vérifiées avant envoi et conservées indépendamment de la
fiche contact. Les campagnes et la réception Gmail ne sont pas incluses.

### Lecture GitHub

Associer un dépôt sous la forme `propriétaire/dépôt` à un projet, puis utiliser
« Lire l'activité ». Les dépôts publics sont lus sans jeton.

Pour un dépôt privé, configurer `ORBITA_GITHUB_TOKEN` avec les droits nécessaires
et `ORBITA_GITHUB_SPACE_ID`. Le jeton n'est jamais utilisé pour un autre espace.
La vue présente au maximum les 20 derniers tickets et PR du dépôt ; elle
n'effectue ni synchronisation continue ni création d'issues.

## PostgreSQL

Le profil facultatif utilise les mêmes migrations Flyway avec PostgreSQL 18.
Définir `ORBITA_DATABASE_PASSWORD`, puis lancer :

~~~sh
docker compose -f compose.yml -f compose.postgres.yml up --build -d
~~~

Le port PostgreSQL n'est pas publié sur l'ordinateur. Sa persistance est séparée
dans le volume `orbita_orbita-postgres`. Changer de moteur ne migre pas
automatiquement les données déjà créées dans H2.

## Sans Docker

Prérequis : JDK 25 et Node.js 24 LTS. Maven est fourni par le Wrapper.

Windows / PowerShell :

~~~powershell
.\mvnw.cmd -Pweb verify
java -jar target/orbita-0.1.0-SNAPSHOT.jar
~~~

macOS / Linux :

~~~sh
./mvnw -Pweb verify
java -jar target/orbita-0.1.0-SNAPSHOT.jar
~~~

La base locale est alors dans `.local/data/`. Le profil `web` installe et
construit React avant son inclusion dans le JAR.

Pour travailler avec rechargement du frontend :

~~~sh
# Terminal 1, racine du dépôt
./mvnw spring-boot:run

# Terminal 2
cd frontend
npm ci
npm run dev
~~~

Le frontend est sur `http://127.0.0.1:5173`, avec un proxy vers Java sur
`http://127.0.0.1:8080`.

## Vérifier et formater

~~~sh
./mvnw verify
./mvnw spotless:apply
npm --prefix frontend run format:check
npm --prefix frontend run format
npm --prefix frontend test
npm --prefix frontend run build
python -m unittest discover -s tests -v
~~~

Sous Windows, remplacer `./mvnw` par `.\mvnw.cmd`. Python sert uniquement aux
contrôles du flux de contribution, pas au fonctionnement du produit.

La CI conserve `Repository checks` et `PR policy` comme checks obligatoires.
Le premier exige la réussite des jobs Java et web avant les tests de contribution.

## Exploitation du pilote

Cette livraison fonctionne avec une instance de serveur. Au redémarrage, les
demandes IA interrompues sont marquées en échec et les envois SMTP interrompus
à vérifier, sans répétition automatique. Les sessions en mémoire demandent une
reconnexion ; les données métier sont conservées.

Un rapport quotidien est enregistré à 18 h dans `ORBITA_TIMEZONE`
(`Europe/Paris` par défaut), si le serveur tourne. Une clé de période empêche les
doublons pour la même journée et le même espace. Il n'y a pas de rattrapage
automatique si le serveur était arrêté à cette heure.

Le service worker fournit une page de repli hors connexion, sans conserver
de réponse API authentifiée ni de donnée métier. Les écrans sont responsive ;
les push et la validation sur appareils réels restent à livrer.

Avant des données importantes, organiser les sauvegardes et vérifier la
restauration. Elles ne sont pas automatisées dans cette version. Pour une copie
H2 cohérente, arrêter le serveur avant de copier `/data` ou `.local/data/`.

Le déploiement public, la vérification d'adresse, la récupération de compte,
le MFA et le durcissement commercial sont des travaux distincts. Cette tranche
locale ne constitue pas le SaaS P0/P1 complet.
