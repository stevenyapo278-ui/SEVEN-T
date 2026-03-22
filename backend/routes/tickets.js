import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
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

// Create ticket (user)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { subject, description, priority } = req.body || {};

        const subj = typeof subject === 'string' ? subject.trim() : '';
        const desc = typeof description === 'string' ? description.trim() : '';
        const prio = typeof priority === 'string' ? priority : 'medium';

        if (!subj) return res.status(400).json({ error: 'Sujet requis' });
        if (subj.length > 200) return res.status(400).json({ error: 'Sujet trop long (max 200)' });
        if (desc.length > 5000) return res.status(400).json({ error: 'Description trop longue (max 5000)' });
        if (!PRIORITIES.has(prio)) return res.status(400).json({ error: 'Priorité invalide' });

        const id = uuidv4();
        await db.run(
            `INSERT INTO tickets (id, user_id, subject, description, status, priority)
             VALUES (?, ?, ?, ?, 'open', ?)`,
            id,
            req.user.ownerId,
            subj,
            desc || null,
            prio
        );

        const firstMsg = desc ? desc : null;
        if (firstMsg) {
            await db.run(
                `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message)
                 VALUES (?, ?, ?, 'user', ?)`,
                uuidv4(),
                id,
                req.user.ownerId,
                firstMsg
            );
        }

        await activityLogger.log({
            userId: req.user.id,
            action: 'create_ticket',
            entityType: 'ticket',
            entityId: id,
            details: { subject: subj, priority: prio },
            req
        });

        // Notify creator
        await notificationService.create(req.user.ownerId, {
            type: 'info',
            title: 'Ticket créé',
            message: `Votre ticket "${subj}" a été créé.`,
            link: `/dashboard/tickets/${id}`,
            metadata: { ticketId: id, event: 'ticket_created' }
        });

        // Notify admins/support (all admins + support_agent role users)
        const staff = await db.all(
            `
            SELECT DISTINCT u.id
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.is_active = 1 AND (u.is_admin = 1 OR r.key IN ('support_agent', 'support'))
            `
        );
        for (const s of staff || []) {
            if (!s?.id) continue;
            if (s.id === req.user.ownerId) continue;
            await notificationService.create(s.id, {
                type: 'info',
                title: 'Nouveau ticket support',
                message: `${subj}`,
                link: `/dashboard/support/tickets/${id}`,
                metadata: { ticketId: id, event: 'ticket_created', priority: prio }
            });
        }

        const ticket = await db.get(
            `SELECT * FROM tickets WHERE id = ? AND user_id = ?`,
            id,
            req.user.ownerId
        );

        return res.status(201).json({ ticket });
    } catch (error) {
        console.error('Create ticket error:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// List my tickets (user) with pagination/filter
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, priority, q } = req.query || {};
        const limit = clampInt(req.query?.limit, { min: 1, max: 100, fallback: 25 });
        const offset = clampInt(req.query?.offset, { min: 0, max: 100000, fallback: 0 });

        const where = ['t.user_id = ?'];
        const params = [req.user.ownerId];

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
        if (typeof q === 'string' && q.trim()) {
            where.push('(t.subject ILIKE ? OR t.description ILIKE ?)');
            params.push(`%${q.trim()}%`, `%${q.trim()}%`);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const totalRow = await db.get(`SELECT COUNT(*)::int as count FROM tickets t ${whereSql}`, ...params);
        const tickets = await db.all(
            `
            SELECT t.*
            FROM tickets t
            ${whereSql}
            ORDER BY t.updated_at DESC, t.created_at DESC
            LIMIT ? OFFSET ?
            `,
            ...params,
            limit,
            offset
        );

        return res.json({ tickets: tickets || [], total: totalRow?.count ?? 0, limit, offset });
    } catch (error) {
        console.error('List tickets error:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get my ticket detail + messages
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const ticket = await db.get(`SELECT * FROM tickets WHERE id = ? AND user_id = ?`, req.params.id, req.user.ownerId);
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

        const messages = await db.all(
            `SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
            req.params.id
        );

        return res.json({ ticket, messages: messages || [] });
    } catch (error) {
        console.error('Get ticket error:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add message to my ticket
router.post('/:id/messages', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body || {};
        const msg = typeof message === 'string' ? message.trim() : '';
        if (!msg) return res.status(400).json({ error: 'Message requis' });
        if (msg.length > 5000) return res.status(400).json({ error: 'Message trop long (max 5000)' });

        const ticket = await db.get(`SELECT * FROM tickets WHERE id = ? AND user_id = ?`, req.params.id, req.user.ownerId);
        if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

        if (ticket.status === 'closed') return res.status(400).json({ error: 'Ticket fermé' });

        const id = uuidv4();
        await db.run(
            `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message)
             VALUES (?, ?, ?, 'user', ?)`,
            id,
            req.params.id,
            req.user.ownerId,
            msg
        );

        // If client replies while ticket was resolved or waiting for customer, move back to in_progress
        if (ticket.status === 'resolved' || ticket.status === 'waiting_on_customer') {
            await db.run(`UPDATE tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
            await activityLogger.log({
                userId: req.user.id,
                action: 'ticket_status_change',
                entityType: 'ticket',
                entityId: req.params.id,
                details: { from: ticket.status, to: 'in_progress', reason: 'user_reply' },
                req
            });
        } else {
            await db.run(`UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, req.params.id);
        }

        // Notify assigned agent if any, otherwise notify staff
        const fresh = await db.get(`SELECT id, subject, assigned_to FROM tickets WHERE id = ?`, req.params.id);
        if (fresh?.assigned_to) {
            await notificationService.create(fresh.assigned_to, {
                type: 'info',
                title: 'Nouveau message (ticket)',
                message: `Ticket: ${fresh.subject}`,
                link: `/dashboard/support/tickets/${req.params.id}`,
                metadata: { ticketId: req.params.id, event: 'ticket_message_user' }
            });
        } else {
            const staff = await db.all(
                `
                SELECT DISTINCT u.id
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE u.is_active = 1 AND (u.is_admin = 1 OR r.key IN ('support_agent', 'support'))
                `
            );
            for (const s of staff || []) {
                if (!s?.id) continue;
                await notificationService.create(s.id, {
                    type: 'info',
                    title: 'Nouveau message client',
                    message: `Ticket: ${fresh?.subject || req.params.id}`,
                    link: `/dashboard/support/tickets/${req.params.id}`,
                    metadata: { ticketId: req.params.id, event: 'ticket_message_user' }
                });
            }
        }

        await activityLogger.log({
            userId: req.user.id,
            action: 'ticket_reply_user',
            entityType: 'ticket',
            entityId: req.params.id,
            req
        });

        const created = await db.get(`SELECT * FROM ticket_messages WHERE id = ?`, id);
        return res.status(201).json({ message: created });
    } catch (error) {
        console.error('Add ticket message error:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;

