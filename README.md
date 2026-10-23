# Moodly

Projet étudiant de suivi du moral au travail.

## Fonctionnalités

- Connexion collaborateur ou manager.
- Une humeur par jour avec des tags facultatifs.
- Tendances collectives du manager sur 30 jours, avec masquage des petits effectifs.
- Carnet personnel facultatif : calendrier, historique, notes privées, intentions et comparaison avec la veille. Les données restent sur l’appareil.
- Cinq pauses guidées : respiration animée, minuteur, pause/reprise et ambiance sonore.
- Boîte à idées : propositions sans auteur, avec statut et réponse du manager.
- Questionnaire VSS et harcèlement en quatre étapes, confirmation avant envoi et réponses chiffrées. Les dossiers sont réservés à l’administration Moodly ; les accès sont journalisés.
- Interface ordinateur/mobile et projet Android Capacitor.

## Installation

Prérequis : Node.js 20.19+ ou 22.12+, npm et Docker Compose.

```bash
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Remplacer `JWT_SECRET` dans `apps/api/.env` par un secret d’au moins 32 caractères (`openssl rand -hex 32`).

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Avec Compose v1, utiliser `docker-compose up -d`. Ouvrir `http://localhost:5173`.

| Compte de démo | Mot de passe |
| --- | --- |
| employe1@moodly.dev | Moodly2026! |
| manager@moodly.dev | Moodly2026! |

Le seed refuse de recréer les comptes existants. Les migrations historiques sont conservées.

## Activer les signalements VSS

Dans `apps/api/.env`, renseigner :

- `VSS_ENCRYPTION_KEY` : une clé privée générée avec `openssl rand -hex 32`, distincte de `JWT_SECRET`. La conserver pour relire les dossiers.
- `MOODLY_ADMIN_EMAIL` et `MOODLY_ADMIN_PASSWORD` : identifiants administrateur, mot de passe d’au moins 12 caractères.

```bash
npm run vss:setup
```

Le dépôt nécessite cette clé et un administrateur. Celui-ci se connecte à `/signalements` pour consulter les dossiers et changer leur statut. Les managers n’y ont pas accès. Sans coordonnées volontaires, aucun recontact n’est possible. Ce service n’est pas surveillé en permanence et ne constitue pas un service d’urgence.

## Vérification

```bash
npm test
npm run build
# Avec Vite démarré et Chrome installé :
npm run test:ui
```

## Android

Dans `apps/mobile/.env`, définir `VITE_API_URL` sur `http://10.0.2.2:3001/api` pour l’émulateur ou sur l’IP locale de l’ordinateur pour un téléphone. Garder PostgreSQL et l’API démarrés. Android Studio, JDK 21 et le SDK Android sont nécessaires.

```bash
npm run build
npm run android -w apps/mobile
cd apps/mobile
npx cap open android
```

Projet de démonstration : le seuil de réponses ne garantit pas un anonymat absolu. Les fichiers `.env` restent privés. Une diffusion publique nécessite HTTPS.
