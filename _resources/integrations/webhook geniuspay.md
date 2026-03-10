Ran command: `pgrep -f "node server.js"`
Ran command: `npm ls -g ngrok`
Ran command: `psql postgres://postgres:postgres@localhost:5432/seven_t -c "SELECT external_id, status, paid_at FROM saas_subscription_payments ORDER BY created_at DESC LIMIT 5;"`

Pour vérifier que votre webhook fonctionne correctement avec GeniusPay (surtout si vous testez en local), voici la méthode étape par étape. 

S'il vous plaît, confimez-moi d'abord votre environnement de travail : **Êtes-vous en train de développer en local sur votre machine ou l'application est-elle déjà en ligne sur un serveur (ex: Hostinger, VPS) ?**

Voici le guide dans les deux cas :

### CAS 1 : Vous êtes en ligne (sur un vrai domaine Web)
Si votre application a déjà un nom de domaine (ex: `https://votre-site.com`), la vérification est très simple :
1. Connectez-vous à votre tableau de bord **GeniusPay** (Dashboard Sandbox).
2. Dans le menu de gauche, trouvez la section **Developer**, **API & Webhooks** ou **Paramètres > Webhooks**.
3. Assurez-vous d'ajouter cette URL exacte : 
   `https://votre-site.com/api/subscription/webhook/geniuspay`
4. Cochez les événements à écouter, notamment `payment.success`.
5. Sauvegardez et refaites un test. Si l'URL est correcte, ça devrait fonctionner immédiatement.

---

### CAS 2 : Vous développez en local (localhost:3001)
*C'est la cause de 99% des problèmes de webhooks non reçus en Sandbox.*
GeniusPay ne peut envoyer aucune information à `http://localhost:3001` car il ne connaît pas votre ordinateur. Il vous faut utiliser un tunnel comme **Ngrok** ou **LocalTunnel**.

**Étape 1 : Exposer votre backend sur internet temporairement**
1. Ouvrez un **nouveau terminal** (laissez votre serveur backend tourner tranquillement).
2. Si vous avez Node.js (ce qui est le cas), tapez la commande suivante :
   ```bash
   npx localtunnel --port 3001
   ```
3. Cela va vous afficher une URL publique temporaire, par exemple : `https://hollow-donkey-42.loca.lt`
   *(Gardez ce terminal ouvert)*

**Étape 2 : Configurer GeniusPay**
1. Allez sur votre tableau de bord Sandbox GeniusPay.
2. Dans les **paramètres Webhooks**, entrez la nouvelle URL générée par *localtunnel* en y ajoutant le bon chemin :
   `https://hollow-donkey-42.loca.lt/api/subscription/webhook/geniuspay`
3. Cochez l'événement `payment.success` (ou "Tous les événements").

**Étape 3 : Configurer votre Backend (Important !)**
Par défaut, au moment de payer, le backend transmet une `callbackUrl` à GeniusPay ([backend/routes/subscription.js](cci:7://file:///home/styapo/Projet/SEVEN-T/backend/routes/subscription.js:0:0-0:0) ligne 143). 
Vous devez indiquer temporairement votre URL *localtunnel* à votre serveur.
Allez dans votre fichier **`.env`** (à la racine du projet SEVEN-T) et trouvez la variable `BASE_URL`. Modifiez-la :
```env
BASE_URL=https://hollow-donkey-42.loca.lt
```

**Étape 4 : Le test ultime**
1. Redémarrez votre backend (`npm run dev` ou `node server.js`).
2. Faites un nouveau test Sandbox.
3. Regardez immédiatement la console / terminal de votre Backend Node.js ! Si tout marche correctement, vous verrez désormais des messages de requêtes entrantes !