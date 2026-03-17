import { Router } from 'express';
import db from '../database/init.js';
import { authenticateAdmin, requireFullAdmin, requirePermission } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { whatsappManager } from '../services/whatsapp.js';
import { adminAnomaliesService } from '../services/adminAnomalies.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { activityLogger } from '../services/activityLogger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = join(__dirname, '..', '..', 'sessions');

const router = Router();

// ==================== DASHBOARD STATS ====================

// Get admin dashboard stats
router.get('/stats', authenticateAdmin, requirePermission('platform.stats.read'), async (req, res) => {
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
            WHERE created_at >= (NOW() - INTERVAL '7 days')
        `);
        const recentSignups = recentSignupsRow?.count ?? 0;

        // Messages per day (last 7 days)
        const messagesPerDay = await db.all(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM messages
            WHERE created_at >= (NOW() - INTERVAL '7 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        // Security Stats (last 24h)
        const failedLogins24hRow = await db.get(`
            SELECT COUNT(*) as count 
            FROM activity_logs 
            WHERE action = 'login_failed' 
            AND created_at >= (NOW() - INTERVAL '24 hours')
        `);
        const failedLogins24h = failedLogins24hRow?.count ?? 0;

        const criticalActions24hRow = await db.get(`
            SELECT COUNT(*) as count 
            FROM activity_logs 
            WHERE (action LIKE '%delete%' OR action LIKE '%reset_password%' OR action = 'add_credits' OR action = 'update_plan' OR action = 'update_ai_model' OR action = 'rollback_action')
            AND created_at >= (NOW() - INTERVAL '24 hours')
        `);
        const criticalActions24h = criticalActions24hRow?.count ?? 0;

        const recentSecurityEvents = await db.all(`
            SELECT l.*, u.name as user_name, u.email as user_email
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE (l.action LIKE '%delete%' OR l.action LIKE '%reset_password%' OR l.action = 'add_credits' OR l.action = 'login_failed' OR l.action = 'update_plan' OR l.action = 'update_ai_model' OR l.action = 'rollback_action')
            ORDER BY l.created_at DESC
            LIMIT 5
        `);

        res.json({ 
            stats, 
            usersByPlan, 
            recentSignups,
            messagesPerDay,
            security: {
                failedLogins24h,
                criticalActions24h,
                recentSecurityEvents
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all available roles
router.get('/roles', authenticateAdmin, async (req, res) => {
    try {
        const roles = await db.all('SELECT key, name, description FROM roles ORDER BY name ASC');
        res.json({ roles: roles || [] });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== USERS MANAGEMENT ====================

// Get all users with stats
router.get('/users', authenticateAdmin, requirePermission('users.read'), async (req, res) => {
    try {
        const { search, plan, status, sort = 'created_at', order = 'desc', limit = 50, offset = 0 } = req.query;

        let query = `
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
router.get('/users/:id', authenticateAdmin, requirePermission('users.read'), async (req, res) => {
    try {
        let user = await db.get(`
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

        // Get user's roles
        const userRoles = await db.all(`
            SELECT r.key
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ?
        `, req.params.id);
        const roles = (userRoles || []).map(r => r.key);

        // Remove password
        const { password, ...userWithoutPassword } = user;

        res.json({ user: { ...userWithoutPassword, roles }, agents });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update user
router.put('/users/:id', authenticateAdmin, requirePermission('users.write'), async (req, res) => {
    try {
        const { 
            name, email, company, plan, credits, is_admin, is_active, 
            voice_responses_enabled, payment_module_enabled, analytics_module_enabled, subscription_end_date,
            can_manage_users, can_manage_plans, can_view_stats, can_manage_ai,
            roles
        } = req.body;

        const existing = await db.get('SELECT id, is_admin, plan, name, email, credits, is_active FROM users WHERE id = ?', req.params.id);
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
        let planChanged = false;
        let oldPlan = existing.plan;
        
        if (plan != null && plan !== '') {
            const planActive = await db.get('SELECT 1 FROM subscription_plans WHERE name = ? AND is_active = 1', plan);
            if (!planActive) {
                return res.status(400).json({ error: 'Ce plan n\'est pas actif. Choisissez un plan actif dans la liste.' });
            }
            if (plan !== existing.plan) {
                planChanged = true;
            }
        }

        // Check if email is taken by another user (only when email is provided and different)
        if (email != null && email !== '') {
            const emailTaken = await db.get('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND id != ?', String(email).trim(), req.params.id);
            if (emailTaken) {
                return res.status(400).json({ error: 'Cet email est déjà utilisé' });
            }
        }

        // Préparer chaque champ explicitement pour garantir la mise à jour
        const setClauses = [];
        const params = [];

        if (name !== undefined && name !== null) {
            setClauses.push('name = ?');
            params.push(String(name).trim());
        }
        if (email !== undefined && email !== null && String(email).trim() !== '') {
            setClauses.push('email = ?');
            params.push(String(email).trim().toLowerCase());
        }
        if (company !== undefined) {
            setClauses.push('company = ?');
            params.push(company || null);
        }
        if (plan !== undefined && plan !== null && plan !== '') {
            setClauses.push('plan = ?');
            params.push(plan);
            
            if (planChanged) {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                
                setClauses.push('subscription_status = ?');
                params.push('active');
                
                setClauses.push('subscription_end_date = ?');
                params.push(nextMonth.toISOString());
            }
        }
        if (credits !== undefined && credits !== null) {
            setClauses.push('credits = ?');
            params.push(Number(credits));
        }
        if (is_admin !== undefined && is_admin !== null) {
            setClauses.push('is_admin = ?');
            params.push(is_admin ? 1 : 0);
        }
        if (is_active !== undefined && is_active !== null) {
            setClauses.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }
        if (voice_responses_enabled !== undefined) {
            setClauses.push('voice_responses_enabled = ?');
            params.push(voice_responses_enabled ? 1 : 0);
        }
        if (payment_module_enabled !== undefined) {
            setClauses.push('payment_module_enabled = ?');
            params.push(payment_module_enabled ? 1 : 0);
        }
        if (analytics_module_enabled !== undefined) {
            setClauses.push('analytics_module_enabled = ?');
            params.push(analytics_module_enabled ? 1 : 0);
        }
        if (can_manage_users !== undefined) {
            setClauses.push('can_manage_users = ?');
            params.push(can_manage_users ? 1 : 0);
        }
        if (can_manage_plans !== undefined) {
            setClauses.push('can_manage_plans = ?');
            params.push(can_manage_plans ? 1 : 0);
        }
        if (can_view_stats !== undefined) {
            setClauses.push('can_view_stats = ?');
            params.push(can_view_stats ? 1 : 0);
        }
        if (can_manage_ai !== undefined) {
            setClauses.push('can_manage_ai = ?');
            params.push(can_manage_ai ? 1 : 0);
        }

        // Allow explicit override of subscription_end_date (only if plan didn't already set it)
        if (subscription_end_date !== undefined && !planChanged) {
            if (subscription_end_date === '' || subscription_end_date === null) {
                setClauses.push('subscription_end_date = ?');
                params.push(null);
            } else {
                const parsed = new Date(subscription_end_date);
                if (!isNaN(parsed.getTime())) {
                    setClauses.push('subscription_end_date = ?');
                    params.push(parsed.toISOString());
                    // Also update subscription_status to trialing if plan is free
                    if (existing.plan === 'free' || existing.plan === 'free_expired') {
                        setClauses.push('subscription_status = ?');
                        params.push('trialing');
                        // Restore free plan if expired
                        if (existing.plan === 'free_expired') {
                            setClauses.push('plan = ?');
                            params.push('free');
                        }
                    }
                }
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
        }

        setClauses.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.params.id);

        await db.run(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
            ...params
        );

        if (planChanged) {
            const notifId = uuidv4();
            await db.run(
                `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
                notifId,
                req.params.id,
                'info',
                'Changement de plan',
                `Votre abonnement a été mis à jour vers le plan "${plan}". Découvrez vos nouvelles fonctionnalités !`
            );
        }

        // Synchronize roles if provided
        if (roles !== undefined && Array.isArray(roles)) {
            await db.transaction(async (tx) => {
                // Remove existing roles
                await tx.run('DELETE FROM user_roles WHERE user_id = ?', req.params.id);
                
                // Add new roles
                if (roles.length > 0) {
                    const availableRoles = await tx.all('SELECT id, key FROM roles');
                    const roleMap = new Map((availableRoles || []).map(r => [r.key, r.id]));
                    
                    for (const roleKey of roles) {
                        const roleId = roleMap.get(roleKey);
                        if (roleId) {
                            await tx.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', req.params.id, roleId);
                        }
                    }
                }
            });
        }

        const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
        const { password: _p, ...userWithoutPassword } = user;

        // Calculate changes for logging
        const changes = {};
        const fieldsToTrack = [
            'name', 'email', 'plan', 'credits', 'is_admin', 'is_active',
            'can_manage_users', 'can_manage_plans', 'can_view_stats', 'can_manage_ai',
            'voice_responses_enabled', 'payment_module_enabled', 'analytics_module_enabled'
        ];
        fieldsToTrack.forEach(field => {
            if (req.body[field] !== undefined && String(existing[field]) !== String(req.body[field])) {
                changes[field] = { old: existing[field], new: req.body[field] };
            }
        });

        await activityLogger.log({
            userId: req.user.id,
            action: 'update_user',
            entityType: 'user',
            entityId: req.params.id,
            details: { 
                email: user.email,
                changes: Object.keys(changes).length > 0 ? changes : null
            },
            req
        });

        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Reset user password
router.post('/users/:id/reset-password', authenticateAdmin, requirePermission('users.credentials.reset'), async (req, res) => {
    try {
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const existing = await db.get('SELECT id, email FROM users WHERE id = ?', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.params.id);

        await activityLogger.log({
            userId: req.user.id,
            action: 'reset_password',
            entityType: 'user',
            entityId: req.params.id,
            details: { target_email: existing.email },
            req
        });

        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
});

// Add credits to user
router.post('/users/:id/add-credits', authenticateAdmin, requirePermission('users.credits.write'), async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount < 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        const existing = await db.get('SELECT id, credits FROM users WHERE id = ?', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        await db.run('UPDATE users SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', amount, req.params.id);

        const user = await db.get('SELECT credits FROM users WHERE id = ?', req.params.id);
        
        await activityLogger.log({
            userId: req.user.id,
            action: 'add_credits',
            entityType: 'user',
            entityId: req.params.id,
            details: { amount },
            req
        });

        res.json({ message: 'Crédits ajoutés', credits: user.credits });
    } catch (error) {
        console.error('Add credits error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de crédits' });
    }
});

// Get deletion preview (what will be deleted)
router.get('/users/:id/deletion-preview', authenticateAdmin, requirePermission('users.delete'), async (req, res) => {
    try {
        const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Get counts of all related data
        const agents = await db.all('SELECT id, name, whatsapp_connected FROM agents WHERE user_id = ?', req.params.id);
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
            
            const convRow = await db.get(`SELECT COUNT(*) as count FROM conversations WHERE agent_id IN (${placeholders})`, ...agentIds);
            stats.conversations = convRow?.count || 0;
            
            const msgRow = await db.get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.agent_id IN (${placeholders})`, ...agentIds);
            stats.messages = msgRow?.count || 0;
            
            const kbRow = await db.get(`SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id IN (${placeholders})`, ...agentIds);
            stats.knowledgeItems = kbRow?.count || 0;
            
            const tplRow = await db.get(`SELECT COUNT(*) as count FROM templates WHERE agent_id IN (${placeholders})`, ...agentIds);
            stats.templates = tplRow?.count || 0;
            
            const blRow = await db.get(`SELECT COUNT(*) as count FROM blacklist WHERE agent_id IN (${placeholders})`, ...agentIds);
            stats.blacklistEntries = blRow?.count || 0;
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
router.delete('/users/:id', authenticateAdmin, requirePermission('users.delete'), async (req, res) => {
    try {
        const { soft_delete } = req.query;
        
        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const existing = await db.get('SELECT id, name, email FROM users WHERE id = ?', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Get all agents for this user
        const agents = await db.all('SELECT id, whatsapp_connected FROM agents WHERE user_id = ?', req.params.id);
        
        // Disconnect all WhatsApp sessions and clean up session files
        const cleanupResults = [];
        for (const agent of agents) {
            try {
                if (whatsappManager.isConnected(agent.id)) {
                    await whatsappManager.disconnect(agent.id, false);
                    cleanupResults.push({ agentId: agent.id, action: 'disconnected' });
                }
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

        if (soft_delete === 'true') {
            await db.run(`UPDATE users SET is_active = 0, email = email || '_deleted_' || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, Date.now(), req.params.id);
            await db.run('UPDATE agents SET is_active = 0, whatsapp_connected = 0 WHERE user_id = ?', req.params.id);
            
            await activityLogger.log({
                userId: req.user.id,
                action: 'soft_delete_user',
                entityType: 'user',
                entityId: req.params.id,
                details: { email: existing.email },
                req
            });

            res.json({ message: 'Utilisateur désactivé avec succès', soft_deleted: true, cleanup: cleanupResults });
        } else {
            await db.run('DELETE FROM users WHERE id = ?', req.params.id);

            await activityLogger.log({
                userId: req.user.id,
                action: 'hard_delete_user',
                entityType: 'user',
                entityId: req.params.id,
                details: { email: existing.email },
                req
            });

            res.json({ message: 'Utilisateur et toutes ses données supprimés définitivement', soft_deleted: false, cleanup: cleanupResults, deleted: { agents: agents.length, sessions_cleaned: cleanupResults.filter(r => r.action === 'session_deleted').length } });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Restore soft-deleted user
router.post('/users/:id/restore', authenticateAdmin, requirePermission('users.write'), async (req, res) => {
    try {
        const user = await db.get('SELECT id, email FROM users WHERE id = ?', req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const originalEmail = user.email.replace(/_deleted_\d+$/, '');
        
        const emailTaken = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', originalEmail, req.params.id);
        if (emailTaken) {
            return res.status(400).json({ 
                error: 'L\'email original est maintenant utilisé par un autre compte',
                original_email: originalEmail
            });
        }

        await db.run(`UPDATE users SET is_active = 1, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, originalEmail, req.params.id);
        await db.run('UPDATE agents SET is_active = 1 WHERE user_id = ?', req.params.id);

        await activityLogger.log({
            userId: req.user.id,
            action: 'restore_user',
            entityType: 'user',
            entityId: req.params.id,
            details: { email: originalEmail },
            req
        });

        res.json({ message: 'Utilisateur restauré avec succès', email: originalEmail });
    } catch (error) {
        console.error('Restore user error:', error);
        res.status(500).json({ error: 'Erreur lors de la restauration' });
    }
});

// Create new user (admin)
router.post('/users', authenticateAdmin, requirePermission('users.write'), async (req, res) => {
    try {
        const { 
            name, email, password, company, plan, credits, is_admin, 
            voice_responses_enabled, payment_module_enabled, analytics_module_enabled,
            can_manage_users, can_manage_plans, can_view_stats, can_manage_ai,
            roles,
            generate_coupon
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
        }

        const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Ne pas autoriser de créer un utilisateur avec un plan désactivé
        const planToUse = plan || 'free';
        const planActive = await db.get('SELECT 1 FROM subscription_plans WHERE name = ? AND is_active = 1', planToUse);
        if (!planActive) {
            return res.status(400).json({ error: 'Ce plan n\'est pas actif. Choisissez un plan actif dans la liste.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Appliquer la période d'essai configurée si le plan est 'free'
        let subscriptionStatus = 'active';
        let subscriptionEndDate = null;

        if (planToUse === 'free') {
            const trialSetting = await db.get("SELECT value FROM platform_settings WHERE key = 'default_trial_days'");
            const trialDays = trialSetting && trialSetting.value ? parseInt(trialSetting.value, 10) : 7;
            
            const trialDate = new Date();
            trialDate.setDate(trialDate.getDate() + trialDays);
            
            subscriptionStatus = 'trialing';
            subscriptionEndDate = trialDate.toISOString();
        }

        await db.run(`
            INSERT INTO users (
                id, name, email, password, company, plan, credits, is_admin, 
                subscription_status, subscription_end_date, voice_responses_enabled, payment_module_enabled, analytics_module_enabled,
                can_manage_users, can_manage_plans, can_view_stats, can_manage_ai
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, userId, name, email, hashedPassword, company || '', planToUse, credits ?? 500, is_admin || 0, 
           subscriptionStatus, subscriptionEndDate, voice_responses_enabled ? 1 : 0, payment_module_enabled ? 1 : 0, analytics_module_enabled ? 1 : 0,
           can_manage_users ? 1 : 0, can_manage_plans ? 1 : 0, can_view_stats ? 1 : 0, can_manage_ai ? 1 : 0
        );

        await activityLogger.log({
            userId: req.user.id,
            action: 'create_user',
            entityType: 'user',
            entityId: userId,
            details: { email, plan: planToUse },
            req
        });

        // Add roles if provided
        if (roles && Array.isArray(roles) && roles.length > 0) {
            const availableRoles = await db.all('SELECT id, key FROM roles');
            const roleMap = new Map((availableRoles || []).map(r => [r.key, r.id]));
            
            for (const roleKey of roles) {
                const roleId = roleMap.get(roleKey);
                if (roleId) {
                    await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING', userId, roleId);
                }
            }
        }

        // Auto-generate influencer coupon if requested
        if (generate_coupon) {
            const couponCode = `${name.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
            const couponId = uuidv4();
            await db.run(`
                INSERT INTO subscription_coupons (id, name, code, discount_type, discount_value, max_uses, is_active, influencer_id, bonus_credits)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, couponId, `Coupon ${name}`, couponCode, 'percentage', 10, null, 1, userId, 500);

            // Ensure user has influencer role
            const influencerRole = await db.get("SELECT id FROM roles WHERE key = 'influencer'");
            if (influencerRole) {
                await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING', userId, influencerRole.id);
            }
        }

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
router.get('/agents', authenticateAdmin, requirePermission('platform.activity.read'), async (req, res) => {
    try {
        const agents = await db.all(`
            SELECT a.*, u.name as user_name, u.email as user_email,
                   (SELECT COUNT(*) FROM conversations WHERE agent_id = a.id) as conversations_count,
                   (SELECT COUNT(*) FROM messages m 
                    JOIN conversations c ON m.conversation_id = c.id 
                    WHERE c.agent_id = a.id) as messages_count
            FROM agents a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        `);

        res.json({ agents: Array.isArray(agents) ? agents : [] });
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== SYSTEM LOGS ====================

// Get recent activity logs
router.get('/activity', authenticateAdmin, requirePermission('platform.activity.read'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const recentConversations = await db.all(`
            SELECT c.*, a.name as agent_name, u.name as user_name
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            JOIN users u ON a.user_id = u.id
            ORDER BY c.last_message_at DESC
            LIMIT ?
        `, parseInt(limit));

        const recentMessages = await db.all(`
            SELECT m.*, c.contact_name, a.name as agent_name
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            ORDER BY m.created_at DESC
            LIMIT ?
        `, parseInt(limit));

        res.json({ recentConversations: Array.isArray(recentConversations) ? recentConversations : [], recentMessages: Array.isArray(recentMessages) ? recentMessages : [] });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get Audit Trail (Activity Logs)
router.get('/audit-logs', authenticateAdmin, requirePermission('audit.read'), async (req, res) => {
    try {
        const { limit = 50, offset = 0, userId, action, actionExact, entityType, entityId, dateFrom, dateTo, ip, onlyErrors } = req.query;
        const { logs, total } = await activityLogger.getLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            userId,
            action,
            actionExact,
            entityType,
            entityId,
            dateFrom,
            dateTo,
            ip,
            onlyErrors
        });
        
        res.json({ 
            logs,
            total
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// Rollback an audit log action
router.post('/audit-logs/:id/rollback', authenticateAdmin, requireFullAdmin, async (req, res) => {
    try {
        const result = await activityLogger.rollback(req.params.id, req.user.id);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json({ success: true, message: 'Action annulée avec succès' });
    } catch (error) {
        console.error('Rollback route error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'annulation' });
    }
});

// ==================== ANOMALIES MANAGEMENT ====================

// Get all anomalies
router.get('/anomalies', authenticateAdmin, requirePermission('security.anomalies.read'), async (req, res) => {
    try {
        const { resolved, severity, type, q, limit = 100, offset = 0 } = req.query;

        const resolvedMode =
            resolved === 'only' ? 'only'
            : resolved === 'true' ? 'all'
            : 'open';

        const anomalies = await adminAnomaliesService.getAll({
            resolved: resolved === 'true',
            resolvedMode,
            severity: severity || null,
            type: type || null,
            q: typeof q === 'string' ? q : null,
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
router.get('/anomalies/stats', authenticateAdmin, requirePermission('security.anomalies.read'), async (req, res) => {
    try {
        const stats = await adminAnomaliesService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Get anomaly stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Run health check
router.post('/anomalies/health-check', authenticateAdmin, requireFullAdmin, async (req, res) => {
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
router.post('/anomalies/:id/resolve', authenticateAdmin, requireFullAdmin, async (req, res) => {
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
router.post('/anomalies/resolve-type/:type', authenticateAdmin, requireFullAdmin, async (req, res) => {
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
router.delete('/anomalies/cleanup', authenticateAdmin, requireFullAdmin, async (req, res) => {
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
