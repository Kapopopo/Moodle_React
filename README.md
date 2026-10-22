# Moodly

Un petit geste. Une vraie écoute. MVP étudiant de suivi du moral : le collaborateur partage son humeur, le manager consulte uniquement des tendances anonymisées.

## Architecture

- `apps/mobile` : React, TypeScript, Vite, React Router, Tailwind, Recharts, icônes Tabler, date-fns et Capacitor Android.
- `apps/api` : Express, Prisma, PostgreSQL, JWT 8 h, bcrypt, Zod, Helmet et limitation des tentatives de connexion.
- `docker-compose.yml` : PostgreSQL 16 avec volume persistant.

Les données collectives et les statuts de saisie utilisent exclusivement l’API ; le carnet personnel optionnel utilise le stockage local. Les mascottes, libellés et couleurs sont des éléments d’interface statiques. Aucun compte ni résultat fictif n’est injecté dans le front.

## Espaces et interactions

### Accueil
L’accueil présente le statut de saisie du collaborateur ou un accès aux tendances pour le manager.  
Il propose des activités de pause et des raccourcis vers les espaces disponibles.  
La navigation est latérale sur ordinateur et placée en bas de l’écran sur téléphone ; des boutons Retour et Se déconnecter sont accessibles sur les pages connectées.

### Mon humeur — Collaborateur
Le collaborateur choisit une humeur parmi cinq mascottes et peut ajouter des tags.  
Une seule saisie est possible par jour, selon l’heure de Paris, sans modification après envoi.  
Il peut choisir de conserver une copie dans son carnet personnel après validation par l’API.

### Mon carnet — Collaborateur
Le carnet facultatif conserve les humeurs, notes privées et intentions sur l’appareil, séparément pour chaque compte.  
Un calendrier coloré, des compteurs et un historique avec recherche et filtres permettent de retrouver les journées.  
Les notes sont modifiables par date ; la comparaison à la veille apparaît lorsque les deux humeurs sont disponibles.

### Mon équipe — Manager
Le manager consulte la répartition quotidienne des humeurs, la participation et les principaux tags de son équipe.  
Les jours sous le seuil de réponses sont masqués et exclus des totaux affichés.  
Les humeurs individuelles et les carnets personnels ne sont pas accessibles depuis cet espace.

### Mes pauses — Collaborateur et manager
Cinq activités proposent des étapes guidées et un minuteur avec démarrage, pause, reprise et remise à zéro.  
La respiration dispose d’un cercle animé ; une ambiance sonore locale peut accompagner les activités.  
Chaque activité peut être arrêtée librement et ne constitue ni un diagnostic ni un suivi médical.

### Boîte à idées — Collaborateur et manager
Le collaborateur propose des idées de jeux, sorties, bien-être ou autres activités pour son équipe.  
Les membres de l’équipe consultent les propositions ; le manager ajoute un statut et une réponse publique.  
Les idées sont enregistrées sans auteur, mais le texte libre peut contenir des éléments permettant une identification.

### Parler à un psy — Collaborateur
Cet espace présente un accès à un accompagnement psychologique externe via BetterHelp.  
Le lien ouvre le site du prestataire, où se déroulent la réservation, la facturation et les consultations.  
Moodly ne transmet ni compte, ni jeton de connexion, ni humeur, ni contenu du carnet dans ce lien.

### VSS et harcèlement — Collaborateur
Un questionnaire en quatre étapes permet de déposer un signalement auprès du service d’administration Moodly, indépendant de l’entreprise.  
L’utilisateur choisit de laisser ou non un moyen de contact et confirme explicitement l’envoi.  
Les réponses sont chiffrées en base ; quitter ou recharger avant l’envoi efface le formulaire en mémoire.

### Signalements VSS — Administration Moodly
L’administrateur assure le rôle de référent VSS : il consulte et traite les signalements, sans remplir le questionnaire.  
Un filtre liste les entreprises ayant déposé un signalement ; chaque dossier indique son entreprise et son statut.  
Les consultations et changements de statut sont journalisés ; les managers et collaborateurs n’accèdent pas aux dossiers.

### Tableau de bord — Administration
Le tableau de bord affiche les nombres réels de signalements reçus, en cours d’examen et clos.  
Il liste les entreprises concernées et les cinq plus anciens dossiers restant à traiter.  
Chaque compteur, entreprise ou dossier donne un accès direct à la vue correspondante dans Signalements VSS.

