import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { notificationService } from './notifications.js';

/**
 * Activity Logger Service
 * Keeps track of user actions for audit purposes
 */
class ActivityLogger {
    constructor() {
        this.ipCache = new Map();
    }

    /**
     * Log an action to the database
     */
    async log({ userId, action, entityType, entityId, details, req }) {
        try {
            const id = uuidv4();
            const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').replace('::ffff:', '') : null;
            const ua = req ? req.headers['user-agent'] : null;
            
            // Brute Force Detection
            if (action === 'login_failed' && ip) {
                const recentFailures = await db.get(`
                    SELECT COUNT(*) as count FROM activity_logs 
                    WHERE action = 'login_failed' AND ip_address = ? 
                    AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '10 minutes')
                `, ip);
                
                if (recentFailures?.count >= 5) {
                    await this.alertAdmins('brute_force_detected', { ip, count: recentFailures.count + 1, details }, userId);
                }
            }

            // Security Alerting for other critical actions
            if (this.isCriticalAction(action)) {
                await this.alertAdmins(action, details, userId);
            }

            // IP Enrichment (Internal or external)
            let geoInfo = null;
            if (ip && ip !== '127.0.0.1' && ip !== '::1') {
                geoInfo = await this.enrichIp(ip);
            }

            const detailsObj = typeof details === 'object' ? details : { message: details };
            if (geoInfo) detailsObj.geo = geoInfo;
            
            const detailsJson = JSON.stringify(detailsObj);

            await db.run(`
                INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, id, userId, action, entityType, entityId, detailsJson, ip, ua);
            
            return true;
        } catch (error) {
            console.error('Failed to log activity:', error);
            return false;
        }
    }

    isCriticalAction(action) {
        const critical = [
            'update_ai_model', 'delete_user', 'hard_delete_user', 
            'update_api_key', 'login_failed', 'delete_account',
            'reset_password_success', 'add_credits', 'update_plan', 'rollback_action'
        ];
        return critical.includes(action);
    }

    async alertAdmins(action, details, userId) {
        try {
            const admins = await db.all('SELECT id FROM users WHERE is_admin = 1');
            const detailMsg = typeof details === 'object' ? (details.email || details.name || details.ip || JSON.stringify(details)) : details;
            
            const titles = {
                'brute_force_detected': 'Détection Brute Force',
                'login_failed': 'Tentative de connexion échouée',
                'update_api_key': 'Modification de Clé API',
                'hard_delete_user': 'Suppression Définitive d\'un Utilisateur',
                'update_plan': 'Changement de Plan (Admin)',
                'rollback_action': 'Annulation d\'Action'
            };

            const title = titles[action] || `Action Critique: ${action}`;
            const message = action === 'brute_force_detected' 
                ? `ALERTE : Plus de 5 tentatives de connexion échouées en 10 minutes depuis l'IP ${details.ip}.`
                : `Une action sensible a été détectée : ${action} (${detailMsg})`;

            for (const admin of admins) {
                if (admin.id === userId) continue; // Don't notify self
                
                await notificationService.notifyCriticalAction(
                    admin.id, 
                    title,
                    message,
                    { action, userId, details }
                );
            }
        } catch (err) {
            console.error('Failed to notify admins of critical action:', err);
        }
    }

    async enrichIp(ip) {
        if (this.ipCache.has(ip)) return this.ipCache.get(ip);
        try {
            // Using ip-api.com (free for non-commercial/low-volume)
            const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp`);
            const data = await response.json();
            
            if (data.status === 'success') {
                const result = {
                    city: data.city,
                    country: data.country,
                    countryCode: data.countryCode,
                    emoji: this.getFlagEmoji(data.countryCode),
                    isp: data.isp
                };
                this.ipCache.set(ip, result);
                return result;
            }
            return null;
        } catch (e) {
            console.error('IP Enrichment failed:', e);
            return null;
        }
    }

    getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🌐';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    /**
     * Rollback a change log
     */
    async rollback(logId, adminId) {
        try {
            const log = await db.get('SELECT * FROM activity_logs WHERE id = ?', logId);
            if (!log || !log.details) throw new Error('Log non trouvé');

            const details = JSON.parse(log.details);
            if (!details.changes) throw new Error('Aucun changement réversible trouvé');

            const { entity_type, entity_id } = log;
            const changes = details.changes;

            // Mapping types to tables
            let table = {
                'user': 'users',
                'agent': 'agents',
                'plan': 'subscription_plans',
                'product': 'products',
                'ai_model': 'ai_models'
            }[entity_type];

            if (entity_type === 'knowledge') {
                // Determine if it's agent-specific or global knowledge
                const isAgentKb = await db.get('SELECT id FROM knowledge_base WHERE id = ?', entity_id);
                table = isAgentKb ? 'knowledge_base' : 'global_knowledge';
            }

            if (!table) throw new Error(`Type d'entité ${entity_type} non supporté pour le rollback`);

            const updates = [];
            const values = [];
            for (const [field, delta] of Object.entries(changes)) {
                updates.push(`${field} = ?`);
                values.push(delta.old);
            }

            values.push(entity_id);
            await db.run(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, ...values);

            // Log the rollback itself
            await this.log({
                userId: adminId,
                action: 'rollback_action',
                entityType: entity_type,
                entityId: entity_id,
                details: { target_log_id: logId, rolled_back_fields: Object.keys(changes) }
            });

            return { success: true };
        } catch (error) {
            console.error('Rollback error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get recent logs with filtering
     */
    async getLogs({ limit = 100, offset = 0, userId, action, actionExact, entityType, entityId, dateFrom, dateTo, ip, onlyErrors } = {}) {
        try {
            let query = `
                SELECT l.*, u.name as user_name, u.email as user_email
                FROM activity_logs l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (userId) {
                query += ` AND (l.user_id = ? OR (l.entity_id = ? AND l.entity_type = 'user'))`;
                params.push(userId, userId);
            }
            if (actionExact) {
                query += ` AND l.action = ?`;
                params.push(actionExact);
            } else if (action) {
                query += ` AND (l.action LIKE ? OR l.details LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR l.entity_id LIKE ?)`;
                const searchParam = `%${action}%`;
                params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
            }
            if (entityType) {
                query += ` AND l.entity_type = ?`;
                params.push(entityType);
            }
            if (entityId) {
                query += ` AND l.entity_id = ?`;
                params.push(entityId);
            }
            if (dateFrom) {
                query += ` AND l.created_at >= ?`;
                params.push(dateFrom);
            }
            if (dateTo) {
                query += ` AND l.created_at <= ?`;
                params.push(dateTo);
            }
            if (ip) {
                query += ` AND l.ip_address LIKE ?`;
                params.push(`%${ip}%`);
            }
            if (onlyErrors === 'true' || onlyErrors === true) {
                query += ` AND (l.action LIKE '%failed%' OR l.action LIKE '%delete%' OR l.action = 'brute_force_detected' OR l.action = 'hard_delete_user')`;
            }

            const logs = await db.all(query + ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, ...params, parseInt(limit), parseInt(offset));
            
            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM activity_logs l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE 1=1
            `;
            const countParams = [];
            if (userId) {
                countQuery += ` AND (l.user_id = ? OR (l.entity_id = ? AND l.entity_type = 'user'))`;
                countParams.push(userId, userId);
            }
            if (actionExact) {
                countQuery += ` AND l.action = ?`;
                countParams.push(actionExact);
            } else if (action) {
                countQuery += ` AND (l.action LIKE ? OR l.details LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR l.entity_id LIKE ?)`;
                const searchParam = `%${action}%`;
                countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
            }
            if (entityType) {
                countQuery += ` AND l.entity_type = ?`;
                countParams.push(entityType);
            }
            if (entityId) {
                countQuery += ` AND l.entity_id = ?`;
                countParams.push(entityId);
            }
            if (dateFrom) {
                countQuery += ` AND l.created_at >= ?`;
                countParams.push(dateFrom);
            }
            if (dateTo) {
                countQuery += ` AND l.created_at <= ?`;
                countParams.push(dateTo);
            }
            if (ip) {
                countQuery += ` AND l.ip_address LIKE ?`;
                countParams.push(`%${ip}%`);
            }
            if (onlyErrors === 'true' || onlyErrors === true) {
                countQuery += ` AND (l.action LIKE '%failed%' OR l.action LIKE '%delete%' OR l.action = 'brute_force_detected' OR l.action = 'hard_delete_user')`;
            }
            const { total } = await db.get(countQuery, ...countParams);

            return { logs, total };
        } catch (error) {
            console.error('getLogs error:', error);
            return { logs: [], total: 0 };
        }
    }
}

export const activityLogger = new ActivityLogger();
