# Moodly — V1

Projet étudiant de suivi du moral au travail, limité aux fonctions de départ.

## Fonctionnalités

- Connexion et déconnexion : collaborateur ou manager, session JWT de 8 heures.
- Collaborateur : choisir une humeur parmi cinq choix et ajouter des tags facultatifs. Une saisie par jour selon l’heure de Paris, sans modification après envoi.
- Manager : consulter les tendances de son équipe sur 30 jours, la participation et les trois tags principaux.
- Confidentialité : humeurs séparées des identités, jours sous le seuil minimum de trois réponses masqués et exclus des totaux. Ce seuil ne garantit pas un anonymat absolu.
- Accueil, explication de la confidentialité et interface adaptée au téléphone et à l’ordinateur.
- Projet Android Capacitor fourni.

La V1 ne contient pas de carnet personnel, pauses guidées, boîte à idées, accompagnement externe, questionnaire VSS ou espace administrateur. Leur code applicatif a été retiré. La version précédente reste disponible dans l’historique Git.

## Installation

Prérequis : Node.js 20.19+ ou 22.12+, npm, PostgreSQL 16 ou Docker Compose.

```bash
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Remplacer `JWT_SECRET` par une valeur aléatoire d’au moins 32 caractères, par exemple avec `openssl rand -hex 32`. Adapter `DATABASE_URL` si nécessaire.

```bash
docker compose up -d
# Avec Compose v1 : docker-compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Vite : `http://localhost:5173`. API : `http://localhost:3001/api/health`. Le navigateur utilise le proxy Vite ; les builds Android utilisent `VITE_API_URL`.

Le seed crée une équipe, huit collaborateurs, un manager et un historique de démonstration. Il refuse de recréer les comptes existants.

| Rôle | Adresse | Mot de passe local |
| --- | --- | --- |
| Collaborateur | employe1@moodly.dev | Moodly2026! |
| Manager | manager@moodly.dev | Moodly2026! |

Les anciennes migrations et les modèles de stockage associés restent conservés pour la compatibilité des bases existantes. Aucun endpoint de la V1 ne consulte les anciennes idées ou les signalements. Les anciens rôles administratifs ne peuvent pas se connecter. Aucune suppression des données existantes n’est effectuée par cette simplification. La commande de migration applique l’historique avec Prisma `migrate deploy`.

## API

| Méthode | Route | Accès |
| --- | --- | --- |
| GET | /api/health | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Connecté |
| GET | /api/moods/today | Collaborateur |
| POST | /api/moods | Collaborateur |
| GET | /api/teams/me/summary?days=30 | Manager |

L’envoi d’une humeur accepte `{ score: 1..5, tags: [] }`. Les tags autorisés sont `CHARGE_DE_TRAVAIL`, `AMBIANCE_EQUIPE`, `MANAGEMENT`, `EQUILIBRE_PERSO` et `CONDITIONS_TRAVAIL`, sans doublon. L’API refuse une deuxième saisie avec le code 409.

## Android

Avec Android Studio, JDK 21 et le SDK Android installés, définir `VITE_API_URL` dans `apps/mobile/.env` : `http://10.0.2.2:3001/api` pour l’émulateur, ou l’IP locale de l’ordinateur pour un téléphone. Garder PostgreSQL et l’API démarrés.

```bash
npm run build
npm run android -w apps/mobile
cd apps/mobile
npx cap open android
```

La configuration HTTP locale sert uniquement à la démonstration. Une diffusion publique nécessite HTTPS.

## Vérifications

```bash
npm test
npm run build
# Avec Vite démarré et Chrome installé :
npm run test:ui
# Avec PostgreSQL démarré et les migrations appliquées :
npm run test:db
```

Les tests unitaires et API couvrent les rôles, la validation, les dates Paris et le masquage. Les tests navigateur couvrent la saisie, la confirmation, la déconnexion et l’absence des anciens espaces avec une API simulée. Les tests PostgreSQL vérifient aussi les soumissions simultanées.

Les fichiers `.env`, dépendances et résultats de tests restent locaux.
