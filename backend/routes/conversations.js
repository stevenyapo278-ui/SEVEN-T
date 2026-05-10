import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, extname, resolve } from 'path';
import { existsSync } from 'fs';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { getPlan, hasModule, hasModuleForUser } from '../config/plans.js';
import { 
    validate,
    updateConversationStatusSchema,
    updateConversationContactSchema,
    bulkTakeoverSchema,
    toggleTakeoverSchema,
    deleteMessagesSchema,
    bulkDeleteConversationsSchema,
    bulkMarkReadSchema
} from '../middleware/security.js';
import { generateConversationPdf } from '../services/conversationPdfExport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Get distinct imported contacts (from conversations)
// Must be before any "/:id" routes
router.get('/imported-contacts', authenticateToken, async (req, res) => {
    try {
        const { agent_id, q, min_messages, limit } = req.query || {};

        const safeLimit = Math.max(1, Math.min(parseInt(limit || '200', 10) || 200, 500));
        const safeMinMessages = Math.max(0, parseInt(min_messages || '0', 10) || 0);
        const search = (q || '').toString().trim();

        if (agent_id) {
            const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.ownerId);
            if (!agent) {
                return res.status(404).json({ error: 'Agent non trouvé' });
            }
        }

        const nameExpr = `COALESCE(NULLIF(TRIM(c.contact_name), ''), NULLIF(TRIM(c.push_name), ''), c.contact_number)`;

        let query = `
            SELECT
                c.agent_id,
                a.name as agent_name,
                c.contact_number,
                ${nameExpr} as contact_name,
                MAX(COALESCE(c.last_message_at, c.created_at)) as last_message_at,
                COUNT(m.id) as message_count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE a.user_id = ?
            AND c.contact_number IS NOT NULL
            AND TRIM(c.contact_number) != ''
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid' OR c.contact_jid LIKE '%@g.us')
        `;
        const params = [req.user.ownerId];

        if (agent_id) {
            query += ' AND c.agent_id = ?';
            params.push(agent_id);
        }

        if (search) {
            query += ' AND (LOWER(c.contact_number) LIKE ? OR LOWER(c.contact_name) LIKE ? OR LOWER(c.push_name) LIKE ?)';
            const s = `%${search.toLowerCase()}%`;
            params.push(s, s, s);
        }

        query += `
            GROUP BY c.agent_id, a.name, c.contact_number, ${nameExpr}
        `;

        if (safeMinMessages > 0) {
            query += ` HAVING COUNT(m.id) >= ?`;
            params.push(safeMinMessages);
        }

        query += `
            ORDER BY last_message_at DESC
            LIMIT ?
        `;
        params.push(safeLimit);

        const contacts = await db.all(query, ...params);
        res.json({ contacts: Array.isArray(contacts) ? contacts : [], limit: safeLimit });
    } catch (error) {
        console.error('Get imported contacts error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all conversations for an agent
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
    try {
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.ownerId);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const conversations = await db.all(`
            SELECT c.*,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
            FROM conversations c
            WHERE c.agent_id = ?
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid' OR c.contact_jid LIKE '%@g.us')
            ORDER BY c.last_message_at DESC
        `, req.params.agentId);

        res.json({ conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all conversations for user (across all agents)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.ownerId);
        const hasConversionScore = await hasModuleForUser(user, 'conversion_score');

        const score_band = req.query.score_band; // high_potential | at_risk
        let scoreClause = '';
        if (hasConversionScore && score_band === 'high_potential') {
            scoreClause = ' AND c.conversion_score >= 70';
        } else if (hasConversionScore && score_band === 'at_risk') {
            scoreClause = ' AND c.conversion_score <= 30 AND c.conversion_score IS NOT NULL';
        }

        const conversations = await db.all(`
            SELECT c.*, a.name as agent_name,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
                   (SELECT COUNT(*) FROM proactive_message_log WHERE conversation_id = c.id AND status = 'pending') as pending_relances_count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid' OR c.contact_jid LIKE '%@g.us')
            ${scoreClause}
            ORDER BY c.last_message_at DESC
            LIMIT 100
        `, req.user.ownerId);

        const totalMessagesRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid' OR c.contact_jid LIKE '%@g.us')
        `, req.user.ownerId);
        const totalMessages = totalMessagesRow?.count ?? 0;

        res.json({ conversations, totalMessages: Number(totalMessages) });
    } catch (error) {
        console.error('Get all conversations error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get message media (image) - must be before GET /:id
router.get('/:convId/messages/:msgId/media', authenticateToken, async (req, res) => {
    try {
        const msg = await db.get(`
            SELECT m.media_url, m.message_type
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE m.id = ? AND c.id = ? AND a.user_id = ?
        `, req.params.msgId, req.params.convId, req.user.ownerId);
        if (!msg || !msg.media_url) {
            return res.status(404).json({ error: 'Média non trouvé' });
        }
        const filepath = join(__dirname, '..', '..', 'uploads', 'messages', msg.media_url);
        if (!existsSync(filepath)) {
            return res.status(404).json({ error: 'Fichier non trouvé' });
        }
        const ext = extname(msg.media_url || '').toLowerCase();
        let contentType = null;
        if (msg.message_type === 'audio') {
            if (ext === '.mp3') {
                contentType = 'audio/mpeg';
            } else if (ext === '.opus') {
                contentType = 'audio/opus';
            } else {
                contentType = 'audio/ogg';
            }
        } else if (msg.message_type === 'image') {
            contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
        }
        if (contentType) {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Accept-Ranges', 'bytes');
        }
        res.sendFile(resolve(filepath));
    } catch (error) {
        console.error('Get message media error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Export conversation to PDF (messages included)
router.get('/:id/export/pdf', authenticateToken, async (req, res) => {
    try {
        const conversation = await db.get(`
            SELECT c.*, a.name as agent_name
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const MAX_MESSAGES = 500;
        const total = await db.get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', req.params.id);
        const messages = await db.all(`
            SELECT role, content, created_at, message_type
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        `, req.params.id, MAX_MESSAGES);

        const pdfBytes = await generateConversationPdf(conversation, messages, {
            messagesTotal: total?.count || messages.length
        });

        const safeContact = (conversation.contact_name || conversation.contact_number || conversation.id)
            .toString()
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]/g, '');
        const filename = `conversation-${safeContact || conversation.id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Export conversation PDF error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get unread conversations count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const row = await db.get(`
            SELECT COALESCE(SUM(COALESCE(c.unread_messages_count, 0)), 0) as count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
        `, req.user.ownerId);
        res.json({ count: row?.count || 0 });
    } catch (error) {
        console.error('Get unread conversation count error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Initiate or get existing conversation for a new contact message
router.post('/initiate', authenticateToken, async (req, res) => {
    try {
        const { agent_id, contact_jid, contact_name, contact_number } = req.body;
        if (!agent_id || !contact_jid) {
            return res.status(400).json({ error: 'agent_id et contact_jid sont requis' });
        }
        const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.ownerId);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }
        let conv = await db.get('SELECT id FROM conversations WHERE agent_id = ? AND contact_jid = ?', agent_id, contact_jid);
        if (conv) {
            return res.json({ id: conv.id });
        }
        // Create new
        const { v4: uuidv4 } = await import('uuid');
        const newId = uuidv4();
        await db.run(`
            INSERT INTO conversations (id, agent_id, contact_jid, contact_name, contact_number, last_message_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, newId, agent_id, contact_jid, contact_name || contact_number, contact_number || contact_jid.split('@')[0]);

        res.json({ id: newId });
    } catch (error) {
        console.error('Initiate conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single conversation with messages
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const conversation = await db.get(`
            SELECT c.*, a.name as agent_name,
                   (SELECT COUNT(*) FROM proactive_message_log WHERE conversation_id = c.id AND status = 'pending') as pending_relances_count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const LIMIT_MESSAGES = 100;
        const total = await db.get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', req.params.id);
        const messagesDesc = await db.all(`
            SELECT * FROM messages 
            WHERE conversation_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, req.params.id, LIMIT_MESSAGES);
        const messages = messagesDesc.reverse();

        res.json({
            conversation,
            messages,
            messagesTotal: total.count,
            messagesHasMore: total.count > LIMIT_MESSAGES
        });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update conversation status
router.put('/:id/status', authenticateToken, validate(updateConversationStatusSchema), async (req, res) => {
    try {
        const { status } = req.body;

        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run('UPDATE conversations SET status = ? WHERE id = ?', status, req.params.id);

        res.json({ message: 'Statut mis à jour' });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete conversation
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run('DELETE FROM conversations WHERE id = ?', req.params.id);

        res.json({ message: 'Conversation supprimée' });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Bulk delete conversations
router.delete('/bulk/delete', authenticateToken, validate(bulkDeleteConversationsSchema), async (req, res) => {
    try {
        const { conversation_ids } = req.body;
        
        if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
            return res.status(400).json({ error: 'Liste de conversations requise' });
        }

        const placeholders = conversation_ids.map(() => '?').join(',');
        const ownedConversations = await db.all(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id IN (${placeholders}) AND a.user_id = ?
        `, ...conversation_ids, req.user.ownerId);

        if (ownedConversations.length !== conversation_ids.length) {
            return res.status(403).json({ error: 'Certaines conversations ne vous appartiennent pas' });
        }

        const validIds = ownedConversations.map(c => c.id);

        // Delete messages first (cascade)
        await db.run(`DELETE FROM messages WHERE conversation_id IN (${placeholders})`, ...validIds);
        // Delete conversations
        await db.run(`DELETE FROM conversations WHERE id IN (${placeholders})`, ...validIds);

        res.json({ message: `${validIds.length} conversation(s) supprimée(s)`, deleted: validIds.length });
    } catch (error) {
        console.error('Bulk delete conversations error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Bulk mark conversations as read
router.post('/bulk/mark-read', authenticateToken, validate(bulkMarkReadSchema), async (req, res) => {
    try {
        const { conversation_ids } = req.body;
        
        if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
            return res.status(400).json({ error: 'Liste de conversations requise' });
        }

        const placeholders = conversation_ids.map(() => '?').join(',');
        const ownedConversations = await db.all(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id IN (${placeholders}) AND a.user_id = ?
        `, ...conversation_ids, req.user.ownerId);

        if (ownedConversations.length !== conversation_ids.length) {
            return res.status(403).json({ error: 'Certaines conversations ne vous appartiennent pas' });
        }

        const validIds = ownedConversations.map(c => c.id);
        await db.run(`UPDATE conversations SET unread_messages_count = 0 WHERE id IN (${placeholders})`, ...validIds);

        res.json({ message: 'Conversations marquées comme lues', updated: validIds.length });
    } catch (error) {
        console.error('Bulk mark read error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Bulk toggle human takeover for multiple conversations (MUST be before /:id routes)
router.put('/bulk/takeover', authenticateToken, validate(bulkTakeoverSchema), async (req, res) => {
    try {
        const { conversation_ids, human_takeover } = req.body;

        if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
            return res.status(400).json({ error: 'Liste de conversations requise' });
        }

        const placeholders = conversation_ids.map(() => '?').join(',');
        const ownedConversations = await db.all(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id IN (${placeholders}) AND a.user_id = ?
        `, ...conversation_ids, req.user.ownerId);

        if (ownedConversations.length !== conversation_ids.length) {
            return res.status(403).json({ error: 'Certaines conversations ne vous appartiennent pas' });
        }

        await db.run(`UPDATE conversations SET human_takeover = ? WHERE id IN (${placeholders})`, human_takeover ? 1 : 0, ...conversation_ids);

        res.json({ 
            message: `${conversation_ids.length} conversation(s) ${human_takeover ? 'passée(s) en mode humain' : 'passée(s) en mode IA'}`,
            updated: conversation_ids.length,
            human_takeover: human_takeover ? 1 : 0
        });
    } catch (error) {
        console.error('Bulk takeover error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle human takeover for a single conversation
router.put('/:id/takeover', authenticateToken, validate(toggleTakeoverSchema), async (req, res) => {
    try {
        const { human_takeover } = req.body;

        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run('UPDATE conversations SET human_takeover = ? WHERE id = ?', human_takeover ? 1 : 0, req.params.id);

        res.json({ 
            message: human_takeover ? 'Mode humain activé' : 'Mode IA activé',
            human_takeover: human_takeover ? 1 : 0
        });
    } catch (error) {
        console.error('Update takeover error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update contact name for a conversation
router.put('/:id/contact', authenticateToken, validate(updateConversationContactSchema), async (req, res) => {
    try {
        const { contact_name } = req.body;

        if (!contact_name || !contact_name.trim()) {
            return res.status(400).json({ error: 'Nom requis' });
        }

        const conversation = await db.get(`
            SELECT c.id, c.contact_jid, c.agent_id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run('UPDATE conversations SET contact_name = ? WHERE id = ?', contact_name.trim(), req.params.id);

        await db.run(`
            UPDATE conversations SET contact_name = ? 
            WHERE contact_jid = ? AND agent_id IN (SELECT id FROM agents WHERE user_id = ?)
        `, contact_name.trim(), conversation.contact_jid, req.user.ownerId);

        res.json({ message: 'Nom du contact mis à jour', contact_name: contact_name.trim() });
    } catch (error) {
        console.error('Update contact name error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== REAL-TIME / POLLING ROUTES ====================

// Get new messages for a conversation since timestamp (for polling)
router.get('/:id/new-messages', authenticateToken, async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const { since } = req.query;

        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const sinceDate = since || new Date(Date.now() - 60000).toISOString();
        const messages = await db.all(`
            SELECT * FROM messages 
            WHERE conversation_id = ? AND created_at > ?
            ORDER BY created_at ASC
        `, req.params.id, sinceDate);

        res.json({
            messages: Array.isArray(messages) ? messages : [],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get new messages error:', error?.message || error);
        if (error?.stack) console.error(error.stack);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get conversation updates for all conversations (for dashboard polling)
router.get('/updates/all', authenticateToken, async (req, res) => {
    try {
        const { since } = req.query;
        const sinceDate = since || new Date(Date.now() - 60000).toISOString();

        const updates = await db.all(`
            SELECT 
                c.id,
                c.contact_name,
                c.contact_number,
                c.last_message_at,
                a.id as agent_id,
                a.name as agent_name,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND created_at > ?) as new_message_count,
                (SELECT COUNT(*) FROM proactive_message_log WHERE conversation_id = c.id AND status = 'pending') as pending_relances_count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.last_message_at > ?
            ORDER BY c.last_message_at DESC
        `, sinceDate, req.user.ownerId, sinceDate);

        const totalNew = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.created_at > ?
        `, req.user.ownerId, sinceDate);

        res.json({ 
            updates,
            totalNewMessages: totalNew?.count || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get updates error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get message history with pagination
router.get('/:id/messages', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, before } = req.query;

        const conversation = await db.get(`
            SELECT c.* FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        let query = `
            SELECT * FROM messages 
            WHERE conversation_id = ?
        `;
        const params = [req.params.id];

        if (before) {
            query += ` AND created_at < ?`;
            params.push(before);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const messages = await db.all(query, ...params);

        const total = await db.get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', req.params.id);

        res.json({ 
            messages: messages.reverse(), // Return in chronological order
            total: total.count,
            hasMore: parseInt(offset) + messages.length < total.count
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete messages (selection and/or all)
router.delete('/:id/messages', authenticateToken, validate(deleteMessagesSchema), async (req, res) => {
    try {
        const { message_ids, delete_all } = req.body || {};

        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const convId = req.params.id;

        if (delete_all === true) {
            const result = await db.run('DELETE FROM messages WHERE conversation_id = ?', convId);
            return res.json({ message: `${result.rowCount} message(s) supprimé(s)`, deleted: result.rowCount });
        }

        if (message_ids && Array.isArray(message_ids) && message_ids.length > 0) {
            const placeholders = message_ids.map(() => '?').join(',');
            const result = await db.run(`
                DELETE FROM messages WHERE id IN (${placeholders}) AND conversation_id = ?
            `, ...message_ids, convId);
            return res.json({ message: `${result.rowCount} message(s) supprimé(s)`, deleted: result.rowCount });
        }

        return res.status(400).json({ error: 'Indiquez message_ids (tableau) ou delete_all: true' });
    } catch (error) {
        console.error('Delete messages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mark messages as read
router.post('/:id/mark-read', authenticateToken, async (req, res) => {
    try {
        const conversation = await db.get(`
            SELECT c.id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run(
            'UPDATE conversations SET status = ?, unread_messages_count = 0, last_read_at = CURRENT_TIMESTAMP WHERE id = ?',
            'read',
            req.params.id
        );

        res.json({ message: 'Messages marqués comme lus' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle human takeover mode for a conversation
router.post('/:id/human-takeover', authenticateToken, async (req, res) => {
    try {
        const { enabled } = req.body;
        
        const conversation = await db.get(`
            SELECT c.*, a.id as agent_id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        await db.run('UPDATE conversations SET human_takeover = ? WHERE id = ?', enabled ? 1 : 0, req.params.id);

        res.json({ 
            message: enabled ? 'Prise en charge humaine activée' : 'Réponse IA réactivée',
            human_takeover: enabled
        });
    } catch (error) {
        console.error('Toggle human takeover error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send a message from the platform (human intervention)
router.post('/:id/send', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Le message est requis' });
        }
        
        const conversation = await db.get(`
            SELECT c.*, a.id as agent_id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const { default: whatsappService } = await import('../services/whatsapp.js');
        
        const result = await whatsappService.sendMessage(
            conversation.agent_id, 
            req.params.id, 
            message.trim(),
            req.user.ownerId
        );

        res.json({ 
            message: 'Message envoyé',
            ...result
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});

// Get conversations that need human intervention
router.get('/needs-human', authenticateToken, async (req, res) => {
    try {
        const conversations = await db.all(`
            SELECT c.*, a.name as agent_name,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            AND (c.needs_human = 1 OR c.human_takeover = 1)
            ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
        `, req.user.ownerId);

        res.json({ conversations });
    } catch (error) {
        console.error('Get human conversations error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


export default router;
