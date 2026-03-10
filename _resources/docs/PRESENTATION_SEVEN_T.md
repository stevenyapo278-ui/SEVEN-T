# SEVEN T - Documentation Complète

## Présentation de la Plateforme SaaS

---

# 1. INTRODUCTION

## 1.1 Qu'est-ce que SEVEN T ?

**SEVEN T** est une plateforme SaaS (Software as a Service) d'automatisation WhatsApp spécialisée pour le e-commerce. Elle permet aux entreprises de créer des agents IA intelligents qui répondent automatiquement aux clients via WhatsApp, gèrent les commandes, et optimisent la relation client.

## 1.2 Vision

> "Automatiser la relation client WhatsApp pour permettre aux e-commerçants de se concentrer sur leur cœur de métier"

## 1.3 Proposition de Valeur

| Problème | Solution SEVEN T |
|----------|------------------|
| Répondre 24h/24 aux clients | Agents IA disponibles en permanence |
| Gérer un grand volume de messages | Automatisation intelligente des réponses |
| Suivre les commandes manuellement | Détection automatique des intentions d'achat |
| Perdre des prospects | Identification automatique des leads |
| Former des équipes support | Base de connaissances centralisée |

---

# 2. PUBLIC CIBLE

## 2.1 Secteur Prioritaire : E-commerce

SEVEN T est conçu spécifiquement pour :

- **Boutiques en ligne** (mode, électronique, cosmétiques...)
- **Marketplaces** locales
- **Vendeurs sur réseaux sociaux** (Instagram, Facebook)
- **PME** avec forte activité WhatsApp
- **Agences digitales** gérant plusieurs clients

## 2.2 Cas d'Usage Typiques

1. **Vente de produits** : L'IA présente le catalogue, répond aux questions sur les prix et la disponibilité
2. **Support client** : Gestion des réclamations, suivi de commandes
3. **Prise de rendez-vous** : Pour les services (salons, consultations)
4. **Génération de leads** : Qualification automatique des prospects

---

# 3. FONCTIONNALITÉS PRINCIPALES

## 3.1 Gestion des Agents IA

### Création d'agents personnalisés
- **Nom et personnalité** : Définissez l'identité de votre assistant
- **System Prompt** : Instructions précises sur le comportement de l'IA
- **Choix du modèle IA** : Gemini, GPT-4, OpenRouter (modèles gratuits et premium)
- **Température** : Contrôle de la créativité des réponses (0-1)
- **Tokens max** : Limite de longueur des réponses

### Templates prédéfinis
| Template | Description |
|----------|-------------|
| **E-commerce** | Spécialisé vente, gestion stock, commandes |
| **Commercial** | Prospection, qualification, conversion |
| **Support** | Résolution de problèmes, empathie |
| **FAQ** | Réponses rapides aux questions fréquentes |
| **Rendez-vous** | Prise de RDV, collecte d'informations |

### Paramètres avancés
- **Délai de réponse** : Configurable (1-60 secondes) pour un effet naturel
- **Auto-reply** : Activation/désactivation des réponses automatiques
- **Horaires de disponibilité** : Définir les heures de service
- **Message d'absence** : Réponse personnalisée hors horaires
- **Transfert humain** : Mots-clés pour escalade vers un agent humain

---

## 3.2 Intégration WhatsApp

### Connexion simple
1. Scanner un QR code depuis l'interface
2. Connexion instantanée au compte WhatsApp Business ou personnel
3. Auto-reconnexion en cas de déconnexion

### Fonctionnalités WhatsApp
- **Réception des messages** en temps réel
- **Envoi de réponses** automatiques
- **Historique des conversations** complet
- **Photos de profil** des contacts
- **Noms des contacts** (pushName, nom enregistré)
- **Gestion multi-comptes** (selon le plan)

### Sécurité
- Sessions chiffrées
- Données stockées localement
- Pas d'accès à vos messages par des tiers

---

## 3.3 Gestion des Conversations

### Interface de chat
- **Liste des conversations** avec aperçu du dernier message
- **Recherche** par nom ou contenu
- **Filtres** : actives, archivées, prioritaires
- **Tags** personnalisables
- **Priorité** : normale, haute, urgente

### Vue détaillée
- Historique complet des échanges
- Distinction messages entrants/sortants
- Horodatage précis
- Indicateur de besoin d'intervention humaine
- Envoi de messages manuels

