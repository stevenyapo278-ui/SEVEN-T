
Voici l’état actuel :

**Ce qui est en place**
- **Service PaymeTrust** (`backend/services/paymetrust.js`) : création d’invoice et récupération de l’URL de paiement (HPP).
- **Intégration dans les paiements** : si on appelle `createPaymentLink` avec `provider: 'paymetrust'` et que PaymeTrust est configuré, le lien créé est bien l’URL PaymeTrust.

**Ce qui fait que ce n’est pas “fonctionnel” pour toi aujourd’hui**

1. **Page Commandes** : le bouton « Envoyer lien de paiement » envoie toujours `provider: 'manual'`, donc le lien reste un lien “manuel” (page interne), jamais PaymeTrust.
2. **Configuration** : il faut avoir dans ton `.env` :
   - `PAYMETRUST_ACCOUNT_ID`
   - `PAYMETRUST_API_KEY`
   - (optionnel) `PAYMETRUST_BASE_URL` si tu n’utilises pas l’URL par défaut.
   Ces variables ne sont pas documentées dans `.env.example` pour l’instant.
3. **Webhook** : l’URL de callback est bien passée à PaymeTrust, mais il n’existe pas encore de route `POST /api/payments/webhook/paymetrust` pour recevoir la notification et passer le paiement en « payé » automatiquement. Aujourd’hui il faudrait le faire à la main (ex. « Confirmer » côté app).

En résumé : **PaymeTrust est branché dans le code (création de lien)** mais n’est pas utilisé depuis la page Commandes (à cause de `provider: 'manual'`) et la mise à jour automatique du statut « payé » n’est pas faite (webhook manquant). Si tu veux, on peut :
- ajouter les variables PaymeTrust dans `.env.example`,
- faire en sorte que, depuis la page Commandes, on utilise PaymeTrust quand il est configuré (en envoyant `provider: 'paymetrust'` dans ce cas),
- et ajouter la route webhook PaymeTrust pour marquer le paiement comme payé automatiquement.