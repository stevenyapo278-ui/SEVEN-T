import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { adminAnomaliesService } from '../services/adminAnomalies.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { activityLogger } from '../services/activityLogger.js';
import { hasModule, MODULE_TO_USER_COLUMN } from '../config/plans.js';

import { getUserUsageStats } from '../services/usage.js';

const router = Router();

// Get usage statistics vs limits
router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const stats = await getUserUsageStats(req.user.id);
        res.json(stats);
    } catch (error) {
        console.error('Get usage stats route error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Export user data (JSON)
router.get('/me/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db.get(`
            SELECT id, email, name, company, plan, credits, is_admin, is_active,
                   created_at, updated_at, currency, media_model, subscription_status,
                   subscription_end_date, google_id
            FROM users
            WHERE id = ?
        `, userId);

        const agents = await db.all('SELECT * FROM agents WHERE user_id = ?', userId);
        const agentIds = agents.map(agent => agent.id);

        const conversations = await db.all(`
            SELECT c.*
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
        `, userId);
        const conversationIds = conversations.map(conv => conv.id);

        let messages = [];
        if (conversationIds.length > 0) {
            const placeholders = conversationIds.map(() => '?').join(',');
            messages = await db.all(`
                SELECT *
                FROM messages
                WHERE conversation_id IN (${placeholders})
                ORDER BY created_at ASC
            `, ...conversationIds);
        }

        let knowledgeBase = [];
        if (agentIds.length > 0) {
            const placeholders = agentIds.map(() => '?').join(',');
            knowledgeBase = await db.all(`
                SELECT *
                FROM knowledge_base
                WHERE agent_id IN (${placeholders})
            `, ...agentIds);
        }

        const globalKnowledge = await db.all('SELECT * FROM global_knowledge WHERE user_id = ?', userId);

        let agentGlobalKnowledge = [];
        if (agentIds.length > 0) {
            const placeholders = agentIds.map(() => '?').join(',');
            agentGlobalKnowledge = await db.all(`
                SELECT *
                FROM agent_global_knowledge
                WHERE agent_id IN (${placeholders})
            `, ...agentIds);
        }

        const products = await db.all('SELECT * FROM products WHERE user_id = ?', userId);
        const orders = await db.all('SELECT * FROM orders WHERE user_id = ?', userId);
        const orderIds = orders.map(order => order.id);

        let orderItems = [];
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            orderItems = await db.all(`
                SELECT *
                FROM order_items
                WHERE order_id IN (${placeholders})
            `, ...orderIds);
        }

        const leads = await db.all('SELECT * FROM leads WHERE user_id = ?', userId);

        const exportPayload = {
            exported_at: new Date().toISOString(),
            version: 1,
            user,
            agents,
            conversations,
            messages,
            products,
            orders,
            order_items: orderItems,
            leads,
            knowledge_base: knowledgeBase,
            global_knowledge: globalKnowledge,
            agent_global_knowledge: agentGlobalKnowledge
        };

        const filename = `seven-t-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(exportPayload));
    } catch (error) {
        console.error('Export user data error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, created_at, subscription_end_date, payment_module_enabled, analytics_module_enabled, reports_module_enabled, flows_module_enabled FROM users WHERE id = ?', userId);

        
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        
        const { getPlan, getEffectivePlanName } = await import('../config/plans.js');
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        
        return res.json({ user: { ...user, plan: effectivePlan, plan_features } });
    } catch (err) {
        console.error('GET /api/users/me error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { 
            name, company, currency, media_model, notification_number, 
            analytics_module_enabled, flows_module_enabled,
            payment_module_enabled, reports_module_enabled 
        } = req.body;

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (company !== undefined) { updates.push('company = ?'); values.push(company); }
        if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
        if (media_model !== undefined) { updates.push('media_model = ?'); values.push(media_model); }
        if (notification_number !== undefined) { updates.push('notification_number = ?'); values.push(notification_number); }
        if (analytics_module_enabled !== undefined) { updates.push('analytics_module_enabled = ?'); values.push(analytics_module_enabled ? 1 : 0); }
        if (flows_module_enabled !== undefined) { updates.push('flows_module_enabled = ?'); values.push(flows_module_enabled ? 1 : 0); }
        if (payment_module_enabled !== undefined) { updates.push('payment_module_enabled = ?'); values.push(payment_module_enabled ? 1 : 0); }
        if (reports_module_enabled !== undefined) { updates.push('reports_module_enabled = ?'); values.push(reports_module_enabled ? 1 : 0); }


        if (updates.length > 0) {
            values.push(req.user.id);
            await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...values);
        }

        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, created_at, subscription_end_date FROM users WHERE id = ?', req.user.id);
        res.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get current user audit logs
router.get('/me/audit-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const action = req.query.action || '';
        const actionExact = req.query.actionExact || '';
        const entityType = req.query.entityType || '';
        const entityId = req.query.entityId || '';
        const onlyErrors = req.query.onlyErrors === 'true';

        let queryStr = `
            SELECT l.*, u.name as user_name, u.email as user_email
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.user_id = ?
        `;
        const params = [userId];

        if (action) {
            queryStr += ` AND l.action ILIKE ?`;
            params.push(`%${action}%`);
        }
        if (actionExact) {
            queryStr += ` AND l.action = ?`;
            params.push(actionExact);
        }
        if (entityType) {
            queryStr += ` AND l.entity_type = ?`;
            params.push(entityType);
        }
        if (entityId) {
            queryStr += ` AND l.entity_id = ?`;
            params.push(entityId);
        }
        if (onlyErrors) {
            queryStr += ` AND (l.action LIKE '%failed%' OR l.action LIKE '%error%' OR l.action LIKE '%brute_force%')`;
        }

        const countParams = [...params];
        let countQuery = `SELECT COUNT(*) as count FROM activity_logs l WHERE l.user_id = ? ${action ? ' AND l.action ILIKE ?' : ''} ${actionExact ? ' AND l.action = ?' : ''} ${entityType ? ' AND l.entity_type = ?' : ''} ${entityId ? ' AND l.entity_id = ?' : ''} ${onlyErrors ? " AND (l.action LIKE '%failed%' OR l.action LIKE '%error%' OR l.action LIKE '%brute_force%')" : ''}`;
        
        const countQueryRes = await db.get(countQuery, ...countParams);
        const total = countQueryRes?.count || 0;

        queryStr += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
        const queryParams = [...params, limit, offset];

        const logs = await db.all(queryStr, ...queryParams);

        res.json({
            logs,
            total: parseInt(total)
        });
    } catch (error) {
        console.error('Get user audit logs error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get current user anomalies (system logs/alerts)
router.get('/me/anomalies', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { resolved, severity, type, q, limit = 100, offset = 0 } = req.query;

        const anomalies = await adminAnomaliesService.getAll({
            userId,
            resolved: resolved === 'true',
            resolvedMode: resolved === 'only' ? 'only' : (resolved === 'true' ? 'all' : 'open'),
            severity: severity || null,
            type: type || null,
            q: q || null,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const stats = await adminAnomaliesService.getStats(userId);

        res.json({ anomalies, stats });
    } catch (error) {
        console.error('Get user anomalies error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Resolve single anomaly for current user
router.post('/me/anomalies/:id/resolve', authenticateToken, async (req, res) => {
    try {
        const success = await adminAnomaliesService.resolve(req.params.id, req.user.id, req.user.id);
        if (success) {
            res.json({ success: true, message: 'Anomalie résolue' });
        } else {
            res.status(404).json({ error: 'Anomalie non trouvée ou accès refusé' });
        }
    } catch (error) {
        console.error('Resolve anomaly error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Resolve all anomalies of a type for current user
router.post('/me/anomalies/resolve-type/:type', authenticateToken, async (req, res) => {
    try {
        const count = await adminAnomaliesService.resolveByType(req.params.type, req.user.id, req.user.id);
        res.json({
            success: true,
            resolved_count: count,
            message: `${count} anomalie(s) résolue(s)`
        });
    } catch (error) {
        console.error('Resolve by type error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Run health check for current user
router.post('/me/anomalies/health-check', authenticateToken, async (req, res) => {
    try {
        const count = await adminAnomaliesService.runHealthCheck(req.user.id);
        res.json({
            success: true,
            anomalies_found: count,
            message: count === 0 ? 'Aucune anomalie détectée' : `${count} anomalie(s) détectée(s)`
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
 
// ── Team Management ──────────────────────────────────────────

// Get team members (managers)
router.get('/me/team', authenticateToken, async (req, res) => {
    try {
        // Only owners can manage team
        if (req.user.role === 'manager') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const members = await db.all(`
            SELECT id, email, name, role, is_active, created_at, permissions
            FROM users
            WHERE parent_user_id = ?
            ORDER BY created_at DESC
        `, req.user.id);
        res.json({ team: members });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create a manager
router.post('/me/team', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'manager') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const { email, password, name, permissions } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const managerId = uuidv4();
        
        // Owner data for inheritance
        const owner = await db.get('SELECT company, plan, availability_hours_enabled, voice_responses_enabled, payment_module_enabled, reports_module_enabled, analytics_module_enabled, next_best_action_enabled, conversion_score_enabled, daily_briefing_enabled, sentiment_routing_enabled, catalog_import_enabled, human_handoff_alerts_enabled, flows_module_enabled FROM users WHERE id = ?', req.user.id);

        const moduleConfigs = {};
        const allowedModules = ['availability_hours', 'voice_responses', 'payment_module', 'reports', 'analytics', 'next_best_action', 'conversion_score', 'daily_briefing', 'sentiment_routing', 'catalog_import', 'human_handoff_alerts', 'flows'];
        
        for (const mod of allowedModules) {
            const col = MODULE_TO_USER_COLUMN[mod];
            const hasByPlan = await hasModule(owner.plan, mod);
            const hasByOverride = owner[col] === 1;
            const ownerAllowed = hasByPlan || hasByOverride;
            
            // Only enable for manager if owner allowed AND requested in permissions
            moduleConfigs[col] = (ownerAllowed && permissions && permissions.includes(mod)) ? 1 : 0;
        }

        await db.run(`
            INSERT INTO users (
                id, email, password, name, company, plan, parent_user_id, role, permissions, credits,
                availability_hours_enabled, voice_responses_enabled, payment_module_enabled, reports_module_enabled, 
                analytics_module_enabled, next_best_action_enabled, conversion_score_enabled, daily_briefing_enabled, 
                sentiment_routing_enabled, catalog_import_enabled, human_handoff_alerts_enabled, flows_module_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'manager', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, 
            managerId, email.toLowerCase().trim(), hashedPassword, name.trim(), owner.company, owner.plan, req.user.id, JSON.stringify(permissions || []),
            moduleConfigs.availability_hours_enabled, moduleConfigs.voice_responses_enabled, moduleConfigs.payment_module_enabled, moduleConfigs.reports_module_enabled,
            moduleConfigs.analytics_module_enabled, moduleConfigs.next_best_action_enabled, moduleConfigs.conversion_score_enabled, moduleConfigs.daily_briefing_enabled,
            moduleConfigs.sentiment_routing_enabled, moduleConfigs.catalog_import_enabled, moduleConfigs.human_handoff_alerts_enabled, moduleConfigs.flows_module_enabled
        );

        const member = await db.get('SELECT id, email, name, role, created_at FROM users WHERE id = ?', managerId);

        await activityLogger.log({
            userId: req.user.id,
            action: 'create_team_member',
            entityType: 'user',
            entityId: managerId,
            details: { name: name.trim(), email: email.toLowerCase().trim() },
            req
        });

        res.status(201).json({ member });
    } catch (error) {
        console.error('Create manager error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a manager
router.put('/me/team/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'manager') return res.status(403).json({ error: 'Accès refusé' });
        
        const { name, email, password, is_active, permissions } = req.body;
        const managerId = req.params.id;

        // Verify it belongs to this owner
        const member = await db.get('SELECT id FROM users WHERE id = ? AND parent_user_id = ?', managerId, req.user.id);
        if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (email) { updates.push('email = ?'); values.push(email.toLowerCase().trim()); }
        if (password) { 
            const hashedPassword = await bcrypt.hash(password, 12);
            updates.push('password = ?'); 
            values.push(hashedPassword); 
        }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
        
        if (permissions !== undefined) { 
            updates.push('permissions = ?'); 
            values.push(JSON.stringify(permissions)); 
            
            // Sync individual module columns
            const owner = await db.get('SELECT plan, availability_hours_enabled, voice_responses_enabled, payment_module_enabled, reports_module_enabled, analytics_module_enabled, next_best_action_enabled, conversion_score_enabled, daily_briefing_enabled, sentiment_routing_enabled, catalog_import_enabled, human_handoff_alerts_enabled, flows_module_enabled FROM users WHERE id = ?', req.user.id);
            const allowedModules = ['availability_hours', 'voice_responses', 'payment_module', 'reports', 'analytics', 'next_best_action', 'conversion_score', 'daily_briefing', 'sentiment_routing', 'catalog_import', 'human_handoff_alerts', 'flows'];
            
            for (const mod of allowedModules) {
                const col = MODULE_TO_USER_COLUMN[mod];
                const hasByPlan = await hasModule(owner.plan, mod);
                const hasByOverride = owner[col] === 1;
                const ownerAllowed = hasByPlan || hasByOverride;
                
                updates.push(`${col} = ?`);
                values.push((ownerAllowed && permissions.includes(mod)) ? 1 : 0);
            }
        }

        if (updates.length > 0) {
            values.push(managerId);
            await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...values);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update manager error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Bulk delete managers
router.delete('/me/team/bulk/delete', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'manager') return res.status(403).json({ error: 'Accès refusé' });
        
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Liste d\'identifiants requise' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const result = await db.run(`DELETE FROM users WHERE parent_user_id = ? AND id IN (${placeholders})`, req.user.id, ...ids);
        
        res.json({ message: `${ids.length} membre(s) supprimé(s)`, deleted: ids.length });
    } catch (error) {
        console.error('Bulk delete manager error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a manager
router.delete('/me/team/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'manager') return res.status(403).json({ error: 'Accès refusé' });
        
        const managerId = req.params.id;
        const result = await db.run('DELETE FROM users WHERE id = ? AND parent_user_id = ?', managerId, req.user.id);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Membre non trouvé' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete manager error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
