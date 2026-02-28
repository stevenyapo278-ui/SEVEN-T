import { Router } from 'express';
import db from '../database/init.js';
import { authenticateAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { whatsappManager } from '../services/whatsapp.js';
import { adminAnomaliesService } from '../services/adminAnomalies.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = join(__dirname, '..', '..', 'sessions');

const router = Router();

// ==================== DASHBOARD STATS ====================

// Get admin dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const r = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM users'),
            db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
            db.get('SELECT COUNT(*) as count FROM agents'),
            db.get('SELECT COUNT(*) as count FROM agents WHERE whatsapp_connected = 1'),
            db.get('SELECT COUNT(*) as count FROM conversations'),
            db.get('SELECT COUNT(*) as count FROM messages'),
            db.get('SELECT SUM(tokens_used) as total FROM messages'),
            db.all(`
                SELECT u.name, u.email, SUM(m.tokens_used) as total_tokens, COUNT(m.id) as message_count
                FROM users u
                JOIN agents a ON u.id = a.user_id
                JOIN conversations c ON a.id = c.agent_id
                JOIN messages m ON c.id = m.conversation_id
                WHERE m.role = 'assistant'
                GROUP BY u.id, u.name, u.email
                ORDER BY total_tokens DESC
                LIMIT 10
            `)
        ]);
        const stats = {
            users: r[0]?.count ?? 0,
            activeUsers: r[1]?.count ?? 0,
            agents: r[2]?.count ?? 0,
            activeAgents: r[3]?.count ?? 0,
            conversations: r[4]?.count ?? 0,
            messages: r[5]?.count ?? 0,
            totalTokens: r[6]?.total ?? 0,
            topTokenUsers: r[7] || []
        };

        const usersByPlan = await db.all(`
            SELECT plan, COUNT(*) as count 
            FROM users 
            GROUP BY plan
        `);

        // Recent signups (last 7 days)
        const recentSignupsRow = await db.get(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        `);
        const recentSignups = recentSignupsRow?.count ?? 0;

        // Messages per day (last 7 days)
        const messagesPerDay = await db.all(`
            SELECT date(created_at) as date, COUNT(*) as count
            FROM messages
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
            GROUP BY date(created_at)
            ORDER BY date ASC
        `);

        res.json({ 
            stats, 
            usersByPlan, 
            recentSignups,
            messagesPerDay
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== USERS MANAGEMENT ====================

// Get all users with stats
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { search, plan, status, sort = 'created_at', order = 'desc', limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT u.*,
                   p.name as parent_name,
                   (SELECT COUNT(*) FROM agents WHERE user_id = u.id) as agents_count,
                   (SELECT COUNT(*) FROM conversations c 
                    JOIN agents a ON c.agent_id = a.id 
                    WHERE a.user_id = u.id) as conversations_count,
                   (SELECT COUNT(*) FROM messages m 
                    JOIN conversations c ON m.conversation_id = c.id 
                    JOIN agents a ON c.agent_id = a.id 
                    WHERE a.user_id = u.id) as messages_count
            FROM users u
            LEFT JOIN users p ON u.parent_user_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (plan) {
            query += ` AND u.plan = ?`;
            params.push(plan);
        }

        if (status === 'active') {
            query += ` AND u.is_active = 1`;
        } else if (status === 'inactive') {
            query += ` AND u.is_active = 0`;
        }

        const allowedSorts = ['created_at', 'name', 'email', 'plan', 'credits'];
        const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        query += ` ORDER BY u.${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const users = await db.all(query, ...params);

        let countQuery = `SELECT COUNT(*) as count FROM users u WHERE 1=1`;
        const countParams = [];

        if (search) {
            countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)`;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        if (plan) {
            countQuery += ` AND u.plan = ?`;
            countParams.push(plan);
        }
        if (status === 'active') {
            countQuery += ` AND u.is_active = 1`;
        } else if (status === 'inactive') {
            countQuery += ` AND u.is_active = 0`;
        }

        const countRow = await db.get(countQuery, ...countParams);
        const total = countRow?.count ?? 0;

        const list = Array.isArray(users) ? users : [];
        const sanitizedUsers = list.map(({ password, ...user }) => user);

        res.json({ 
            users: sanitizedUsers, 
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single user details
router.get('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        let user;
        try {
            user = await db.get(`
                SELECT u.*,
                       p.name as parent_name,
                       (SELECT COUNT(*) FROM agents WHERE user_id = u.id) as agents_count,
                       (SELECT COUNT(*) FROM conversations c 
                        JOIN agents a ON c.agent_id = a.id 
                        WHERE a.user_id = u.id) as conversations_count,
                       (SELECT COUNT(*) FROM messages m 
                        JOIN conversations c ON m.conversation_id = c.id 
                        JOIN agents a ON c.agent_id = a.id 
                        WHERE a.user_id = u.id) as messages_count
                FROM users u
                LEFT JOIN users p ON u.parent_user_id = p.id
                WHERE u.id = ?
            `, req.params.id);
        } catch (queryError) {
            // Fallback when parent_user_id column does not exist (migration not run yet)
            user = await db.get(`
                SELECT u.*,
                       (SELECT COUNT(*) FROM agents WHERE user_id = u.id) as agents_count,
                       (SELECT COUNT(*) FROM conversations c 
                        JOIN agents a ON c.agent_id = a.id 
                        WHERE a.user_id = u.id) as conversations_count,
                       (SELECT COUNT(*) FROM messages m 
                        JOIN conversations c ON m.conversation_id = c.id 
                        JOIN agents a ON c.agent_id = a.id 
                        WHERE a.user_id = u.id) as messages_count
                FROM users u
                WHERE u.id = ?
            `, req.params.id);
            if (user) user.parent_name = null;
        }

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Get user's agents
        const agents = await db.all(`
            SELECT a.*,
                   (SELECT COUNT(*) FROM conversations WHERE agent_id = a.id) as conversations_count
            FROM agents a
            WHERE a.user_id = ?
        `, req.params.id);

        // Remove password
        const { password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword, agents });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update user
router.put('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, email, company, plan, credits, is_admin, is_active, voice_responses_enabled, payment_module_enabled, parent_user_id } = req.body;

        const existing = await db.get('SELECT id, is_admin FROM users WHERE id = ?', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (req.params.id === req.user.id && is_admin === 0) {
            return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' });
        }

        if (is_admin === 0 && existing.is_admin === 1) {
            const adminRow = await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
            const adminCount = adminRow?.count ?? 0;
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Impossible de retirer le dernier administrateur' });
            }
        }

        if (req.params.id === req.user.id && is_active === 0) {
            return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
        }

        // Ne pas autoriser d'assigner un plan désactivé
        if (plan != null && plan !== '') {
            const planActive = db.prepare('SELECT 1 FROM subscription_plans WHERE name = ? AND is_active = 1').get(plan);
            if (!planActive) {
                return res.status(400).json({ error: 'Ce plan n\'est pas actif. Choisissez un plan actif dans la liste.' });
            }
        }

        // Check if email is taken by another user (only when email is provided and different)
        if (email != null && email !== '') {
            const emailTaken = await db.get('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND id != ?', String(email).trim(), req.params.id);
            if (emailTaken) {
                return res.status(400).json({ error: 'Cet email est déjà utilisé' });
            }
        }

        const voiceValue = voice_responses_enabled !== undefined ? (voice_responses_enabled ? 1 : 0) : null;
        const paymentModuleValue = payment_module_enabled !== undefined ? (payment_module_enabled ? 1 : 0) : null;
        const parentId = parent_user_id === '' || parent_user_id === null || parent_user_id === undefined ? null : parent_user_id;
        await db.run(`
            UPDATE users SET 
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                company = COALESCE(?, company),
                plan = COALESCE(?, plan),
                credits = COALESCE(?, credits),
                is_admin = COALESCE(?, is_admin),
                is_active = COALESCE(?, is_active),
                voice_responses_enabled = CASE WHEN ?::integer IS NOT NULL THEN ?::integer ELSE voice_responses_enabled END,
                payment_module_enabled = CASE WHEN ?::integer IS NOT NULL THEN ?::integer ELSE payment_module_enabled END,
                parent_user_id = ?::text,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, name, email, company, plan, credits, is_admin, is_active, voiceValue, voiceValue, paymentModuleValue, paymentModuleValue, parentId ?? null, req.params.id);

        const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
        const { password: _p, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Reset user password
router.post('/users/:id/reset-password', authenticateAdmin, async (req, res) => {
    try {
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.params.id);

        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
});

// Add credits to user
router.post('/users/:id/add-credits', authenticateAdmin, (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount < 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        const existing = db.prepare('SELECT id, credits FROM users WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        db.prepare('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amount, req.params.id);

        const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.params.id);
        res.json({ message: 'Crédits ajoutés', credits: user.credits });
    } catch (error) {
        console.error('Add credits error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de crédits' });
    }
});

