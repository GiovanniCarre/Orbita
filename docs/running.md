# Exécution

Copier `.env.example` vers `.env`, définir un mot de passe PostgreSQL local et générer `META_TOKEN_ENCRYPTION_KEY` avec `openssl rand -hex 32`. `scripts\run.cmd` construit et démarre les services Docker. `docker compose down` les arrête sans effacer les données. La commande avec `-v` efface les volumes : ne pas l'utiliser sans sauvegarde.

`ORBITA_MODULES` choisit les modules activés, par exemple `ORBITA_MODULES=social` ; vide, tous les modules sont actifs. Redémarrer l'API après modification.

Le frontend et l'API sont liés à `127.0.0.1`. Cette configuration est destinée au développement. Toute l'API, sauf `/api/health`, exige une connexion (voir ci-dessous). PostgreSQL conserve les comptes sociaux et leurs jetons chiffrés. Ne pas perdre la clé de chiffrement : elle n'est pas stockée dans la base.

## Connexion à Orbita

Orbita a un seul compte : l'adresse `ORBITA_LOGIN_EMAIL` (par défaut `giovannicarre49@gmail.com`) et un mot de passe dont seule l'empreinte scrypt est conservée dans `.env`. Pour l'activer :

1. Générer `ORBITA_SESSION_SECRET` avec `openssl rand -hex 32` et le mettre dans `.env`.
2. Générer l'empreinte du mot de passe (12 caractères minimum) : `docker compose run --rm --build -it backend python -m app.auth.password`, ou sans Docker `python -m app.auth.password` depuis `backend/`. Copier la ligne `ORBITA_PASSWORD_HASH=…` affichée dans `.env`.
3. Redémarrer Orbita (`scriptsun.cmd`) et se connecter.

La session dure 30 jours dans un cookie signé `HttpOnly`, marqué `Secure` quand l'API est en HTTPS. Changer le mot de passe ou `ORBITA_SESSION_SECRET` déconnecte toutes les sessions. Après 5 échecs en 15 minutes, l'adresse IP est bloquée pour le reste de cette période (compteur en mémoire, remis à zéro au redémarrage). Sans configuration, la page de connexion indique que la connexion n'est pas configurée et personne ne peut entrer.

## Connexion Instagram et Facebook

Créer/configurer une application Meta pour Instagram Login et Facebook Login, puis renseigner dans `.env` les identifiants `META_INSTAGRAM_APP_ID`, `META_INSTAGRAM_APP_SECRET`, `META_FACEBOOK_APP_ID` et `META_FACEBOOK_APP_SECRET`. L'Instagram API accepte les comptes professionnels (Business ou Creator), pas les comptes personnels. Facebook se connecte par Page. Meta doit accorder les autorisations de publication correspondantes avant que la publication puisse être développée.

Définir `ORBITA_API_PUBLIC_URL` sur l'URL HTTPS publique de l'API et `ORBITA_FRONTEND_PUBLIC_URL` sur l'URL du frontend. Ajouter ces URI de redirection à l'application Meta :

Les URL de l'API et du frontend doivent partager le même nom d'hôte pour que le cookie OAuth de protection d'état revienne au callback.

- `<ORBITA_API_PUBLIC_URL>/api/social/meta/instagram/callback`
- `<ORBITA_API_PUBLIC_URL>/api/social/meta/facebook/callback`

`META_GRAPH_API_VERSION` choisit la version Graph utilisée par le flux Facebook. Redémarrer Orbita après une modification de `.env`. Le bouton de connexion reste désactivé tant que les identifiants, la base et la clé de chiffrement ne sont pas configurés. Retirer un compte dans Orbita supprime son jeton local ; révoquer l'autorisation Meta se fait séparément dans les réglages de l'application ou du compte Meta.
