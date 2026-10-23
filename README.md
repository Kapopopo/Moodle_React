# Moodly

Projet étudiant pour partager son humeur au travail et suivre le moral d’une équipe.

- **Collaborateur** : humeur du jour, carnet privé, pauses, idées et signalements.
- **Manager** : tendances de l’équipe et réponses aux idées.
- **Administration** : traitement des signalements VSS (violences sexistes et sexuelles).

Le manager ne voit pas les humeurs individuelles ni les carnets. Les résultats avec trop peu de réponses sont masqués, sans garantie d’anonymat absolu.

## Lancer le projet

Il faut **Node.js 20.19+**, **npm** et **Docker avec Compose**.

Depuis le dossier du projet :

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Dans `apps/api/.env`, remplace `JWT_SECRET` par un secret généré avec `openssl rand -hex 32`.

Puis lance :

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvre **http://localhost:5173**.

| Compte de démo | Adresse | Mot de passe |
| --- | --- | --- |
| Collaborateur | maena@gmail.com | EPITECHDIGI2026-Maena! |
| Manager | manager@moodly.dev | Moodly2026! |

Les fois suivantes, lance seulement `docker compose up -d` puis `npm run dev`. Le seed sert une seule fois.

## Commandes utiles

| Commande | Action |
| --- | --- |
| `npm run dev` | Démarrer l’application et le serveur. |
| `npm run build` | Vérifier et compiler le projet. |
| `npm test` | Lancer les tests. |
| `npm run test:db` | Tester avec PostgreSQL démarré et migré. |
| `npm run test:ui` | Tester dans Chrome, avec l’application lancée et les comptes de démo créés. |

## Android

Avec Android Studio, le JDK 21 et le SDK Android installés :

```bash
npm run android -w apps/mobile
cd apps/mobile
npx cap open android
```

Dans Android Studio, choisis l’appareil puis **Run**. Garde le serveur lancé et le téléphone sur le même réseau que le PC.

Si nécessaire, remplace `VITE_API_URL=auto` dans `apps/mobile/.env` par `VITE_API_URL=http://IP_DU_PC:3001/api`, puis relance la commande `android`.

## Signalements et données privées

Pour activer les signalements, renseigne `VSS_ENCRYPTION_KEY` (générée avec `openssl rand -hex 32`), `MOODLY_ADMIN_EMAIL` et `MOODLY_ADMIN_PASSWORD` (12 caractères minimum) dans `apps/api/.env`, puis lance `npm run vss:setup` et redémarre le serveur.

Garde les fichiers `.env` privés. La clé VSS doit être différente du secret JWT et sauvegardée : sa perte rend les dossiers illisibles. Le dépôt ne garantit pas une lecture immédiate.

Le carnet est synchronisé par compte. Pour récupérer un ancien carnet local, installe la mise à jour sans désinstaller l’application, puis ouvre le carnet sur l’ancien appareil.

Pour te repérer dans le code : [guide des fichiers](README_FICHIERS.md).
