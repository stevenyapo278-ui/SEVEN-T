# 🚀 Guide de Déploiement SEVEN T sur Hostinger VPS

> Toutes les commandes sont prêtes à copier-coller dans ton terminal.

---

## 🏗️ ÉTAPE 0 — Choisir le bon plan Hostinger

| Type d'hébergement               | Compatible |       Recommandé        |
| -------------------------------- | :--------: | :---------------------: |
| Hébergement Web partagé          |     ❌     | ❌ Node.js non supporté |
| WordPress Hosting                |     ❌     |           ❌            |
| **VPS (Virtual Private Server)** |     ✅     |  ✅ **C'est celui-ci**  |
| Cloud Hosting                    |     ✅     |     ✅ Alternative      |

### Plan minimum recommandé :

- **KVM 1** : 1 vCPU, 4 GB RAM (~7€/mois) — pour démarrer
- **KVM 2** : 2 vCPU, 8 GB RAM (~12€/mois) — recommandé
- Système d'exploitation : **Ubuntu 22.04 LTS**

> ⚠️ Un hébergement partagé Hostinger classique ne fonctionnera **pas** avec Node.js.

---

## 🔌 ÉTAPE 1 — Se connecter au VPS (SSH)

Après l'achat, Hostinger t'envoie un email avec : **l'IP du serveur**, **l'utilisateur** (`root`) et un **mot de passe**.

```bash
# Dans un terminal sur ton ordinateur :
ssh root@TON_IP_VPS

# Exemple :
ssh root@185.234.123.45
```

---

## 📦 ÉTAPE 2 — Mettre à jour et installer les outils

```bash
# Mettre à jour Ubuntu
apt update && apt upgrade -y

# Installer les outils de base
apt install -y git curl wget nano ufw

# Installer Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier
node --version     # → v20.x.x
npm --version      # → 10.x.x

# Installer PM2 (gestionnaire de processus)
npm install -g pm2
pm2 --version      # → 5.x.x
```

---

## 🐘 ÉTAPE 3 — Installer PostgreSQL

```bash
# Installer PostgreSQL
apt install -y postgresql postgresql-contrib

# Démarrer et activer au reboot
systemctl start postgresql
systemctl enable postgresql

# Créer la base de données et l'utilisateur
# ⚠️ Remplace "METS_UN_MOT_DE_PASSE_FORT" par un vrai mot de passe !
sudo -u postgres psql << 'EOF'
CREATE DATABASE seven_t;
CREATE USER seven_t_user WITH ENCRYPTED PASSWORD 'METS_UN_MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON DATABASE seven_t TO seven_t_user;
ALTER DATABASE seven_t OWNER TO seven_t_user;
\q
EOF

echo "✅ PostgreSQL configuré !"
```

---

## 📁 ÉTAPE 4 — Déployer le code

### Option A — Depuis GitHub (recommandé)

```bash
cd /var/www

# Clone ton dépôt privé (remplace avec ton URL)
git clone https://github.com/TON_USERNAME/SEVEN-T.git seven-t

cd seven-t
```

### Option B — Transfert direct depuis ton ordinateur

```bash
# Sur TON ORDINATEUR LOCAL, dans un nouveau terminal :
scp -r /home/stevenyapo/Documents/Test/* root@TON_IP_VPS:/var/www/seven-t/

# Puis reconnecte-toi au serveur :
ssh root@TON_IP_VPS
cd /var/www/seven-t
```

---

## ⚙️ ÉTAPE 5 — Configurer les variables d'environnement

```bash
# Sur le serveur, dans /var/www/seven-t :
nano .env
```

Colle ce contenu et **remplace toutes les valeurs** :

