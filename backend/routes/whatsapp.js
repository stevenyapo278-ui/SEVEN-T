import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappManager } from '../services/whatsapp.js';
import { checkToolLimit } from './tools.js';
import multer from 'multer';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Configure multer for status uploads
const statusUploadDir = join(__dirname, '..', '..', 'uploads', 'status');
if (!fs.existsSync(statusUploadDir)) {
    fs.mkdirSync(statusUploadDir, { recursive: true });
}
const statusUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, statusUploadDir),
        filename: (req, file, cb) => {
            const ext = file.originalname.split('.').pop() || 'tmp';
            cb(null, `status_${Date.now()}_${Math.round(Math.random() * 1E9)}.${ext}`);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max
});

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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id, { createToolIfMissing: true });
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id, { createToolIfMissing: true });
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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

        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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

        const result = await whatsappManager.sendAutomatedMessageAndSave(toolId, to, message, { messageType: 'test' });

        res.json(result);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: "Erreur lors de l'envoi" });
    }
});

// ==================== SYNC ROUTES ====================

// Sync all chats for a tool (or agent fallback)
router.post('/sync/:id', authenticateToken, async (req, res) => {
    try {
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.id);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.agentId);
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
        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.agentId);
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

// Get imported contacts from Baileys store (full contact list)
// Optional query params: agent_id, q, limit
router.get('/imported-contacts', authenticateToken, async (req, res) => {
    try {
        const { agent_id, q, limit } = req.query || {};
        const safeLimit = Math.max(1, Math.min(parseInt(limit || '2000', 10) || 2000, 5000));
        const search = (q || '').toString().trim();

        let agents = [];
        if (agent_id) {
            const agent = await db.get('SELECT id, name, tool_id, whatsapp_connected FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.ownerId);
            if (!agent) return res.status(404).json({ error: 'Agent non trouvé' });
            agents = [agent];
        } else {
            agents = await db.all(`
                SELECT id, name, tool_id, whatsapp_connected
                FROM agents
                WHERE user_id = ? AND tool_id IS NOT NULL
                ORDER BY name ASC
            `, req.user.ownerId);
        }

        const merged = new Map(); // number -> contact

        for (const a of (agents || [])) {
            const toolId = a.tool_id;
            if (!toolId) continue;
            if (!whatsappManager.isConnected(toolId)) continue;

            const list = await whatsappManager.getStoreContacts(toolId, { q: search, limit: safeLimit });
            for (const c of (list || [])) {
                const number = String(c.number || '').replace(/\D/g, '');
                if (!number) continue;
                if (!merged.has(number)) {
                    merged.set(number, {
                        agent_id: a.id,
                        agent_name: a.name,
                        contact_number: c.number,
                        contact_name: c.name || c.number,
                        jid: c.jid,
                        is_my_contact: !!c.isMyContact
                    });
                }
                if (merged.size >= safeLimit) break;
            }
            if (merged.size >= safeLimit) break;
        }

        const contacts = Array.from(merged.values()).sort((x, y) => {
            const xn = String(x.contact_name || '').toLowerCase();
            const yn = String(y.contact_name || '').toLowerCase();
            if (xn < yn) return -1;
            if (xn > yn) return 1;
            return String(x.contact_number || '').localeCompare(String(y.contact_number || ''));
        });

        res.json({ 
            contacts, 
            limit: safeLimit, 
            source: 'baileys_store',
            reason: contacts.length === 0 ? 'store_empty_or_not_connected' : null
        });
    } catch (error) {
        console.error('Get imported contacts (store) error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Quick diagnostics for Baileys store state (debug)
router.get('/imported-contacts/debug', authenticateToken, async (req, res) => {
    try {
        const { agent_id } = req.query || {};
        const agents = agent_id
            ? [await db.get('SELECT id, name, tool_id FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.ownerId)]
            : await db.all('SELECT id, name, tool_id FROM agents WHERE user_id = ? AND tool_id IS NOT NULL ORDER BY name ASC', req.user.ownerId);

        const data = (agents || []).filter(Boolean).map((a) => {
            const toolId = a.tool_id;
            const store = toolId ? whatsappManager.stores?.get(toolId) : null;
            const contactsCount = store?.contacts ? Object.keys(store.contacts).length : 0;
            const chatsCount = store?.chats ? (store.chats.size || 0) : 0;
            const connected = toolId ? whatsappManager.isConnected(toolId) : false;
            const status = toolId ? whatsappManager.getStatus(toolId) : { status: 'no_tool' };
            return { agent_id: a.id, agent_name: a.name, tool_id: toolId, connected, status, contactsCount, chatsCount };
        });

        res.json({ agents: data });
    } catch (error) {
        console.error('Imported contacts debug error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get profile picture for a contact (contactJid may be URL-encoded)
router.get('/profile-picture/:agentId/:contactJid', authenticateToken, async (req, res) => {
    const contactJid = decodeURIComponent(req.params.contactJid || '');
    try {
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.ownerId);
        
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
        
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.ownerId);
        
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

        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.ownerId);
        
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
        res.status(500).json({ error: error.message || "Erreur lors de l'envoi" });
    }
});

// Get new messages since a timestamp (for polling)
router.get('/new-messages/:agentId', authenticateToken, async (req, res) => {
    try {
        const { since } = req.query;

        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.ownerId);
        
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

// ==================== STATUS (STORY) ROUTES ====================

// Upload media for status
router.post('/status/upload', authenticateToken, statusUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier reçu' });
        }
        // Return a relative path that we can serve
        const fileUrl = `/api/whatsapp/status/media/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Status upload error:', error);
        res.status(500).json({ error: "Erreur lors de l'upload" });
    }
});

// Serve uploaded status media
router.get('/status/media/:filename', (req, res) => {
    try {
        const filepath = join(__dirname, '..', '..', 'uploads', 'status', req.params.filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).send('Not found');
        }
        res.sendFile(filepath);
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

// Get scheduled/sent statuses history
router.get('/statuses/:agentId', authenticateToken, async (req, res) => {
    try {
        const statuses = await db.all(`
            SELECT * FROM whatsapp_statuses 
            WHERE user_id = ? AND agent_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, req.user.ownerId, req.params.agentId);
        res.json({ statuses });
    } catch (error) {
        console.error('Get statuses error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete or revoke a status
router.delete('/statuses/:id', authenticateToken, async (req, res) => {
    try {
        const row = await db.get(`
            SELECT ws.*, a.tool_id 
            FROM whatsapp_statuses ws
            JOIN agents a ON ws.agent_id = a.id
            WHERE ws.id = ? AND ws.user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!row) {
            return res.status(404).json({ error: 'Statut introuvable' });
        }

        // If it was already sent and we have a message key, try to revoke it from WhatsApp
        if (row.status === 'sent' && row.whatsapp_message_key && row.tool_id) {
            try {
                if (whatsappManager.isConnected(row.tool_id)) {
                    await whatsappManager.revokeStatus(row.tool_id, row.whatsapp_message_key);
                }
            } catch (revokeError) {
                console.warn(`[WhatsApp] Failed to revoke status ${row.id} on WhatsApp:`, revokeError.message);
                // We still proceed with deleting from DB
            }
        }

        await db.run('DELETE FROM whatsapp_statuses WHERE id = ?', req.params.id);
        res.json({ success: true, message: 'Statut supprimé' });
    } catch (error) {
        console.error('Delete status error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send or schedule a WhatsApp Status (Story) - broadcasts to status@broadcast
router.post('/status/:agentId', authenticateToken, async (req, res) => {
    try {
        const { type, text, backgroundColor, font, mediaUrl, caption, mimeType, scheduled_at } = req.body;

        const resolved = await resolveToolAndAgent(req.user.ownerId, req.params.agentId);
        if (resolved.error) {
            return res.status(resolved.status || 400).json({ error: resolved.error });
        }
        const toolId = resolved.tool?.id;
        if (!toolId) {
            return res.status(404).json({ error: 'Outil WhatsApp non trouvé' });
        }

        const isScheduled = scheduled_at && new Date(scheduled_at) > new Date();

        // If it's an immediate send, verify whatsapp connection first
        if (!isScheduled && !whatsappManager.isConnected(toolId)) {
            return res.status(400).json({ error: 'WhatsApp non connecté. Veuillez connecter votre agent WhatsApp.' });
        }

        // Always save to database for tracking/scheduling
        const statusId = uuidv4();
        const contentStr = type === 'text' ? text : (mediaUrl || '');
        const finalStatus = isScheduled ? 'scheduled' : 'sent';

        await db.run(`
            INSERT INTO whatsapp_statuses (id, user_id, agent_id, type, content, caption, mime_type, background_color, font, status, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, statusId, req.user.ownerId, req.params.agentId, type || 'text', contentStr, caption || null, mimeType || null, backgroundColor || null, font || null, finalStatus, isScheduled ? scheduled_at : null);

        // If it's scheduled for the future, we return immediately
        if (isScheduled) {
            return res.status(201).json({ 
                success: true, 
                message: 'Statut programmé', 
                statusId, 
                scheduled_at
            });
        }

        // If immediate, send it right away
        try {
            const sendResult = await whatsappManager.sendStatus(toolId, {
                type: type || 'text',
                text: type === 'text' ? (text || '') : (caption || ''), 
                backgroundColor: backgroundColor || null,
                font: font !== undefined ? Number(font) : 2,
                mediaUrl: mediaUrl || null,
                caption: caption || null,
                mimeType: mimeType || null
            });
            
            if (sendResult && sendResult.key) {
                try {
                    // Use null instead of undefined for DB parameters
                    await db.run(
                        'UPDATE whatsapp_statuses SET status = ?, whatsapp_message_id = ?, whatsapp_message_key = ? WHERE id = ?', 
                        'sent',
                        sendResult.messageId || null, 
                        JSON.stringify(sendResult.key), 
                        statusId
                    );
                } catch (dbErr) {
                    console.error('[WhatsApp Status API] DB Update failed (sent):', dbErr.message);
                }
            }
        } catch (sendError) {
            console.error('[WhatsApp Status API] Sending failed:', sendError.message);
            try {
                await db.run('UPDATE whatsapp_statuses SET status = ? WHERE id = ?', 'failed', statusId);
            } catch (dbErr) {
                console.error('[WhatsApp Status API] DB Update failed (failed):', dbErr.message);
            }
            throw sendError;
        }

        res.json({ success: true, result: sendResult, statusId });
    } catch (error) {
        console.error('[WhatsApp Status API] Error detail:', {
            message: error.message,
            stack: error.stack,
            agentId: req.params.agentId,
            body: req.body
        });
        res.status(500).json({ 
            error: error.message || "Erreur lors de l'envoi du statut",
            details: error.stack // Temporarily expose for debugging
        });
    }
});

export default router;
