# Plan : Fonctionnalités révolutionnaires SEVEN T (révision)

## Modifications apportées suite à tes précisions

### 1. Paiement à la livraison

- **Précision :** Même en « paiement à la livraison », le lien de paiement peut **toujours** être envoyé si le client n’a pas de liquidité (ex. le livreur arrive, le client n’a pas de cash → envoi du lien PaymeTrust).
- **Implémentation :**
  - Ajouter `payment_method` sur les commandes (`online` | `on_delivery`).
  - Par défaut « à la livraison » pour la Côte d’Ivoire, sans obliger le marchand à envoyer un lien.
  - **Garder systématiquement** le bouton « Envoyer lien de paiement » (PaymeTrust) disponible pour toute commande (pending/validée), y compris quand `payment_method = on_delivery`. Pas de masquage du lien selon le mode de paiement.
  - Optionnel : statut « Livré / Payé » pour tracer les commandes effectivement payées à la réception.

### 2. Réponses vocales (TTS)

- **Précision :** Tu ne veux pas activer les messages vocaux pour l’instant, mais l’implémentation est acceptée **à condition** de permettre l’activation via l’admin : pour **tout le système** ou pour **un utilisateur spécifique**.
- **Implémentation :**
  - Développer le flux TTS (génération audio à partir de la réponse IA + envoi en message vocal WhatsApp) comme prévu.
  - **Contrôle d’activation dans la vue Admin :**
    - **Niveau plateforme :** un paramètre global (ex. dans les paramètres plateforme / config admin) : « Réponses vocales activées pour la plateforme » (on/off). Si off, personne n’a la réponse vocale.
    - **Niveau utilisateur :** un paramètre par utilisateur (ex. dans la fiche utilisateur ou les paramètres utilisateur gérés par l’admin) : « Réponses vocales activées pour cet utilisateur » (on/off). Pour qu’un user ait la réponse vocale, il faut que le flag global soit on **et** le flag user soit on (pour ce user).
  - Côté agent/conversation : n’envoyer une réponse en vocal que si la plateforme et l’utilisateur (propriétaire de l’agent) ont la fonction activée.
  - Par défaut : **désactivé** (global off ou user off) pour ne pas changer le comportement actuel.

---

Le reste du plan (checkout WhatsApp, multi-langue, plusieurs comptes WhatsApp déjà en place, mode agence) reste inchangé par rapport à la version précédente.
