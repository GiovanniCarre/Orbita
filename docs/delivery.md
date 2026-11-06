# Première brique

Livré : structure SvelteKit/FastAPI, connexion par e-mail et mot de passe réservée au propriétaire, tableau de bord, préparation locale de vidéo et de texte pour cinq réseaux, point de santé, PostgreSQL persistant, OAuth Meta pour comptes Instagram professionnels et Pages Facebook, stockage chiffré des jetons, affichage et retrait des comptes dans Orbita. La publication n'est pas encore disponible. Les accès Meta doivent être configurés dans `.env`; les URLs de callback doivent être déclarées dans l'application Meta. La connexion doit être configurée dans `.env` (voir `docs/running.md`).

Le module Messages prépare la connexion de comptes Gmail, la lecture des messages adressés à SportCooks et l'envoi ou la réponse après confirmation. Il nécessite une configuration OAuth Google et le consentement du titulaire de chaque boîte ; sans eux, il indique que l'intégration n'est pas configurée.