```bash
# ============================================
# SEVEN T — PRODUCTION
# ============================================

# Serveur
PORT=3001
NODE_ENV=production

# JWT Secret (OBLIGATOIRE — génère avec la commande ci-dessous)
# node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=COLLE_ICI_LA_CLE_GENEREE

# PostgreSQL (remplace le mot de passe par celui de l'étape 3)
DATABASE_URL=postgres://seven_t_user:METS_UN_MOT_DE_PASSE_FORT@127.0.0.1:5432/seven_t
DB_POOL_MAX=20

# Domaine (remplace par ton vrai domaine)
FRONTEND_URL=https://ton-domaine.com
BASE_URL=https://ton-domaine.com
ALLOWED_ORIGINS=https://ton-domaine.com

# IA
GEMINI_API_KEY=ton_api_key_gemini
OPENAI_API_KEY=ton_api_key_openai
OPENROUTER_API_KEY=ton_api_key_openrouter
DEFAULT_AI_PROVIDER=gemini

# Admin (compte superadmin)
ADMIN_EMAIL=ton@email.com
ADMIN_PASSWORD=MOT_DE_PASSE_FORT
ADMIN_NAME=Admin

# Google OAuth
GOOGLE_CLIENT_ID=ton_google_client_id
GOOGLE_CLIENT_SECRET=ton_google_client_secret

# Stripe (mode LIVE pour la production !)
STRIPE_SECRET_KEY=sk_live_TON_KEY
STRIPE_WEBHOOK_SECRET=whsec_TON_SECRET
STRIPE_PRICE_STARTER=price_xxxxxxxx
STRIPE_PRICE_PRO=price_yyyyyyyy
STRIPE_PRICE_BUSINESS=price_zzzzzzzz
STRIPE_PRICE_ENTERPRISE=price_wwwwwwww

# Email SMTP (Hostinger Email ou autre)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@ton-domaine.com
SMTP_PASS=TON_MOT_DE_PASSE_EMAIL
EMAIL_FROM=SEVEN T <noreply@ton-domaine.com>
EMAIL_REPLY_TO=support@ton-domaine.com
```

**Sauvegarder :** `Ctrl+X` → `Y` → `Entrée`

---

## 🔑 Générer le JWT_SECRET

```bash
# Sur le serveur, génère une clé sécurisée :
node -e "require('crypto').randomBytes(64).toString('hex')"

# Copie le résultat et colle-le dans .env à la ligne JWT_SECRET=
```

---

## 🔨 ÉTAPE 6 — Installer les dépendances et builder

```bash
cd /var/www/seven-t

# Dépendances backend
npm install

# Build du frontend
cd frontend
npm install
npm run build
cd ..

# Initialiser la base de données (crée toutes les tables)
node backend/server.js &
sleep 8
kill %1

# Créer le compte admin
npm run db:create-admin

echo "✅ Build terminé !"
```

---

## 🚀 ÉTAPE 7 — Lancer avec PM2

```bash
cd /var/www/seven-t

# Créer la configuration PM2
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'seven-t',
    script: 'backend/server.js',
    instances: 1,          // 1 seule instance (whitApp sessions en mémoire)
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/seven-t/error.log',
    out_file: '/var/log/seven-t/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
EOF

# Créer le dossier de logs
mkdir -p /var/log/seven-t

# Démarrer l'application
pm2 start ecosystem.config.cjs

# Voir les logs (cherche ✅ Database initialized et 🚀 SEVEN T)
pm2 logs seven-t --lines 30

# Configurer le démarrage automatique au reboot
pm2 startup
# ⚠️ Copie et exécute la commande qu'il affiche (commence par : sudo env ...)

# Sauvegarder l'état PM2
pm2 save

echo "✅ PM2 configuré et démarré !"
```

> ⚠️ **Pourquoi `instances: 1` et pas `max` ?**
> Ton app WhatsApp (Baileys) stocke les sessions en mémoire dans une `Map`.
> Le mode cluster PM2 crée plusieurs processus **qui ne partagent pas la mémoire**.
> Résultat → les sessions WhatsApp se perdent entre les processus → bugs.
> **1 instance est la bonne configuration.**

---

## 🌍 ÉTAPE 8 — Configurer Nginx (reverse proxy + SSL)

```bash
# Installer Nginx et Certbot
apt install -y nginx certbot python3-certbot-nginx

# Créer la configuration Nginx
# ⚠️ Remplace "ton-domaine.com" par ton vrai domaine !
cat > /etc/nginx/sites-available/seven-t << 'EOF'
server {
    listen 80;
    server_name ton-domaine.com www.ton-domaine.com;

    # Fichiers statiques du frontend
    root /var/www/seven-t/frontend/dist;
    index index.html;

    # API Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }

    # WebSocket Socket.IO (temps réel)
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA Routing — Toujours servir index.html pour les routes frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/seven-t /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et redémarrer Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Générer le certificat SSL gratuit (Let's Encrypt)
# ⚠️ Remplace les domaines et l'email !
certbot --nginx \
  -d ton-domaine.com \
  -d www.ton-domaine.com \
  --email ton@email.com \
  --agree-tos \
  --no-eff-email

echo "✅ Nginx + HTTPS configuré !"
```

