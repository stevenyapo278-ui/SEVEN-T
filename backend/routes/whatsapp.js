import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappManager } from '../services/whatsapp.js';
import { checkToolLimit } from './tools.js';

const router = Router();

async function resolveToolAndAgent(userId, id, { createToolIfMissing = false } = {}) {
    let tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', id, userId);
    let agent = null;

    if (tool) {
        if (tool.type !== 'whatsapp') {
            return { error: 'Outil non WhatsApp', status: 400 };
        }
        agent = await db.get('SELECT * FROM agents WHERE tool_id = ?', tool.id) || null;
        return { tool, agent };
    }

    agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', id, userId);
    if (!agent) {
        return { error: 'Agent ou outil non trouvé', status: 404 };
    }

    if (agent.tool_id) {
        tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', agent.tool_id, userId);
    }

    if (!tool && createToolIfMissing) {
        const limitCheck = await checkToolLimit(userId, 'whatsapp');
        if (!limitCheck.allowed) {
            return {
                error: `Limite de comptes WhatsApp atteinte (${limitCheck.current}/${limitCheck.limit})`,
                status: 403,
                code: 'WHATSAPP_LIMIT_REACHED',
                limit: limitCheck.limit,
                current: limitCheck.current
            };
        }
        const toolId = agent.id;
        await db.run(`
            INSERT INTO tools (id, user_id, type, label, status, config, meta)
            VALUES (?, ?, 'whatsapp', ?, 'disconnected', ?, ?)
            ON CONFLICT (id) DO NOTHING
        `, toolId, userId, agent.whatsapp_number || 'WhatsApp', JSON.stringify({}), JSON.stringify({ phone: agent.whatsapp_number || null }));
        await db.run('UPDATE agents SET tool_id = ? WHERE id = ?', toolId, agent.id);
        tool = await db.get('SELECT * FROM tools WHERE id = ? AND user_id = ?', toolId, userId);
    }

    return { tool, agent };
}

// Get connection status for a tool (or agent fallback)
router.get('/status/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error, code: resolved.code, limit: resolved.limit, current: resolved.current });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }
        const status = whatsappManager.getStatus(toolId);
        const qr = (status.status === 'qr' || status.status === 'connecting') ? whatsappManager.getQRCode(toolId) : null;

        res.json({ 
            toolId,
            ...status,
            ...(qr && { qr })
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Connect WhatsApp for a tool (or agent fallback)
router.post('/connect/:id', authenticateToken, async (req, res) => {
    try {
        const { forceNew } = req.body;
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id, { createToolIfMissing: true });
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error, code: resolved.code, limit: resolved.limit, current: resolved.current });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        const result = await whatsappManager.connect(toolId, forceNew || false);

        res.json(result);
    } catch (error) {
        console.error('Connect error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Force reconnect with fresh session (new WhatsApp account)
router.post('/reconnect/:id', authenticateToken, async (req, res) => {
    try {
        const { keepConversations = false } = req.body;
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id, { createToolIfMissing: true });
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error, code: resolved.code, limit: resolved.limit, current: resolved.current });
        }
        const toolId = resolved.tool?.id;
        const agent = resolved.agent;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        // Disconnect first if connected
        await whatsappManager.disconnect(toolId, true);
        
        // Clear conversations unless explicitly asked to keep them
        // This is important when connecting a different WhatsApp account
        let clearedData = null;
        if (!keepConversations && agent) {
            clearedData = await whatsappManager.clearConversations(agent.id);
        }
        
        // Update database
        if (agent) {
            await db.run('UPDATE agents SET whatsapp_connected = 0, whatsapp_number = NULL WHERE id = ?', agent.id);
        }
        
        // Wait a moment then reconnect with fresh session
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await whatsappManager.connect(toolId, true);

        res.json({ 
            message: 'Reconnexion initiée', 
            ...result,
            clearedData: clearedData ? {
                conversations: clearedData.conversations,
                messages: clearedData.messages
            } : null
        });
    } catch (error) {
        console.error('Reconnect error:', error);
        res.status(500).json({ error: 'Erreur lors de la reconnexion' });
    }
});

// Clear all conversations for an agent (manual action)
router.post('/clear-conversations/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const agent = resolved.agent;
        if (!agent) {
            return res.status(404).json({ error: 'Aucun agent assigné à cet outil' });
        }

        const result = await whatsappManager.clearConversations(agent.id);
        
        res.json({ 
            message: `${result.conversations} conversation(s) et ${result.messages} message(s) supprimé(s)`,
            ...result
        });
    } catch (error) {
        console.error('Clear conversations error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression des conversations' });
    }
});