### Temps réel
- Rafraîchissement automatique (polling)
- Nouvelles conversations instantanées
- Compteur de messages non lus

---

## 3.4 Base de Connaissances

### Sources de données supportées

| Type | Description | Extraction |
|------|-------------|------------|
| **Texte** | Saisie manuelle | Direct |
| **PDF** | Documents, catalogues | Extraction automatique |
| **YouTube** | Vidéos explicatives | Transcription |
| **Site web** | Pages produits, FAQ | Scraping intelligent |

### Organisation
- **Base globale** : Partagée entre tous les agents
- **Base par agent** : Connaissances spécifiques
- **Catalogue produits** : Intégré automatiquement

### Utilisation par l'IA
L'IA consulte automatiquement la base de connaissances pour :
- Répondre aux questions sur les produits
- Donner des informations de l'entreprise
- Fournir des réponses cohérentes

---

## 3.5 Gestion des Produits (E-commerce)

### Catalogue produit
- **Nom, SKU, Description**
- **Prix** (en FCFA par défaut)
- **Stock** avec indicateurs visuels
- **Catégories** pour l'organisation
- **Images** des produits
- **Statut** : actif/inactif

### Gestion du stock
- **Indicateurs automatiques** :
  - ✅ En stock
  - ⚠️ Stock limité (< 5 unités)
  - ⛔ Rupture de stock
- **Logs de stock** : Historique de tous les mouvements
- **Alertes** de stock bas

### Import/Export
- Import CSV pour ajout en masse
- Export des données produits

---

## 3.6 Détection des Commandes

### Fonctionnement automatique
1. L'IA analyse chaque message client
2. Détection des intentions d'achat (mots-clés, quantités)
3. Création automatique d'une commande en attente
4. Notification au propriétaire

### Workflow de validation
```
Client demande → IA détecte → Commande créée → 
Notification → Validation humaine → Stock mis à jour
```

### Interface de gestion
- Liste des commandes par statut
- Détails : client, produits, quantités, montant
- Actions : Valider, Rejeter
- Historique des stock movements

---

## 3.7 Gestion des Leads

### Détection automatique
L'IA analyse les conversations pour identifier les prospects :
- **Score d'intention** (0-100)
- **Niveau de confiance**
- **Raison de classification**

### Workflow
1. **Lead suggéré** : L'IA propose un prospect
2. **Validation humaine** : Accepter ou rejeter
3. **Lead confirmé** : Ajouté à la liste

### Informations collectées
- Nom du contact
- Numéro de téléphone
- Source (agent WhatsApp)
- Score et confiance
- Lien vers la conversation

---

## 3.8 Système de Notifications

### Types de notifications
| Type | Exemple |
|------|---------|
| 🆘 **Intervention requise** | Client demande un humain |
| 💰 **Crédits faibles** | Alerte à 50, 20, 10, 5 crédits |
| 🛒 **Nouvelle commande** | Commande détectée en attente |
| 👤 **Nouveau lead** | Prospect identifié par l'IA |
| 📦 **Stock bas** | Produit en rupture imminente |
| ✅ **Bienvenue** | Nouvel utilisateur inscrit |

### Gestion
- Marquer comme lu
- Supprimer individuellement
- "Tout marquer comme lu"
- Nettoyage automatique après 30 jours

---

## 3.9 Intervention Humaine Intelligente

### Détection automatique
Le système détecte quand un humain doit intervenir :

**Déclencheurs :**
- Mots-clés : "remboursement", "problème", "parler à quelqu'un"
- Rupture de stock sur demande client
- Demande de négociation de prix
- Réclamation ou mécontentement
- Question hors connaissance de l'IA

### Actions automatiques
1. Conversation marquée "priorité haute"
2. Notification envoyée au propriétaire
3. Lien direct vers la conversation

---

## 3.10 Tableau de Bord

