# Moodly — rôle des fichiers

Ce guide explique où se trouve chaque partie du projet et à quoi servent ses fichiers. Le [README principal](README.md) décrit les fonctionnalités et les commandes d’installation.

Les fichiers de code et de configuration sont détaillés ci-dessous. Les ressources Android déclinées en plusieurs résolutions et les fichiers générés sont regroupés par famille.

## 1. Organisation générale

```text
Moodle_react/
├── apps/
│   ├── api/        Serveur Express, base de données et tests de l’API
│   └── mobile/     Interface React et projet Android Capacitor
├── tests/          Tests des parcours dans le navigateur
├── package.json    Commandes communes aux deux applications
└── docker-compose.yml  Service PostgreSQL local
```

## 2. Fichiers à la racine

| Fichier | À quoi il sert |
| --- | --- |
| `README.md` | Présente Moodly, ses fonctionnalités, son installation, ses routes API, les règles de confidentialité et les vérifications. |
| `README_FICHIERS.md` | Explique le rôle des fichiers du projet : ce document. |
| `techs.md` | Récapitule les technologies utilisées et les principaux points techniques pour la présentation. |
| `notes.md` | Contient des idées, demandes d’amélioration et remarques de travail ; certaines sont déjà réalisées. |
| `package.json` | Déclare les espaces de travail npm (`apps/*`) et les commandes globales : développement, compilation, tests et base de données. |
| `package-lock.json` | Enregistre les versions exactes des dépendances pour reproduire une installation. Mis à jour par npm. |
| `docker-compose.yml` | Lance PostgreSQL 16 avec un volume persistant et un contrôle de disponibilité. |
| `playwright.config.ts` | Configure les tests navigateur : dossier `tests`, URL locale, Chrome et exécution avec un seul worker. |
| `.env.example` | Fournit un exemple de variables d’environnement à la racine. |
| `.gitignore` | Indique à Git quels fichiers locaux ou générés ignorer. |

## 3. Interface React — `apps/mobile`

### Code de l’application — `src/`

| Fichier | À quoi il sert |

| `main.tsx` | Point d’entrée React. Gère la session, la connexion, la déconnexion, les routes et les protections selon le rôle. Contient aussi la saisie d’humeur collaborateur et le tableau de bord manager avec son graphique. |

| `spaces.tsx` | Contient la navigation, la page Plus, l’accueil, le carnet personnel avec calendrier et historique, les pauses avec minuteur et ambiance sonore, ainsi que la page Confiance et sa FAQ. |

| `community.tsx` | Contient la page d’accompagnement externe et la boîte à idées : création et consultation des propositions, statuts et réponse du manager. Réexporte aussi le composant de signalement VSS. |

| `vss.tsx` | Contient le questionnaire de signalement VSS et la boîte de réception de l’administrateur Moodly, avec consultation des dossiers et changement de statut. |

| `api.ts` | Centralise les appels HTTP à l’API, le jeton d’authentification et les erreurs. Définit aussi les types utilisateur et synthèse manager ainsi que les libellés des tags. |

| `personal.ts` | Gère les données du carnet sur l’appareil via Capacitor Preferences : activation, lecture, sauvegarde des humeurs, notes et intentions, comparaison à la veille et effacement. Sépare les données par compte et sérialise les modifications. |

| `journal-widgets.tsx` | Fournit les composants réutilisables du carnet : éditeur de note, intention, comparaison d’humeur et accompagnement de la journée. Contient aussi des fonctions d’affichage des dates. |

| `mascots.tsx` | Définit les cinq humeurs et dessine leurs mascottes en SVG dans les composants React. |

| `style.css` | Définit les styles de l’interface : couleurs, typographie, disposition, affichage mobile, animations et adaptation à la réduction des mouvements. |

### Configuration et ressources

| Fichier | À quoi il sert |
| --- | --- |
| `index.html` | Page HTML de départ : contient le point de montage React et charge le module de l’application. |

| `package.json` | Déclare les bibliothèques du front et les commandes Vite, de compilation et de synchronisation Android. |

