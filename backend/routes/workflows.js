import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { workflowExecutor } from '../services/workflowExecutor.js';

const router = Router();

// Workflow trigger types
const TRIGGER_TYPES = {
    new_message: { name: 'Nouveau message', description: 'Déclenché à chaque nouveau message entrant' },
    no_response: { name: 'Pas de réponse', description: 'Déclenché si pas de réponse après X minutes' },
    keyword: { name: 'Mot-clé détecté', description: 'Déclenché quand un mot-clé est mentionné' },
    new_conversation: { name: 'Nouvelle conversation', description: 'Déclenché pour chaque nouvelle conversation' },
    order_created: { name: 'Commande créée', description: 'Déclenché quand une commande est détectée' },
    order_validated: { name: 'Commande validée', description: 'Déclenché quand une commande est validée' },
    lead_detected: { name: 'Lead détecté', description: 'Déclenché quand un lead est identifié' },
    scheduled: { name: 'Programmé', description: 'Déclenché à une heure spécifique' }
};

// Action types
const ACTION_TYPES = {
    send_message: { name: 'Envoyer un message', description: 'Envoie un message WhatsApp' },
    add_tag: { name: 'Ajouter un tag', description: 'Ajoute un tag à la conversation' },
    assign_human: { name: 'Assigner à un humain', description: 'Active le mode takeover humain' },
    create_lead: { name: 'Créer un lead', description: 'Crée un lead à partir de la conversation' },
    send_notification: { name: 'Notification', description: 'Envoie une notification admin' },
    wait: { name: 'Attendre', description: 'Pause avant la prochaine action' }
};

// Role options for workflow contacts
const CONTACT_ROLES = {
    livreur: 'Livreur',
    gerant_magasin: 'Gérant magasin',
    admin: 'Admin',
    support: 'Support',
    autre: 'Autre'
};

// Get trigger and action types
router.get('/types', authenticateToken, (req, res) => {
    res.json({ triggerTypes: TRIGGER_TYPES, actionTypes: ACTION_TYPES, contactRoles: CONTACT_ROLES });
});

