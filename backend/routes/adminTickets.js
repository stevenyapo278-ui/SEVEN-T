import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateAdmin, requirePermission, requireFullAdmin } from '../middleware/auth.js';
import { activityLogger } from '../services/activityLogger.js';
import { notificationService } from '../services/notifications.js';

const router = Router();

const STATUSES = new Set(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']);
const PRIORITIES = new Set(['low', 'medium', 'high']);

function clampInt(v, { min, max, fallback }) {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function senderRoleFromAdmin(req) {
    return req.user?.is_admin ? 'admin' : 'support';
}

// List all tickets (support/admin) with filters + pagination
router.get(
    '/tickets',
    authenticateAdmin,
    requirePermission('support.tickets.read'),
    async (req, res) => {
        try {
            const { status, priority, userId, assignedTo, q } = req.query || {};
            const limit = clampInt(req.query?.limit, { min: 1, max: 200, fallback: 50 });
            const offset = clampInt(req.query?.offset, { min: 0, max: 1000000, fallback: 0 });

            const where = ['1=1'];
            const params = [];

            if (typeof status === 'string' && status) {
                if (!STATUSES.has(status)) return res.status(400).json({ error: 'Statut invalide' });
                where.push('t.status = ?');
                params.push(status);
            }
            if (typeof priority === 'string' && priority) {
                if (!PRIORITIES.has(priority)) return res.status(400).json({ error: 'Priorité invalide' });
                where.push('t.priority = ?');
                params.push(priority);
            }
            if (typeof userId === 'string' && userId) {
                where.push('t.user_id = ?');
                params.push(userId);
            }
            if (typeof assignedTo === 'string' && assignedTo) {
                if (assignedTo === 'unassigned') {
                    where.push('t.assigned_to IS NULL');
                } else {
                    where.push('t.assigned_to = ?');
                    params.push(assignedTo);
                }
            }
            if (typeof q === 'string' && q.trim()) {
                where.push('(t.subject ILIKE ? OR t.description ILIKE ?)');
                params.push(`%${q.trim()}%`, `%${q.trim()}%`);
            }

            const whereSql = `WHERE ${where.join(' AND ')}`;

            const totalRow = await db.get(
                `SELECT COUNT(*)::int as count FROM tickets t ${whereSql}`,
                ...params
            );

            const tickets = await db.all(
                `
                SELECT
                  t.*,
                  u.name as user_name,
                  u.email as user_email,
                  ass.name as assigned_name,
                  ass.email as assigned_email
                FROM tickets t
                JOIN users u ON u.id = t.user_id
                LEFT JOIN users ass ON ass.id = t.assigned_to
                ${whereSql}
                ORDER BY
                  CASE t.status
                    WHEN 'open' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'resolved' THEN 3
                    ELSE 4
                  END,
                  t.updated_at DESC,
                  t.created_at DESC
                LIMIT ? OFFSET ?
                `,
                ...params,
                limit,
                offset
            );

            return res.json({ tickets: tickets || [], total: totalRow?.count ?? 0, limit, offset });
        } catch (error) {
            console.error('Admin list tickets error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// Ticket resolution metrics (support/admin)
// NOTE: must be defined before '/tickets/:id'
router.get(
    '/tickets/stats',
    authenticateAdmin,
    requirePermission('support.tickets.read'),
    async (req, res) => {
        try {
            const days = clampInt(req.query?.days, { min: 1, max: 365, fallback: 30 });

            const byStatus = await db.all(
                `
                SELECT status, COUNT(*)::int as count
                FROM tickets
                GROUP BY status
                `
            );

            const resolvedWindowRow = await db.get(
                `
                SELECT COUNT(*)::int as count
                FROM tickets
                WHERE status IN ('resolved', 'closed')
                  AND updated_at >= (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
                `,
                days
            );

            // Avg first support reply time (minutes) within window
            const firstReplyRow = await db.get(
                `
                WITH first_support AS (
                  SELECT
                    t.id,
                    MIN(m.created_at) as first_support_at
                  FROM tickets t
                  JOIN ticket_messages m ON m.ticket_id = t.id
                  WHERE m.sender_role IN ('admin', 'support')
                    AND t.created_at >= (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
                  GROUP BY t.id
                )
                SELECT
                  COALESCE(AVG(EXTRACT(EPOCH FROM (fs.first_support_at - t.created_at)) / 60.0), 0)::float as avg_minutes
                FROM tickets t
                JOIN first_support fs ON fs.id = t.id
                `,
                days
            );

            // Avg resolution time (hours) using activity_logs ticket_status_change -> resolved/closed
            // We rely on activity logs because tickets table doesn't store resolved_at/closed_at.
            const resolutionRow = await db.get(
                `
                WITH resolved_events AS (
                  SELECT
                    l.entity_id as ticket_id,
                    MIN(l.created_at) as resolved_at
                  FROM activity_logs l
                  WHERE l.entity_type = 'ticket'
                    AND l.action = 'ticket_status_change'
                    AND (l.details::jsonb ->> 'to') IN ('resolved', 'closed')
                    AND l.created_at >= (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
                  GROUP BY l.entity_id
                )
                SELECT
                  COALESCE(AVG(EXTRACT(EPOCH FROM (re.resolved_at - t.created_at)) / 3600.0), 0)::float as avg_hours,
                  COUNT(*)::int as count
                FROM resolved_events re
                JOIN tickets t ON t.id = re.ticket_id
                `,
                days
            );

            return res.json({
                windowDays: days,
                byStatus: byStatus || [],
                resolvedInWindow: resolvedWindowRow?.count ?? 0,
                avgFirstReplyMinutes: Number(firstReplyRow?.avg_minutes ?? 0),
                avgResolutionHours: Number(resolutionRow?.avg_hours ?? 0),
                resolutionSampleSize: resolutionRow?.count ?? 0
            });
        } catch (error) {
            console.error('Admin ticket stats error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// Get ticket detail + messages
router.get(
    '/tickets/:id',
    authenticateAdmin,
    requirePermission('support.tickets.read'),
    async (req, res) => {
        try {
            const ticket = await db.get(
                `
                SELECT
                  t.*,
                  u.name as user_name,
                  u.email as user_email,
                  ass.name as assigned_name,
                  ass.email as assigned_email
                FROM tickets t
                JOIN users u ON u.id = t.user_id
                LEFT JOIN users ass ON ass.id = t.assigned_to
                WHERE t.id = ?
                `,
                req.params.id
            );
            if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

            const messages = await db.all(
                `
                SELECT m.*, u.name as sender_name, u.email as sender_email
                FROM ticket_messages m
                LEFT JOIN users u ON u.id = m.sender_id
                WHERE m.ticket_id = ?
                ORDER BY m.created_at ASC
                `,
                req.params.id
            );

            return res.json({ ticket, messages: messages || [] });
        } catch (error) {
            console.error('Admin get ticket error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// Reply as support/admin
router.post(
    '/tickets/:id/messages',
    authenticateAdmin,
    requirePermission('support.tickets.reply'),
    async (req, res) => {
        try {
            const { message } = req.body || {};
            const msg = typeof message === 'string' ? message.trim() : '';
            if (!msg) return res.status(400).json({ error: 'Message requis' });
            if (msg.length > 5000) return res.status(400).json({ error: 'Message trop long (max 5000)' });

            const ticket = await db.get(`SELECT * FROM tickets WHERE id = ?`, req.params.id);
            if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
            if (ticket.status === 'closed') return res.status(400).json({ error: 'Ticket fermé' });

            const id = uuidv4();
            await db.run(
                `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message)
                 VALUES (?, ?, ?, ?, ?)`,
                id,
                req.params.id,
                req.user.id,
                senderRoleFromAdmin(req),
                msg
            );

            // If open, move to in_progress automatically on first support reply
            if (ticket.status === 'open') {
                await db.run(`UPDATE tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
            } else if (ticket.status === 'waiting_on_customer' || ticket.status === 'resolved') {
                // A support reply means we are actively working again
                await db.run(`UPDATE tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
            } else {
                await db.run(`UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
            }

            await activityLogger.log({
                userId: req.user.id,
                action: 'ticket_reply_support',
                entityType: 'ticket',
                entityId: req.params.id,
                req
            });

            // Notify ticket owner
            try {
                const t = await db.get(`SELECT user_id, subject FROM tickets WHERE id = ?`, req.params.id);
                if (t?.user_id) {
                    await notificationService.create(t.user_id, {
                        type: 'info',
                        title: 'Réponse du support',
                        message: t.subject || 'Ticket support',
                        link: `/dashboard/tickets/${req.params.id}`,
                        metadata: { ticketId: req.params.id, event: 'ticket_message_support' }
                    });
                }
            } catch {}

            const created = await db.get(`SELECT * FROM ticket_messages WHERE id = ?`, id);
            return res.status(201).json({ message: created });
        } catch (error) {
            console.error('Admin reply ticket error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// Change status
router.patch(
    '/tickets/:id/status',
    authenticateAdmin,
    requirePermission('support.tickets.status'),
    async (req, res) => {
        try {
            const { status } = req.body || {};
            if (!STATUSES.has(status)) return res.status(400).json({ error: 'Statut invalide' });

            const ticket = await db.get(`SELECT * FROM tickets WHERE id = ?`, req.params.id);
            if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

            await db.run(`UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, status, req.params.id);

            await activityLogger.log({
                userId: req.user.id,
                action: 'ticket_status_change',
                entityType: 'ticket',
                entityId: req.params.id,
                details: { from: ticket.status, to: status },
                req
            });

            // Notify owner and assigned agent (if any)
            try {
                const t = await db.get(`SELECT user_id, subject, assigned_to FROM tickets WHERE id = ?`, req.params.id);
                if (t?.user_id) {
                    await notificationService.create(t.user_id, {
                        type: status === 'closed' ? 'success' : 'info',
                        title: 'Statut du ticket mis à jour',
                        message: `${t.subject || 'Ticket'} → ${status}`,
                        link: `/dashboard/tickets/${req.params.id}`,
                        metadata: { ticketId: req.params.id, event: 'ticket_status', status }
                    });
                }
                if (t?.assigned_to) {
                    await notificationService.create(t.assigned_to, {
                        type: 'info',
                        title: 'Statut ticket modifié',
                        message: `${t.subject || 'Ticket'} → ${status}`,
                        link: `/dashboard/support/tickets/${req.params.id}`,
                        metadata: { ticketId: req.params.id, event: 'ticket_status', status }
                    });
                }
            } catch {}

            const updated = await db.get(`SELECT * FROM tickets WHERE id = ?`, req.params.id);
            return res.json({ ticket: updated });
        } catch (error) {
            console.error('Admin ticket status error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// Assign ticket (full admin or support with assign perm)
router.patch(
    '/tickets/:id/assign',
    authenticateAdmin,
    requirePermission('support.tickets.assign'),
    async (req, res) => {
        try {
            const { assigned_to } = req.body || {};
            const ticket = await db.get(`SELECT * FROM tickets WHERE id = ?`, req.params.id);
            if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

            if (assigned_to === null || assigned_to === '' || assigned_to === 'unassigned') {
                await db.run(`UPDATE tickets SET assigned_to = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
            } else {
                const target = await db.get(`SELECT id FROM users WHERE id = ?`, assigned_to);
                if (!target) return res.status(400).json({ error: 'Agent invalide' });
                await db.run(`UPDATE tickets SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, assigned_to, req.params.id);
            }

            await activityLogger.log({
                userId: req.user.id,
                action: 'ticket_assign',
                entityType: 'ticket',
                entityId: req.params.id,
                details: { assigned_to: assigned_to || null },
                req
            });

            // Notify assigned agent
            try {
                const t = await db.get(`SELECT user_id, subject, assigned_to FROM tickets WHERE id = ?`, req.params.id);
                if (t?.assigned_to) {
                    await notificationService.create(t.assigned_to, {
                        type: 'info',
                        title: 'Ticket assigné',
                        message: t.subject || 'Ticket support',
                        link: `/dashboard/support/tickets/${req.params.id}`,
                        metadata: { ticketId: req.params.id, event: 'ticket_assigned' }
                    });
                }
            } catch {}

            const updated = await db.get(`SELECT * FROM tickets WHERE id = ?`, req.params.id);
            return res.json({ ticket: updated });
        } catch (error) {
            console.error('Admin ticket assign error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

// List support agents (for assignment UI)
router.get(
    '/support-agents',
    authenticateAdmin,
    requirePermission('support.tickets.assign'),
    async (req, res) => {
        try {
            const agents = await db.all(
                `
                SELECT DISTINCT u.id, u.name, u.email
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE u.is_active = 1 AND (
                  u.is_admin = 1 OR r.key IN ('support_agent', 'support')
                )
                ORDER BY u.name ASC
                `
            );
            return res.json({ agents: agents || [] });
        } catch (error) {
            console.error('Support agents list error:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

export default router;