// Get deletion preview (what will be deleted)
router.get('/users/:id/deletion-preview', authenticateAdmin, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Get counts of all related data
        const agents = db.prepare('SELECT id, name, whatsapp_connected FROM agents WHERE user_id = ?').all(req.params.id);
        const agentIds = agents.map(a => a.id);
        
        let stats = {
            agents: agents.length,
            connectedAgents: agents.filter(a => a.whatsapp_connected).length,
            conversations: 0,
            messages: 0,
            knowledgeItems: 0,
            templates: 0,
            blacklistEntries: 0
        };

        if (agentIds.length > 0) {
            const placeholders = agentIds.map(() => '?').join(',');
            
            stats.conversations = db.prepare(`
                SELECT COUNT(*) as count FROM conversations WHERE agent_id IN (${placeholders})
            `).get(...agentIds).count;
            
            stats.messages = db.prepare(`
                SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.agent_id IN (${placeholders})
            `).get(...agentIds).count;
            
            stats.knowledgeItems = db.prepare(`
                SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id IN (${placeholders})
            `).get(...agentIds).count;
            
            stats.templates = db.prepare(`
                SELECT COUNT(*) as count FROM templates WHERE agent_id IN (${placeholders})
            `).get(...agentIds).count;
            
            stats.blacklistEntries = db.prepare(`
                SELECT COUNT(*) as count FROM blacklist WHERE agent_id IN (${placeholders})
            `).get(...agentIds).count;
        }

        res.json({ 
            user,
            agents: agents.map(a => ({ id: a.id, name: a.name, connected: a.whatsapp_connected })),
            stats,
            warning: stats.connectedAgents > 0 
                ? `${stats.connectedAgents} agent(s) WhatsApp connecté(s) seront déconnectés` 
                : null
        });
    } catch (error) {
        console.error('Deletion preview error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete user (with full cleanup)
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { soft_delete } = req.query;
        
        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const existing = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Get all agents for this user
        const agents = db.prepare('SELECT id, whatsapp_connected FROM agents WHERE user_id = ?').all(req.params.id);
        
        // Disconnect all WhatsApp sessions and clean up session files
        const cleanupResults = [];
        for (const agent of agents) {
            try {
                // Disconnect WhatsApp if connected
                if (whatsappManager.isConnected(agent.id)) {
                    await whatsappManager.disconnect(agent.id, false);
                    cleanupResults.push({ agentId: agent.id, action: 'disconnected' });
                }
                
                // Remove session files from disk
                const sessionPath = join(sessionsDir, agent.id);
                if (existsSync(sessionPath)) {
                    rmSync(sessionPath, { recursive: true, force: true });
                    cleanupResults.push({ agentId: agent.id, action: 'session_deleted' });
                }
            } catch (err) {
                console.error(`Error cleaning up agent ${agent.id}:`, err);
                cleanupResults.push({ agentId: agent.id, action: 'error', error: err.message });
            }
        }

        // Soft delete: just deactivate the user
        if (soft_delete === 'true') {
            db.prepare(`
                UPDATE users SET 
                    is_active = 0, 
                    email = email || '_deleted_' || ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(Date.now(), req.params.id);
            
            // Also deactivate all their agents
            db.prepare('UPDATE agents SET is_active = 0, whatsapp_connected = 0 WHERE user_id = ?').run(req.params.id);

            res.json({ 
                message: 'Utilisateur désactivé avec succès',
                soft_deleted: true,
                cleanup: cleanupResults
            });
        } else {
            // Hard delete: permanently remove user and all data
            db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

            res.json({ 
                message: 'Utilisateur et toutes ses données supprimés définitivement',
                soft_deleted: false,
                cleanup: cleanupResults,
                deleted: {
                    agents: agents.length,
                    sessions_cleaned: cleanupResults.filter(r => r.action === 'session_deleted').length
                }
            });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Restore soft-deleted user
router.post('/users/:id/restore', authenticateAdmin, (req, res) => {
    try {
        const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Remove the _deleted_ suffix from email
        const originalEmail = user.email.replace(/_deleted_\d+$/, '');
        
        // Check if original email is now taken
        const emailTaken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(originalEmail, req.params.id);
        if (emailTaken) {
            return res.status(400).json({ 
                error: 'L\'email original est maintenant utilisé par un autre compte',
                original_email: originalEmail
            });
        }

        db.prepare(`
            UPDATE users SET 
                is_active = 1,
                email = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(originalEmail, req.params.id);

        // Reactivate agents (but keep WhatsApp disconnected)
        db.prepare('UPDATE agents SET is_active = 1 WHERE user_id = ?').run(req.params.id);

        res.json({ message: 'Utilisateur restauré avec succès', email: originalEmail });
    } catch (error) {
        console.error('Restore user error:', error);
        res.status(500).json({ error: 'Erreur lors de la restauration' });
    }
});

// Create new user (admin)
router.post('/users', authenticateAdmin, async (req, res) => {
    try {
        const { name, email, password, company, plan, credits, is_admin, parent_user_id } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
        }

        const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Ne pas autoriser de créer un utilisateur avec un plan désactivé
        const planToUse = plan || 'free';
        const planActive = db.prepare('SELECT 1 FROM subscription_plans WHERE name = ? AND is_active = 1').get(planToUse);
        if (!planActive) {
            return res.status(400).json({ error: 'Ce plan n\'est pas actif. Choisissez un plan actif dans la liste.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const parentId = parent_user_id === '' || parent_user_id === null || parent_user_id === undefined ? null : parent_user_id;

        await db.run(`
            INSERT INTO users (id, name, email, password, company, plan, credits, is_admin, parent_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, userId, name, email, hashedPassword, company || '', planToUse, credits ?? 100, is_admin || 0, parentId);

        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        const { password: pwd, ...userWithoutPassword } = user;

        res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// ==================== AGENTS MANAGEMENT ====================

// Get all agents
router.get('/agents', authenticateAdmin, (req, res) => {
    try {
        const agents = db.prepare(`
            SELECT a.*, u.name as user_name, u.email as user_email,
                   (SELECT COUNT(*) FROM conversations WHERE agent_id = a.id) as conversations_count,
                   (SELECT COUNT(*) FROM messages m 
                    JOIN conversations c ON m.conversation_id = c.id 
                    WHERE c.agent_id = a.id) as messages_count
            FROM agents a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        `).all();

        res.json({ agents });
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== SYSTEM LOGS ====================

// Get recent activity logs
router.get('/activity', authenticateAdmin, (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Get recent conversations
        const recentConversations = db.prepare(`
            SELECT c.*, a.name as agent_name, u.name as user_name
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            JOIN users u ON a.user_id = u.id
            ORDER BY c.last_message_at DESC
            LIMIT ?
        `).all(parseInt(limit));

        // Get recent messages
        const recentMessages = db.prepare(`
            SELECT m.*, c.contact_name, a.name as agent_name
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            ORDER BY m.created_at DESC
            LIMIT ?
        `).all(parseInt(limit));

        res.json({ recentConversations, recentMessages });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== ANOMALIES MANAGEMENT ====================

// Get all anomalies
router.get('/anomalies', authenticateAdmin, async (req, res) => {
    try {
        const { resolved, severity, type, limit = 100, offset = 0 } = req.query;

        const anomalies = await adminAnomaliesService.getAll({
            resolved: resolved === 'true',
            severity: severity || null,
            type: type || null,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ anomalies });
    } catch (error) {
        console.error('Get anomalies error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get anomaly stats
router.get('/anomalies/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await adminAnomaliesService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Get anomaly stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Run health check
router.post('/anomalies/health-check', authenticateAdmin, async (req, res) => {
    try {
        const anomaliesFound = await adminAnomaliesService.runHealthCheck();
        res.json({ 
            success: true, 
            anomalies_found: anomaliesFound,
            message: `Vérification terminée. ${anomaliesFound} anomalie(s) détectée(s).`
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
});

// Resolve single anomaly
router.post('/anomalies/:id/resolve', authenticateAdmin, async (req, res) => {
    try {
        const success = await adminAnomaliesService.resolve(req.params.id, req.user.id);
        if (success) {
            res.json({ success: true, message: 'Anomalie résolue' });
        } else {
            res.status(404).json({ error: 'Anomalie non trouvée' });
        }
    } catch (error) {
        console.error('Resolve anomaly error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Resolve all of a type
router.post('/anomalies/resolve-type/:type', authenticateAdmin, async (req, res) => {
    try {
        const count = await adminAnomaliesService.resolveByType(req.params.type, req.user.id);
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

// Cleanup old resolved anomalies
router.delete('/anomalies/cleanup', authenticateAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const deleted = await adminAnomaliesService.cleanup(parseInt(days));
        res.json({
            success: true,
            deleted_count: deleted,
            message: `${deleted} anomalie(s) supprimée(s)`
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
