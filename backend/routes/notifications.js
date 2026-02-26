import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = express.Router();

// Get all notifications for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const unreadOnly = req.query.unread === 'true';

        const notifications = await notificationService.getForUser(req.user.id, { limit, unreadOnly });
        let unreadCount = 0;
        try {
            unreadCount = await notificationService.getUnreadCount(req.user.id);
        } catch (unreadErr) {
            console.error('Get notifications unread count error:', unreadErr?.message || unreadErr);
        }
        res.json({
            notifications: Array.isArray(notifications) ? notifications : [],
            unreadCount: Number(unreadCount) || 0
        });
    } catch (error) {
        console.error('Get notifications error:', error?.message || error);
        if (error?.stack) console.error(error.stack);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// Get unread count only
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.id);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Mark a notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const success = await notificationService.markAsRead(req.params.id, req.user.id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notification non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Delete a notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const success = await notificationService.delete(req.params.id, req.user.id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notification non trouvée' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

export default router;
