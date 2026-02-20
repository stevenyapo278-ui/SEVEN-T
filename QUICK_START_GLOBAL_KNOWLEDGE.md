# Quick Start: Attribution de Base de Connaissance Globale

## Vue d'ensemble

Votre système permet maintenant d'attribuer sélectivement des éléments de la base de connaissance globale à chaque agent. Cela vous donne un contrôle précis sur les informations que chaque agent utilise.

## Étapes de Démarrage

### 1. Redémarrer le Serveur Backend

```bash
cd backend
# Arrêter le serveur en cours (Ctrl+C)
npm run dev
```

**Pourquoi?** Pour créer la nouvelle table `agent_global_knowledge` dans la base de données.

### 2. (Optionnel) Migrer les Agents Existants

Si vous voulez que vos agents existants conservent l'accès à toutes les connaissances globales (comportement précédent):

```bash
cd backend
node scripts/migrateGlobalKnowledge.js
```

**Sortie attendue**:
```
===========================================
Global Knowledge Migration Script
===========================================

Found 3 agent(s) to migrate

  ✓ Agent abc-123: 5 assignment(s) created
  ✓ Agent def-456: 5 assignment(s) created
  ✓ Agent ghi-789: 5 assignment(s) created

===========================================
Migration completed successfully
Total assignments created: 15
===========================================
```

**Si vous ne migrez pas**: Tous les agents auront 0 connaissances globales par défaut (vous devrez les assigner manuellement).

### 3. Tester l'Interface

1. **Ouvrez votre application**: `http://localhost:5173/dashboard/agents`

2. **Sélectionnez un agent** et cliquez dessus

3. **Allez dans l'onglet "Connaissances"**

4. **Vous devriez voir une nouvelle section**:
   ```
   ┌────────────────────────────────────────────────┐
   │ 🌐 Base de connaissance globale                │
   │ X élément(s) de la base globale attribué(s)    │
   │                                  [Gérer] ←─────┤
   └────────────────────────────────────────────────┘
   ```

5. **Cliquez sur "Gérer"**: Un modal s'ouvre avec tous vos éléments de connaissance globale

6. **Cochez/décochez** les éléments que vous voulez attribuer

7. **Cliquez "Sauvegarder"**

8. **Vérification**: Le compteur dans la section doit se mettre à jour

### 4. Tester avec WhatsApp

1. **Envoyez un message** à votre agent via WhatsApp

2. **Vérifiez** que l'agent utilise uniquement les connaissances assignées

3. **Exemple**:
   - Si vous avez assigné "Politique de retour" et "Horaires"
   - L'agent pourra répondre sur ces sujets
   - Mais pas sur d'autres connaissances globales non assignées

## Scénarios d'Utilisation

### Scénario 1: Agents Spécialisés

```
Agent "Ventes" → Connaissances assignées:
  ✓ Catalogue produits
  ✓ Promotions en cours
  ✓ Conditions de paiement
  
Agent "Support" → Connaissances assignées:
  ✓ FAQ
  ✓ Politique de retour
  ✓ Guide de dépannage
```

### Scénario 2: Agents Multi-marques

```
Agent "Nike Store" → Connaissances assignées:
  ✓ Produits Nike uniquement
  ✓ Histoire de la marque Nike
  
Agent "Adidas Store" → Connaissances assignées:
  ✓ Produits Adidas uniquement
  ✓ Histoire de la marque Adidas
```

## Fonctionnalités de l'Interface

### Section Base de Connaissance Globale
- Gradient violet/bleu pour la distinguer
- Icône Globe (🌐)
- Compteur en temps réel
- Bouton "Gérer" pour ouvrir le modal

### Modal de Sélection
- **Header**: Titre + description + bouton fermer
- **Liste scrollable**: Tous les éléments disponibles
- **Chaque élément affiche**:
  - Checkbox (coche violette si sélectionné)
  - Icône selon le type (PDF, YouTube, Website, Texte)
  - Titre
  - Badge de type
  - Nombre de caractères
  - Aperçu du contenu (2 lignes)