| `tsconfig.json` | Configure la vérification TypeScript de l’interface. |

| `vite.config.ts` | Configure React avec Vite, le serveur de développement, le proxy `/api` vers le backend et la séparation de certaines bibliothèques dans le build. |

| `tailwind.config.js` | Décrit une configuration Tailwind : chemins de contenu, couleurs, polices et arrondis. Le traitement CSS utilise le plugin Tailwind 4 déclaré dans PostCSS. |
| `postcss.config.js` | Active le plugin PostCSS de Tailwind CSS pour traiter les styles. |
| `capacitor.config.ts` | Définit l’identité de l’application Capacitor, le dossier web à embarquer et les options de fonctionnement natif. |
| `.env.example` | Donne un exemple de configuration du front, notamment l’URL de l’API. |
| `public/audio/pause-ambiance.wav` | Ressource sonore locale d’ambiance pour les pauses. |
| `public/audio/README.txt` | Décrit l’origine et le format du son d’ambiance. |

## 4. Backend — `apps/api`

### Code serveur — `src/`

| Fichier | À quoi il sert |
| --- | --- |
| `server.ts` | Démarre le serveur HTTP, sur le port 3001 par défaut, puis ferme le serveur et la connexion Prisma lors de l’arrêt du processus. |
| `app.ts` | Construit l’application Express : sécurité, CORS, authentification JWT, contrôles de rôles, validation des données et gestion des erreurs. Définit les routes de connexion, d’humeur, de synthèse manager, de support et d’idées, puis branche les routes VSS. |
| `aggregate.ts` | Calcule les résultats collectifs : distributions d’humeurs, participation et tags. Applique le seuil de masquage et fournit les fonctions de dates selon le fuseau Europe/Paris. |
| `vss-routes.ts` | Gère les routes du questionnaire VSS, le dépôt des signalements et leur consultation par le administrateur Moodly. Contrôle les rôles et les équipes, chiffre les réponses et journalise les accès et changements de statut. |
| `vss-questionnaire.ts` | Définit les questions VSS, leur version et le schéma Zod de validation des réponses et du consentement. C’est le fichier à modifier pour faire évoluer le questionnaire. |
| `vss-crypto.ts` | Vérifie la configuration de la clé puis chiffre et déchiffre les dossiers VSS avec AES-256-GCM, en liant les données au dossier et à l’équipe. |

### Tests — `src/`

| Fichier | Ce qu’il vérifie |
| --- | --- |
| `aggregate.test.ts` | Les calculs collectifs, le masquage, les seuils, les tags et les dates. |
| `app.test.ts` | L’authentification, les accès par rôle et la validation des requêtes avec un accès Prisma simulé. |
| `database.test.ts` | Le fonctionnement avec PostgreSQL réel, notamment la gestion de soumissions concurrentes. |
| `ideas.test.ts` | Les propositions de la boîte à idées, leurs validations et les droits d’accès. |
| `vss.test.ts` | La validation VSS, le chiffrement et les parcours API de dépôt et de traitement des signalements. |
| `personal.test.ts` | Le stockage du carnet défini dans le front : migration des anciennes données, consentement, séparation des comptes et sauvegardes concurrentes. Il se trouve dans l’API mais teste `apps/mobile/src/personal.ts`. |

### Configuration

| Fichier | À quoi il sert |
| --- | --- |
| `package.json` | Déclare les dépendances du serveur et les commandes de développement, compilation, tests et gestion Prisma. |
| `tsconfig.json` | Configure la compilation TypeScript du backend. |
| `.env.example` | Donne les variables nécessaires au serveur : connexion PostgreSQL, secret JWT, port, origines autorisées, seuil de réponses et clé VSS. |

## 5. Base de données — `apps/api/prisma`