---

## 🔒 ÉTAPE 9 — Configurer le Firewall

```bash
ufw allow OpenSSH        # Port 22 (pour toi)
ufw allow 'Nginx Full'   # Ports 80 et 443 (pour les visiteurs)
ufw deny 3001            # Bloquer l'accès direct au backend
ufw deny 5432            # Bloquer l'accès direct à PostgreSQL
ufw enable
ufw status
```

---

## 🌐 ÉTAPE 10 — Pointer ton domaine vers le VPS

Dans le **panneau Hostinger hPanel** → **Domaines** → **Gérer** → **Zone DNS** :

| Type | Nom   | Valeur       | TTL |
| ---- | ----- | ------------ | --- |
| `A`  | `@`   | `TON_IP_VPS` | 300 |
| `A`  | `www` | `TON_IP_VPS` | 300 |

> Attends **5 à 30 minutes** pour la propagation DNS avant de passer à la suite.

---

## ✅ ÉTAPE 11 — Vérifications finales

```bash
# App qui tourne ?
pm2 status

# Logs sans erreur ?
pm2 logs seven-t --lines 50

# API qui répond ?
curl http://localhost:3001/api/health

# HTTPS qui fonctionne ? (depuis ton ordinateur)
curl https://ton-domaine.com/api/health
```

**Résultat attendu :**

```json
{ "status": "ok", "timestamp": "2026-02-28T22:27:00.000Z" }
```

---

## 🔄 Commandes du quotidien

```bash
# Voir les logs en temps réel
pm2 logs seven-t

# Redémarrer l'app (ex: après une mise à jour du code)
pm2 restart seven-t

# Statut et RAM/CPU utilisés
pm2 monit

# Mettre à jour le code depuis Git
cd /var/www/seven-t
git pull
npm install
cd frontend && npm install && npm run build && cd ..
pm2 restart seven-t
```

---

## 🐛 Résolution de problèmes

### L'app ne démarre pas

```bash
pm2 logs seven-t --lines 100
# Cherche les "❌" ou "Error" → lis le message d'erreur
```

### Erreur de connexion PostgreSQL

```bash
# Tester la connexion directement :
psql "postgres://seven_t_user:TON_MOT_DE_PASSE@127.0.0.1:5432/seven_t" -c "SELECT 1"
```

### Le frontend affiche une page blanche

```bash
# Vérifier que le build existe :
ls /var/www/seven-t/frontend/dist/

# Si vide, rebuilder :
cd /var/www/seven-t/frontend && npm run build
```

### WebSocket (temps réel) ne fonctionne pas

Vérifie que le bloc `location /socket.io` est bien dans nginx avec `Upgrade` et `Connection "Upgrade"`.

### Stripe webhook ne reçoit pas les événements

Sur le [Dashboard Stripe](https://dashboard.stripe.com/webhooks), configure l'endpoint :

```
https://ton-domaine.com/api/subscription/webhook
```

---

## 📊 Architecture finale

```
Internet (HTTPS)
       │
       ▼
  Nginx (port 80/443)
  SSL Let's Encrypt
       │
       ├── /              ──► Frontend (fichiers statiques dist/)
       ├── /api           ──► Node.js Backend (port 3001 interne)
       └── /socket.io     ──► WebSocket temps réel (port 3001 interne)
                                      │
                                      ▼
                            PM2 → Node.js (1 instance)
                            ├── Express API
                            ├── Socket.IO
                            └── Baileys WhatsApp (1 socket / client SaaS)
                                      │
                                      ▼
                            PostgreSQL (port 5432, local uniquement)
```

---

## ⏱️ Durée estimée

| Étape                       | Durée          |
| --------------------------- | -------------- |
| Achat VPS + connexion SSH   | 5 min          |
| Installation Node.js + PM2  | 3 min          |
| Installation PostgreSQL     | 5 min          |
| Envoi du code               | 5-10 min       |
| Configuration `.env`        | 10 min         |
| Install dépendances + build | 5-8 min        |
| Lancement PM2               | 2 min          |
| Nginx + SSL                 | 5 min          |
| Firewall                    | 2 min          |
| DNS (propagation)           | 5-30 min       |
| **Total**                   | **~45-60 min** |
