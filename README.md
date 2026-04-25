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

## 📦 Modules du Système : Le Détail Technologique
SEVEN-T est conçu comme un écosystème modulaire où chaque fonctionnalité peut être activée indépendamment. Voici le détail de chaque brique :

1.  **🕒 Heures de disponibilité** : Définition de créneaux d'activité par agent. En période d'absence, l'IA bascule en mode "Répondeur intelligent" avec un message personnalisé, évitant les réponses tardives inappropriées.
2.  **🎙️ Réponses vocales (TTS)** : Intégration de moteurs comme **ElevenLabs** pour transformer les réponses de l'IA en messages audio ultra-réalistes, favorisant la proximité avec le client.
3.  **🎯 Next Best Action** : Système de recommandation contextuel. L'IA analyse l'historique pour suggérer l'action la plus rentable (ex: "Proposer un code promo", "Demander un appel").
4.  **📈 Score de conversion** : Algorithme propriétaire calculant un score de 0 à 100% basé sur 6 facteurs (Volume de messages, Sentiment, Intention d'achat, Engagement humain, Récence). Le score est visible sur chaque conversation pour prioriser les leads.
5.  **📅 Daily Briefing** : Rapport de synthèse généré par IA et envoyé chaque matin à l'administrateur. Il récapitule les opportunités chaudes, les rendez-vous fixés et les statistiques de la veille.
6.  **🎭 Sentiment Routing** : Analyse sémantique continue. Si un client exprime une frustration critique, le système alerte instantanément un superviseur humain et suspend l'IA pour éviter toute escalade.
7.  **🗳️ Sondages Interactifs** : Création de questionnaires natifs WhatsApp. Les réponses sont automatiquement analysées et injectées dans le profil du prospect pour une segmentation précise.
8.  **⚡ Relance IA (Proactive)** : Identifie les conversations inactives depuis 24h/48h ayant un fort potentiel. L'IA suggère un message de relance adapté au contexte précédent pour maximiser le réengagement.
9.  **🏗️ Flow Builder** : Outil visuel de création de scénarios (Drag & Drop). Permet de structurer des parcours complexes comme des diagnostics, des prises de commande ou des FAQs arborescentes.
10. **📣 Campagnes & Marketing** : Envoi de messages en masse respectant les limites de WhatsApp, avec support des variables de personnalisation et suivi du taux d'ouverture.
11. **🛠️ Alertes Transfert Humain** : Notifications Push/Email/WhatsApp dès que l'IA détecte une limite de compétence ou une demande explicite de parler à un humain.
12. **🗂️ Gestion de Catalogue** : Synchronisation dynamique des stocks et prix. L'IA peut envoyer des photos de produits et générer des liens de paiement directement dans le chat.

---

## 🛠️ Stack Technologique Avancée

### 🧠 Intelligence Artificielle
*   **LLMs** : Google Gemini 1.5 Pro/Flash & OpenAI GPT-4o.
*   **Vector Database** : pgvector pour le stockage des embeddings de la base de connaissances.
*   **NLP** : Analyse de sentiment et détection d'intentions via des pipelines de classification personnalisés.

### 💻 Infrastructure Backend
*   **Node.js & Express** : Cœur de l'application.
*   **PostgreSQL** : Base de données principale (Robuste & ACID).
*   **Baileys** : Connexion multi-socket aux comptes WhatsApp via Web-Service.
*   **Redis/BullMQ** : Gestion résiliente des tâches de fond (relances, campagnes).

### 🎨 Frontend & Design
*   **Vite + React** : Pour une expérience SPA (Single Page Application) fluide.
*   **Tailwind CSS** : Utilisation d'un système de jetons (Design System) pour une cohérence totale.
*   **Recharts** : Visualisation de données complexes (ROI, Volume, Sentiments).

---

## 🖼️ Rôles des Vues (Pages) : Guide de Navigation

| Vue | Rôle Stratégique | Fonctionnalité Clé |
| :--- | :--- | :--- |
| **Landing** | Acquisition & Demo | Présentation des modules et chat démo interactif. |
| **Dashboard** | Pilotage Global | Visualisation du ROI IA, volume de messages et alertes critiques. |
| **Agents** | Configuration IA | Création de la personnalité, choix du modèle et prompt system. |
| **Agent Detail** | Hub Technique | Connexion WhatsApp QR, Base de connaissances (PDF/Doc) et Logs. |
| **Conversations** | Supervision Live | Lecture des échanges, bascule Mode IA/Humain et **Score de Conversion**. |
| **Leads & Deals** | Conversion CRM | Pipeline Kanban pour transformer les discussions en ventes fermes. |
| **Flow Builder** | Automatisation | Création graphique de tunnels de vente sans code. |
| **Campaigns** | Growth Marketing | Diffusion massive de messages segmentés avec planification. |
| **Polls** | Feedback Client | Création et analyse des données récoltées via les sondages. |
| **Analytics** | Performance | Analyse du coût par message et efficacité de l'IA (ROI). |
| **Admin** | Gouvernance | Gestion des plans, sécurité, audits et clés API globales. |

---

## 🚀 Déploiement & Maintenance

### Installation Locale
1. `npm install` (Root & Frontend)
2. Configuration `.env` (Base de données, Clés API IA)
3. `npm run dev`

### Production
Le projet est optimisé pour un déploiement via **Docker** ou **Dokploy**. Il supporte le clustering pour gérer des milliers de sockets WhatsApp simultanément.

---
*© 2026 SEVEN-T - Pionnier de l'Intelligence Conversationnelle. Designé pour la performance.*
