import express from 'express';
import { db } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappManager } from '../services/whatsapp.js';

const router = express.Router();

/**
 * GET /api/relances/stats
 * Aggregated statistics for proactive relances
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Status Distribution
        const statusDist = await db.all(`
            SELECT status, COUNT(*) as count 
            FROM proactive_message_log 
            WHERE user_id = ? 
            GROUP BY status
        `, userId);
        
        // 2. Type Distribution
        const typeDist = await db.all(`
            SELECT type, COUNT(*) as count 
            FROM proactive_message_log 
            WHERE user_id = ? 
            GROUP BY type
        `, userId);
        
        // 3. Daily trends (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        
        const dailyTrends = await db.all(`
            SELECT DATE(created_at) as date, COUNT(*) as count,
                   SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                   SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) as ignored
            FROM proactive_message_log
            WHERE user_id = ? AND created_at >= ?
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, userId, sevenDaysAgo.toISOString());

        res.json({
            statusDist,
            typeDist,
            dailyTrends
        });
    } catch (error) {
        console.error('[Relances API] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/relances
 * Fetch pending or sent/ignored relances
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const status = req.query.status || 'pending'; // 'pending', 'sent', 'ignored'
        
        const logs = await db.all(`
            SELECT p.*, c.contact_name, c.contact_number, c.contact_jid, a.name as agent_name
            FROM proactive_message_log p
            JOIN conversations c ON p.conversation_id = c.id
            LEFT JOIN agents a ON p.agent_id = a.id
            WHERE p.user_id = ? AND p.status = ?
            ORDER BY p.created_at DESC
        `, req.user.id, status);
        
        res.json(logs);
    } catch (error) {
        console.error('[Relances API] Get error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/relances/:id/send
 * Confirm and send a pending relance
 */
router.post('/:id/send', authenticateToken, async (req, res) => {
    try {
        const logId = req.params.id;
        const editedMessage = req.body.message_content; // Optional edited message
        
        const log = await db.get('SELECT * FROM proactive_message_log WHERE id = ? AND user_id = ? AND status = ?', logId, req.user.id, 'pending');
        if (!log) {
            return res.status(404).json({ error: 'Relance not found or not pending' });
        }
        
        const contentToSend = editedMessage || log.message_content;
        
        // Find tool id
        const agent = await db.get('SELECT tool_id FROM agents WHERE id = ?', log.agent_id);
        const conv = await db.get('SELECT contact_jid, contact_number FROM conversations WHERE id = ?', log.conversation_id);
        
        if (!agent || !conv) {
             return res.status(400).json({ error: 'Agent or conversation not found' });
        }
        
        await whatsappManager.sendMessage(agent.tool_id, conv.contact_jid, contentToSend);
        
        // Mark as sent
        await db.run('UPDATE proactive_message_log SET status = ?, sent_at = CURRENT_TIMESTAMP, message_content = ? WHERE id = ?', 'sent', contentToSend, logId);
        
        // Log to messages table like normal messages
         await db.run(`
            INSERT INTO messages (id, conversation_id, role, content, sender_type, message_type, created_at)
            VALUES (?, ?, 'assistant', ?, 'ai', 'relance', CURRENT_TIMESTAMP)
        `, logId + '_msg', log.conversation_id, contentToSend);
        
        res.json({ success: true, message: 'Relance envoyée' });
    } catch (error) {
        console.error('[Relances API] Send error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/relances/:id/ignore
 * Mark a pending relance as ignored
 */
router.post('/:id/ignore', authenticateToken, async (req, res) => {
    try {
        const logId = req.params.id;
        
        const log = await db.get('SELECT * FROM proactive_message_log WHERE id = ? AND user_id = ? AND status = ?', logId, req.user.id, 'pending');
        if (!log) {
            return res.status(404).json({ error: 'Relance not found or not pending' });
        }
        
        await db.run('UPDATE proactive_message_log SET status = ? WHERE id = ?', 'ignored', logId);
        
        res.json({ success: true, message: 'Relance ignorée' });
    } catch (error) {
        console.error('[Relances API] Ignore error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
