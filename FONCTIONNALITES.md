# Moodly : fonctionnalités et choix de conception

Moodly est une application mobile de suivi du moral en entreprise. Ce document présente ce qui existe dans l'application et pourquoi, puis les fonctionnalités pertinentes qui n'y sont pas encore et pourquoi nous ne les avons pas mises pour le moment.

## 1. Les quatre principes qui guident nos choix

| Principe | Ce que ça veut dire | D'où ça vient |
|---|---|---|
| **Anonymat avant tout** | Un manager ne doit jamais pouvoir identifier un collaborateur. | Cahier des charges du client ; la crainte de surveillance est le premier risque de rejet identifié dans l'étude de marché. |
| **Rapidité** | Saisir son humeur doit prendre quelques secondes. | La « fatigue du sondage » des outils existants (questionnaires de 10 à 20 questions). |
| **Utilité pour le salarié** | L'outil doit rendre quelque chose au collaborateur, pas seulement à l'entreprise. | Un salarié sur deux estime que sa détresse n'est pas prise en compte (ORSE). |
| **Pas un outil médical** | Moodly accompagne, il ne diagnostique pas. | Risque de « faux soin » identifié dans l'étude de marché. |

---

## 2. Fonctionnalités présentes dans l'application

### Accueil
- **Ce que c'est :** le statut de saisie pour le collaborateur, l'accès aux tendances pour le manager, des raccourcis vers les espaces et des activités de pause. Navigation latérale sur ordinateur, en bas de l'écran sur téléphone.
- **Pourquoi :** une porte d'entrée unique et simple. Chaque rôle voit tout de suite ce qui le concerne, sans chercher.

### Mon humeur (collaborateur)
- **Ce que c'est :** choix d'une humeur parmi cinq mascottes, tags facultatifs, **une seule saisie par jour** (heure de Paris), sans modification après envoi. Possibilité de garder une copie dans son carnet personnel.
- **Pourquoi :**
  - cinq mascottes : l'humeur se lit sans mot et la saisie reste très rapide ;
  - une saisie par jour, non modifiable : des données fiables (pas de retouche sous la pression) et un geste simple, qui devient une habitude ;
  - tags facultatifs : donner du contexte sans obliger à écrire.
- **Limite assumée :** pas de droit à la modification ; c'est un arbitrage (voir section 3).

### Mon carnet (collaborateur)
- **Ce que c'est :** un carnet facultatif, **stocké sur l'appareil**, séparément pour chaque compte : calendrier coloré, compteurs, historique avec recherche et filtres, notes privées modifiables, comparaison à la veille.
- **Pourquoi :** offrir une utilité personnelle au salarié (comprendre ses propres cycles) sans jamais envoyer ces données au serveur. C'est notre réponse au « qu'est-ce que j'y gagne ? ».

### Mon équipe (manager)
- **Ce que c'est :** répartition quotidienne des humeurs, participation et principaux tags de l'équipe. Les jours sous le seuil de réponses sont **masqués et exclus des totaux**. Aucune humeur individuelle ni aucun carnet n'est accessible.
- **Pourquoi :** donner au manager de quoi agir (charge de travail, ambiance) sans lui donner de quoi identifier quelqu'un. Un seul graphe, lisible, pour un manager qui manque de temps.

### Mes pauses (collaborateur et manager)
- **Ce que c'est :** cinq activités guidées avec minuteur (démarrer, pause, reprise, remise à zéro), un cercle animé pour la respiration, une ambiance sonore locale. Chaque activité peut être arrêtée librement.
- **Pourquoi :** une aide immédiate quand la journée est difficile, ce que les baromètres RH n'offrent pas. Ouvert aussi aux managers, eux-mêmes exposés au burn-out. Elles ne constituent ni un diagnostic ni un suivi médical.

### Boîte à idées (collaborateur et manager)
- **Ce que c'est :** les collaborateurs proposent des idées d'activités (jeux, sorties, bien-être) ; l'équipe les consulte ; le manager ajoute un statut et une réponse publique. Les idées sont enregistrées **sans auteur**.
- **Pourquoi :** transformer les tendances en actions concrètes et donner une voix à l'équipe, sans exposer personne.
- **Limite assumée :** le texte libre peut contenir des éléments qui permettent d'identifier quelqu'un. L'application l'indique clairement.

### Parler à un psy (collaborateur)
- **Ce que c'est :** un accès à un accompagnement psychologique externe via BetterHelp. Le lien ouvre le site du prestataire, où se déroulent réservation, facturation et consultations. Moodly ne transmet ni compte, ni jeton de connexion, ni humeur, ni contenu du carnet.
- **Pourquoi :** nous ne sommes pas des psychologues et nous ne voulons pas jouer ce rôle. Nous orientons vers des professionnels, sans leur transmettre aucune donnée.

