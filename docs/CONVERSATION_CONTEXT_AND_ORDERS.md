# Contexte de conversation et commandes

## Comment le contexte est gardé

### 1. Même conversation = même `conversation_id`

- Chaque fil WhatsApp avec un contact est une **conversation** en base (table `conversations`).
- Tous les messages échangés avec ce contact sont enregistrés avec le même `conversation_id` (table `messages`).
- Tant que tu ne supprimes pas la conversation, **tout l’historique** de ce fil est en base.

### 2. Contexte envoyé à l’IA

- À chaque message entrant, on charge les **20 derniers messages** de cette conversation :
  ```text
  SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20
  ```
- Cette liste `history` est passée au LLM (Gemini/OpenRouter/OpenAI) comme **contexte** (conversation récente).
- Le **message actuel** (celui auquel l’IA doit répondre) est envoyé **explicitement** sous un libellé dédié :
  - **Gemini** : dans le prompt texte, section `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message en priorité):` suivie du message.
  - **OpenAI / OpenRouter** : dernier message `user` avec le préfixe `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message):` puis le texte.
- Ainsi le modèle distingue clairement le **contexte** (historique) du **message réel** à traiter, ce qui améliore les réponses (ex. « je veux passer une commande » dans une conversation où l’iPhone 15 a déjà été mentionné).

### 3. Contexte pour la détection de commande (OrderDetector)

- Pour savoir **quels produits** le client veut, on utilise :
  - le **message actuel** ;
  - les **10 derniers messages** de la conversation (concaténés en `conversationContext`).
- Si le client a dit « iPhone 15 » dans un message précédent et « je confirme » dans le dernier, le produit peut être trouvé via ce contexte.
- Une commande est **créée** seulement si :
  - on détecte une **confirmation explicite** (ex. « je confirme », « je valide », « passer commande ») **ou** des **infos de livraison** ;
  - et qu’on peut associer au moins **un produit** (nom présent dans le message actuel ou dans les 10 derniers messages).
- S’il n’y a pas de confirmation explicite / livraison, ou aucun produit trouvé, aucun ordre n’est créé (log « Purchase intent detected but missing explicit confirmation/delivery info » ou pas de produit matché).

### 4. Mode « prise en main humain » (human takeover)

- Quand l’IA répond avec `need_human: true` ou qu’une règle impose l’escalade, la conversation peut être marquée en **human takeover**.
- Au message suivant, on recharge quand même l’historique et on relance l’IA. Si l’IA répond avec `need_human: false` et qu’on envoie la réponse, on peut **réactiver le mode IA** (désescalade) pour cette conversation.

## Comment on sait que le client veut « passer une commande » (ou une autre)

- On ne stocke pas un état du type « en attente de commande » ou « nouvelle commande ».  
  Chaque message est **réévalué** avec :
  - l’intention (order, greeting, etc.) ;
  - les mots-clés (achat, confirmation, livraison, refus, question) ;
  - le contexte des 10 derniers messages pour les produits.
- Donc :
  - **« Je veux passer une commande »** → intention achat + éventuellement confirmation, mais **création d’ordre** seulement si un **produit** est identifiable (message actuel ou contexte) et (confirmation explicite ou livraison).
  - **« Une autre commande »** : même logique. Si le client dit « je veux une autre commande » puis plus tard « je confirme pour 1 iPhone 15 », le produit est dans le contexte et la commande peut être créée (s’il n’y a pas déjà une commande en attente pour cette conversation).

## Bonne approche côté produit

1. **Garder le même fil** : ne pas supprimer la conversation = le contexte reste en base et est réutilisé (20 messages pour l’IA, 10 pour les produits).
2. **Pour une nouvelle commande dans la même conversation** :
   - Soit le client **reprécise le produit** (« je veux commander l’iPhone 15 » puis « je confirme »), et la détection peut créer l’ordre.
   - Soit il dit seulement « je veux passer une commande » : l’IA peut répondre (grâce à l’historique) et demander « Quel produit souhaitez-vous ? » ; au message suivant, s’il nomme le produit et confirme, l’ordre peut être créé.
3. **Une seule commande en attente par conversation** : s’il y a déjà une commande `pending` pour ce `conversation_id`, on n’en crée pas une deuxième. Il faut finaliser/annuler la précédente ou gérer côté métier (ex. « nouvelle commande » = clôture de la précédente) si tu veux autoriser plusieurs commandes en parallèle.

## Résumé

| Élément | Où c’est utilisé | Rôle |
|--------|-------------------|------|
| **Historique (20 messages)** | Réponse IA | Contexte complet du fil pour le LLM |
| **Contexte (10 messages)** | OrderDetector | Détecter les produits mentionnés dans le fil |
| **conversation_id** | Partout | Lier tous les messages au même fil |
| **human_takeover** | WhatsApp + décision | Escalade / désescalade sans perdre l’historique |

Le fait d’être « dans la même conversation » et de ne pas supprimer suffit pour que le contexte soit gardé et que le système sache que le client peut vouloir passer une (autre) commande ; la création effective d’ordre dépend des règles ci‑dessus (confirmation/livraison + produit identifiable).
