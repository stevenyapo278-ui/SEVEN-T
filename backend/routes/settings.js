import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireModule } from '../middleware/requireModule.js';

const router = Router();

/**
 * GET /api/settings/daily-briefing
 * Get daily briefing settings for the current user. Requires daily_briefing module.
 */
router.get('/daily-briefing', authenticateToken, requireModule('daily_briefing'), async (req, res) => {
    try {
        const row = await db.get(
            'SELECT user_id, enabled, preferred_hour, channel, email, whatsapp_contact_jid, last_sent_at, created_at, updated_at FROM daily_briefing_settings WHERE user_id = ?',
            req.user.id
        );
        if (!row) {
            return res.json({
                enabled: false,
                preferred_hour: 8,
                channel: 'email',
                email: null,
                whatsapp_contact_jid: null,
                last_sent_at: null
            });
        }
        res.json({
            enabled: Boolean(row.enabled),
            preferred_hour: row.preferred_hour ?? 8,
            channel: row.channel || 'email',
            email: row.email ?? null,
            whatsapp_contact_jid: row.whatsapp_contact_jid ?? null,
            last_sent_at: row.last_sent_at ?? null
        });
    } catch (error) {
        console.error('GET daily-briefing settings error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /api/settings/daily-briefing
 * Update daily briefing settings. Requires daily_briefing module.
 * Body: { enabled?, preferred_hour?, channel?, email?, whatsapp_contact_jid? }
 */
router.put('/daily-briefing', authenticateToken, requireModule('daily_briefing'), async (req, res) => {
    try {
        const { enabled, preferred_hour, channel, email, whatsapp_contact_jid } = req.body;
        const userId = req.user.id;

        const existing = await db.get('SELECT user_id FROM daily_briefing_settings WHERE user_id = ?', userId);

        const enabledVal = enabled === true || enabled === 1 ? 1 : 0;
        const hour = typeof preferred_hour === 'number' ? Math.max(0, Math.min(23, Math.floor(preferred_hour))) : 8;
        const channelVal = channel === 'whatsapp' ? 'whatsapp' : 'email';
        const emailVal = typeof email === 'string' ? email.trim() || null : null;
        const whatsappJid = typeof whatsapp_contact_jid === 'string' ? whatsapp_contact_jid.trim() || null : null;

        if (existing) {
            await db.run(
                `UPDATE daily_briefing_settings SET enabled = ?, preferred_hour = ?, channel = ?, email = ?, whatsapp_contact_jid = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
                enabledVal,
                hour,
                channelVal,
                emailVal,
                whatsappJid,
                userId
            );
        } else {
            await db.run(
                `INSERT INTO daily_briefing_settings (user_id, enabled, preferred_hour, channel, email, whatsapp_contact_jid, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                userId,
                enabledVal,
                hour,
                channelVal,
                emailVal,
                whatsappJid
            );
        }

        const row = await db.get(
            'SELECT user_id, enabled, preferred_hour, channel, email, whatsapp_contact_jid, last_sent_at FROM daily_briefing_settings WHERE user_id = ?',
            userId
        );
        res.json({
            enabled: Boolean(row.enabled),
            preferred_hour: row.preferred_hour ?? 8,
            channel: row.channel || 'email',
            email: row.email ?? null,
            whatsapp_contact_jid: row.whatsapp_contact_jid ?? null,
            last_sent_at: row.last_sent_at ?? null
        });
    } catch (error) {
        console.error('PUT daily-briefing settings error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
