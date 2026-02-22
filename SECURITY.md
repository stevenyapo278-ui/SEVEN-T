# Revue de sécurité – SEVEN T

Ce document résume l’état de la sécurité du projet et les recommandations.

---

## 1. Authentification et autorisation

### En place
- **JWT** : génération et vérification avec `JWT_SECRET` (obligatoire en production, `middleware/auth.js`).
- **Secret unifié** : `JWT_SECRET` est exporté depuis `auth.js` et réutilisé dans `server.js` et `routes/outlook.js` pour éviter des secrets différents selon les routes.
- **Admin** : `authenticateAdmin` et `requireAdmin` vérifient `is_admin` en base après le token.
- **Isolation des données** : les routes métier (commandes, paiements, conversations, agents, etc.) filtrent par `user_id` / `req.user.id` (requêtes paramétrées).

### Recommandations
- Conserver un `JWT_SECRET` fort et unique en production (génération aléatoire, pas de valeur par défaut).
- En production, s’assurer que `NODE_ENV=production` et que les variables requises sont bien définies (le serveur quitte déjà si `JWT_SECRET` ou `DATABASE_URL` manquent).

---

## 2. Injection et validation des entrées

### En place
- **Requêtes SQL** : utilisation systématique de paramètres (`?` / `$1, $2...`) via le module base de données ; pas de concaténation de chaînes pour les requêtes.
- **Schémas de validation** (Zod) : `registerSchema`, `loginSchema`, `createPaymentLinkSchema`, `createAgentSchema`, etc., sur les routes sensibles.
- **Sanitization** : middleware `sanitizeInput` qui échappe `&`, `<`, `>`, `"`, `'` dans tout `req.body`.

### Attention
- La sanitization globale du body peut modifier du contenu légitime (ex. prompts ou textes avec `<`, `>`, `&`). Si des champs riches (HTML, markdown) sont nécessaires, envisager de ne pas les sanitizer côté API et de sécuriser l’affichage côté front (échappement ou librairie dédiée).

---

## 3. Données sensibles

### En place
- **Mots de passe** : hachage bcrypt avant stockage ; jamais renvoyés dans les réponses (exclusion dans les `SELECT` ou `userWithoutPassword`).
- **Credentials paiement** : table `user_payment_providers` ; les clés ne sont jamais renvoyées par l’API (GET `/payments/providers` ne renvoie que `configured: true/false`).
- **Logs** : pas de log du body des requêtes contenant des secrets (ex. PUT providers) ; messages d’erreur PaymeTrust sans données sensibles.

### Recommandations
- **Chiffrement au repos** : pour `user_payment_providers.credentials`, envisager un chiffrement (AES-256-GCM) avec une clé dérivée de `ENCRYPTION_KEY` ou équivalent, en plus du contrôle d’accès actuel.
- Ne jamais logger ou exposer en API : `api_key`, `account_id`, tokens, mots de passe.

---

## 4. API et réseau

### En place
- **CORS** : origine(s) configurée(s) via `ALLOWED_ORIGINS` ; en production, ne pas utiliser de wildcard pour l’origine.
- **Rate limiting** : `apiLimiter`, `authLimiter`, `whatsappLimiter` (et `aiLimiter` si utilisé) pour limiter abus et brute-force.
- **Helmet** : activé en production (en-têtes de sécurité, CSP de base).
- **Body size** : limite `express.json` à 10 Mo pour limiter les payloads énormes.
- **Gestion d’erreurs** : réponses 500 génériques (« Erreur serveur ») sans stack trace côté client.

### Recommandations
- En production, définir `ALLOWED_ORIGINS` avec les domaines réels du front.
- Vérifier que `trust proxy` est cohérent avec l’infrastructure (déjà à 1 en production).

---

## 5. Webhooks (paiement)

### En place
- Route PaymeTrust : pas d’auth (webhook appelé par le provider) ; lecture de `external_id` puis mise à jour de `payment_links` et éventuellement `orders` ; requêtes paramétrées.

### Recommandations
- **Signature de webhook** : si PaymeTrust / PaymentsTrust fournit une signature (header type `X-Signature` ou similaire), l’implémenter (ex. HMAC-SHA256 avec un secret partagé) et rejeter les requêtes dont la signature est invalide.
- Consulter la doc officielle du provider pour les bonnes pratiques webhook.

---

## 6. Frontend

### En place
- Pas d’utilisation de `dangerouslySetInnerHTML` avec du contenu utilisateur non contrôlé repéré dans la recherche.
- Champs mots de passe en `type="password"`.
- Token stocké dans `localStorage` ; envoi via header `Authorization` (standard).

### Recommandations
- Éviter d’afficher du HTML utilisateur sans échappement ou sanitization côté client.
- Pour des contenus riches (ex. messages, descriptions), privilégier des composants qui échappent ou une librairie (DOMPurify, etc.) si affichage HTML nécessaire.

---

## 7. Dépendances

### Recommandations
- Lancer régulièrement `npm audit` (backend et frontend) et traiter les vulnérabilités critiques/high.
- Tenir à jour les dépendances (notamment express, jwt, bcrypt, pg, react, vite).

---

## 8. Checklist rapide

| Domaine              | Statut |
|----------------------|--------|
| JWT secret unifié    | OK (corrigé) |
| Auth sur routes sensibles | OK |
| Isolation user_id   | OK |
| Requêtes paramétrées | OK |
| Validation (Zod)     | OK sur routes clés |
| Pas de secrets en log/réponse | OK |
| CORS / rate limit / Helmet | OK (prod) |
| Webhook signature   | À ajouter si fournie par le provider |
| Chiffrement credentials DB | Recommandé |

---

*Dernière revue : février 2025.*
