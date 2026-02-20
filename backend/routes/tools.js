import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, createToolSchema } from '../middleware/security.js';
import { getPlan } from '../config/plans.js';
import { whatsappManager } from '../services/whatsapp.js';

const router = Router();

const TOOL_TYPES = ['whatsapp', 'outlook'];

function getLimitKeyForType(type) {
    return `${type}_accounts`;
}

async function checkToolLimit(userId, type) {
    const user = await db.get('SELECT plan FROM users WHERE id = ?', userId);
    const plan = await getPlan(user?.plan || 'free');
    const limitKey = getLimitKeyForType(type);
    const limit = plan?.limits?.[limitKey];

    if (limit === undefined || limit === -1) {
        return { allowed: true, limit: limit ?? -1, current: 0 };
    }

    const row = await db.get('SELECT COUNT(*) as count FROM tools WHERE user_id = ? AND type = ?', userId, type);
    const current = row?.count ?? 0;

    return {
        allowed: current < limit,
        limit,
        current,
        remaining: Math.max(0, limit - current)
    };
}

// List tools for a user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tools = await db.all(`
            SELECT id, user_id, type, label, status, config, meta, created_at, updated_at
            FROM tools
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, req.user.id);

        const counts = await db.all(`
            SELECT type, COUNT(*) as count
            FROM tools
            WHERE user_id = ?
            GROUP BY type
        `, req.user.id);

        const countsByType = counts.reduce((acc, row) => {
            acc[row.type] = Number(row.count);
            return acc;
        }, {});

        const user = await db.get('SELECT plan FROM users WHERE id = ?', req.user.id);
        const plan = await getPlan(user?.plan || 'free');

        res.json({
            tools: tools.map(t => ({
                ...t,
                config: t.config ? JSON.parse(t.config) : {},
                meta: t.meta ? JSON.parse(t.meta) : {}
            })),
            usage: countsByType,
            limits: plan?.limits || {}
        });
    } catch (error) {
        console.error('Get tools error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create a tool
router.post('/', authenticateToken, validate(createToolSchema), async (req, res) => {
    try {
        const { type, label } = req.body || {};
        if (!TOOL_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Type d’outil invalide' });
        }

        const limitCheck = await checkToolLimit(req.user.id, type);
        if (!limitCheck.allowed) {
            const limit = limitCheck.limit;
            const typeLabel = type === 'whatsapp' ? 'WhatsApp' : type === 'outlook' ? 'Outlook' : type;
            const errMsg = limit === 0
                ? 'Aucun compte ' + typeLabel + ' inclus dans votre plan. Passez à un plan supérieur.'
                : 'Limite d\'outils ' + type + ' atteinte (' + limitCheck.current + '/' + limit + ').';
            return res.status(403).json({
                error: errMsg,
                code: `${type.toUpperCase()}_LIMIT_REACHED`,
                limit: limitCheck.limit,
                current: limitCheck.current
            });
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO tools (id, user_id, type, label, status, config, meta)
            VALUES (?, ?, ?, ?, 'disconnected', ?, ?)
        `, id, req.user.id, type, label || null, JSON.stringify({}), JSON.stringify({}));

        const tool = await db.get('SELECT * FROM tools WHERE id = ?', id);
        res.json({
            tool: {
                ...tool,
                config: tool.config ? JSON.parse(tool.config) : {},
                meta: tool.meta ? JSON.parse(tool.meta) : {}
            }
        });
    } catch (error) {
        console.error('Create tool error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get a tool
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!tool) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }
        res.json({
            tool: {
                ...tool,
                config: tool.config ? JSON.parse(tool.config) : {},
                meta: tool.meta ? JSON.parse(tool.meta) : {}
            }
        });
    } catch (error) {
        console.error('Get tool error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a tool (label/config/meta)
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!tool) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        const { label, config, meta, status } = req.body || {};
        const nextLabel = label !== undefined ? label : tool.label;
        const nextConfig = config !== undefined ? JSON.stringify(config) : tool.config;
        const nextMeta = meta !== undefined ? JSON.stringify(meta) : tool.meta;
        const nextStatus = status !== undefined ? status : tool.status;

        await db.run(`
            UPDATE tools
            SET label = ?, config = ?, meta = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, nextLabel, nextConfig, nextMeta, nextStatus, tool.id);

        const updated = await db.get('SELECT * FROM tools WHERE id = ?', tool.id);
        res.json({
            tool: {
                ...updated,
                config: updated.config ? JSON.parse(updated.config) : {},
                meta: updated.meta ? JSON.parse(updated.meta) : {}
            }
        });
    } catch (error) {
        console.error('Update tool error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a tool
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!tool) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        if (tool.type === 'whatsapp') {
            try {
                await whatsappManager.disconnect(tool.id, true);
            } catch (err) {
                console.warn('WhatsApp disconnect warning:', err.message);
            }
        }

        await db.run('UPDATE agents SET tool_id = NULL WHERE tool_id = ?', tool.id);
        await db.run('DELETE FROM tools WHERE id = ?', tool.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete tool error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export { checkToolLimit };
export default router;
