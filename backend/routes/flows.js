import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Flow node types for visual chatbot builder
const NODE_TYPES = {
    start: { name: 'Démarrage', color: 'green', icon: 'play' },
    message: { name: 'Message', color: 'blue', icon: 'message' },
    question: { name: 'Question', color: 'purple', icon: 'help' },
    condition: { name: 'Condition', color: 'orange', icon: 'git-branch' },
    action: { name: 'Action', color: 'red', icon: 'zap' },
    delay: { name: 'Délai', color: 'gray', icon: 'clock' },
    end: { name: 'Fin', color: 'black', icon: 'stop' }
};

// Get node types
router.get('/node-types', authenticateToken, (req, res) => {
    res.json({ nodeTypes: NODE_TYPES });
});

// Get flow config/templates
router.get('/config/templates', authenticateToken, (req, res) => {
    const templates = [
        {
            id: 'welcome',
            name: 'Accueil',
            description: 'Flow de bienvenue standard',
            nodes: [
                { id: '1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Démarrage' } },
                { id: '2', type: 'message', position: { x: 250, y: 150 }, data: { label: 'Message de bienvenue', content: 'Bonjour ! Comment puis-je vous aider ?' } },
                { id: '3', type: 'question', position: { x: 250, y: 250 }, data: { label: 'Choix', options: ['Produits', 'Support', 'Autre'] } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' }
            ]
        },
        {
            id: 'support',
            name: 'Support client',
            description: 'Flow pour le support technique',
            nodes: [
                { id: '1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Démarrage' } },
                { id: '2', type: 'question', position: { x: 250, y: 150 }, data: { label: 'Type de problème', options: ['Technique', 'Facturation', 'Livraison'] } },
                { id: '3', type: 'condition', position: { x: 250, y: 250 }, data: { label: 'Vérifier urgence' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' }
            ]
        },
        {
            id: 'sales',
            name: 'Vente',
            description: 'Flow pour la prise de commande',
            nodes: [
                { id: '1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Démarrage' } },
                { id: '2', type: 'message', position: { x: 250, y: 150 }, data: { label: 'Catalogue', content: 'Voici nos produits disponibles :' } },
                { id: '3', type: 'question', position: { x: 250, y: 250 }, data: { label: 'Choix produit' } },
                { id: '4', type: 'action', position: { x: 250, y: 350 }, data: { label: 'Créer commande' } }
            ],
            edges: [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-4', source: '3', target: '4' }
            ]
        }
    ];
    
    res.json({ templates, nodeTypes: NODE_TYPES });
});

// Get all flows for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const flows = await db.all(`
            SELECT f.*, a.name as agent_name
            FROM chatbot_flows f
            LEFT JOIN agents a ON f.agent_id = a.id
            WHERE f.user_id = ?
            ORDER BY f.updated_at DESC
        `, req.user.id);

        flows.forEach(f => {
            try {
                f.nodes = JSON.parse(f.nodes || '[]');
                f.edges = JSON.parse(f.edges || '[]');
                f.trigger_keywords = f.trigger_keywords ? f.trigger_keywords.split(',') : [];
            } catch (e) {
                f.nodes = [];
                f.edges = [];
                f.trigger_keywords = [];
            }
        });

        res.json({ flows });
    } catch (error) {
        console.error('Get flows error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get flow by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const flow = await db.get(`
            SELECT f.*, a.name as agent_name
            FROM chatbot_flows f
            LEFT JOIN agents a ON f.agent_id = a.id
            WHERE f.id = ? AND f.user_id = ?
        `, req.params.id, req.user.id);

        if (!flow) {
            return res.status(404).json({ error: 'Flow non trouvé' });
        }

        try {
            flow.nodes = JSON.parse(flow.nodes || '[]');
            flow.edges = JSON.parse(flow.edges || '[]');
            flow.trigger_keywords = flow.trigger_keywords ? flow.trigger_keywords.split(',') : [];
        } catch (e) {
            flow.nodes = [];
            flow.edges = [];
            flow.trigger_keywords = [];
        }

        res.json({ flow });
    } catch (error) {
        console.error('Get flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create flow
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, agent_id, nodes = [], edges = [], trigger_keywords = [] } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Nom requis' });
        }

        const id = uuidv4();
        const initialNodes = nodes.length > 0 ? nodes : [{
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Démarrage' }
        }];

        await db.run(`
            INSERT INTO chatbot_flows (id, user_id, agent_id, name, description, nodes, edges, trigger_keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            id,
            req.user.id,
            agent_id || null,
            name.trim(),
            description?.trim() || null,
            JSON.stringify(initialNodes),
            JSON.stringify(edges),
            trigger_keywords.join(',')
        );

        const flow = await db.get('SELECT * FROM chatbot_flows WHERE id = ?', id);
        flow.nodes = initialNodes;
        flow.edges = edges;
        flow.trigger_keywords = trigger_keywords;

        res.status(201).json({ flow });
    } catch (error) {
        console.error('Create flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update flow
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, agent_id, nodes, edges, trigger_keywords, is_active } = req.body;

        const existing = await db.get('SELECT * FROM chatbot_flows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Flow non trouvé' });
        }

        await db.run(`
            UPDATE chatbot_flows 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                agent_id = COALESCE(?, agent_id),
                nodes = COALESCE(?, nodes),
                edges = COALESCE(?, edges),
                trigger_keywords = COALESCE(?, trigger_keywords),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
            name?.trim(),
            description?.trim(),
            agent_id,
            nodes ? JSON.stringify(nodes) : null,
            edges ? JSON.stringify(edges) : null,
            trigger_keywords ? trigger_keywords.join(',') : null,
            is_active,
            req.params.id
        );

        const flow = await db.get('SELECT * FROM chatbot_flows WHERE id = ?', req.params.id);
        try {
            flow.nodes = JSON.parse(flow.nodes);
            flow.edges = JSON.parse(flow.edges);
            flow.trigger_keywords = flow.trigger_keywords ? flow.trigger_keywords.split(',') : [];
        } catch (e) {}

        res.json({ flow });
    } catch (error) {
        console.error('Update flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle flow active state
router.post('/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM chatbot_flows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Flow non trouvé' });
        }

        const newState = existing.is_active ? 0 : 1;
        await db.run('UPDATE chatbot_flows SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', newState, req.params.id);

        res.json({ is_active: newState === 1, message: newState ? 'Flow activé' : 'Flow désactivé' });
    } catch (error) {
        console.error('Toggle flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete flow
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM chatbot_flows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Flow non trouvé' });
        }

        await db.run('DELETE FROM chatbot_flows WHERE id = ?', req.params.id);
        res.json({ message: 'Flow supprimé' });
    } catch (error) {
        console.error('Delete flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Duplicate flow
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM chatbot_flows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Flow non trouvé' });
        }

        const newId = uuidv4();
        await db.run(`
            INSERT INTO chatbot_flows (id, user_id, agent_id, name, description, nodes, edges, trigger_keywords, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
            newId,
            req.user.id,
            existing.agent_id,
            `${existing.name} (copie)`,
            existing.description,
            existing.nodes,
            existing.edges,
            existing.trigger_keywords
        );

        const flow = await db.get('SELECT * FROM chatbot_flows WHERE id = ?', newId);
        try {
            flow.nodes = JSON.parse(flow.nodes);
            flow.edges = JSON.parse(flow.edges);
            flow.trigger_keywords = flow.trigger_keywords ? flow.trigger_keywords.split(',') : [];
        } catch (e) {}

        res.status(201).json({ flow });
    } catch (error) {
        console.error('Duplicate flow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
