# Organisation du projet

- `apps/mobile/src/main.tsx` : connexion, session, saisie d’humeur et tendances manager.
- `apps/mobile/src/spaces.tsx` : accueil, navigation et confidentialité.
- `apps/mobile/src/api.ts` : client API et types.
- `apps/mobile/src/mascots.tsx` : les cinq humeurs.
- `apps/mobile/src/style.css` : styles ordinateur et mobile.
- `apps/mobile/android/` : projet Android Capacitor.
- `apps/api/src/app.ts` : authentification et routes du projet.
- `apps/api/src/aggregate.ts` : dates et calcul des tendances avec masquage.
- `apps/api/prisma/` : schéma, seed et historique des migrations conservé pour les bases existantes.
- `tests/v1.spec.ts` : parcours navigateur du projet.
- `docker-compose.yml` : PostgreSQL local.
- `.env.example` et `apps/*/.env.example` : exemples de configuration.

- `apps/mobile/src/personal.ts` : stockage privé du carnet.
- `apps/mobile/src/journal-widgets.tsx` : notes, intentions et comparaison à la veille.
- `apps/mobile/public/audio/` : ambiance sonore des pauses.
- `tests/mobile-improvements.spec.ts` : carnet et pauses dans le navigateur.
