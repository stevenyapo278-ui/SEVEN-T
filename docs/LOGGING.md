# Memo : Logs et santé du système (admin vs production)

## Contexte

Les `console.log` / `console.error` / `console.warn` dans le frontend et le backend peuvent servir à deux usages distincts :

1. **Vue admin / santé du système** : permettre à l’administrateur de suivre l’état de l’application (connexions WhatsApp, erreurs métier, debug).
2. **Production** : en prod, les logs ne doivent pas exposer de données sensibles ni encombrer la console des utilisateurs finaux.

## Recommandations

### Backend

- **En développement** : les logs détaillés (erreurs, étapes critiques, reconnexions WhatsApp) sont utiles. Les garder.
- **En production** :
  - Ne pas logger de corps de requête complets, tokens, mots de passe ou données personnelles.
  - Préférer un niveau de log configurable (ex. `LOG_LEVEL=error` en prod) et un vrai logger (ex. Winston, Pino) qui écrit dans des fichiers ou un service (Sentry, Datadog).
  - Les messages du type « Erreur lors de la récupération des produits » ou « Token invalide » peuvent rester en `console.error` côté serveur si les logs sont centralisés et non exposés au client.

### Frontend

- **Logs « pour l’admin »** : si les logs front sont destinés à aider l’admin à diagnostiquer (ex. dans une page Admin ou un panneau de santé), les garder **uniquement** :
  - dans des pages ou composants réservés aux admins (ex. `/dashboard/admin`), ou
  - derrière un flag du type `VITE_DEBUG_LOGS=true` en dev uniquement.
- **Hors vue admin** : dans le reste de l’app (Produits, Conversations, Login, etc.), éviter les `console.log` / `console.error` en production, car :
  - tout utilisateur peut ouvrir la console du navigateur ;
  - des infos techniques ou des IDs peuvent fuiter.
- **En prod** : avant déploiement, soit supprimer les appels `console.*` hors admin, soit les remplacer par un module qui ne logue qu’en dev ou quand l’utilisateur est admin (ex. `logger.debug(...)` no-op en prod pour les utilisateurs normaux).

### Résumé

| Contexte              | Recommandation                                                                 |
|-----------------------|---------------------------------------------------------------------------------|
| Backend, logs serveur | Garder les logs utiles ; en prod éviter les données sensibles, utiliser niveau + fichier/service. |
| Frontend, vue Admin   | Les logs « santé système » dans la vue admin sont acceptables.                 |
| Frontend, reste de l’app | En prod, retirer ou désactiver les `console.*` pour ne pas exposer d’infos aux utilisateurs. |

Avant mise en production, faire un passage pour : supprimer ou conditionner les logs frontend hors admin, et vérifier que les logs backend ne contiennent pas de secrets.
