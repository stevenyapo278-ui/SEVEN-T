/**
 * Admin Anomalies Service
 * Detects and logs system anomalies for admin notification
 */

import db from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';
import { getPlan } from '../config/plans.js';

// Anomaly types
export const ANOMALY_TYPES = {
    CREDITS_ZERO: 'credits_zero',           // User has 0 credits
    CREDITS_NEGATIVE: 'credits_negative',   // User has negative credits
    AI_ERROR: 'ai_error',                   // AI service error
    WHATSAPP_DISCONNECT: 'whatsapp_disconnect', // WhatsApp disconnected unexpectedly
    RATE_LIMIT: 'rate_limit',               // Rate limit hit
    PLAN_LIMIT_EXCEEDED: 'plan_limit_exceeded', // User exceeded plan limits
    LOGIN_FAILED: 'login_failed',           // Multiple failed login attempts
    UNUSUAL_ACTIVITY: 'unusual_activity',   // Unusual usage pattern
    SYSTEM_ERROR: 'system_error',           // General system error
    LOW_STOCK: 'low_stock',                 // Product stock critically low
    ORDER_STUCK: 'order_stuck',             // Order pending for too long
};

// Severity levels
export const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

class AdminAnomaliesService {
    constructor() {
        // Table admin_anomalies is created in database/init.js
    }

