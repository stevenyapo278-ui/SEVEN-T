# 🚀 SEVEN-T : Écosystème de Vente & Automatisation WhatsApp IA

SEVEN-T est une plateforme SaaS de pointe conçue pour transformer la relation client et automatiser les processus de vente via WhatsApp. En combinant la puissance de l'Intelligence Artificielle (Gemini/GPT-4), un CRM intégré et des outils d'automatisation avancés, SEVEN-T permet aux entreprises de gérer des milliers de conversations tout en offrant une expérience ultra-personnalisée.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-cyan)

---

## ✨ Fonctionnalités en "Moindre Détail"

### 🤖 Intelligence Artificielle & RAG (Retrieval Augmented Generation)
*   **Multi-Modèles** : Support natif de **Google Gemini 1.5 (Flash/Pro)** et **OpenAI GPT-4o**.
*   **Base de Connaissances (RAG)** : Entraînez vos agents avec vos propres documents (PDF, texte). L'IA n'invente rien, elle répond sur la base de vos données réelles.
*   **Analyse de Sentiments & Leads** : Détection automatique des intentions d'achat, scoring des prospects et qualification des leads.
*   **Next Best Action** : L'IA suggère la meilleure action suivante pour chaque conversation afin de maximiser la conversion.
*   **Réponses Vocales** : Capacité à générer et comprendre des messages vocaux (TTS/STT).

### 📱 Hub WhatsApp Omnicanal
*   **Multi-Agents** : Connectez plusieurs numéros WhatsApp simultanément, chacun géré par un agent IA spécifique.
*   **Synchronisation en Temps Réel** : WebSockets pour une réactivité instantanée des messages et statuts.
*   **Gestion des Médias** : Envoi et réception d'images, documents et notes vocales avec analyse automatique par l'IA.
*   **Handoff Humain** : Système d'intervention permettant à un agent humain de prendre le relais de l'IA à tout moment.

### 💼 CRM & Sales Automation
*   **Pipeline de Ventes** : Gestion des opportunités (Deals) et des étapes de conversion.
*   **Détection de Commandes** : L'IA identifie lorsqu'un client veut commander et remplit automatiquement le panier.
*   **Relances Proactives** : Algorithme intelligent qui identifie les clients à relancer pour maximiser le ROI.
*   **Sondages & Polls** : Création de sondages interactifs sur WhatsApp pour collecter des données clients.

### 📊 Analytics & Reporting
*   **Tableau de Bord Holistique** : Visualisez le ROI généré par l'IA, le volume de messages et les taux de conversion.
*   **Daily Briefing** : Rapport quotidien envoyé automatiquement résumant l'activité de la veille.
*   **Rapports PDF** : Génération de rapports détaillés pour l'exportation et l'analyse hors-ligne.

---

## 📦 Modules du Système (Activables par Plan)
SEVEN-T est structuré en modules indépendants qui peuvent être activés selon le niveau d'abonnement :

1.  **Heures de disponibilité** : Gestion automatique des horaires de réponse des agents.
2.  **Paiement & Encaissement** : Intégration de passerelles pour vendre directement via WhatsApp.
3.  **Next Best Action** : Suggestions intelligentes d'actions pour maximiser les ventes.
4.  **Score de conversion** : Analyse prédictive de la probabilité d'achat de chaque prospect.
5.  **Daily Briefing** : Résumé quotidien de l'activité envoyé directement sur WhatsApp.
6.  **Sentiment Routing** : Détection de l'humeur du client et transfert prioritaire si nécessaire.
7.  **Import Catalogue** : Synchronisation de vos produits via URL ou fichiers.
8.  **Alertes Transfert Humain** : Notifications instantanées pour une reprise en main manuelle.
9.  **Analytics & Statistiques** : Tableaux de bord avancés et rapports de performance.
10. **Flows (Flux de travail)** : Constructeur visuel de parcours clients automatisés.
11. **Statut WhatsApp** : Publication automatique de contenus sur les statuts WhatsApp.
12. **Gestion des Leads** : Pipeline complet de suivi et de qualification des prospects.
13. **Campagnes WhatsApp** : Envoi de messages en masse et planification marketing.
14. **Réponses vocales (TTS)** : Capacité de l'IA à répondre par message audio.
15. **Sondages** : Création et analyse de sondages interactifs.
16. **Relance IA (Proactive)** : Suivi automatique des paniers et commandes abandonnés.

