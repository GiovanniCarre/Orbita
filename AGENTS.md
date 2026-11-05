# Travailler sur Orbita

Lire `docs/vision.md`, `docs/delivery.md`, `docs/backlog.md` et `docs/architecture.md` avant une fonctionnalité.

SvelteKit/TypeScript, Python/FastAPI et PostgreSQL. Code et identifiants en anglais ; interface et documentation en français. Règles métier dans les modules ; dépendances entre modules explicites. Protéger les données et les accès, ne jamais exposer de secrets, ne pas inventer de données fournisseur, demander validation pour les actions sensibles et ne pas rejouer une action externe incertaine. Documenter les réglages dans `.env.example` et `docs/running.md`. Exécuter formatage, tests, E2E, qualité et build.

Limiter toute requête métier à l'espace autorisé et tester les accès entre espaces. Les notes privées restent privées dans l'activité, les exports et le contexte IA. Respecter les versions des objets et les gardes contre les actions répétées ; vérifier les retours des fournisseurs avant de déclarer une action exécutée. Conserver les données au redémarrage. Distinguer capacités livrées, intégrations non configurées et éventuel futur SaaS.