    /**
     * Log an anomaly
     */
    async log(type, severity, title, message, options = {}) {
        try {
            const id = uuidv4();
            const { userId, agentId, metadata } = options;

            const recentDuplicate = await db.get(`
                SELECT id FROM admin_anomalies 
                WHERE type = ? AND (user_id IS NOT DISTINCT FROM ?) AND (agent_id IS NOT DISTINCT FROM ?) AND is_resolved = 0
                AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
            `, type, userId || null, agentId || null);

            if (recentDuplicate) {
                await db.run(`
                    UPDATE admin_anomalies 
                    SET message = ?, metadata = ?, created_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, message, metadata ? JSON.stringify(metadata) : null, recentDuplicate.id);
                return recentDuplicate.id;
            }

            await db.run(`
                INSERT INTO admin_anomalies (id, type, severity, title, message, user_id, agent_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, id, type, severity, title, message, userId || null, agentId || null,
                   metadata ? JSON.stringify(metadata) : null);

            console.log(`[AdminAnomalies] Logged: ${type} - ${title}`);
            return id;
        } catch (error) {
            console.error('[AdminAnomalies] Log error:', error);
            return null;
        }
    }

    /**
     * Get all anomalies with filters
     */
    async getAll({ resolved = false, severity = null, type = null, limit = 100, offset = 0 } = {}) {
        try {
            let query = `
                SELECT a.*, 
                       u.name as user_name, u.email as user_email,
                       ag.name as agent_name
                FROM admin_anomalies a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN agents ag ON a.agent_id = ag.id
                WHERE 1=1
            `;
            const params = [];

            if (!resolved) {
                query += ` AND a.is_resolved = 0`;
            }
            if (severity) {
                query += ` AND a.severity = ?`;
                params.push(severity);
            }
            if (type) {
                query += ` AND a.type = ?`;
                params.push(type);
            }

            query += ` ORDER BY 
                CASE a.severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                a.created_at DESC
                LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const anomalies = await db.all(query, ...params);

            return anomalies.map(a => ({
                ...a,
                metadata: a.metadata ? JSON.parse(a.metadata) : null
            }));
        } catch (error) {
            console.error('[AdminAnomalies] GetAll error:', error);
            return [];
        }
    }

    /**
     * Get count by severity
     */
    async getStats() {
        try {
            const stats = await db.all(`
                SELECT 
                    severity,
                    COUNT(*) as count
                FROM admin_anomalies
                WHERE is_resolved = 0
                GROUP BY severity
            `);

            const byType = await db.all(`
                SELECT 
                    type,
                    COUNT(*) as count
                FROM admin_anomalies
                WHERE is_resolved = 0
                GROUP BY type
            `);

            const totalRow = await db.get(`
                SELECT COUNT(*) as count FROM admin_anomalies WHERE is_resolved = 0
            `);
            const total = totalRow?.count ?? 0;

            return {
                total: Number(total),
                bySeverity: stats.reduce((acc, s) => ({ ...acc, [s.severity]: Number(s.count) }), {}),
                byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: Number(t.count) }), {})
            };
        } catch (error) {
            return { total: 0, bySeverity: {}, byType: {} };
        }
    }

    /**
     * Mark as resolved
     */
    async resolve(anomalyId, adminId) {
        try {
            await db.run(`
                UPDATE admin_anomalies 
                SET is_resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, adminId, anomalyId);
            return true;
        } catch (error) {
            return false;
        }
    }

    async resolveByType(type, adminId) {
        try {
            const result = await db.run(`
                UPDATE admin_anomalies 
                SET is_resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
                WHERE type = ? AND is_resolved = 0
            `, adminId, type);
            return result?.rowCount ?? 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Delete old resolved anomalies
     */
    async cleanup(daysOld = 30) {
        try {
            const result = await db.run(`
                DELETE FROM admin_anomalies 
                WHERE is_resolved = 1 AND resolved_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 day')
            `, daysOld);
            return result?.rowCount ?? 0;
        } catch (error) {
            return 0;
        }
    }

    // ==================== SPECIFIC ANOMALY LOGGERS ====================

    /**
     * Log when a user runs out of credits
     */
    logCreditsZero(userId, userName) {
        return this.log(
            ANOMALY_TYPES.CREDITS_ZERO,
            SEVERITY.MEDIUM,
            'Crédits épuisés',
            `${userName} n'a plus de crédits`,
            { userId, metadata: { user_name: userName } }
        );
    }

    /**
     * Log AI service error
     */
    logAIError(userId, agentId, errorMessage, model) {
        return this.log(
            ANOMALY_TYPES.AI_ERROR,
            SEVERITY.HIGH,
            'Erreur service IA',
            `Échec de génération IA: ${errorMessage.substring(0, 100)}`,
            { userId, agentId, metadata: { error: errorMessage, model } }
        );
    }

    /**
     * Log rate limit hit
     */
    logRateLimit(userId, model) {
        return this.log(
            ANOMALY_TYPES.RATE_LIMIT,
            SEVERITY.MEDIUM,
            'Limite de requêtes atteinte',
            `Rate limit OpenRouter atteint pour le modèle ${model}`,
            { userId, metadata: { model } }
        );
    }

    /**
     * Log WhatsApp disconnection
     */
    logWhatsAppDisconnect(userId, agentId, agentName, reason) {
        return this.log(
            ANOMALY_TYPES.WHATSAPP_DISCONNECT,
            SEVERITY.HIGH,
            'WhatsApp déconnecté',
            `Agent "${agentName}" déconnecté: ${reason}`,
            { userId, agentId, metadata: { agent_name: agentName, reason } }
        );
    }

    /**
     * Log plan limit exceeded
     */
    logPlanLimitExceeded(userId, userName, limitType, current, max) {
        return this.log(
            ANOMALY_TYPES.PLAN_LIMIT_EXCEEDED,
            SEVERITY.MEDIUM,
            'Limite de plan dépassée',
            `${userName} a atteint la limite de ${limitType} (${current}/${max})`,
            { userId, metadata: { user_name: userName, limit_type: limitType, current, max } }
        );
    }

    /**
     * Log system error
     */
    logSystemError(errorMessage, context = {}) {
        return this.log(
            ANOMALY_TYPES.SYSTEM_ERROR,
            SEVERITY.CRITICAL,
            'Erreur système',
            errorMessage.substring(0, 200),
            { metadata: { ...context, timestamp: new Date().toISOString() } }
        );
    }

    /**
     * Log low stock
     */
    logLowStock(userId, productName, stock) {
        return this.log(
            ANOMALY_TYPES.LOW_STOCK,
            stock === 0 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
            stock === 0 ? 'Rupture de stock' : 'Stock critique',
            `Produit "${productName}" : ${stock} unités restantes`,
            { userId, metadata: { product_name: productName, stock } }
        );
    }

    /**
     * Log order stuck
     */
    logOrderStuck(userId, orderId, customerName, hoursOld) {
        return this.log(
            ANOMALY_TYPES.ORDER_STUCK,
            SEVERITY.MEDIUM,
            'Commande en attente',
            `Commande de ${customerName} en attente depuis ${hoursOld}h`,
            { userId, metadata: { order_id: orderId, customer_name: customerName, hours_old: hoursOld } }
        );
    }

    // ==================== SYSTEM HEALTH CHECK ====================

    /**
     * Run a full system health check and log anomalies
     */
    async runHealthCheck() {
        console.log('[AdminAnomalies] Running health check...');
        let anomaliesFound = 0;

        try {
            const usersNoCredits = await db.all(`
                SELECT id, name, email, credits, plan 
                FROM users 
                WHERE credits <= 0 AND plan != 'enterprise' AND is_active = 1
            `);

            for (const user of usersNoCredits) {
                if (Number(user.credits) < 0) {
                    await this.log(ANOMALY_TYPES.CREDITS_NEGATIVE, SEVERITY.HIGH,
                        'Crédits négatifs',
                        `${user.name} a ${user.credits} crédits`,
                        { userId: user.id, metadata: { credits: user.credits } });
                } else {
                    await this.logCreditsZero(user.id, user.name);
                }
                anomaliesFound++;
            }

            const users = await db.all(`
                SELECT u.id, u.name, u.plan,
                       (SELECT COUNT(*) FROM agents WHERE user_id = u.id) as agents_count,
                       (SELECT COUNT(*) FROM agents WHERE user_id = u.id AND whatsapp_connected = 1) as wa_count
                FROM users u
                WHERE u.is_active = 1
            `);

            for (const user of users) {
                const plan = await getPlan(user.plan);
                const agentsCount = Number(user.agents_count);
                const waCount = Number(user.wa_count);
                if (plan.limits.agents !== -1 && agentsCount > plan.limits.agents) {
                    await this.logPlanLimitExceeded(user.id, user.name, 'agents', agentsCount, plan.limits.agents);
                    anomaliesFound++;
                }
                if (plan.limits.whatsapp_accounts !== -1 && waCount > plan.limits.whatsapp_accounts) {
                    await this.logPlanLimitExceeded(user.id, user.name, 'whatsapp_accounts', waCount, plan.limits.whatsapp_accounts);
                    anomaliesFound++;
                }
            }

            const outOfStock = await db.all(`
                SELECT p.id, p.name, p.stock, p.user_id
                FROM products p
                WHERE p.is_active = 1 AND p.stock = 0
            `);

            for (const product of outOfStock) {
                await this.logLowStock(product.user_id, product.name, product.stock);
                anomaliesFound++;
            }

            const stuckOrders = await db.all(`
                SELECT o.id, o.user_id, o.customer_name, 
                       ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.created_at)) / 3600)::integer as hours_old
                FROM orders o
                WHERE o.status = 'pending' 
                AND o.created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `);

            for (const order of stuckOrders) {
                await this.logOrderStuck(order.user_id, order.id, order.customer_name, order.hours_old);
                anomaliesFound++;
            }

            console.log(`[AdminAnomalies] Health check complete. Found ${anomaliesFound} anomalies.`);
            return anomaliesFound;
        } catch (error) {
            console.error('[AdminAnomalies] Health check error:', error);
            await this.logSystemError(`Health check failed: ${error.message}`);
            return -1;
        }
    }
}

export const adminAnomaliesService = new AdminAnomaliesService();
export default adminAnomaliesService;