---

## 🛠️ Stack Technologique

### Frontend (Interface Utilisateur)
*   **React 18 + Vite** : Pour une interface ultra-rapide et réactive.
*   **Tailwind CSS** : Design system moderne, mode sombre natif et responsive.
*   **Lucide Icons & Framer Motion** : Icônes élégantes et micro-animations fluides.
*   **Socket.io-client** : Communication bidirectionnelle en temps réel.
*   **I18next** : Support multilingue complet.

### Backend (Moteur Logiciel)
*   **Node.js & Express** : Architecture robuste et scalable.
*   **PostgreSQL** : Base de données relationnelle pour une gestion stricte des données CRM.
*   **Baileys (WhatsApp Web API)** : Connexion stable et performante aux serveurs WhatsApp.
*   **BullMQ & Redis** : Gestion des files d'attente pour les campagnes et workflows massifs.
*   **Zod & Helmet** : Sécurité accrue par validation de schémas et protection des headers.

### Paiements & Intégrations
*   **GeniusPay & PaymeTrust** : Gateways de paiement locaux et internationaux.
*   **Stripe** : Gestion des abonnements SaaS.
*   **Google Calendar & Outlook** : Synchronisation des rendez-vous détectés par l'IA.

---

## 🖼️ Rôles des Vues (Pages)

| Vue | Rôle & Fonctionnalité |
| :--- | :--- |
| **Landing** | Vitrine technologique avec démonstration interactive du chatbot IA. |
| **Dashboard** | Vue d'ensemble des KPIs, ROI, et activités récentes de tous les agents. |
| **Agents** | Centre de contrôle pour créer, configurer et connecter vos assistants IA. |
| **Agent Detail** | Configuration avancée : System Prompt, Base de connaissances, Playground et statut WhatsApp. |
| **Conversations** | Messagerie unifiée pour superviser les échanges IA/Clients en temps réel. |
| **Leads & Deals** | Pipeline CRM pour suivre la progression des prospects vers la vente. |
| **Flow Builder** | Interface visuelle "Drag & Drop" pour créer des parcours automatisés. |
| **Campaigns** | Planification et envoi massif de messages WhatsApp segmentés. |
| **Orders & Products** | Gestion du catalogue de produits et suivi des commandes générées par l'IA. |
| **Payments** | Suivi des transactions, liens de paiement et statuts de règlement. |
| **Analytics & Reports**| Analyse profonde des performances via des graphiques et exports PDF. |
| **Team** | Gestion des collaborateurs, rôles (Admin, Manager, Agent) et permissions. |
| **Admin** | Panel super-administrateur : gestion des plans, clés API globales, logs d'audit et sécurité. |

---

## 🚀 Installation

### 1. Prérequis
- Node.js 18+
- PostgreSQL 15+
- Redis (pour les files d'attente)

### 2. Setup Rapide
```bash
# Installation des dépendances
npm install
cd frontend && npm install && cd ..

# Configuration environnement
cp .env.example .env
# Remplissez les clés DATABASE_URL, GEMINI_API_KEY, JWT_SECRET, etc.

# Lancement en développement
npm run dev
```

---

## 🛡️ Sécurité & Production
*   **Protection Brute Force** : Système de bannissement temporaire des IPs suspectes.
*   **Logs d'Audit** : Traçabilité complète des actions administratives avec option de Rollback.
*   **Sentry Integration** : Monitoring des erreurs en temps réel.
*   **Docker Ready** : Déploiement simplifié via `docker-compose.yml`.

---
*© 2026 SEVEN-T - Plateforme d'Intelligence Conversationnelle.*
