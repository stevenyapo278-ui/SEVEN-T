import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Template categories (align with frontend dropdown)
const TEMPLATE_CATEGORIES = ['greeting', 'closing', 'info', 'support', 'sales', 'follow-up', 'followup', 'faq', 'general'];

// Get all templates for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { category } = req.query;

        let query = 'SELECT * FROM message_templates WHERE user_id = ? AND is_active = 1';
        const params = [req.user.id];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY usage_count DESC, name ASC';

        const templates = await db.all(query, ...params);

        // Parse variables JSON
        templates.forEach(t => {
            if (t.variables) {
                try {
                    t.variables = JSON.parse(t.variables);
                } catch (e) {
                    t.variables = [];
                }
            } else {
                t.variables = [];
            }
        });

        res.json({ templates });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get template categories
router.get('/categories', authenticateToken, (req, res) => {
    res.json({ categories: TEMPLATE_CATEGORIES });
});

// Create template
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, content, category = 'general', variables = [] } = req.body;

        if (!name?.trim() || !content?.trim()) {
            return res.status(400).json({ error: 'Nom et contenu requis' });
        }

        if (!TEMPLATE_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }

        const extractedVars = content.match(/\{\{([^}]+)\}\}/g) || [];
        const allVariables = [...new Set([...variables, ...extractedVars.map(v => v.replace(/\{\{|\}\}/g, ''))])];

        const shortcut = req.body.shortcut?.trim().replace(/[^a-z0-9]/g, '') || null;
        const id = uuidv4();
        await db.run(`
            INSERT INTO message_templates (id, user_id, name, content, category, variables, shortcut)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, id, req.user.id, name.trim(), content.trim(), category, JSON.stringify(allVariables), shortcut || null);

        const template = await db.get('SELECT * FROM message_templates WHERE id = ?', id);
        template.variables = allVariables;

        res.status(201).json({ template });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, content, category, is_active, shortcut } = req.body;

        const existing = await db.get('SELECT * FROM message_templates WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }

        let variables = existing.variables;
        if (content) {
            const extractedVars = content.match(/\{\{([^}]+)\}\}/g) || [];
            variables = JSON.stringify(extractedVars.map(v => v.replace(/\{\{|\}\}/g, '')));
        }

        const shortcutVal = shortcut !== undefined ? (String(shortcut || '').trim().replace(/[^a-z0-9]/g, '') || null) : existing.shortcut;
        await db.run(`
            UPDATE message_templates 
            SET name = COALESCE(?, name),
                content = COALESCE(?, content),
                category = COALESCE(?, category),
                variables = COALESCE(?, variables),
                is_active = COALESCE(?, is_active),
                shortcut = ?
            WHERE id = ?
        `, name?.trim(), content?.trim(), category, variables, is_active, shortcutVal, req.params.id);

        const template = await db.get('SELECT * FROM message_templates WHERE id = ?', req.params.id);
        try {
            template.variables = JSON.parse(template.variables);
        } catch (e) {
            template.variables = [];
        }

        res.json({ template });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM message_templates WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }

        await db.run('DELETE FROM message_templates WHERE id = ?', req.params.id);
        res.json({ message: 'Template supprimé' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Use template (increment usage count and return filled content)
router.post('/:id/use', authenticateToken, async (req, res) => {
    try {
        const { variables = {} } = req.body;

        const template = await db.get('SELECT * FROM message_templates WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!template) {
            return res.status(404).json({ error: 'Template non trouvé' });
        }

        await db.run('UPDATE message_templates SET usage_count = usage_count + 1 WHERE id = ?', req.params.id);

        // Fill in variables
        let content = template.content;
        Object.entries(variables).forEach(([key, value]) => {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        res.json({ content });
    } catch (error) {
        console.error('Use template error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get popular templates (most used)
router.get('/popular', authenticateToken, async (req, res) => {
    try {
        const templates = await db.all(`
            SELECT * FROM message_templates 
            WHERE user_id = ? AND is_active = 1
            ORDER BY usage_count DESC
            LIMIT 10
        `, req.user.id);

        templates.forEach(t => {
            try {
                t.variables = JSON.parse(t.variables);
            } catch (e) {
                t.variables = [];
            }
        });

        res.json({ templates });
    } catch (error) {
        console.error('Get popular templates error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
