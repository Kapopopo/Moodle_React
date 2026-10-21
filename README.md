# Moodly

Projet étudiant de suivi du moral au travail, dans sa version finale de rendu. Le collaborateur partage son humeur quotidienne et le manager consulte des tendances collectives avec un seuil de réponses.

## Fonctionnalités

- **Collaborateur** : humeur du jour, carnet personnel facultatif conservé sur l’appareil, pauses guidées, boîte à idées, lien vers un accompagnement psychologique externe et questionnaire de signalement VSS.
- **Manager** : tendances et participation de son équipe, traitement des idées proposées.
- **Administration Moodly** : tableau de bord et traitement des signalements VSS, avec dossiers chiffrés et accès journalisés.
- Interface adaptée aux ordinateurs et téléphones, avec projet Android Capacitor fourni.

## Technologies

React 19, TypeScript, Vite 6, Tailwind CSS 4 et Capacitor 7 pour l’interface ; Node.js, Express 4, Prisma 6 et PostgreSQL 16 pour l’API et les données. Tests avec Vitest, Supertest et Playwright.

## Installation locale

Prérequis : Node.js 20.19+ (ou Node.js 22.12+), npm et Docker Compose.

```bash
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Dans `apps/api/.env`, remplacer `JWT_SECRET` par un secret aléatoire d’au moins 32 caractères. Générer séparément `VSS_ENCRYPTION_KEY` avec `openssl rand -hex 32` : cette clé doit rester privée et stable pour relire les signalements.

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvrir l’adresse affichée par Vite, généralement `http://localhost:5173`. L’API écoute sur le port `3001` ; en développement navigateur, Vite transmet les appels `/api` à l’API.

Le seed crée une équipe et des données de démonstration. Il refuse de s’exécuter si les comptes existent déjà pour préserver les données.

| Compte de démonstration | Identifiant | Mot de passe |
| --- | --- | --- |
| Collaborateur | `employe1@moodly.dev` | `Moodly2026!` |
| Manager | `manager@moodly.dev` | `Moodly2026!` |

Pour tester l’administration VSS, renseigner `MOODLY_ADMIN_EMAIL` et `MOODLY_ADMIN_PASSWORD` (12 caractères minimum) dans `apps/api/.env`, puis lancer `npm run vss:setup`. Aucun administrateur avec mot de passe public n’est créé par le seed.

## Android

Prérequis supplémentaires : Android Studio, JDK 21 et SDK Android.

Dans `apps/mobile/.env`, remplacer l’adresse de `VITE_API_URL` par celle de l’ordinateur sur le réseau local, avec le suffixe `:3001/api`. Le téléphone doit pouvoir joindre cette adresse. Ajouter l’origine Vite locale à `CORS_ORIGINS` si le navigateur utilise cette adresse.

```bash
npm run build
npm run android -w apps/mobile
cd apps/mobile
npx cap open android
```

Le projet Android est déjà fourni : inutile de lancer `cap add android`. Refaire le build puis la synchronisation après une modification. La configuration HTTP locale convient à la démonstration ; une diffusion publique nécessite HTTPS et une configuration adaptée.

## Vérifications

```bash
npm test
npm run build
```

Vérifications complémentaires nécessitant des services locaux :

```bash
npm run test:db
npm run test:ui
```

## Organisation

```text
apps/api/          API Express, schéma Prisma, migrations et tests serveur
apps/mobile/       Interface React et projet Android
tests/             Tests navigateur
docs/              Guide technique et notes de travail archivées
```

- [Guide technique](docs/GUIDE_TECHNIQUE.md) : fonctionnalités détaillées, variables d’environnement, API et confidentialité.
- [Rôle des fichiers](README_FICHIERS.md).
- [Technologies et présentation](techs.md).

## Données et limites

Une seule humeur par jour et par collaborateur, selon l’heure de Paris. Les humeurs collectives sont séparées des identités ; les jours sous le seuil de réponses sont masqués, sans garantie d’anonymat absolu. Le carnet reste sur l’appareil. Les signalements VSS sont réservés à l’administration Moodly ; le texte libre peut identifier une personne.

Cette version est un projet étudiant de démonstration. Elle ne constitue ni un dispositif médical ni un service de surveillance permanente des signalements.

Les dépendances, builds, caches, résultats de tests et fichiers `.env` locaux sont exclus par `.gitignore`. Conserver `package-lock.json`, les migrations et les sources Android pour permettre une installation reproductible.