### Confiance / Confidentialité — Collaborateur et manager
Cet espace explique les données collectées, la séparation des tables et les règles de masquage.  
Il précise le stockage local du carnet, les accès aux signalements VSS et les limites de confidentialité.  
Une FAQ dépliable répond aux questions sur la saisie, la participation et la conservation des données.

### Plus — Navigation mobile du collaborateur
Cet onglet complète les quatre accès directs : Accueil, Mon humeur, Mon carnet et Mes pauses.  
Il regroupe la boîte à idées, l’accompagnement psychologique, le questionnaire VSS et la confidentialité.  
Il permet de conserver cinq onglets dans la barre de navigation du téléphone.

## Accompagnement externe, signalement et idées collectives

**Accompagnement psychologique** : l’espace collaborateur « Parler à un psy » ouvre BetterHelp dans un nouvel onglet / navigateur externe. La réservation, la facturation et la visio se font chez le prestataire ; aucune intégration API BetterHelp ni partenariat n’est simulé. Moodly ne transmet ni compte, ni token, ni humeur, ni carnet dans le lien. Les conditions du prestataire sont à vérifier avant utilisation. Source : [fonctionnement BetterHelp](https://www.betterhelp.com/comment-fonctionne-betterhelp/).

**VSS et harcèlement internes** : questionnaire Moodly en quatre étapes, avec questions rédigées par l’équipe, réponses nécessaires et champs facultatifs, choix de contact et récapitulatif avant consentement explicite. Il n’y a plus de redirection externe comme parcours principal. Les réponses ne sont envoyées qu’après confirmation ; aucun brouillon n’est stocké dans Preferences ni dans le carnet. Quitter ou recharger efface le formulaire en mémoire. Le bouton de sortie revient à l’accueil sans effacer l’historique du navigateur.

Un rôle distinct `ADMIN` accède à `/signalements` et aux dossiers de toutes les entreprises, avec un filtre par entreprise. Le manager et les collaborateurs ne peuvent pas consulter la boîte de réception ni les dossiers, même en connaissant une référence. L’administrateur n’accède pas aux tendances manager ni à la boîte à idées via ce rôle. Les statuts sont Reçu, En cours d’examen, Clos. Il n’y a pas de notification e-mail ni de surveillance permanente ; l’accusé confirme le dépôt, pas sa lecture. Sans coordonnées volontaires, aucun recontact n’est possible depuis le dossier. Le contenu du récit peut identifier une personne même sans nom : le formulaire ne promet pas un anonymat absolu.

Les réponses, le moyen de contact volontaire et la version des questions sont chiffrés avec AES-256-GCM (nonce aléatoire et authentification liant le dossier à son équipe), dans une table distincte sans auteur ni référence à `User`, `MoodEntry` ou `Participation`. La liste charge uniquement des métadonnées ; le récit est déchiffré après une ouverture autorisée. Les consultations et changements de statut sont journalisés dans `VssAccess` avec l’identifiant de l’administrateur, sans récit ni coordonnées. Les réponses API VSS portent `Cache-Control: no-store`.

Le questionnaire est défini dans **`apps/api/src/vss-questionnaire.ts`**. Votre équipe peut y modifier les textes et options ; incrémenter `VSS_VERSION` lors d’une modification. La validation serveur est dérivée de cette définition. Chaque dossier conserve une copie chiffrée des questions au moment du dépôt pour rester lisible après modification. Le questionnaire n’est ni un diagnostic ni une qualification juridique.

Pour activer le dépôt, il faut au moins un administrateur Moodly et `VSS_ENCRYPTION_KEY` dans `apps/api/.env` (64 caractères hexadécimaux, générés avec `openssl rand -hex 32`, distincts de `JWT_SECRET`). Garder cette clé stable, privée, hors du dépôt et sauvegardée : la perdre rend les dossiers illisibles. Le dispositif refuse un dépôt si la clé ou le compte administrateur manque. La référence de dépôt est un UUID, pas un jeton donnant accès au dossier.

Pour activer l’administration, appliquer les migrations avec `npm run db:migrate`, puis configurer `MOODLY_ADMIN_EMAIL` et `MOODLY_ADMIN_PASSWORD` (12 caractères minimum) dans `apps/api/.env` et lancer `npm run vss:setup`. Cette commande crée un compte `ADMIN` distinct des entreprises ; elle ne transforme aucun compte existant en administrateur. Les identifiants sont réservés à l’équipe Moodly et ne doivent pas être distribués aux entreprises. Le seed ne crée pas de compte administrateur avec un mot de passe public. Les anciens comptes `VSS_REFERENT` restent sans accès aux dossiers. Le modèle actuel représente chaque entreprise par une entrée `Team`.

Les administrateurs ne consultent pas les statistiques manager ni la boîte à idées. Les accès aux dossiers et les modifications de statut restent journalisés. Le chiffrement des dossiers existants reste compatible.

**Boîte à idées** : proposition par un collaborateur, consultation par l’équipe, statut et réponse publique par le manager de cette équipe. Catégories : jeux, sorties, bien-être, autre. Statuts : nouvelle, à l’étude, prévue, non retenue. Les propositions persistent dans PostgreSQL. Le modèle `Idea` ne contient ni auteur, ni relation à `User`, ni horodatage ; l’UUID est aléatoire. Le manager n’accède à aucune identité via cet endpoint. Le texte libre peut toutefois permettre une déduction : l’interface demande de ne pas inclure de nom ni de détail personnel. La boîte ne doit pas servir aux signalements VSS. Aucun vote nominatif ni notification n’est ajouté.

La liste est paginée par UUID (50 propositions par page), sans ordre chronologique de dépôt. La création est limitée à 30 requêtes par heure et par IP. Les tests utilisent uniquement des équipes temporaires, nettoyées en fin de scénario ; aucun faux contenu n’est injecté dans la boîte de démonstration.

## Installation et démo

Prérequis : Node 20.19+ (Node 22 LTS recommandé), npm, Docker avec Compose. Pour Android : Android Studio, JDK 21, SDK Android et un téléphone avec débogage USB activé.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Dans `apps/api/.env`, remplacer `JWT_SECRET` par un secret aléatoire d’au moins 32 caractères (`openssl rand -hex 32`) et remplir `VSS_ENCRYPTION_KEY` avec une autre valeur générée par la même commande. Dans `apps/mobile/.env`, remplacer l’IP de `VITE_API_URL` par l’IP locale de la machine ; ne pas utiliser localhost pour le téléphone. Ajouter `http://VOTRE_IP:5173` à `CORS_ORIGINS` côté API.

```bash
docker compose up -d
# Si seul Compose v1 est disponible : docker-compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvrir l’adresse affichée par Vite (`http://localhost:5173` par défaut ; `5174` si le premier port est déjà occupé). En développement navigateur, les appels `/api` passent par le proxy Vite vers l’API locale sur le port 3001 : ils fonctionnent aussi avec un autre port Vite et depuis un téléphone ouvrant le serveur Vite sur le réseau local. `MOODLY_DEV_API_TARGET` permet de changer la cible du proxy si nécessaire. Les applications Capacitor installées et les builds de production utilisent toujours `VITE_API_URL`.

Ouvrir `http://VOTRE_IP:5173`. L’API écoute sur le port 3001 et Vite sur 5173. La machine et le téléphone doivent être sur le même réseau, avec ces ports accessibles dans le pare-feu. Le serveur PostgreSQL est exposé uniquement sur le loopback de la machine.

Le seed crée une équipe, huit collaborateurs, un manager, trente jours d’historique avec deux jours masqués. Il refuse de s’exécuter si les comptes existent déjà afin de préserver les saisies.

| Rôle | Adresse | Mot de passe de démo |
| --- | --- | --- |
| Manager | manager@moodly.dev | Moodly2026! |
| Collaborateur | employe1@moodly.dev à employe8@moodly.dev | Moodly2026! |

`employe1@moodly.dev` reste disponible pour saisir son humeur le jour du seed. Ces comptes sont réservés à la démonstration locale.

## Android

Pour l’émulateur Android Studio, définir `VITE_API_URL=http://10.0.2.2:3001/api` dans `apps/mobile/.env` : cette adresse pointe vers l’ordinateur hôte. Pour un téléphone physique, utiliser l’IP locale de l’ordinateur à la place.

L’application Android ne démarre pas le serveur : garder `npm run dev` lancé depuis la racine (et PostgreSQL démarré avec `docker compose up -d`). Vérifier `http://localhost:3001/api/health` sur l’ordinateur, puis `http://10.0.2.2:3001/api/health` dans Chrome sur l’émulateur : les deux doivent afficher `{"status":"ok"}`. Si l’application affiche « Impossible de joindre Moodly », vérifier ces adresses avant les identifiants.

```bash
npm run build
cd apps/mobile
npx cap add android
npx cap sync android
npx cap open android
```

Le projet Android est fourni dans `apps/mobile/android` : ignorer `cap add android` sur ce checkout. Dans Android Studio, sélectionner le téléphone et lancer Run. Refaire `npm run build` depuis la racine puis `npm run android -w apps/mobile` après chaque changement du front ou de son environnement.

`capacitor.config.ts` autorise le HTTP local et le contenu mixte. Le manifeste Android autorise le trafic en clair pour cette démo. Le CORS accepte les origines Capacitor et Vite. Pour une diffusion publique, utiliser HTTPS et désactiver le trafic en clair.

Les polices Google Fonts nécessitent une connexion internet au premier chargement ; les polices système servent de repli.

## Variables d’environnement

| Variable | Emplacement | Usage |
| --- | --- | --- |
| DATABASE_URL | apps/api/.env | Connexion PostgreSQL |
| JWT_SECRET | apps/api/.env | Signature JWT, 32 caractères minimum |
| PORT | apps/api/.env | Port API, 3001 par défaut |
| CORS_ORIGINS | apps/api/.env | Origines autorisées, séparées par des virgules |
| MIN_RESPONSES | apps/api/.env | Seuil d’affichage, 3 minimum |
| VSS_ENCRYPTION_KEY | apps/api/.env | Clé AES-256 distincte du JWT : 64 caractères hexadécimaux, stable et privée |
| VITE_API_URL | apps/mobile/.env | URL absolue de l’API locale, suffixe /api |
| POSTGRES_PASSWORD | Environnement Docker | Facultatif, synchroniser DATABASE_URL si modifié |

Les exemples sont dans les deux fichiers `.env.example`. Aucun secret réel ne doit être versionné.

## API

Toutes les routes commencent par `/api`. Authentification : `Authorization: Bearer <token>`. Erreur : `{ "error": { "code": "…", "message": "…" } }`.

| Méthode | Route | Accès | Contrat |
| --- | --- | --- | --- |
| GET | /health | Public | `{ status: "ok" }`, vivacité de l’API |
| POST | /auth/login | Public | `{ email, password }` → `{ token, user: { id, firstName, role, team: { id, name } } }` |
| GET | /support | EMPLOYEE | Liens BetterHelp et ressources complémentaires officielles ; les signalements utilisent le questionnaire interne |
| GET | /vss/questionnaire | EMPLOYEE | Version, questions, destinataire et disponibilité du dépôt |
| POST | /vss/reports | EMPLOYEE | `{ version, submissionKey, answers, contactMode, contact, consent: true }` → `{ reference }` ; reprise idempotente avec la même clé |
| GET | /vss/dashboard | ADMIN | Compteurs par statut, entreprises concernées et dossiers à traiter |
| GET | /vss/companies | ADMIN | Entreprises ayant au moins un signalement |
| GET | /vss/inbox?cursor=UUID&companyId=UUID | ADMIN | Métadonnées des dossiers de toutes les entreprises, filtre `companyId` facultatif, 50 par page |
| GET | /vss/inbox/:id | ADMIN | Dossier déchiffré après contrôle du rôle administrateur et journalisation |
| PATCH | /vss/inbox/:id | ADMIN | `{ status: RECEIVED / REVIEWING / CLOSED }`, changement journalisé |
| GET | /ideas?cursor=UUID | EMPLOYEE / MANAGER | `{ ideas, nextCursor }` : propositions de sa seule équipe, sans auteur |
| POST | /ideas | EMPLOYEE | `{ category, title, description }` → 201 proposition sans auteur |
| PATCH | /ideas/:id | MANAGER | `{ status, managerNote }` → `{ updated: true }`, limité à sa seule équipe |
| GET | /auth/me | Connecté | Utilisateur courant, même forme que `user` |
| GET | /moods/today | EMPLOYEE | `{ hasSubmitted: boolean }` |
| POST | /moods | EMPLOYEE | `{ score: 1..5, tags: Tag[] }` → 201 `{ submitted: true }` ; 409 si déjà saisi |
| GET | /teams/me/summary?days=30 | MANAGER | Période, participationRate, totalResponses, days, topTags, minimumResponses |

Tags autorisés : `CHARGE_DE_TRAVAIL`, `AMBIANCE_EQUIPE`, `MANAGEMENT`, `EQUILIBRE_PERSO`, `CONDITIONS_TRAVAIL`. Maximum cinq, sans doublon. Aucun texte libre dans l’endpoint d’humeur. Les notes du carnet restent locales ; les récits VSS utilisent un endpoint distinct à accès restreint, et les idées un endpoint collectif séparé. Les idées utilisent `GAME`, `OUTING`, `WELLBEING`, `OTHER` et les statuts `NEW`, `REVIEWING`, `PLANNED`, `DECLINED`. Titre : 3 à 100 caractères ; description : 10 à 1 500 ; réponse manager : 800 maximum. Les champs supplémentaires (notamment un auteur fourni par le client) sont rejetés.

Les autres codes sont 400 (validation), 401 (session), 403 (rôle), 429 (login limité), 500 (erreur interne).

La période comprend le jour courant et les 29 précédents, calculés en Europe/Paris. Un jour visible contient `date`, `isWorkday`, `masked: false`, `total` et `distribution` (comptages des scores 1 à 5). Un jour masqué contient `total: null` et `distribution: null`. Un week-end sans réponse a `total: 0` et `distribution: null`. Un week-end avec trop peu de réponses est aussi masqué. Les tags sont les trois plus cités parmi les réponses visibles ; `share` est leur proportion de réponses, pas leur proportion parmi les tags.

## Anonymisation et choix explicites

`MoodEntry` ne contient aucune référence à l’utilisateur, aucun nom, aucun horodatage. `Participation` sert uniquement à empêcher la double saisie. Leurs UUID sont aléatoires (UUID v4 générés par Prisma), sans horodatage. Les deux insertions appartiennent à une même transaction et la contrainte unique `(userId, day)` arbitre les requêtes simultanées. Aucun endpoint ne permet la modification d’une humeur.

**Adaptation du brief pour éviter une fuite par les totaux :** `totalResponses` et `participationRate` excluent les jours masqués. La participation est le nombre de réponses visibles sur les jours ouvrés divisé par l’effectif collaborateur actuel multiplié par le nombre de jours ouvrés de la période. Les réponses du week-end ne gonflent pas ce taux. Le libellé de l’interface précise « sur les jours affichables ». Un jour ouvré sans réponse est masqué comme un jour avec une ou deux réponses. Les jours ouvrés sont lundi à vendredi, sans calendrier de jours fériés.

La confirmation affiche l’humeur choisie en mémoire, juste après l’envoi. Une copie personnelle n’est conservée localement que si le carnet a été activé volontairement avant la saisie. Au rechargement, le serveur ne renvoie que le statut de participation. Le token est stocké via Capacitor Preferences ; le navigateur utilise son stockage local sous-jacent. Les logs serveur ne contiennent ni corps de requête ni token.

Limite : un seuil quotidien ne constitue pas une garantie mathématique contre toutes les déductions. Un manager qui actualise pendant la journée peut observer les variations des agrégats après le seuil, et un administrateur de base peut observer les transactions. Avant un déploiement réel, prévoir publication différée des jours clos, contrôle des accès techniques, politique de conservation et revue de confidentialité. Le MVP respecte la séparation des tables et le masquage quotidien demandés ; ne pas promettre une anonymisation absolue.

## Vérifications

```bash
npm test
npm run build
# PostgreSQL lancé et migré :
npm run test:db
# API et Vite lancés, Chrome installé :
npm run test:ui
```

Vitest vérifie le seuil exact, les jours masqués, l’exclusion des tags et totaux, les périodes vides et les dates Paris. Supertest vérifie authentification, expiration JWT, séparation des rôles et validation des entrées, avec accès Prisma simulé. La compilation vérifie les deux applications. Les tests PostgreSQL réels, y compris deux soumissions simultanées, sont disponibles via `TEST_DATABASE=1 npm test`. Ils créent puis nettoient une équipe temporaire. Les tests navigateur couvrent également les onglets, les filtres, le minuteur avec pause, la FAQ et le carnet local (activation, notes sur plusieurs jours, recherche, comparaison à la veille, intentions, conservation, export, effacement). Ils utilisent Chrome installé (`npx playwright install chrome` si nécessaire) : lancer `npm run dev` puis `npm run test:ui`. Ils utilisent les comptes du seed sans consommer la saisie du compte de démonstration. Les tests VSS vérifient également consentement, validation des questions, chiffrement authentifié, reprise idempotente, accès par rôle et équipe, journalisation, absence de dépôt sans administrateur, et parcours complet collaborateur → administration. Le test sur téléphone nécessite Android Studio et un appareil.

## Scénario vidéo (2 minutes)

1. Expliquer : une saisie brève pour faciliter l’écoute collective, sans exposer les personnes.
2. Sur téléphone, connecter `employe1`, choisir une mascotte et éventuellement un tag, valider.
3. Recharger : confirmation générique. Une nouvelle soumission reçoit 409.
4. Déconnecter puis connecter le manager : montrer les deux indicateurs et l’unique graphe empilé, toucher une barre.
5. Montrer les deux jours masqués et les tags collectifs. Expliquer que l’API ne fournit aucune humeur individuelle.
6. Montrer brièvement le schéma Prisma et les tests, puis conclure sur l’écoute dans l’équipe.