### Statistiques en temps réel
- **Conversations actives**
- **Messages traités** (aujourd'hui, cette semaine, ce mois)
- **Crédits restants**
- **Agents actifs**
- **Leads générés**
- **Commandes en attente**

### Graphiques
- Évolution des messages dans le temps
- Répartition par agent
- Performance des modèles IA

---

# 4. MODÈLES IA DISPONIBLES

## 4.1 Providers Supportés

| Provider | Modèles | Caractéristiques |
|----------|---------|------------------|
| **Google Gemini** | gemini-1.5-flash, gemini-1.5-pro | Rapide, multilingue |
| **OpenAI** | gpt-4o-mini, gpt-4o, gpt-4-turbo | Très intelligent |
| **OpenRouter** | Llama, Qwen, Gemma, DeepSeek, Phi-3 | Gratuits disponibles |

## 4.2 Modèles Gratuits (OpenRouter)

| Modèle | Taille | Recommandation |
|--------|--------|----------------|
| Qwen 3 Next 80B | 80B | ⭐ Très puissant |
| Llama 3.1 8B | 8B | Bon équilibre |
| Gemma 2 9B | 9B | Stable |
| DeepSeek R1T Chimera | - | Raisonnement |
| Phi-3 Mini | 3.8B | Ultra-rapide |

## 4.3 Système de Fallback

En cas d'erreur (rate limit, indisponibilité) :
1. Tentative modèle principal
2. Retry avec modèle alternatif gratuit
3. Fallback vers Gemini si configuré
4. Réponse de secours intelligente

---

# 5. PLANS TARIFAIRES

## 5.1 Grille Tarifaire

| Plan | Prix/mois | Agents | WhatsApp | Messages | Crédits IA |
|------|-----------|--------|----------|----------|------------|
| **Gratuit** | 0 FCFA | 1 | 0 | 500 | 500 |
| **Starter** | 19 023 FCFA | 1 | 1 | 2 500 | 2 000 |
| **Pro** | 32 142 FCFA | 2 | 2 | 10 000 | 5 000 |
| **Business** | 130 535 FCFA | 4 | 4 | Illimité | 30 000 |
| **Enterprise** | Sur devis | Illimité | Illimité | Illimité | Illimité |

## 5.2 Comparaison des Fonctionnalités

| Fonctionnalité | Gratuit | Starter | Pro | Business |
|----------------|---------|---------|-----|----------|
| Réponse auto | ✅ | ✅ | ✅ | ✅ |
| Horaires dispo | ❌ | ✅ | ✅ | ✅ |
| Transfert humain | ❌ | ❌ | ✅ | ✅ |
| Blacklist | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ | ✅ |
| Support prioritaire | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Branding custom | ❌ | ❌ | ❌ | ✅ |
| Calendrier/RDV | ❌ | ❌ | ✅ | ✅ |

## 5.3 Système de Crédits

### Coût par modèle
| Modèle | Crédits/requête |
|--------|-----------------|
| Gemini Flash | 1 |
| GPT-4o Mini | 2 |
| Gemini Pro | 3 |
| GPT-4o | 5 |
| GPT-4 Turbo | 8 |
| OpenRouter Gratuit | 0 |

### Alertes automatiques
- Notification à 50 crédits restants
- Notification à 20 crédits
- Notification à 10 crédits
- Notification à 5 crédits

---

# 6. ARCHITECTURE TECHNIQUE

## 6.1 Stack Technologique

### Frontend
- **React 18** avec Vite
- **Tailwind CSS** pour le styling
- **React Router** pour la navigation
- **Recharts** pour les graphiques
- **Lucide React** pour les icônes

### Backend
- **Node.js** avec Express.js
- **SQLite** (better-sqlite3) pour la base de données
- **JWT** pour l'authentification
- **Baileys** pour WhatsApp Web API

### IA
- **Google Generative AI** (Gemini)
- **OpenAI SDK** (GPT)
- **OpenRouter** (multi-modèles)

## 6.2 Schéma d'Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │Dashboard│ │ Agents  │ │ Convos  │ │Products │ │ Leads  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ │
└───────┼──────────┼──────────┼──────────┼──────────┼────────┘
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                              │
                         [API REST]
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                       BACKEND (Node.js)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │  Services   │  │     Database        │  │
│  │ - auth      │  │ - whatsapp  │  │ - users             │  │
│  │ - agents    │  │ - ai        │  │ - agents            │  │
│  │ - products  │  │ - leads     │  │ - conversations     │  │
│  │ - orders    │  │ - orders    │  │ - messages          │  │
│  │ - leads     │  │ - notifs    │  │ - products          │  │
│  └─────────────┘  └─────────────┘  │ - orders            │  │
│                                     │ - leads             │  │
│                                     │ - notifications     │  │
│                                     └─────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────┴────┐          ┌─────┴─────┐         ┌────┴────┐
   │ WhatsApp │          │    IA     │         │  Stripe │
   │ (Baileys)│          │ Services  │         │Payments │
   └─────────┘          └───────────┘         └─────────┘
        │                     │
   ┌────┴────┐    ┌───────────┴───────────┐
   │ WA Web  │    │   Gemini │ OpenAI │   │
   │   API   │    │   OpenRouter (multi)  │
   └─────────┘    └───────────────────────┘
```

## 6.3 Base de Données

### Tables principales
| Table | Description |
|-------|-------------|
| users | Comptes utilisateurs |
| agents | Configuration des agents IA |
| conversations | Historique des chats |
| messages | Messages individuels |
| products | Catalogue produits |
| orders | Commandes détectées |
| order_items | Produits par commande |
| leads | Prospects identifiés |
| knowledge | Base de connaissances |
| global_knowledge | Connaissances partagées |
| notifications | Alertes système |
| product_logs | Historique stock |

---

# 7. SÉCURITÉ

## 7.1 Authentification
- **JWT Tokens** avec expiration
- **Mots de passe hashés** (bcrypt)
- **Sessions sécurisées**

## 7.2 Protection des Données
- Données stockées localement
- Pas de partage avec des tiers
- Chiffrement des sessions WhatsApp

## 7.3 Rate Limiting
- Protection contre les abus
- Limites par plan

## 7.4 Rôles
- **Utilisateur** : Accès à ses ressources
- **Admin** : Gestion de tous les utilisateurs

---

# 8. INTERFACE UTILISATEUR

## 8.1 Thèmes
- **Mode clair** : Interface lumineuse
- **Mode sombre** : Confortable pour les yeux
- **Détection automatique** des préférences système

## 8.2 Design
- Interface moderne et épurée
- Navigation intuitive
- Responsive (mobile, tablette, desktop)
- Animations fluides

## 8.3 Accessibilité
- Contraste suffisant
- Navigation au clavier
- Labels explicites

---

# 9. COMMENT DÉMARRER

## 9.1 Inscription
1. Créer un compte sur la plateforme
2. Confirmer l'email
3. Choisir un plan

## 9.2 Configuration initiale
1. **Créer un agent** avec le template souhaité
2. **Connecter WhatsApp** (scanner le QR code)
3. **Ajouter des produits** si e-commerce
4. **Enrichir la base de connaissances**

## 9.3 Test
1. Envoyer un message depuis un autre téléphone
2. Vérifier la réponse automatique
3. Ajuster le system prompt si nécessaire

## 9.4 Lancement
1. Activer l'agent
2. Surveiller les conversations
3. Valider les commandes et leads

---  

# 10. SUPPORT ET CONTACT

## 10.1 Documentation
- Guide utilisateur intégré
- FAQ dans l'application
- Tutoriels vidéo (à venir)

## 10.2 Support
- **Plan Gratuit/Starter** : Email
- **Plan Pro** : Support prioritaire
- **Plan Business/Enterprise** : Support dédié + Setup VIP

## 10.3 Communauté
- Groupe WhatsApp utilisateurs
- Forum de discussion

---

# 11. ROADMAP (Évolutions futures)

## Court terme
- [ ] Intégration Telegram
- [ ] Export PDF des conversations
- [ ] Templates de messages prédéfinis

## Moyen terme
- [ ] Application mobile
- [ ] Intégration CRM (HubSpot, Salesforce)
- [ ] Webhooks pour intégrations

## Long terme
- [ ] Multi-langues avancé
- [ ] IA vocale
- [ ] Marketplace de templates

---

# 12. ANNEXES

## 12.1 Glossaire

| Terme | Définition |
|-------|------------|
| **Agent** | Assistant IA configuré pour répondre automatiquement |
| **System Prompt** | Instructions définissant le comportement de l'IA |
| **Lead** | Prospect potentiel identifié par l'IA |
| **Crédits** | Unités de consommation pour les appels IA |
| **Fallback** | Réponse de secours quand l'IA échoue |
| **Token** | Unité de mesure du texte traité par l'IA |

## 12.2 Limites techniques

- **Taille max PDF** : 10 MB
- **Durée max vidéo YouTube** : Pas de limite (transcription)
- **Messages par minute** : Selon capacité WhatsApp
- **Longueur réponse IA** : Configurable (max 4000 tokens)

---

**SEVEN T** - Automatisez votre relation client WhatsApp

*Document généré le 1er février 2026*
*Version 1.0*
