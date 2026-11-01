# Application de ménage, guide de mise en ligne

Compte environ 30 minutes. Tout est gratuit.

Garde ouvert à côté le fichier **variables-vercel-PRIVE.txt**, qui se trouve dans le dossier parent de ce dossier « code ». Il contient les clés secrètes déjà générées. Ne le partage pas et ne l'envoie pas sur GitHub.

---

## 1. Supabase : la base de données et les photos

1. Crée un compte sur https://supabase.com (bouton « Start your project »).
2. Clique sur **New project**.
   - Name : `app-menage`
   - Database password : clique sur « Generate a password » (tu n'en auras pas besoin ensuite)
   - Region : **West EU (Paris)**
3. Attends 1 à 2 minutes que le projet soit prêt.
4. Dans le menu de gauche, ouvre **SQL Editor**, puis **New query**.
5. Ouvre le fichier `supabase/schema.sql` de ce dossier, copie tout son contenu, colle-le dans l'éditeur et clique sur **Run**. Le message « Success » doit s'afficher.
6. Va dans **Project Settings** puis **API** (ou **Data API** et **API Keys**), et note :
   - le **Project URL** (il ressemble à `https://abcd.supabase.co`) ;
   - la clé **service_role** (clique sur « Reveal »). C'est une clé secrète : ne la partage pas.

## 2. GitHub : stocker le code

1. Crée un compte sur https://github.com.
2. Clique sur **+** en haut à droite, puis **New repository**.
   - Repository name : `app-menage`
   - Coche **Private**
   - Clique sur **Create repository**.
3. Sur la page qui s'affiche, clique sur le lien **uploading an existing file**.
4. Ouvre ce dossier « code » dans le Finder, sélectionne **tout son contenu** (Cmd+A) et fais-le glisser dans la page GitHub. Il faut glisser le contenu du dossier, pas le dossier lui-même.
5. Clique sur **Commit changes**.

## 3. Vercel : mettre l'application en ligne

1. Crée un compte sur https://vercel.com avec **Continue with GitHub**.
2. Clique sur **Add New…**, puis **Project**, et importe le dépôt `app-menage`.
3. Avant de cliquer sur Deploy, ouvre **Environment Variables** :
   - copie tout le contenu de `variables-vercel-PRIVE.txt` et colle-le dans le premier champ « Key ». Vercel remplit alors toutes les lignes d'un coup ;
   - ajoute ensuite trois variables :
     - `SUPABASE_URL` = le Project URL de l'étape 1
     - `SUPABASE_SERVICE_ROLE_KEY` = la clé service_role de l'étape 1
     - `HOST_PASSWORD` = le mot de passe que tu choisis pour ton espace hôte
     - `ICAL_URL_BOOKING` = le lien d'export du calendrier Booking.com (Extranet Booking > Tarifs et disponibilités > Synchroniser les calendriers > Exporter)
4. Clique sur **Deploy**. Au bout d'une à deux minutes, Vercel affiche l'adresse de ton application, du type `https://app-menage-xxxx.vercel.app`.

Si tu modifies une variable plus tard, va dans **Deployments**, ouvre le menu « … » du dernier déploiement et clique sur **Redeploy** pour que le changement soit pris en compte.

## 4. Lecture du calendrier toutes les 30 minutes

Le calendrier est déjà relu à chaque ouverture de l'application, et une fois par jour automatiquement. Pour qu'il soit relu toutes les 30 minutes :

1. Ouvre le fichier `supabase/cron.sql`.
2. Remplace `<ADRESSE-DE-TON-APP>` par ton adresse Vercel, et `<TON-CRON_SECRET>` par la valeur de `CRON_SECRET` qui se trouve dans le fichier des variables.
3. Colle le tout dans Supabase, **SQL Editor**, **New query**, puis clique sur **Run**.

## 5. Ton iPhone : espace hôte et notifications

1. Ouvre `https://<ton-adresse>.vercel.app/admin` dans **Safari**.
2. Touche **Partager**, puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvre l'application depuis la nouvelle icône et connecte-toi avec ton mot de passe.
4. Va dans **Réglages**, touche **Activer les notifications**, puis autorise-les.
5. Touche **Envoyer un test** pour vérifier que la notification arrive.

Sur iPhone, les notifications ne fonctionnent qu'à partir de l'icône de l'écran d'accueil, pas depuis un onglet Safari.

## 6 bis. La conciergerie

Dans **Réglages**, copie le **lien de la conciergerie** et envoie-le à la responsable de l'entreprise de ménage. En l'ouvrant, elle arrive dans un espace « Conciergerie » : réservations du mois, ménages de la semaine, historique avec photos et PDF, et un bouton « Faire un ménage » pour réaliser elle-même un ménage. Elle ne peut rien annuler ni modifier (checklist, consignes, réglages). Elle peut activer les notifications de fin de ménage depuis son espace, après avoir ajouté la page à son écran d'accueil.

## 6. Le personnel de ménage

Dans **Réglages**, copie le **lien pour le personnel** et envoie-le par SMS ou WhatsApp. La personne voit les ménages prévus et indique son prénom au moment de commencer un ménage. Elle peut aussi ajouter le lien à son écran d'accueil.

Avant de donner le lien, fais un essai toi-même : ouvre-le, commence le ménage du jour, coche quelques tâches, prends une photo, puis termine. Tu dois recevoir la notification. Tu pourras ensuite rouvrir ou ignorer ce ménage de test.

---

## Ce que fait l'application

- **Personnel** : il accède avec le lien, sans compte ni code. Il voit les ménages prévus, indique son prénom en commençant un ménage, coche la checklist pièce par pièce et prend ses photos. Certaines tâches exigent une photo. Il peut laisser un commentaire et terminer le ménage.
- **Photos** : elles sont réduites sur le téléphone avant l'envoi, puis horodatées par le serveur à leur réception, avec une empreinte SHA-256 du fichier reçu.
- **Hôte** :
  - les ménages à venir, que tu peux annuler, déplacer ou ajouter à la main ;
  - l'historique avec le détail, les photos et un PDF « dossier de ménage » numéroté ;
  - une checklist modifiable ;
  - la notification push à la fin de chaque ménage.
- **Calendriers Airbnb et Booking.com** : un ménage est créé le jour de chaque départ, quelle que soit la plateforme. Les dates qu'une plateforme a simplement recopiées de l'autre ne sont pas comptées deux fois. Un départ déplacé déplace le ménage, et une réservation annulée annule le ménage. Les blocages de dates Airbnb sont ignorés. Booking.com ne distingue pas ses blocages de ses réservations : si tu bloques des dates à la main sur Booking, un ménage peut apparaître et tu peux l'annuler dans le Calendrier.

## Bon à savoir

- La formule gratuite de Vercel (« Hobby ») est prévue pour un usage personnel et non commercial. Si tu veux être en règle pour une activité de location, la formule Pro est payante. Netlify est une alternative.
- Un projet Supabase gratuit est mis en pause après une longue période sans activité. La lecture du calendrier toutes les 30 minutes le garde normalement actif. Si l'application ne répond plus, va sur supabase.com et clique sur « Restore project ».
- Le stockage gratuit de Supabase (1 Go) correspond à environ 3 000 photos.
- Pour tester l'application sur un ordinateur sans base de données, tu peux la lancer en mode démo avec `DEMO_MODE=1`.
