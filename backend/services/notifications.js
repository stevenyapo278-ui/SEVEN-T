/**
 * Notification Service
 * Manages user notifications across the application
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';

// Notification types with their icons/colors
export const NOTIFICATION_TYPES = {
    info: { icon: 'info', color: 'blue' },
    success: { icon: 'check', color: 'green' },
    warning: { icon: 'alert', color: 'amber' },
    error: { icon: 'error', color: 'red' },
    lead: { icon: 'user', color: 'violet' },
    whatsapp: { icon: 'message', color: 'green' },
    credit: { icon: 'coins', color: 'gold' },
    agent: { icon: 'bot', color: 'violet' }
};

class NotificationService {
    /**
     * Create a new notification
     * @param {string} userId - User ID
     * @param {Object} notification - Notification data
     * @returns {Object} Created notification
     */
    async create(userId, { type = 'info', title, message, link = null, metadata = null }) {
        try {
            const id = uuidv4();

            await db.run(`
                INSERT INTO notifications (id, user_id, type, title, message, link, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                id,
                userId,
                type,
                title,
                message || null,
                link,
                metadata ? JSON.stringify(metadata) : null
            );

            console.log(`[Notifications] Created: ${type} - ${title} for user ${userId}`);

            return await this.getById(id);
        } catch (error) {
            console.error('[Notifications] Create error:', error);
            return null;
        }
    }

    /**
     * Get a notification by ID
     */
    async getById(id) {
        const notif = await db.get('SELECT * FROM notifications WHERE id = ?', id);
        if (notif && notif.metadata) {
            notif.metadata = JSON.parse(notif.metadata);
        }
        return notif;
    }

    /**
     * Get all notifications for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     */
    async getForUser(userId, { limit = 50, unreadOnly = false, startDate = null, endDate = null, search = '' } = {}) {
        try {
            let query = 'SELECT * FROM notifications WHERE user_id = ?';
            const params = [userId];

            if (unreadOnly) {
                query += ' AND is_read = 0';
            }

            if (startDate) {
                query += ' AND created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND created_at <= ?';
                params.push(endDate);
            }

            if (search && search.trim() !== '') {
                const searchPat = `%${search.trim().toLowerCase()}%`;
                query += ' AND (LOWER(title) LIKE ? OR LOWER(message) LIKE ? OR LOWER(metadata) LIKE ?)';
                params.push(searchPat, searchPat, searchPat);
            }

            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const notifications = await db.all(query, ...params);
            const list = Array.isArray(notifications) ? notifications : [];
            return list.map(n => {
                let meta = null;
                if (n.metadata != null && n.metadata !== '') {
                    try {
                        meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
                    } catch (_) {
                        meta = null;
                    }
                }
                return { ...n, metadata: meta };
            });
        } catch (error) {
            console.error('[Notifications] Get error:', error);
            return [];
        }
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId) {
        try {
            const result = await db.get(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                userId
            );
            const count = result?.count ?? 0;
            return Number(count);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(id, userId) {
        try {
            await db.run(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
                id, userId
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        try {
            await db.run(
                'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
                userId
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete a notification
     */
    async delete(id, userId) {
        try {
            await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', id, userId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete old notifications (cleanup)
     * @param {number} daysOld - Delete notifications older than X days
     */
    async cleanup(daysOld = 30) {
        try {
            const result = await db.run(`
                DELETE FROM notifications 
                WHERE created_at < CURRENT_TIMESTAMP - (? * INTERVAL '1 day')
            `, daysOld);
            const rowCount = result?.rowCount ?? 0;
            console.log(`[Notifications] Cleaned up ${rowCount} old notifications`);
            return rowCount;
        } catch (error) {
            console.error('[Notifications] Cleanup error:', error);
            return 0;
        }
    }

    // ============================================
    // HELPER METHODS FOR SPECIFIC NOTIFICATION TYPES
    // ============================================

    /**
     * Notify about a new suggested lead
     */
    notifyNewLead(userId, leadName, conversationId) {
        return this.create(userId, {
            type: 'lead',
            title: 'Nouveau lead détecté',
            message: `${leadName} semble intéressé par vos produits`,
            link: `/dashboard/leads`,
            metadata: { conversationId }
        });
    }

    /**
     * Notify about low credits
     */
    notifyLowCredits(userId, remainingCredits) {
        return this.create(userId, {
            type: 'warning',
            title: 'Crédits faibles',
            message: `Il vous reste ${remainingCredits} crédits`,
            link: '/dashboard/settings'
        });
    }

    /**
     * Notify about WhatsApp connection status
     */
    notifyWhatsAppStatus(userId, agentName, connected) {
        return this.create(userId, {
            type: connected ? 'success' : 'warning',
            title: connected ? 'Agent connecté' : 'Agent déconnecté',
            message: `${agentName} ${connected ? 'est maintenant actif' : 'a été déconnecté'}`,
            link: '/dashboard/agents'
        });
    }

    /**
     * Notify about new agent creation
     */
    notifyAgentCreated(userId, agentName) {
        return this.create(userId, {
            type: 'success',
            title: 'Agent créé',
            message: `L'agent "${agentName}" a été créé avec succès`,
            link: '/dashboard/agents'
        });
    }

    /**
     * Welcome notification for new users
     */
    notifyWelcome(userId) {
        return this.create(userId, {
            type: 'info',
            title: 'Bienvenue sur SEVEN·T !',
            message: 'Votre compte est prêt. Créez votre premier agent pour commencer.',
            link: '/dashboard/agents'
        });
    }

    /**
     * Notify about new message received (optional, can be noisy)
     */
    notifyNewMessage(userId, contactName, preview) {
        return this.create(userId, {
            type: 'whatsapp',
            title: `Message de ${contactName}`,
            message: preview.substring(0, 50) + (preview.length > 50 ? '...' : ''),
            link: '/dashboard/conversations'
        });
    }
}

export const notificationService = new NotificationService();
export default notificationService;
