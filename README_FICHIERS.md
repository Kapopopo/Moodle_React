# Où trouver le code ?

Pour installer le projet : [README](README.md).

## Les dossiers

| Dossier | Contenu |
| --- | --- |
| `apps/mobile/` | L’interface React et l’application Android. |
| `apps/api/` | Le serveur et la base de données. |
| `tests/` | Les tests dans le navigateur. |

**L’interface envoie les demandes au serveur, qui lit ou enregistre les données dans PostgreSQL.**

## Modifier l’interface

Les fichiers sont dans `apps/mobile/src/`.

| Fichier | Ce qu’il gère |
| --- | --- |
| `main.tsx` | Connexion, humeur du jour et graphique manager. |
| `spaces.tsx` | Accueil, navigation, carnet et pauses. |
| `style.css` | Couleurs, tailles et mise en page. |
| `mascots.tsx` | Dessins des mascottes. |
| `community.tsx` | Boîte à idées et page « Parler à un psy ». |
| `vss.tsx` | Écrans de signalement et d’administration. |
| `personal.ts` | Sauvegarde et synchronisation du carnet. |
| `journal-widgets.tsx` | Affichage des notes et intentions. |
| `api.ts` | Appels au serveur. |

## Modifier le serveur

Les fichiers sont dans `apps/api/src/`.

| Fichier | Ce qu’il gère |
| --- | --- |
| `server.ts` | Démarrage du serveur. |
| `app.ts` | Connexion, droits et routes principales. |
| `aggregate.ts` | Statistiques et masquage des résultats. |
| `vss-routes.ts` | Envoi et traitement des signalements. |
| `vss-questionnaire.ts` | Questions du formulaire VSS. Augmenter `VSS_VERSION` après modification. |
| `vss-crypto.ts` | Chiffrement des signalements. |

## Autres fichiers utiles

| Chemin | Utilité |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Structure de la base de données. |
| `apps/api/prisma/migrations/` | Changements de la structure de la base. |
| `apps/api/prisma/seed.ts` | Comptes et données de démonstration. |
| `apps/mobile/android/` | Projet à ouvrir dans Android Studio. |
| `package.json` | Commandes npm du projet. |
| `docker-compose.yml` | Configuration de PostgreSQL. |
| `apps/api/.env` et `apps/mobile/.env` | Configuration locale : à garder privée. |

Les dossiers `node_modules/`, `dist/` et `build/` sont générés automatiquement.
