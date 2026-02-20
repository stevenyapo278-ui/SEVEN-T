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
│   │   └── init.js          # Initialisation SQLite
│   ├── middleware/
│   │   └── auth.js          # Middleware JWT
│   ├── routes/
│   │   ├── auth.js          # Routes authentification
│   │   ├── agents.js        # Routes agents
│   │   ├── whatsapp.js      # Routes WhatsApp
│   │   ├── conversations.js # Routes conversations
│   │   ├── knowledge.js     # Routes base de connaissances
│   │   └── stats.js         # Routes statistiques
│   ├── services/
│   │   ├── whatsapp.js      # Service WhatsApp/Baileys
│   │   └── ai.js            # Service OpenAI
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
├── data/                    # Base de données SQLite
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
- `DATABASE_PATH`

Pour les fonctionnalités complètes :
- `GEMINI_API_KEY` (IA)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (paiements)
- `SMTP_*` (emails)
- `FRONTEND_URL`, `ALLOWED_ORIGINS`

Voir `.env.example` pour la liste complète.

### Sauvegarde / restauration SQLite

La base est un fichier SQLite (ex. `data/database.sqlite`). Pour sauvegarder :
1. Arrêter l’application
2. Copier le fichier (ou le volume Docker `app_data`)
3. Redémarrer l’application

Pour restaurer : remplacer le fichier par la sauvegarde et redémarrer.

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

Côté backend, le fichier `.env` contient :
```env
GEMINI_API_KEY=AIzaSyBStbOU2wlnvBpIC0rPM1t_08wKYAKxUEE
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
- SQLite (better-sqlite3)
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