| Fichier | À quoi il sert |
| --- | --- |
| `schema.prisma` | Décrit les tables, relations, rôles et contraintes : équipes, utilisateurs, participations, humeurs, idées, dossiers VSS et journal des accès VSS. Sert à générer le client Prisma. |
| `seed.ts` | Crée les données de démonstration : équipe, comptes et historique d’humeurs. |
| `setup-vss.ts` | Crée un compte administrateur global avec les identifiants privés configurés dans l’environnement. |
| `migrations/20261015000000_init/migration.sql` | Crée la structure initiale de la base. |
| `migrations/20261015010000_ideas/migration.sql` | Ajoute la structure de la boîte à idées. |
| `migrations/20261016000000_internal_vss/migration.sql` | Ajoute les éléments nécessaires aux signalements VSS internes. |
| `migrations/20261021000000_platform_admin/migration.sql` | Ajoute le rôle `ADMIN`, réservé à l’administration Moodly. |
| `migrations/migration_lock.toml` | Enregistre le fournisseur de base utilisé pour les migrations Prisma. |

## 6. Tests navigateur — `tests/`

| Fichier | Ce qu’il vérifie |
| --- | --- |
| `ui.spec.ts` | Les parcours avec l’API : connexion, vues collaborateur et manager, saisie d’humeur, accompagnement externe, idées et parcours VSS jusqu’à l’administrateur Moodly. |
| `mobile-improvements.spec.ts` | Les améliorations de l’interface, notamment la navigation mobile, les pauses, la FAQ et le carnet personnel. |

## 7. Projet Android — `apps/mobile/android`

| Capacitor embarque le front web dans une application Android. Les fichiers Gradle servent à compiler cette application ; la logique métier reste principalement dans React et dans l’API. |

### Compilation Android

| Fichier | À quoi il sert |
| --- | --- |
| `build.gradle` | Configure les outils et dépôts de compilation au niveau du projet Android. |
| `settings.gradle` | Déclare les modules qui font partie du projet Android. |
| `variables.gradle` | Centralise des versions Android : SDK et bibliothèques natives. |
| `gradle.properties` | Définit des options de fonctionnement de Gradle et d’Android. |
| `local.properties` | Contient la configuration propre à la machine, notamment le chemin du SDK Android. Fichier local, lorsqu’il est présent. |
| `capacitor.settings.gradle` | Relie les modules Android des plugins Capacitor au projet. Généré par les outils Capacitor. |
| `gradlew` | Lance la version de Gradle du projet sous Linux et macOS. |
| `gradlew.bat` | Équivalent pour Windows. |
| `gradle/wrapper/gradle-wrapper.properties` | Indique la distribution Gradle à télécharger et à utiliser. |
| `gradle/wrapper/gradle-wrapper.jar` | Programme qui permet au wrapper de lancer Gradle. |
| `.gitignore` et `app/.gitignore` | Excluent les fichiers locaux et les résultats de compilation Android. |
| `app/build.gradle` | Configure l’application : identifiant `dev.moodly.app`, versions du SDK, version de l’application, dépendances et compilation de livraison. |
| `app/capacitor.build.gradle` | Ajoute les paramètres et dépendances des plugins natifs Capacitor. Généré lors de la synchronisation. |
| `app/proguard-rules.pro` | Contient les règles de conservation et d’optimisation du code pour ProGuard/R8 si la minification est activée. |

### Application et ressources natives

Les chemins suivants sont relatifs à `apps/mobile/android/app/src/`.

