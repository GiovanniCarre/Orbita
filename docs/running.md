# Exécution

Copier `.env.example` vers `.env`, définir un mot de passe PostgreSQL local et générer `META_TOKEN_ENCRYPTION_KEY` avec `openssl rand -hex 32`. `scripts\run.cmd` construit et démarre les services Docker. `docker compose down` les arrête sans effacer les données. La commande avec `-v` efface les volumes : ne pas l'utiliser sans sauvegarde.

`ORBITA_MODULES` choisit les modules activés, par exemple `ORBITA_MODULES=social` ; vide, tous les modules sont actifs. Redémarrer l'API après modification.

Le frontend et l'API sont liés à `127.0.0.1`. Cette configuration est destinée au développement. Toute l'API, sauf `/api/health`, exige une connexion Google (voir ci-dessous). PostgreSQL conserve les comptes sociaux et leurs jetons chiffrés. Ne pas perdre la clé de chiffrement : elle n'est pas stockée dans la base.

## Connexion à Orbita (Google)

Orbita n'accepte que les comptes Google listés dans `ORBITA_ALLOWED_EMAILS`, par défaut `giovannicarre49@gmail.com`. Pour l'activer :

1. Dans la [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configurer l'écran de consentement OAuth (type « Externe », ajouter son adresse comme utilisateur test), puis créer un « ID client OAuth » de type « Application Web ».
2. Ajouter l'URI de redirection autorisée `<ORBITA_API_PUBLIC_URL>/api/auth/google/callback`, en local `http://localhost:8000/api/auth/google/callback`.
3. Renseigner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `ORBITA_SESSION_SECRET` (`openssl rand -hex 32`) dans `.env`, puis redémarrer.

La session dure 30 jours dans un cookie signé `HttpOnly`, marqué `Secure` quand l'API est en HTTPS. Changer `ORBITA_SESSION_SECRET` déconnecte toutes les sessions ; retirer une adresse de `ORBITA_ALLOWED_EMAILS` coupe immédiatement son accès. Sans configuration Google, la page de connexion l'indique et personne ne peut entrer.

## Connexion Instagram et Facebook

Créer/configurer une application Meta pour Instagram Login et Facebook Login, puis renseigner dans `.env` les identifiants `META_INSTAGRAM_APP_ID`, `META_INSTAGRAM_APP_SECRET`, `META_FACEBOOK_APP_ID` et `META_FACEBOOK_APP_SECRET`. L'Instagram API accepte les comptes professionnels (Business ou Creator), pas les comptes personnels. Facebook se connecte par Page. Meta doit accorder les autorisations de publication correspondantes avant que la publication puisse être développée.

Définir `ORBITA_API_PUBLIC_URL` sur l'URL HTTPS publique de l'API et `ORBITA_FRONTEND_PUBLIC_URL` sur l'URL du frontend. Ajouter ces URI de redirection à l'application Meta :

Les URL de l'API et du frontend doivent partager le même nom d'hôte pour que le cookie OAuth de protection d'état revienne au callback.

- `<ORBITA_API_PUBLIC_URL>/api/social/meta/instagram/callback`
- `<ORBITA_API_PUBLIC_URL>/api/social/meta/facebook/callback`

`META_GRAPH_API_VERSION` choisit la version Graph utilisée par le flux Facebook. Redémarrer Orbita après une modification de `.env`. Le bouton de connexion reste désactivé tant que les identifiants, la base et la clé de chiffrement ne sont pas configurés. Retirer un compte dans Orbita supprime son jeton local ; révoquer l'autorisation Meta se fait séparément dans les réglages de l'application ou du compte Meta.