- **Footer**: 
  - Compteur de sélection
  - Boutons Annuler / Sauvegarder

### Interactions
- Cliquer n'importe où sur une carte → Toggle la sélection
- Bordure violette + fond teinté pour les éléments sélectionnés
- Animations fluides
- Toast de confirmation après sauvegarde

## Vérification de l'Installation

### 1. Vérifier la Table

```bash
sqlite3 backend/database/dev.db "SELECT * FROM agent_global_knowledge LIMIT 5;"
```

### 2. Vérifier les Indexes

```bash
sqlite3 backend/database/dev.db ".indexes agent_global_knowledge"
```

Devrait afficher:
```
idx_agent_global_knowledge_agent
idx_agent_global_knowledge_global
```

### 3. Tester l'API

```bash
# Remplacer AGENT_ID et TOKEN par vos vraies valeurs
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/agents/AGENT_ID/global-knowledge
```

Devrait retourner:
```json
{"assignedIds": []}
```

## Résolution de Problèmes

### Problème 1: Table n'existe pas
**Symptôme**: Erreur "no such table: agent_global_knowledge"

**Solution**:
1. Arrêter le serveur backend
2. Vérifier que `backend/database/init.js` contient la nouvelle table
3. Redémarrer le serveur (la table sera créée automatiquement)

### Problème 2: Modal ne s'ouvre pas
**Symptôme**: Clic sur "Gérer" ne fait rien

**Solution**:
1. Ouvrir la console du navigateur (F12)
2. Vérifier les erreurs JavaScript
3. Vérifier que le frontend a été rechargé (Ctrl+R)

### Problème 3: Sauvegarde échoue
**Symptôme**: Toast d'erreur après clic sur "Sauvegarder"

**Solution**:
1. Vérifier les logs du serveur backend
2. Vérifier que les IDs de connaissances existent
3. Vérifier l'authentification (token valide)

### Problème 4: Agent ne voit pas les connaissances
**Symptôme**: Agent ne répond pas avec les connaissances assignées

**Solution**:
1. Vérifier que l'agent a bien des connaissances assignées (compteur > 0)
2. Redémarrer le serveur backend pour recharger les données
3. Envoyer un nouveau message (les anciennes conversations gardent l'ancien contexte)

## Commandes Utiles

### Voir toutes les assignations d'un agent
```sql
SELECT 
    a.name as agent_name,
    gk.title as knowledge_title,
    gk.type
FROM agent_global_knowledge agk
JOIN agents a ON agk.agent_id = a.id
JOIN global_knowledge gk ON agk.global_knowledge_id = gk.id
WHERE agk.agent_id = 'AGENT_ID';
```

### Compter les assignations par agent
```sql
SELECT 
    a.name,
    COUNT(agk.global_knowledge_id) as assigned_count
FROM agents a
LEFT JOIN agent_global_knowledge agk ON a.id = agk.agent_id
GROUP BY a.id;
```

### Supprimer toutes les assignations d'un agent
```sql
DELETE FROM agent_global_knowledge WHERE agent_id = 'AGENT_ID';
```

### Assigner toute la base globale à un agent
```sql
INSERT INTO agent_global_knowledge (agent_id, global_knowledge_id)
SELECT 'AGENT_ID', id FROM global_knowledge WHERE user_id = 'USER_ID';
```

## Support

Pour toute question ou problème:
1. Consulter `AGENT_GLOBAL_KNOWLEDGE_IMPLEMENTATION.md` pour les détails techniques
2. Vérifier les logs du serveur backend
3. Vérifier la console du navigateur
4. Vérifier que la table existe dans la base de données

---

**Prêt à utiliser!** 🚀

Votre système est maintenant configuré pour l'attribution sélective de connaissances globales aux agents.