// Get QR code for a tool (or agent fallback)
router.get('/qr/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        const qrCode = whatsappManager.getQRCode(toolId);

        if (!qrCode) {
            return res.json({ qr: null, message: 'QR code non disponible' });
        }

        res.json({ qr: qrCode });
    } catch (error) {
        console.error('Get QR error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Disconnect WhatsApp for a tool (or agent fallback)
router.post('/disconnect/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        // Option A: clear session so next connection requires a new QR scan
        await whatsappManager.disconnect(toolId, true);

        res.json({ message: 'Déconnecté avec succès' });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

// Send a test message
router.post('/send/:id', authenticateToken, async (req, res) => {
    try {
        const { to, message } = req.body;

        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        if (!whatsappManager.isConnected(toolId)) {
            return res.status(400).json({ error: 'WhatsApp non connecté' });
        }

        const result = await whatsappManager.sendMessage(toolId, to, message);

        res.json(result);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
    }
});

// ==================== SYNC ROUTES ====================

// Sync all chats for a tool (or agent fallback)
router.post('/sync/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        // Check if socket is actually available
        if (!whatsappManager.isConnected(toolId)) {
            return res.json({ 
                message: 'Connexion en cours, veuillez réessayer dans quelques secondes',
                synced: 0,
                pending: true
            });
        }

        const result = await whatsappManager.syncChats(toolId);
        res.json({ message: 'Synchronisation terminée', ...result });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de la synchronisation' });
    }
});

// Get sync status for a tool (or agent fallback)
router.get('/sync-status/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        const syncStatus = whatsappManager.getSyncStatus(toolId);
        const lastSyncTime = whatsappManager.getLastSyncTime(toolId);

        res.json({ 
            ...syncStatus,
            lastSyncTime
        });
    } catch (error) {
        console.error('Get sync status error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Cleanup empty conversations (no messages)
router.post('/cleanup/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.id);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        const result = await whatsappManager.cleanupEmptyConversations(toolId);
        res.json({ 
            message: `${result.deleted} conversation(s) vide(s) supprimée(s)`,
            ...result
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Sync messages for a specific conversation
router.post('/sync-messages/:agentId/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { limit } = req.body;
        const resolved = await resolveToolAndAgent(req.user.id, req.params.agentId);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error, code: resolved.code, limit: resolved.limit, current: resolved.current });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        if (!whatsappManager.isConnected(toolId)) {
            return res.status(400).json({ error: 'WhatsApp non connecté' });
        }

        const result = await whatsappManager.syncMessages(toolId, req.params.conversationId, limit || 50);
        res.json({ message: 'Messages synchronisés', ...result });
    } catch (error) {
        console.error('Sync messages error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de la synchronisation' });
    }
});

// Get contacts for an agent
router.get('/contacts/:agentId', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.id, req.params.agentId);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error, code: resolved.code, limit: resolved.limit, current: resolved.current });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }

        // Return empty array if WhatsApp not connected (graceful handling)
        if (!whatsappManager.isConnected(toolId)) {
            return res.json({ contacts: [], message: 'WhatsApp non connecté' });
        }

        try {
            const contacts = await whatsappManager.getContacts(toolId);
            res.json({ contacts });
        } catch (contactError) {
            // If WhatsApp session is not active, return empty array
            console.log('Contacts fetch failed (session may be inactive):', contactError.message);
            res.json({ contacts: [], message: 'Session WhatsApp inactive' });
        }
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get profile picture for a contact (contactJid may be URL-encoded)
router.get('/profile-picture/:agentId/:contactJid', authenticateToken, async (req, res) => {
    const contactJid = decodeURIComponent(req.params.contactJid || '');
    try {
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        if (!agent.whatsapp_connected) {
            return res.json({ url: null, message: 'WhatsApp non connecté' });
        }

        const url = await whatsappManager.getProfilePicture(req.params.agentId, contactJid);
        res.json({ url });
    } catch (error) {
        res.json({ url: null });
    }
});

// Get profile pictures for multiple contacts (batch)
router.post('/profile-pictures/:agentId', authenticateToken, async (req, res) => {
    try {
        const { contactJids } = req.body;
        
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        if (!agent.whatsapp_connected || !Array.isArray(contactJids)) {
            return res.json({ pictures: {} });
        }

        // Limit to 10 contacts at a time to avoid rate limiting
        const limitedJids = contactJids.slice(0, 10);
        const pictures = await whatsappManager.getProfilePictures(req.params.agentId, limitedJids);
        res.json({ pictures });
    } catch (error) {
        console.error('Get profile pictures error:', error);
        res.json({ pictures: {} });
    }
});

// Send message to a conversation and save
router.post('/send-to-conversation/:agentId/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message requis' });
        }

        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        if (!agent.whatsapp_connected) {
            return res.status(400).json({ error: 'WhatsApp non connecté' });
        }

        const toolId = agent.tool_id;
        if (!toolId) {
            return res.status(400).json({ error: 'Aucun outil WhatsApp assigné à cet agent' });
        }

        const result = await whatsappManager.sendMessageAndSave(
            toolId, 
            req.params.conversationId, 
            message.trim()
        );

        res.json(result);
    } catch (error) {
        console.error('Send to conversation error:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'envoi' });
    }
});

// Get new messages since a timestamp (for polling)
router.get('/new-messages/:agentId', authenticateToken, async (req, res) => {
    try {
        const { since } = req.query;

        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const toolId = agent.tool_id;
        if (!toolId) {
            return res.json({ messages: [], timestamp: new Date().toISOString() });
        }

        const sinceDate = since || new Date(Date.now() - 60000).toISOString(); // Default: last minute
        const messages = await whatsappManager.getNewMessages(toolId, sinceDate);

        res.json({ 
            messages,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get new messages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
