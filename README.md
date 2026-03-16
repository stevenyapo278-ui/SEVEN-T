# 🚀 SEVEN T

Plateforme d'automatisation WhatsApp avec IA (inspirée de Wazzap.ai)

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Fonctionnalités

- 🔐 **Authentification** - Inscription/connexion sécurisée avec JWT
- 🤖 **Agents IA** - Créez des assistants virtuels personnalisés
- 📱 **WhatsApp** - Connexion via QR code avec Baileys
- 🧠 **Intelligence Artificielle** - Google Gemini + OpenAI GPT-4
- 📚 **Base de connaissances** - Entraînez votre assistant
- 💬 **Conversations** - Historique complet des échanges
- 🎮 **Playground** - Testez votre assistant avant déploiement
- 📊 **Dashboard** - Statistiques et analytics
- 🎨 **UI Moderne** - Interface React + Tailwind CSS

## 📁 Structure du Projet

```
wazzap-clone/
├── backend/
│   ├── database/
│   │   └── init.js          # Schéma et migrations PostgreSQL
│   ├── middleware/
│   │   ├── auth.js          # Middleware JWT
│   │   └── security.js      # Rate limit, validation Zod, Helmet
│   ├── routes/
│   │   ├── auth.js          # Authentification
│   │   ├── agents.js        # Agents
│   │   ├── whatsapp.js      # WhatsApp
│   │   ├── conversations.js # Conversations
│   │   ├── knowledge.js     # Base de connaissances
│   │   ├── payments.js      # Liens de paiement, webhook PaymeTrust
│   │   ├── orders.js        # Commandes
│   │   ├── subscription.js  # Abonnements Stripe
│   │   └── stats.js         # Statistiques
│   ├── services/
│   │   ├── whatsapp.js      # WhatsApp/Baileys
│   │   ├── ai.js            # IA (Gemini, OpenAI)
│   │   ├── paymetrust.js    # API PaymeTrust
│   │   ├── notifications.js # Notifications in-app
│   │   └── workflowExecutor.js # Workflows automatisés
│   └── server.js            # Point d'entrée backend
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Agents.jsx
│   │   │   ├── AgentDetail.jsx
│   │   │   ├── Conversations.jsx
│   │   │   ├── ConversationDetail.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── sessions/                # Sessions WhatsApp
├── .env.example
├── package.json
└── README.md
```

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- npm ou yarn

### 1. Cloner et installer

```bash
# Cloner le projet
cd /home/stevenyapo/Documents/Test

# Installer les dépendances backend
npm install

# Installer les dépendances frontend
cd frontend && npm install && cd ..
```

### Variables d’environnement obligatoires (production)

Au minimum en production :
- `JWT_SECRET`
- `DATABASE_URL` (ex. `postgres://user:password@localhost:5432/seven_t`)

Pour les fonctionnalités complètes :
- `GEMINI_API_KEY` (IA)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (abonnements / paiements Stripe)
- `PAYMETRUST_ACCOUNT_ID`, `PAYMETRUST_API_KEY` (paiement en ligne PaymeTrust, optionnel)
- `SMTP_*` (emails)
- `FRONTEND_URL`, `ALLOWED_ORIGINS`

Voir `.env.example` pour la liste complète. La base de données utilisée est **PostgreSQL** ; la sauvegarde et la restauration sont documentées dans la section Production ci-dessous.

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env
```

Variables importantes :
```env
JWT_SECRET=votre-clé-secrète-jwt
DATABASE_URL=postgres://postgres:postgres@localhost:5432/seven_t
GEMINI_API_KEY=votre-clé-gemini
OPENAI_API_KEY=sk-votre-clé-openai
```

### 3. Lancer l'application

```bash
# Terminal 1 - Backend (port 3001)
npm run dev:backend

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

Ou lancez les deux en même temps :
```bash
npm run dev
```

### 4. Accéder à l'application

- **Frontend**: http://localhost:5173
- **API Backend**: http://localhost:3001/api

## 📖 Guide d'utilisation

### 1. Créer un compte
Allez sur http://localhost:5173 et créez un compte.

### 2. Créer un agent
- Allez dans "Agents" → "Créer un agent"
- Donnez un nom et une description

### 3. Configurer l'agent
- **Paramètres** : Personnalisez le system prompt (instructions)
- **Base de connaissances** : Ajoutez des informations (FAQ, horaires, prix...)

