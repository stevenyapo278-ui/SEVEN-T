# Catalogue produits et flux principaux

Ce document décrit la construction du catalogue produits, comment l’IA est alimentée, et les flux principaux (WhatsApp, commandes).

---

## 1. Données catalogue (produits et images)

### Tables

- **`products`** : par utilisateur (`user_id`), champs utilisés pour le catalogue : `name`, `sku`, `price`, `stock`, `category`, `description`, `image_url`, `is_active`.  
  La **description** et l’**image_url** (image principale) sont recommandées pour que l’IA présente correctement les produits.

- **`product_images`** : images supplémentaires par produit (`product_id`), avec `url`, `position`, `is_primary`.  
  Si `is_primary` est mis pour une image, son `url` est aussi enregistrée dans `products.image_url`.

### Construction du texte catalogue

Le même schéma est utilisé côté **WhatsApp** (`backend/services/whatsapp.js`) et **Playground** (`backend/routes/agents.js`) :

1. Charger les produits actifs :  
   `SELECT id, name, sku, price, stock, category, description, image_url FROM products WHERE user_id = ? AND is_active = 1`
2. Charger les images supplémentaires :  
   `SELECT product_id, url FROM product_images WHERE product_id IN (...) ORDER BY product_id, position ASC`
3. Pour chaque produit :
   - Réunir les URLs : `image_url` du produit + URLs de `product_images` pour ce produit
   - Dédupliquer : `uniqueUrls = [...new Set(allUrls)]`
   - Ligne d’images dans le texte :  
     - 1 URL : `Image: <url>`  
     - plusieurs : `Images: <url1>, <url2>, ...`
4. Ligne catalogue par produit :  
   `- Nom (SKU): prix FCFA [stock] [catégorie] [description indentation] [Image(s): ...]`

L’IA ne doit utiliser que ces informations (pas d’invention de prix, description ou lien d’image).

---

## 2. Où le catalogue est injecté

| Contexte | Fichier | Usage |
|----------|---------|--------|
| **WhatsApp** (réponse IA en conversation) | `backend/services/whatsapp.js` | Contexte agent e-commerce : base de connaissances avec une entrée « CATALOGUE PRODUITS » (texte ci‑dessus) + « RÈGLES DE GESTION DES COMMANDES ». |
| **Playground** (test d’agent) | `backend/routes/agents.js` | Même construction : produits + `product_images`, même format « CATALOGUE PRODUITS » + règles commandes. |
| **Analyse de message** (détection produits, stock) | `backend/services/messageAnalyzer.js` | `_getProducts(userId)` charge les produits (sans `product_images` pour l’index de recherche). Cache par utilisateur ; `invalidateProductCache(userId)` après création/modif/suppression de produits ou d’images. |
| **Prompts IA** | `backend/services/ai.js` | `buildSystemPrompt` reçoit la base de connaissances (déjà construite par WhatsApp ou Playground). Règles explicites : utiliser uniquement le catalogue pour noms, prix, description, images ; formulations professionnelles (« Voici les informations disponibles », etc.). |

---

## 3. Invalidation du cache produits

Pour que l’analyse des messages (détection de produits, stock) reflète les changements, le cache MessageAnalyzer est invalidé dans **`backend/routes/products.js`** dans les cas suivants :

- Création d’un produit
- Mise à jour d’un produit
- Suppression d’un produit
- Import CSV de produits
- Ajout d’une image à un produit (POST `/:id/images`)
- Suppression d’une image (DELETE `/:productId/images/:imageId`)

---

## 4. Flux principaux

### 4.1 Réception d’un message WhatsApp

1. **Réception** : `whatsapp.js` reçoit le message, normalise le payload (tenant_id, conversation_id, from, message).
2. **Contexte** : pour un agent e-commerce, chargement des produits + `product_images` et construction du bloc « CATALOGUE PRODUITS » + règles commandes ; ajout des bases de connaissances globale et agent.
3. **Réponse IA** : `aiService.generateResponse` avec ce contexte ; l’IA répond en s’appuyant uniquement sur le catalogue et les règles.
4. **Envoi** : la réponse est renvoyée au client via WhatsApp.

### 4.2 Détection et gestion des commandes

1. **Analyse** : `messageAnalyzer.analyze` (ou `analyzePayload` / `analyzeMessage`) détecte l’intention (order, inquiry, etc.), les produits mentionnés et les quantités (en utilisant le cache produits).
2. **Création commande** : si une commande est validée (workflow, décision métier), création en base (table `orders` / commandes).
3. **Interface** : la page « Commandes » liste les commandes ; l’utilisateur peut valider, rejeter, créer un lien de paiement, etc.

### 4.3 Liens de paiement

Les liens de paiement sont créés depuis l’API (`/payments`) ou depuis l’interface Commandes (lien associé à une commande). Les statuts (pending, paid, cancelled, expired) sont gérés dans l’app et, le cas échéant, via les webhooks des providers (PaymeTrust, etc.).

---

## 5. Fiches produits côté interface

Pour améliorer les réponses de l’agent e-commerce, l’interface **Produits** encourage à renseigner :

- **Description** : placeholder et indication « (recommandé) » si vide ; message d’aide sur l’amélioration des réponses.
- **URL image** : idem ; possibilité d’ajouter plusieurs images via `product_images`.

Les produits sans description ni image affichent un indicateur « Fiche à compléter » dans la liste.