| Fichier ou famille | À quoi il sert |
| --- | --- |
| `main/AndroidManifest.xml` | Déclare l’application Android, son activité principale, ses permissions et les options réseau. |
| `main/java/dev/moodly/app/MainActivity.java` | Activité Android qui lance l’interface web via le pont Capacitor. |
| `main/res/layout/activity_main.xml` | Définit la disposition native de l’activité principale. |
| `main/res/values/strings.xml` | Définit les chaînes natives, dont le nom de l’application. |
| `main/res/values/styles.xml` | Définit les thèmes Android et l’apparence au lancement. |
| `main/res/values/ic_launcher_background.xml` | Définit la couleur de fond de l’icône. |
| `main/res/xml/file_paths.xml` | Définit les chemins de fichiers accessibles via le fournisseur de fichiers Android. |
| `main/res/xml/config.xml` | Configuration de compatibilité des plugins Cordova, lorsqu’elle est générée par Capacitor. |
| `main/res/drawable*/splash.png` | Images de démarrage adaptées aux orientations et densités d’écran. |
| `main/res/drawable/ic_launcher_background.xml` | Dessine le fond de l’icône de lancement. |
| `main/res/drawable-v24/ic_launcher_foreground.xml` | Définit le premier plan vectoriel de l’icône. |
| `main/res/mipmap-*/ic_launcher*.png` | Icônes de lancement, rondes et de premier plan, selon la résolution de l’appareil. |
| `main/res/mipmap-anydpi-v26/ic_launcher.xml` et `ic_launcher_round.xml` | Assemblent les éléments des icônes adaptatives Android. |
| `test/java/com/getcapacitor/myapp/ExampleUnitTest.java` | Exemple de test unitaire natif fourni avec le projet Android. |
| `androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java` | Exemple de test natif exécuté sur un appareil ou un émulateur. |
| `main/assets/public/` | Copie générée du build web embarqué après synchronisation Capacitor. |
| `main/assets/capacitor.config.json` et `capacitor.plugins.json` | Configuration et liste des plugins générées pour l’application native. |

## 8. Fichiers locaux et générés

| Fichier ou dossier | À quoi il sert |
| --- | --- |
| `.env` et `apps/*/.env`, lorsqu’ils existent | Contiennent les valeurs locales des variables d’environnement. Leur contenu peut inclure des secrets ; les exemples à partager sont les `.env.example`. |
| `node_modules/` | Contient les bibliothèques installées par npm. |
| `apps/mobile/dist/` | Contient le front compilé par Vite. |
| `apps/api/dist/` | Contient le JavaScript du serveur compilé par TypeScript. |
| `apps/mobile/android/.gradle/` et les dossiers `build/` | Contiennent les caches et résultats de compilation Android. |
| `apps/mobile/android/capacitor-cordova-android-plugins/` | Module de compatibilité natif généré par Capacitor. |
| `.idea/` et `apps/mobile/android/.idea/` | Réglages des IDE JetBrains : modules, compilation, lancement, migrations et choix d’appareil. Les fichiers `.iml`, `.xml` et `.gitignore` de ces dossiers concernent l’éditeur. |
| `test-results/` et `playwright-report/`, lorsqu’ils existent | Résultats et rapports produits par les tests navigateur. |

## 9. Quel fichier modifier selon le besoin ?

| Besoin | Fichier principal |
| --- | --- |
| Modifier la connexion ou le graphique manager | `apps/mobile/src/main.tsx` |
| Modifier l’accueil, le carnet, les pauses ou la navigation | `apps/mobile/src/spaces.tsx` |
| Modifier les couleurs, espacements ou animations | `apps/mobile/src/style.css` |
| Modifier les mascottes | `apps/mobile/src/mascots.tsx` |
| Modifier la sauvegarde locale du carnet | `apps/mobile/src/personal.ts` |
| Modifier l’éditeur de notes et les intentions | `apps/mobile/src/journal-widgets.tsx` |
| Modifier la boîte à idées ou la page d’accompagnement | `apps/mobile/src/community.tsx` |
| Modifier les écrans VSS | `apps/mobile/src/vss.tsx` |
| Modifier les questions VSS et leur validation | `apps/api/src/vss-questionnaire.ts` ; incrémenter la version en cas de changement |
| Modifier une route API générale | `apps/api/src/app.ts` |
| Modifier les règles de calcul des tendances | `apps/api/src/aggregate.ts` |
| Modifier le traitement des dossiers VSS | `apps/api/src/vss-routes.ts` |
| Modifier la structure de la base | `apps/api/prisma/schema.prisma`, puis créer une migration |

Pour comprendre le fonctionnement, commencer par `main.tsx`, suivre un appel dans `api.ts`, retrouver sa route dans `app.ts`, puis regarder les tables dans `schema.prisma`. Le carnet personnel suit un autre parcours : composants React → `personal.ts` → stockage local de l’appareil.