### 4. Connecter WhatsApp
- Allez dans l'onglet "Connexion"
- Cliquez sur "Générer le QR Code"
- Scannez avec WhatsApp sur votre téléphone

### 5. Tester
Utilisez le "Playground" pour tester les réponses avant de recevoir des vrais messages.

## 🔧 Configuration (Backend uniquement)

### IA pré-configurée

L'IA est **déjà configurée** - les utilisateurs n'ont rien à faire !

Côté backend, le fichier `.env` contient une clé Gemini **personnelle** que vous devez fournir vous‑même :
```env
GEMINI_API_KEY=votre-cle-gemini
```

### Architecture IA

Le système gère automatiquement :
- **Google Gemini** - Provider principal (Gemini 1.5 Flash/Pro)
- **OpenAI** - Fallback optionnel (GPT-4o)
- **Réponses intelligentes** - Fallback si aucune API disponible

### Modèles disponibles pour les utilisateurs

| Catégorie | Modèle | Description |
|-----------|--------|-------------|
| ⚡ Rapide | Gemini Flash | Très rapide, recommandé |
| ⚡ Rapide | GPT-4o Mini | Alternative rapide |
| 🧠 Puissant | Gemini Pro | Plus intelligent |
| 🧠 Puissant | GPT-4o | Très intelligent |

Les utilisateurs choisissent simplement le modèle dans les paramètres de leur agent - aucune clé API à configurer !

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Utilisateur actuel

### Agents
- `GET /api/agents` - Liste des agents
- `POST /api/agents` - Créer un agent
- `GET /api/agents/:id` - Détails d'un agent
- `PUT /api/agents/:id` - Modifier un agent
- `DELETE /api/agents/:id` - Supprimer un agent

### WhatsApp
- `GET /api/whatsapp/status/:agentId` - Statut de connexion
- `POST /api/whatsapp/connect/:agentId` - Initier connexion
- `GET /api/whatsapp/qr/:agentId` - Obtenir QR code
- `POST /api/whatsapp/disconnect/:agentId` - Déconnecter

### Conversations
- `GET /api/conversations` - Toutes les conversations
- `GET /api/conversations/:id` - Détails + messages

### Base de connaissances
- `GET /api/knowledge/agent/:agentId` - Éléments de la base
- `POST /api/knowledge/agent/:agentId` - Ajouter un élément
- `DELETE /api/knowledge/:id` - Supprimer un élément

## Production

### Sauvegarde et restauration PostgreSQL

- **Sauvegarde** : `pg_dump -U postgres -d seven_t -F c -f backup_$(date +%Y%m%d).dump` (ou `-F p` pour un fichier SQL texte).
- **Restauration** : `pg_restore -U postgres -d seven_t -c backup_YYYYMMDD.dump` (ou `psql -U postgres -d seven_t -f backup.sql` pour un dump SQL).
- **Cron** (ex. tous les jours à 2h) : `0 2 * * * pg_dump -U postgres seven_t -F c -f /backups/seven_t_$(date +\%Y\%m\%d).dump`

### Sentry (erreurs)

En production, définir `SENTRY_DSN` dans `.env` (voir `.env.example`). Configurer le SDK Sentry côté backend (et optionnellement frontend) pour envoyer les erreurs à Sentry. Sans DSN, le suivi des erreurs est désactivé.

### Session et déconnexion après inactivité

Côté frontend, la variable `VITE_SESSION_IDLE_MINUTES` (dans le `.env` du frontend ou à la racine) permet de déconnecter l’utilisateur après X minutes sans activité (0 = désactivé). En production, une valeur comme `30` est recommandée.

## ⚠️ Avertissements

- Ce projet est éducatif et n'est pas affilié à WhatsApp
- L'utilisation de bots non officiels peut entraîner un ban
- Utilisez de manière responsable
- Ne spammez pas les utilisateurs

## 🛠️ Technologies

**Backend:**
- Node.js + Express
- Baileys (WhatsApp Web API)
- Google Gemini AI + OpenAI API
- PostgreSQL (pg)
- JWT pour l'authentification

**Frontend:**
- React 18 + Vite
- React Router
- Tailwind CSS
- Lucide Icons
- Axios

## 📄 Licence

MIT License - Utilisez ce code librement pour apprendre et construire.

---

**Clone éducatif de Wazzap.ai** - Fait avec ❤️
# SEVEN-T
# SEVEN-T