// ========== Workflow contacts (for "send message" etc.) ==========
// List contacts (must be before GET /:id)
router.get('/contacts', authenticateToken, async (req, res) => {
    try {
        const contacts = await db.all(`
            SELECT * FROM workflow_contacts WHERE user_id = ? ORDER BY name ASC
        `, req.user.id);
        res.json({ contacts });
    } catch (error) {
        console.error('Get workflow contacts error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create contact
router.post('/contacts', authenticateToken, async (req, res) => {
    try {
        const { name, phone_number, role, notes } = req.body;
        if (!name?.trim() || !phone_number?.trim() || !role?.trim()) {
            return res.status(400).json({ error: 'Nom, numéro et rôle requis' });
        }
        const id = uuidv4();
        await db.run(`
            INSERT INTO workflow_contacts (id, user_id, name, phone_number, role, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, id, req.user.id, name.trim(), phone_number.trim(), role.trim(), notes?.trim() || null);
        const contact = await db.get('SELECT * FROM workflow_contacts WHERE id = ?', id);
        res.status(201).json({ contact });
    } catch (error) {
        console.error('Create workflow contact error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update contact
router.put('/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM workflow_contacts WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact non trouvé' });
        }
        const { name, phone_number, role, notes } = req.body;
        await db.run(`
            UPDATE workflow_contacts
            SET name = COALESCE(?, name),
                phone_number = COALESCE(?, phone_number),
                role = COALESCE(?, role),
                notes = ?
            WHERE id = ?
        `,
            name?.trim(),
            phone_number?.trim(),
            role?.trim(),
            notes !== undefined ? (notes?.trim() || null) : existing.notes,
            req.params.id
        );
        const contact = await db.get('SELECT * FROM workflow_contacts WHERE id = ?', req.params.id);
        res.json({ contact });
    } catch (error) {
        console.error('Update workflow contact error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete contact
router.delete('/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM workflow_contacts WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Contact non trouvé' });
        }
        await db.run('DELETE FROM workflow_contacts WHERE id = ?', req.params.id);
        res.json({ message: 'Contact supprimé' });
    } catch (error) {
        console.error('Delete workflow contact error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all workflows for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const workflows = await db.all(`
            SELECT w.*, a.name as agent_name
            FROM workflows w
            LEFT JOIN agents a ON w.agent_id = a.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `, req.user.id);

        // Parse JSON fields
        workflows.forEach(w => {
            try {
                w.trigger_config = w.trigger_config ? JSON.parse(w.trigger_config) : {};
                w.actions = w.actions ? JSON.parse(w.actions) : [];
            } catch (e) {
                w.trigger_config = {};
                w.actions = [];
            }
        });

        res.json({ workflows });
    } catch (error) {
        console.error('Get workflows error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get workflow logs (all, with optional filter)
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const workflowId = req.query.workflow_id || null;

        const baseWhere = 'WHERE w.user_id = ?';
        const where = workflowId ? `${baseWhere} AND wl.workflow_id = ?` : baseWhere;
        const params = workflowId ? [req.user.id, workflowId, limit, offset] : [req.user.id, limit, offset];
        const totalParams = workflowId ? [req.user.id, workflowId] : [req.user.id];

        const logs = await db.all(`
            SELECT wl.*, w.name as workflow_name, w.trigger_type, w.agent_id, a.name as agent_name
            FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            LEFT JOIN agents a ON w.agent_id = a.id
            ${where}
            ORDER BY wl.executed_at DESC
            LIMIT ? OFFSET ?
        `, ...params);

        const totalRow = await db.get(`
            SELECT COUNT(*) as count
            FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            ${where}
        `, ...totalParams);
        const total = totalRow?.count ?? 0;

        logs.forEach(log => {
            try {
                log.trigger_data = log.trigger_data ? JSON.parse(log.trigger_data) : {};
                log.result = log.result ? JSON.parse(log.result) : {};
            } catch (e) {}
        });

        res.json({ logs, total, limit, offset });
    } catch (error) {
        console.error('Get workflow logs error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete all workflow execution logs for the current user
router.delete('/logs', authenticateToken, async (req, res) => {
    try {
        const result = await db.run(`
            DELETE FROM workflow_logs
            WHERE workflow_id IN (SELECT id FROM workflows WHERE user_id = ?)
        `, req.user.id);
        const deleted = result?.rowCount ?? 0;
        res.json({ message: 'Historique d\'exécution supprimé', deleted });
    } catch (error) {
        console.error('Delete workflow logs error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Retry a failed workflow execution
router.post('/logs/:logId/retry', authenticateToken, async (req, res) => {
    try {
        const { logId } = req.params;
        const log = await db.get(`
            SELECT wl.*, w.name as workflow_name, w.trigger_type, w.agent_id, w.actions, w.trigger_config, w.user_id
            FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            WHERE wl.id = ? AND w.user_id = ?
        `, logId, req.user.id);

        if (!log) {
            return res.status(404).json({ error: 'Exécution introuvable' });
        }

        if (log.success === 1) {
            return res.status(400).json({ error: 'Cette exécution a réussi, aucune relance nécessaire' });
        }

        const workflow = await db.get('SELECT * FROM workflows WHERE id = ? AND user_id = ?', log.workflow_id, req.user.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow introuvable' });
        }

        try {
            workflow.trigger_config = workflow.trigger_config ? JSON.parse(workflow.trigger_config) : {};
            workflow.actions = workflow.actions ? JSON.parse(workflow.actions) : [];
        } catch (e) {
            workflow.trigger_config = {};
            workflow.actions = [];
        }

        const triggerData = log.trigger_data ? (typeof log.trigger_data === 'string' ? JSON.parse(log.trigger_data) : log.trigger_data) : {};

        const result = await workflowExecutor.executeWorkflow(workflow, triggerData);

        res.json({
            message: 'Workflow relancé avec succès',
            result
        });
    } catch (error) {
        console.error('Retry workflow execution error:', error);
        res.status(500).json({
            error: error?.message || 'Erreur lors de la relance',
            details: error?.message
        });
    }
});

// Get workflow by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const workflow = await db.get(`
            SELECT w.*, a.name as agent_name
            FROM workflows w
            LEFT JOIN agents a ON w.agent_id = a.id
            WHERE w.id = ? AND w.user_id = ?
        `, req.params.id, req.user.id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow non trouvé' });
        }

        try {
            workflow.trigger_config = workflow.trigger_config ? JSON.parse(workflow.trigger_config) : {};
            workflow.actions = workflow.actions ? JSON.parse(workflow.actions) : [];
        } catch (e) {
            workflow.trigger_config = {};
            workflow.actions = [];
        }

        const logs = await db.all(`
            SELECT * FROM workflow_logs 
            WHERE workflow_id = ? 
            ORDER BY executed_at DESC 
            LIMIT 20
        `, req.params.id);

        logs.forEach(log => {
            try {
                log.trigger_data = log.trigger_data ? JSON.parse(log.trigger_data) : {};
                log.result = log.result ? JSON.parse(log.result) : {};
            } catch (e) {}
        });

        res.json({ workflow, logs });
    } catch (error) {
        console.error('Get workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create workflow
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, trigger_type, trigger_config = {}, actions = [], agent_id } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Nom requis' });
        }

        if (!trigger_type || !TRIGGER_TYPES[trigger_type]) {
            return res.status(400).json({ error: 'Type de déclencheur invalide' });
        }

        if (!actions || actions.length === 0) {
            return res.status(400).json({ error: 'Au moins une action requise' });
        }

        for (const action of actions) {
            if (!ACTION_TYPES[action.type]) {
                return res.status(400).json({ error: `Type d'action invalide: ${action.type}` });
            }
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO workflows (id, user_id, agent_id, name, description, trigger_type, trigger_config, actions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            id, 
            req.user.id, 
            agent_id || null, 
            name.trim(), 
            description?.trim() || null,
            trigger_type,
            JSON.stringify(trigger_config),
            JSON.stringify(actions)
        );

        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', id);
        workflow.trigger_config = trigger_config;
        workflow.actions = actions;

        res.status(201).json({ workflow });
    } catch (error) {
        console.error('Create workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update workflow
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, trigger_type, trigger_config, actions, is_active, agent_id } = req.body;

        const existing = await db.get('SELECT * FROM workflows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow non trouvé' });
        }

        await db.run(`
            UPDATE workflows 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                trigger_type = COALESCE(?, trigger_type),
                trigger_config = COALESCE(?, trigger_config),
                actions = COALESCE(?, actions),
                is_active = COALESCE(?, is_active),
                agent_id = COALESCE(?, agent_id)
            WHERE id = ?
        `,
            name?.trim(),
            description?.trim(),
            trigger_type,
            trigger_config ? JSON.stringify(trigger_config) : null,
            actions ? JSON.stringify(actions) : null,
            is_active,
            agent_id,
            req.params.id
        );

        const workflow = await db.get('SELECT * FROM workflows WHERE id = ?', req.params.id);
        try {
            workflow.trigger_config = JSON.parse(workflow.trigger_config);
            workflow.actions = JSON.parse(workflow.actions);
        } catch (e) {}

        res.json({ workflow });
    } catch (error) {
        console.error('Update workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle workflow active state
router.post('/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM workflows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow non trouvé' });
        }

        const newState = existing.is_active ? 0 : 1;
        await db.run('UPDATE workflows SET is_active = ? WHERE id = ?', newState, req.params.id);

        res.json({ is_active: newState === 1, message: newState ? 'Workflow activé' : 'Workflow désactivé' });
    } catch (error) {
        console.error('Toggle workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete workflow
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM workflows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow non trouvé' });
        }

        await db.run('DELETE FROM workflows WHERE id = ?', req.params.id);
        res.json({ message: 'Workflow supprimé' });
    } catch (error) {
        console.error('Delete workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get workflow stats
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const r1 = await db.get('SELECT COUNT(*) as count FROM workflows WHERE user_id = ?', req.user.id);
        const r2 = await db.get('SELECT COUNT(*) as count FROM workflows WHERE user_id = ? AND is_active = 1', req.user.id);
        const r3 = await db.get(`
            SELECT COUNT(*) as count FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            WHERE w.user_id = ?
        `, req.user.id);
        const r4 = await db.get(`
            SELECT COUNT(*) as count FROM workflow_logs wl
            JOIN workflows w ON wl.workflow_id = w.id
            WHERE w.user_id = ? AND wl.executed_at >= ?
        `, req.user.id, sevenDaysAgo.toISOString());
        const stats = {
            total: r1?.count ?? 0,
            active: r2?.count ?? 0,
            totalExecutions: r3?.count ?? 0,
            recentExecutions: r4?.count ?? 0
        };

        res.json({ stats });
    } catch (error) {
        console.error('Get workflow stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Test workflow (dry run)
router.post('/:id/test', authenticateToken, async (req, res) => {
    try {
        const workflow = await db.get('SELECT * FROM workflows WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow non trouvé' });
        }

        const actions = JSON.parse(workflow.actions || '[]');
        const results = [];

        for (const action of actions) {
            results.push({
                type: action.type,
                config: action.config,
                would_execute: ACTION_TYPES[action.type]?.name || action.type,
                simulated: true
            });
        }

        res.json({ 
            workflow_name: workflow.name,
            trigger_type: workflow.trigger_type,
            actions_count: actions.length,
            test_results: results,
            message: 'Test réussi - aucune action exécutée'
        });
    } catch (error) {
        console.error('Test workflow error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
