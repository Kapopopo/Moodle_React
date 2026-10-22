# Organisation de la V1

- `apps/mobile/src/main.tsx` : connexion, session, saisie d’humeur et tendances manager.
- `apps/mobile/src/spaces.tsx` : accueil, navigation et confidentialité.
- `apps/mobile/src/api.ts` : client API et types.
- `apps/mobile/src/mascots.tsx` : les cinq humeurs.
- `apps/mobile/src/style.css` : styles ordinateur et mobile.
- `apps/mobile/android/` : projet Android Capacitor.
- `apps/api/src/app.ts` : authentification et routes de la V1.
- `apps/api/src/aggregate.ts` : dates et calcul des tendances avec masquage.
- `apps/api/prisma/` : schéma, seed et historique des migrations conservé pour les bases existantes.
- `tests/v1.spec.ts` : parcours navigateur de la V1.
- `docker-compose.yml` : PostgreSQL local.
- `.env.example` et `apps/*/.env.example` : exemples de configuration.