### VSS et harcèlement (collaborateur)
- **Ce que c'est :** un questionnaire en quatre étapes pour déposer un signalement auprès de l'administration Moodly, **indépendante de l'entreprise**. Le contact est facultatif, l'envoi doit être confirmé explicitement, les réponses sont **chiffrées en base**, et quitter ou recharger avant l'envoi efface le formulaire.
- **Pourquoi :** un suivi du moral qui ignore les violences sexistes et sexuelles ou le harcèlement manquerait son but. Passer par un tiers indépendant protège la personne qui signale.

### Signalements VSS et Tableau de bord (administration Moodly)
- **Ce que c'est :** l'administrateur, référent VSS, consulte et traite les signalements, filtrés par entreprise et par statut. Les consultations et changements de statut sont **journalisés**. Le tableau de bord affiche les compteurs réels (reçus, en cours, clos), les entreprises concernées et les cinq plus anciens dossiers à traiter.
- **Pourquoi :** garantir que les signalements sont réellement traités, avec une traçabilité. Les managers et collaborateurs n'accèdent jamais aux dossiers.

### Confiance / Confidentialité (collaborateur et manager)
- **Ce que c'est :** une page qui explique les données collectées, la séparation des tables, les règles de masquage, le stockage local du carnet, les accès aux signalements et les limites de confidentialité, avec une FAQ.
- **Pourquoi :** l'anonymat doit être **visible**, pas seulement promis. C'est notre argument central face à la méfiance.

### Plus (navigation mobile du collaborateur)
- **Ce que c'est :** un cinquième onglet qui regroupe la boîte à idées, l'accompagnement psychologique, le questionnaire VSS et la confidentialité.
- **Pourquoi :** garder une barre de navigation de cinq onglets sur téléphone, lisible et ergonomique.

---

## 3. Fonctionnalités pertinentes qui ne sont pas (encore) dans l'application

| Fonctionnalité | Intérêt | Pourquoi pas pour le moment |
|---|---|---|
| **Modification du check-in** | Corriger une erreur de saisie ; c'est un « droit à l'erreur » cité dans l'étude de marché. | Nous avons choisi une saisie non modifiable pour des données fiables et un geste simple (cahier des charges). À réétudier avec un délai court. |
| **Notifications push** | Rappeler la saisie quotidienne et augmenter la participation. | Hors périmètre du MVP, et risque de lassitude. Nous misons d'abord sur un rituel d'équipe. |
| **Commentaires libres sur l'humeur** | Donner plus de contexte aux managers. | Exclus volontairement : le texte libre peut identifier quelqu'un. C'est déjà la limite de la boîte à idées. |
| **Pause automatique après une journée difficile** | Proposer de l'aide au bon moment. | Il faut définir finement les seuils sans que l'application ait l'air de surveiller. |
| **Recommandations d'actions pour le manager** | Relier les tags (charge, équilibre) à des pistes concrètes. | Demande un travail de fond sur le contenu ; les tags les plus cités sont une première étape. |
| **Vue RH agrégée** | Mesurer l'impact des actions RSE à l'échelle de l'entreprise. | Hors périmètre du MVP, avec un seuil de répondants plus élevé à définir. |
| **Connexion unique (SSO)** | Déploiement simple en entreprise. | Hors périmètre du MVP ; la connexion par e-mail et mot de passe suffit pour la démonstration. |
| **Mot de passe oublié, inscription en libre accès** | Autonomie des utilisateurs. | Hors périmètre : les comptes sont créés par le script de seed. |
| **Multi-équipes** | Plusieurs équipes par manager ou par entreprise. | Hors périmètre du MVP ; une équipe suffit pour démontrer le principe. |
| **Mode sombre** | Confort visuel. | Hors périmètre ; priorité aux fonctions essentielles. |
| **Accessibilité complète (clavier, lecteurs d'écran)** | Un outil réellement utilisable par tous. | Visée à terme ; le double codage couleur et mascotte est déjà en place pour les humeurs. |
| **Intégrations (Teams, Slack, SIRH)** | Saisir l'humeur là où les équipes travaillent déjà. | Hors périmètre ; risque de brouiller la séparation entre identité et réponses. |
| **Back-office d'administration complet** | Gérer les comptes et les entreprises. | Hors périmètre ; l'administration se limite aux signalements. |

---

## 4. En résumé

- **Ce qui est fait :** l'essentiel du parcours (saisie en quelques secondes, vue manager anonymisée), un accompagnement du salarié (carnet, pauses, psy externe), un canal indépendant pour les signalements, et une page qui explique les règles de confidentialité.
- **Ce qui vient ensuite :** les fonctions qui augmentent la participation (rappels, droit de correction) et l'utilité pour les managers (recommandations d'actions).
- **Ce que nous ne ferons pas à la légère :** toute fonction qui pourrait affaiblir l'anonymat, comme les commentaires libres ou les intégrations qui relient une identité à une réponse.