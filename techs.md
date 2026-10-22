| **Interface** | React 19 + TypeScript : Création des écrans et des composants |

| **Styles** | Tailwind CSS 4 : Mise en forme et adaptation aux mobiles |

| **Navigation** | React Router 7 : Navigation entre les pages |

| **Graphiques** | Recharts 3 : Affichage des tendances d’humeur |

| **Icônes et dates** | Tabler Icons, date-fns : Icônes et manipulation des dates |

| **Compilation front** | Vite 6 : Serveur de développement et génération du build |

| **Application Android** | Capacitor 7 : Intégration de l’application web dans une application Android, stockage local et partage |

| **Backend / API** | Node.js + Express 4 + TypeScript : Traitement des requêtes et logique métier |

| **Base de données** | PostgreSQL 16 + Prisma 6 : Stockage des données, requêtes et migrations |

| **Authentification** | JWT + bcrypt : Gestion des sessions et hachage des mots de passe |

| **Environnement** | Docker, npm workspaces : Lancement de PostgreSQL et organisation du projet |


**Les principales technologies à retenir pour la présentation** :

React + TypeScript : construire les écrans et les composants de l’interface. TypeScript aide à repérer les erreurs de types pendant le développement.

Tailwind CSS : gérer le style de l’interface et adapter l’affichage aux téléphones et aux ordinateurs.

Node.js + Express : faire fonctionner le serveur, recevoir les requêtes de l’interface et appliquer les règles métier, comme vérifier les droits ou empêcher une deuxième saisie d’humeur dans la journée.

PostgreSQL : stocker les données de l’application, comme les utilisateurs, les équipes et les humeurs collectives. Le carnet personnel reste stocké sur l’appareil.

Prisma : permettre au serveur de lire et d’écrire dans PostgreSQL, et gérer l’évolution de la structure de la base avec des migrations.

CapacitorJS : intégrer l’interface web dans une application Android et accéder aux fonctions natives, comme le stockage local et le partage de fichiers.

Docker : lancer PostgreSQL dans un conteneur, c’est-à-dire un environnement isolé. Le fichier `docker-compose.yml` permet à l’équipe de démarrer la base avec la même configuration ; un volume conserve les données.
