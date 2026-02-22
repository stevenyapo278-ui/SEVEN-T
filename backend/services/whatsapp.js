import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadMediaMessage
} from 'baileys';
import { v4 as uuidv4 } from 'uuid';
import { normalizeJid, resolveConversationJid, resolveJidForSend } from '../utils/whatsappUtils.js';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import db from '../database/init.js';
import { aiService } from './ai.js';
import { leadAnalyzer } from './leadAnalyzer.js';
import { orderDetector } from './orderDetector.js';
import { humanInterventionService } from './humanIntervention.js';
import { adminAnomaliesService } from './adminAnomalies.js';
import { messageAnalyzer } from './messageAnalyzer.js';
import supportAnalyzer from './supportAnalyzer.js';
import faqAnalyzer from './faqAnalyzer.js';
import appointmentAnalyzer from './appointmentAnalyzer.js';
import { workflowExecutor } from './workflowExecutor.js';
import { decisionEngine } from './decisionEngine.js';
import { messageAiLogService } from './messageAiLog.js';
import { autoQaService } from './autoQa.js';
import { notificationService } from './notifications.js';
import { staticResponses } from '../config/staticResponses.js';
import { debugIngest } from '../utils/debugIngest.js';
import { retrieveRelevantChunks } from './knowledgeRetrieval.js';
import * as ttsService from './tts.js';
import { conversationMessageQueue } from './conversationMessageQueue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = join(__dirname, '..', '..', 'sessions');

// Ensure sessions directory exists
if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
}

// Silent logger for Baileys
const silentLogger = {
    level: 'silent',
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    child: () => silentLogger
};

// Simple in-memory store for chats and contacts
class SimpleStore {
    constructor() {
        this.chats = new Map();
        this.contacts = {};
        this.messages = {};
    }

    addChat(chat) {
        this.chats.set(chat.id, chat);
    }

    addContact(jid, contact) {
        this.contacts[jid] = contact;
    }

    addMessage(jid, message) {
        if (!this.messages[jid]) {
            this.messages[jid] = [];
        }
        this.messages[jid].push(message);
        // Keep only last 100 messages per chat
        if (this.messages[jid].length > 100) {
            this.messages[jid] = this.messages[jid].slice(-100);
        }
    }

    getChats() {
        return Array.from(this.chats.values());
    }

    toJSON() {
        return {
            chats: Array.from(this.chats.entries()),
            contacts: this.contacts,
            messages: this.messages
        };
    }

    fromJSON(data) {
        if (data.chats) {
            this.chats = new Map(data.chats);
        }
        if (data.contacts) {
            this.contacts = data.contacts;
        }
        if (data.messages) {
            this.messages = data.messages;
        }
    }
}

const QR_LOG_INTERVAL_MS = 45000; // Ne loguer qu'une fois par 45 s par outil (Baileys renvoie un nouveau QR toutes les ~20-60 s)

class WhatsAppManager {
    constructor() {
        this.connections = new Map(); // toolId -> socket
        this.stores = new Map(); // toolId -> SimpleStore
        this.qrCodes = new Map(); // toolId -> qr code data URL
        this.statuses = new Map(); // toolId -> status
        this.syncStatuses = new Map(); // toolId -> sync status
        this.lastSyncTime = new Map(); // toolId -> last sync timestamp
        this.lidToPhoneMap = new Map(); // toolId -> Map<lid, phoneJid> - track LID to phone mappings
        this.lastQrLogTime = new Map(); // toolId -> timestamp du dernier log QR (éviter le spam)
        this.pendingReconnects = new Map(); // toolId -> timeoutId (pour annuler la reconnexion si l'outil est supprimé)
        this._queueDrainHandlerSet = false;
    }

    /**
     * Populate lidToPhoneMap from store.contacts (Baileys: contact.id can be LID or JID, contact.jid = phone, contact.lid = LID).
     * So we can resolve LID <-> phone for name lookup and profile picture.
     */
    ensureLidMapFromStore(toolId) {
        const store = this.stores.get(toolId);
        if (!store?.contacts) return;
        if (!this.lidToPhoneMap.has(toolId)) {
            this.lidToPhoneMap.set(toolId, new Map());
        }
        const lidMap = this.lidToPhoneMap.get(toolId);
        for (const [key, contactInfo] of Object.entries(store.contacts)) {
            // Contact keyed by phone JID with .lid -> map LID to phone
            if (key.endsWith('@s.whatsapp.net') && contactInfo?.lid) {
                lidMap.set(contactInfo.lid, key);
            }
            // Contact keyed by LID with .jid -> map LID to phone (Baileys history/contacts.upsert often use id=LID)
            if (key.endsWith('@lid') && contactInfo?.jid && contactInfo.jid.endsWith('@s.whatsapp.net')) {
                lidMap.set(key, contactInfo.jid);
            }
        }
    }

    async getAgentByToolId(toolId) {
        if (!toolId) return null;
        return await db.get('SELECT * FROM agents WHERE tool_id = ?', toolId) || null;
    }

    /**
     * Returns true if the tool still exists in DB (not deleted).
     * Use this before reconnecting to avoid reconnecting deleted tools.
     */
    async isToolStillValid(toolId) {
        if (!toolId) return false;
        const row = await db.get('SELECT id FROM tools WHERE id = ?', toolId);
        return !!row;
    }

    /**
     * Clear session files for an agent
     */
    clearSession(toolId) {
        const pendingId = this.pendingReconnects.get(toolId);
        if (pendingId) {
            clearTimeout(pendingId);
            this.pendingReconnects.delete(toolId);
        }
        const sessionPath = join(sessionsDir, toolId);
        if (existsSync(sessionPath)) {
            try {
                rmSync(sessionPath, { recursive: true, force: true });
                console.log(`[WhatsApp] Session cleared for tool ${toolId}`);
            } catch (err) {
                console.error(`[WhatsApp] Error clearing session:`, err);
            }
        }
        // Clear in-memory state
        this.connections.delete(toolId);
        this.stores.delete(toolId);
        this.qrCodes.delete(toolId);
        this.lastQrLogTime.delete(toolId);
        this.statuses.delete(toolId);
    }

    async connect(toolId, forceNew = false) {
        try {
            // Don't connect if the tool was deleted (avoids reconnection loop after tool removal)
            const stillValid = await this.isToolStillValid(toolId);
            if (!stillValid) {
                this.clearSession(toolId);
                this.statuses.delete(toolId);
                return { error: 'Outil supprimé', status: 'disconnected' };
            }

            // If forceNew, clear the existing session first
            if (forceNew) {
                this.clearSession(toolId);
            }

            // Check if already connecting/connected
            if (this.connections.has(toolId)) {
                const currentStatus = this.statuses.get(toolId);
                // If reconnecting, wait for it
                if (currentStatus?.status === 'reconnecting') {
                    return { message: 'Reconnexion en cours...', status: 'reconnecting' };
                }
                return { message: 'Déjà connecté ou en cours de connexion' };
            }

            this.statuses.set(toolId, { status: 'connecting', message: 'Connexion en cours...' });

            const sessionPath = join(sessionsDir, toolId);
            
            // Ensure session directory exists
            if (!existsSync(sessionPath)) {
                mkdirSync(sessionPath, { recursive: true });
            }

            // Check if we have write permissions to the session directory and existing files
            try {
                const fsPromises = await import('fs/promises');
                
                // Check creds.json if it exists - try to actually open for writing using promises
                const credsFile = join(sessionPath, 'creds.json');
                const credsExists = existsSync(credsFile);
                console.log(`[WhatsApp] Checking write permissions for ${toolId}...`);
                
                if (credsExists) {
                    // Try to open file for writing using the same method Baileys uses
                    const handle = await fsPromises.open(credsFile, 'r+');
                    await handle.close();
                    console.log(`[WhatsApp] Write access verified for ${toolId}`);
                } else {
                    // Check we can create files in the directory
                    const testFile = join(sessionPath, '.write_test');
                    await fsPromises.writeFile(testFile, 'test');
                    await fsPromises.unlink(testFile);
                    console.log(`[WhatsApp] Directory write access verified for ${toolId}`);
                }
            } catch (permError) {
                console.error(`[WhatsApp] Permission denied for session ${toolId}:`, permError.message);
                this.statuses.set(toolId, { status: 'error', message: 'Erreur de permissions - impossible d\'écrire dans le dossier de session' });
                await db.run('UPDATE tools SET status = ? WHERE id = ?', 'error', toolId);
                const agent = await db.get('SELECT * FROM agents WHERE tool_id = ?', toolId);
                if (agent) {
                    await db.run('UPDATE agents SET whatsapp_connected = 0 WHERE id = ?', agent.id);
                }
                try {
                    const tool = await db.get('SELECT * FROM tools WHERE id = ?', toolId);
                    adminAnomaliesService.create({
                        type: 'system_error',
                        severity: 'high',
                        title: 'Erreur de permissions WhatsApp',
                        message: `Impossible d'écrire dans le dossier de session pour l'outil ${toolId}. Exécutez: sudo chown -R $(whoami) sessions/`,
                        agentId: agent?.id,
                        userId: tool?.user_id || agent?.user_id
                    });
                } catch (e) {}
                
                return { error: 'Permission denied on session files. Run: sudo chown -R $(whoami) sessions/' };
            }

            const { state, saveCreds: originalSaveCreds } = await useMultiFileAuthState(sessionPath);
            
            const { version } = await fetchLatestBaileysVersion();
            
            // Wrap saveCreds to handle permission errors gracefully
            const saveCreds = async () => {
                try {
                    await originalSaveCreds();
                } catch (error) {
                    console.error(`[WhatsApp] Error saving credentials for tool ${toolId}:`, error.message);
                    // Don't crash the server, just log the error
                }
            };

            // Create simple store for this agent
            const store = new SimpleStore();
            const storeFilePath = join(sessionPath, 'store.json');
            
            // Try to load existing store data
            if (existsSync(storeFilePath)) {
                try {
                    const data = JSON.parse(readFileSync(storeFilePath, 'utf-8'));
                    store.fromJSON(data);
            console.log(`[WhatsApp] Loaded store for tool ${toolId}`);
                } catch (err) {
                    console.log(`[WhatsApp] Could not load store for tool ${toolId}`);
                }
            }

            const sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, silentLogger)
                },
                printQRInTerminal: false,
                logger: silentLogger,
                browser: ['SEVEN T', 'Chrome', '120.0.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                markOnlineOnConnect: true,
                syncFullHistory: false,
            });

            this.stores.set(toolId, store);
            this.connections.set(toolId, sock);

            // Periodically save store
            const storeInterval = setInterval(() => {
                try {
                    writeFileSync(storeFilePath, JSON.stringify(store.toJSON()));
                } catch (err) {
                    // Ignore write errors
                }
            }, 30000);

            // Listen for chat updates
            sock.ev.on('chats.upsert', (chats) => {
                for (const chat of chats) {
                    store.addChat(chat);
                    console.log(`[WhatsApp] Chat added: ${chat.id}`);
                }
            });

            sock.ev.on('chats.update', (updates) => {
                for (const update of updates) {
                    const existing = store.chats.get(update.id);
                    if (existing) {
                        store.chats.set(update.id, { ...existing, ...update });
                    } else {
                        store.addChat(update);
                    }
                }
            });

            // Listen for contact updates
            sock.ev.on('contacts.upsert', async (contacts) => {
                console.log(`[WhatsApp] contacts.upsert event with ${contacts.length} contacts`);
                for (const contact of contacts) {
                    store.addContact(contact.id, contact);
                    console.log(`[WhatsApp] Contact upsert: ${contact.id} - name: "${contact.name || ''}", notify: "${contact.notify || ''}", jid: "${contact.jid || ''}", lid: "${contact.lid || ''}"`);
                    const agent = await this.getAgentByToolId(toolId);
                    this.ensureLidMapFromStore(toolId);
                    if (agent) {
                        void this.updateContactInDB(agent.id, contact);
                    }
                }
            });

            sock.ev.on('contacts.update', async (updates) => {
                console.log(`[WhatsApp] contacts.update event with ${updates.length} updates`);
                for (const update of updates) {
                    const existing = store.contacts[update.id] || {};
                    store.contacts[update.id] = { ...existing, ...update };
                    console.log(`[WhatsApp] Contact update: ${update.id} - notify: "${update.notify || ''}", verifiedName: "${update.verifiedName || ''}"`);
                    const agent = await this.getAgentByToolId(toolId);
                    this.ensureLidMapFromStore(toolId);
                    if (agent) {
                        await this.updateContactInDB(agent.id, update);
                    }
                }
            });

            // Listen for messages to store history
            sock.ev.on('messages.upsert', ({ messages: msgs }) => {
                for (const msg of msgs) {
                    if (msg.key?.remoteJid) {
                        store.addMessage(msg.key.remoteJid, msg);
                    }
                }
            });

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    // Generate QR code as data URL (Baileys envoie un nouveau QR périodiquement tant que personne n'a scanné)
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    this.qrCodes.set(toolId, qrDataUrl);
                    this.statuses.set(toolId, { status: 'qr', message: 'Scannez le QR code' });
                    const now = Date.now();
                    if (!this.lastQrLogTime.get(toolId) || now - this.lastQrLogTime.get(toolId) >= QR_LOG_INTERVAL_MS) {
                        this.lastQrLogTime.set(toolId, now);
                        console.log(`[WhatsApp] QR code généré pour l'outil ${toolId} (renouvelé automatiquement jusqu'au scan)`);
                    }
                }

                if (connection === 'open') {
                    this.qrCodes.delete(toolId);
                    this.lastQrLogTime.delete(toolId);
                    const phoneNumber = sock.user?.id?.split(':')[0] || '';
                    
                    // Update tool status and meta
                    await db.run('UPDATE tools SET status = ?, meta = ? WHERE id = ?', 'connected', JSON.stringify({ phone: phoneNumber, name: sock.user?.name || null }), toolId);
                    const agent = await this.getAgentByToolId(toolId);
                    if (agent) {
                        await db.run('UPDATE agents SET whatsapp_connected = 1, whatsapp_number = ? WHERE id = ?', phoneNumber, agent.id);
                    }
                    
                    this.statuses.set(toolId, { 
                        status: 'connected', 
                        message: 'Connecté',
                        phoneNumber,
                        name: sock.user?.name
                    });
                    console.log(`[WhatsApp] Connected for tool ${toolId}: ${phoneNumber}`);

                    // Sync existing conversations in background to catch any missed messages
                    setTimeout(() => {
                        this.syncExistingConversations(toolId).catch(err => {
                            console.error(`[WhatsApp] Background sync error:`, err.message);
                        });
                    }, 5000); // Wait 5 seconds for connection to stabilize
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    const errorMessage = lastDisconnect?.error?.message || 'Unknown reason';

                    // Save store before closing
                    try {
                        const currentStore = this.stores.get(toolId);
                        if (currentStore) {
                            writeFileSync(storeFilePath, JSON.stringify(currentStore.toJSON()));
                        }
                    } catch (err) {
                        // Ignore
                    }
                    
                    // Clear interval
                    clearInterval(storeInterval);

                    this.connections.delete(toolId);
                    this.qrCodes.delete(toolId);
                    this.lastQrLogTime.delete(toolId);

                    if (shouldReconnect) {
                        const toolIdForTimeout = toolId;
                        const valid = await this.isToolStillValid(toolIdForTimeout);
                        if (!valid) {
                            this.statuses.delete(toolIdForTimeout);
                            this.stores.delete(toolIdForTimeout);
                            return;
                        }
                        this.statuses.set(toolId, { status: 'reconnecting', message: 'Reconnexion...' });
                        // So the frontend (tools list) shows reconnecting instead of "connected" while we retry
                        await db.run('UPDATE tools SET status = ? WHERE id = ?', 'reconnecting', toolId);
                        console.log(`[WhatsApp] Reconnecting tool ${toolId}...`);
                        const timeoutId = setTimeout(async () => {
                            this.pendingReconnects.delete(toolIdForTimeout);
                            const stillValid = await this.isToolStillValid(toolIdForTimeout);
                            if (!stillValid) {
                                this.statuses.delete(toolIdForTimeout);
                                this.stores.delete(toolIdForTimeout);
                                return;
                            }
                            await this.connect(toolIdForTimeout);
                        }, 5000);
                        this.pendingReconnects.set(toolIdForTimeout, timeoutId);
                    } else {
                        // Log admin anomaly for unexpected disconnect
                        try {
                            const agentInfo = await this.getAgentByToolId(toolId);
                            const toolInfo = await db.get('SELECT user_id FROM tools WHERE id = ?', toolId);
                            if (agentInfo) {
                                adminAnomaliesService.logWhatsAppDisconnect(
                                    agentInfo.user_id, 
                                    agentInfo.id, 
                                    agentInfo.name, 
                                    errorMessage
                                );
                            } else if (toolInfo?.user_id) {
                                adminAnomaliesService.logWhatsAppDisconnect(
                                    toolInfo.user_id,
                                    null,
                                    'Outil WhatsApp',
                                    errorMessage
                                );
                            }
                        } catch (e) { /* ignore */ }
                        
                        this.stores.delete(toolId);
                        await db.run('UPDATE tools SET status = ?, meta = ? WHERE id = ?', 'disconnected', JSON.stringify({}), toolId);
                        const agent = await this.getAgentByToolId(toolId);
                        if (agent) {
                            await db.run('UPDATE agents SET whatsapp_connected = 0, whatsapp_number = NULL WHERE id = ?', agent.id);
                        }
                        this.statuses.set(toolId, { status: 'disconnected', message: 'Déconnecté' });
                        console.log(`[WhatsApp] Logged out for tool ${toolId}`);
                    }
                }
            });

            // Save credentials
            sock.ev.on('creds.update', saveCreds);

            // Handle incoming messages (queue: debounce + mutex per conversation)
            if (!this._queueDrainHandlerSet) {
                conversationMessageQueue.setDrainHandler((tId, cId, batch) => this.handleBatchDrain(tId, cId, batch));
                this._queueDrainHandlerSet = true;
            }
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                console.log(`[WhatsApp] messages.upsert event - type: ${type}, count: ${messages.length}`);
                
                // Process both 'notify' (real-time) and 'append' (sync) messages
                if (type !== 'notify' && type !== 'append') return;

                for (const message of messages) {
                    await this.handleIncomingMessage(toolId, sock, message, type);
                }
            });

            return { message: 'Connexion initiée', status: 'connecting' };
        } catch (error) {
            console.error(`[WhatsApp] Connection error for tool ${toolId}:`, error);
            this.statuses.set(toolId, { status: 'error', message: error.message });
            throw error;
        }
    }

    /**
     * Reception only: resolve sender, conversation, agent, extract text/media, duplicate check.
     * Does NOT save to DB. Returns { payload, context, audioTranscriptionFailed } or null.
     */
    async processReceptionOnly(toolId, sock, message, type) {
        try {
            const rawSender = message.key?.remoteJid;
            const senderPn = message.key?.senderPn;
            const fromMe = message.key?.fromMe;
            let sender = rawSender;
            if (rawSender?.endsWith('@lid') && senderPn) {
                sender = senderPn;
                if (!this.lidToPhoneMap.has(toolId)) this.lidToPhoneMap.set(toolId, new Map());
                this.lidToPhoneMap.get(toolId).set(rawSender, senderPn);
            }
            if (!message.message) return null;
            if (fromMe) {
                await this.handleOutgoingMessage(toolId, message, sender);
                return null;
            }
            const agent = await this.getAgentByToolId(toolId);
            if (!agent) return null;
            const agentId = agent.id;
            if (!sender) return null;
            if (sender.endsWith('@g.us') || sender === 'status@broadcast' || sender.includes('broadcast')) return null;
            let messageText = this.extractMessageText(message);
            if (!messageText) return null;
            const contactNumber = sender.split('@')[0];
            
            // Resolve contact name with priority (like whatsapp.js.old.2):
            // 1. Name saved in phone (contact in WhatsApp/store)
            // 2. If number not in contacts: pushName = name set at WhatsApp account creation
            // 3. Phone number as fallback
            const store = this.stores.get(toolId);
            this.ensureLidMapFromStore(toolId);
            let savedContact = store?.contacts?.[sender];
            // Store is often keyed by LID: try rawSender when message came with LID
            if (!savedContact && rawSender?.endsWith('@lid') && store?.contacts?.[rawSender]) {
                savedContact = store.contacts[rawSender];
            }
            if (!savedContact && store?.contacts && this.lidToPhoneMap.get(toolId)) {
                for (const [lid, phoneJid] of this.lidToPhoneMap.get(toolId).entries()) {
                    if (phoneJid === sender) {
                        savedContact = store.contacts[lid];
                        break;
                    }
                }
            }
            const whatsappContactName = savedContact?.name || savedContact?.notify || savedContact?.verifiedName;
            const pushName = message.pushName;
            // notify = nom affiché par WhatsApp (même chose que pushName, souvent dans le store après contacts.update)
            const notifyFromStore = savedContact?.notify;

            // Resolve LID to phone JID when known so we use the same conversation as other messages from this contact
            if (sender?.endsWith('@lid')) {
                const phoneJid = this.lidToPhoneMap.get(toolId)?.get(sender);
                if (phoneJid) sender = phoneJid;
            }
            const contactNumberForConv = sender?.split('@')[0] ?? contactNumber;
            // For sending replies: use LID if the incoming message was from LID (required for delivery in new WhatsApp protocol)
            const replyToJidForSend = (message.key?.remoteJid && String(message.key.remoteJid).endsWith('@lid')) ? message.key.remoteJid : sender;

            // Get or create conversation (needed to fallback to saved push_name for display name)
            let conversation = await db.get('SELECT * FROM conversations WHERE agent_id = ? AND contact_jid = ?', agentId, sender);
            // Name priority: 1) saved in phone (store), 2) pushName from message or notify from store or saved push_name, 3) number
            let contactName = whatsappContactName || pushName || notifyFromStore || contactNumber;
            if (conversation && (contactName === contactNumber || !contactName)) {
                if (conversation.push_name) contactName = conversation.push_name;
                else if (conversation.notify_name) contactName = conversation.notify_name;
            }
            console.log(`[WhatsApp] Message from ${contactName} (pushName: ${pushName || 'none'}, notify: ${notifyFromStore || 'none'}, saved: ${whatsappContactName || 'none'}): ${messageText.substring(0, 50)}...`);

            const createdAt = message.messageTimestamp
                ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString();

            // ==================== CHECK BLACKLIST ====================
            const isBlacklisted = await db.get('SELECT id FROM blacklist WHERE agent_id = ? AND contact_jid = ?', agentId, sender);
            if (isBlacklisted) {
                console.log(`[WhatsApp] Contact ${contactName} is blacklisted, ignoring message`);
                return null;
            }

            // Extract additional contact info from message
            const verifiedBizName = message.verifiedBizName || null;
            const isBusiness = !!verifiedBizName;

            if (!conversation) {
                const convId = uuidv4();
                await db.run(`
                    INSERT INTO conversations (id, agent_id, contact_jid, contact_name, contact_number, push_name, notify_name, is_business, verified_biz_name, last_message_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, convId, agentId, sender, contactName, contactNumberForConv, pushName || null, savedContact?.notify || null, isBusiness ? 1 : 0, verifiedBizName);
                conversation = await db.get('SELECT * FROM conversations WHERE id = ?', convId);
                console.log(`[WhatsApp] New conversation created for ${contactName}`);
                
                // Trigger workflow: new_conversation
                void workflowExecutor.executeMatchingWorkflowsSafe('new_conversation', {
                    conversationId: convId,
                    agentId,
                    userId: agent.user_id,
                    contactJid: sender,
                    contactName,
                    contactNumber: contactNumberForConv
                }, agentId, agent.user_id);
            } else {
                // Only update contact_name if:
                // - Current name is just the phone number (no name was set)
                // - Or we have a better name (from WhatsApp contacts)
                const currentName = conversation.contact_name;
                const isCurrentNameJustNumber = currentName === contactNumber || !currentName;
                const hasBetterName = whatsappContactName && whatsappContactName !== contactNumber;

                const useMessageTimestampForLastMessage = type === 'append' && message.messageTimestamp && createdAt > (conversation.last_message_at || '');
                const updateFields = [useMessageTimestampForLastMessage ? 'last_message_at = ?' : 'last_message_at = CURRENT_TIMESTAMP'];
                const updateValues = useMessageTimestampForLastMessage ? [createdAt] : [];
                
                if (isCurrentNameJustNumber || hasBetterName) {
                    updateFields.push('contact_name = ?');
                    updateValues.push(contactName);
                }
                
                if (pushName && pushName !== conversation.push_name) {
                    updateFields.push('push_name = ?');
                    updateValues.push(pushName);
                }
                if (notifyFromStore && notifyFromStore !== conversation.push_name) {
                    updateFields.push('notify_name = ?');
                    updateValues.push(notifyFromStore);
                    if (!pushName) {
                        updateFields.push('push_name = ?');
                        updateValues.push(notifyFromStore);
                    }
                }
                if (verifiedBizName) {
                    updateFields.push('verified_biz_name = ?', 'is_business = 1');
                    updateValues.push(verifiedBizName);
                }
                
                updateValues.push(conversation.id);
                await db.run(`UPDATE conversations SET ${updateFields.join(', ')} WHERE id = ?`, ...updateValues);
            }

            // Deferred: after contacts.update may have run, refresh name from store (Baileys sets notify from pushName)
            const convIdForDeferred = conversation.id;
            const senderForDeferred = sender;
            const rawSenderForDeferred = rawSender;
            const contactNumberForDeferred = contactNumber;
            setImmediate(async () => {
                try {
                    const storeLater = this.stores.get(toolId);
                    if (!storeLater?.contacts) return;
                    let c = storeLater.contacts[senderForDeferred] || (rawSenderForDeferred && storeLater.contacts[rawSenderForDeferred]);
                    if (!c && this.lidToPhoneMap.get(toolId)) {
                        for (const [lid, phoneJid] of this.lidToPhoneMap.get(toolId).entries()) {
                            if (phoneJid === senderForDeferred) {
                                c = storeLater.contacts[lid];
                                break;
                            }
                        }
                    }
                    const nameFromStore = c?.name || c?.notify || c?.verifiedName;
                    if (!nameFromStore || nameFromStore === contactNumberForDeferred) return;
                    const conv = await db.get('SELECT id, contact_name FROM conversations WHERE id = ?', convIdForDeferred);
                    if (!conv || (conv.contact_name && conv.contact_name !== contactNumberForDeferred)) return;
                    await db.run('UPDATE conversations SET contact_name = ?, push_name = ?, notify_name = ? WHERE id = ?', nameFromStore, c.notify || nameFromStore, c.notify || nameFromStore, convIdForDeferred);
                    console.log(`[WhatsApp] Deferred name update for conversation ${convIdForDeferred}: ${nameFromStore}`);
                } catch (e) {
                    // ignore
                }
            });

            // Check for duplicate incoming message BEFORE processing
            const incomingWhatsappId = message.key.id;
            const existingIncoming = await db.get('SELECT id FROM messages WHERE whatsapp_id = ?', incomingWhatsappId);
            if (existingIncoming) {
                console.log(`[WhatsApp] Skipping duplicate incoming message with whatsapp_id: ${incomingWhatsappId}`);
                return null;
            }

            // If image message: download and save to uploads for display in conversation
            const inMsgId = uuidv4();
            let messageType = 'text';
            let mediaUrl = null;
            let audioBase64 = null;
            let audioMime = null;
            let audioTranscriptionFailed = false;
            if (message.message?.imageMessage) {
                try {
                    const buffer = await downloadMediaMessage(message, 'buffer', {});
                    const mime = message.message.imageMessage?.mimetype || 'image/jpeg';
                    const ext = mime === 'image/png' ? '.png' : '.jpg';
                    const uploadsDir = join(__dirname, '..', '..', 'uploads', 'messages');
                    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
                    const filename = `${inMsgId}${ext}`;
                    writeFileSync(join(uploadsDir, filename), buffer);
                    mediaUrl = filename;
                    messageType = 'image';
                } catch (e) {
                    console.warn('[WhatsApp] Failed to save image for conversation:', e.message);
                }
            } else if (message.message?.audioMessage) {
                try {
                    const buffer = await downloadMediaMessage(message, 'buffer', {});
                    const mime = message.message.audioMessage?.mimetype || 'audio/ogg';
                    const ext = mime === 'audio/mpeg' ? '.mp3' : '.ogg';
                    const uploadsDir = join(__dirname, '..', '..', 'uploads', 'messages');
                    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
                    const filename = `${inMsgId}${ext}`;
                    writeFileSync(join(uploadsDir, filename), buffer);
                    mediaUrl = filename;
                    messageType = 'audio';
                    audioBase64 = buffer.toString('base64');
                    audioMime = mime;
                } catch (e) {
                    console.warn('[WhatsApp] Failed to save audio for conversation:', e.message);
                }
            }

            // Transcribe audio (Gemini) before saving, so content is searchable and AI can answer
            if (messageType === 'audio' && audioBase64) {
                try {
                    const transcriptResult = await aiService.transcribeAudio(agent, audioBase64, audioMime, agent.user_id);
                    const transcript = transcriptResult?.text?.trim();
                    if (transcript) {
                        messageText = transcript;
                    } else {
                        audioTranscriptionFailed = true;
                    }
                } catch (e) {
                    audioTranscriptionFailed = true;
                    console.warn('[WhatsApp] Audio transcription failed:', e.message);
                }
            }

            return {
                payload: { content: messageText, messageType, whatsapp_id: incomingWhatsappId, createdAt, mediaUrl, replyToJidForSend, inMsgId },
                context: { conversation, agent, sender, contactName, contactNumberForConv, replyToJidForSend },
                audioTranscriptionFailed
            };
        } catch (e) {
            return null;
        }
    }

    async handleIncomingMessage(toolId, sock, message, type) {
        try {
            const result = await this.processReceptionOnly(toolId, sock, message, type);
            if (!result) return;
            if (result.audioTranscriptionFailed) {
                const { payload, context } = result;
                await db.run(`
                    INSERT INTO messages (id, conversation_id, role, content, whatsapp_id, message_type, media_url, created_at)
                    VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
                `, payload.inMsgId, context.conversation.id, payload.content, payload.whatsapp_id, payload.messageType, payload.mediaUrl, payload.createdAt);
                humanInterventionService.flagConversation(context.conversation.id, context.agent.user_id, 'audio_transcription_failed');
                console.log(`[WhatsApp] Audio transcription failed for conversation ${context.conversation.id}, flagged for human`);
                return;
            }
            const { payload, context } = result;
            if (payload.messageType !== 'text') {
                await conversationMessageQueue.flush(toolId, context.conversation.id);
                await db.run(`
                    INSERT INTO messages (id, conversation_id, role, content, whatsapp_id, message_type, media_url, created_at)
                    VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
                `, payload.inMsgId, context.conversation.id, payload.content, payload.whatsapp_id, payload.messageType, payload.mediaUrl, payload.createdAt);
                console.log(`[WhatsApp] Message saved: ${context.contactName} -> ${payload.content.substring(0, 30)}...`);
                void workflowExecutor.executeMatchingWorkflowsSafe('new_message', {
                    conversationId: context.conversation.id,
                    messageId: payload.inMsgId,
                    agentId: context.agent.id,
                    userId: context.agent.user_id,
                    contactJid: context.sender,
                    contactName: context.contactName,
                    contactNumber: context.contactNumberForConv,
                    message: payload.content,
                    messageType: payload.messageType
                }, context.agent.id, context.agent.user_id);
                this.getProfilePicture(context.agent.id, context.sender).catch(() => {});
                const normalizedPayload = { tenant_id: context.agent.user_id, conversation_id: context.conversation.id, from: context.sender, message: payload.content, timestamp: Date.now() };
                await this.runPipelineAndSend(toolId, sock, context, normalizedPayload, { messageType: payload.messageType, rawMessage: message });
                return;
            }
            conversationMessageQueue.enqueue(toolId, context.conversation.id, { ...payload, ...context });
        } catch (error) {
            console.error('[WhatsApp] Error handling message:', error);
        }
    }

    /**
     * Run the AI pipeline and send response. Used for single message (after INSERT) and for batch (after batch INSERT).
     * context: { conversation, agent, sender, contactName, contactNumberForConv, replyToJidForSend }
     * opts: { messageType, rawMessage } (rawMessage for image/audio single message)
     */
    async runPipelineAndSend(toolId, sock, context, normalizedPayload, opts = {}) {
        const { conversation, agent, sender, contactName, replyToJidForSend } = context;
        const messageText = normalizedPayload.message;
        const messageType = opts.messageType || 'text';
        const rawMessage = opts.rawMessage || null;
        const userId = agent.user_id;
        const agentId = agent.id;
        const contactNumberForConv = context.contactNumberForConv;

        // Cache profile picture while connection is active (non-blocking)
        this.getProfilePicture(agentId, sender).catch(() => {});

        try {
            // ==================== CHECK MAX MESSAGES PER DAY ====================
            if (agent.max_messages_per_day > 0) {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const messagesTodayRow = await db.get(`
                    SELECT COUNT(*) as count FROM messages 
                    WHERE conversation_id = ? AND role = 'assistant' AND created_at >= ?
                `, conversation.id, todayStart.toISOString());
                const messagesTodayCount = messagesTodayRow?.count ?? 0;
                if (messagesTodayCount >= agent.max_messages_per_day) {
                    console.log(`[WhatsApp] Max messages per day (${agent.max_messages_per_day}) reached for ${contactName}`);
                    return;
                }
            }

            // Check if agent is active (messages are still received/saved, but AI won't respond)
            if (!agent.is_active) {
                console.log(`[WhatsApp] Agent ${agent.name} is inactive, message saved but no AI response`);
                return;
            }

            // Check if auto-reply is enabled
            const autoReply = agent.auto_reply !== 0 && agent.auto_reply !== false;
            if (!autoReply) {
                console.log(`[WhatsApp] Auto-reply disabled for agent ${agent.name}, skipping response`);
                return;
            }
            
            // Check if conversation is in human takeover mode
            // BUT: allow AI to respond if it has high confidence (smart de-escalation)
            const isHumanTakeover = conversation.human_takeover;
            if (isHumanTakeover) {
                console.log(`[WhatsApp] Conversation ${conversation.id} is in human takeover mode, checking if AI can handle this message...`);
                // We'll let the pre-analysis and AI decide if it can handle it
                // If AI responds with high confidence and need_human=false, we'll auto de-escalate
            }

            // ==================== CHECK AVAILABILITY HOURS ====================
            if (agent.availability_enabled) {
                const isAvailable = this.checkAvailability(agent);
                if (!isAvailable) {
                    console.log(`[WhatsApp] Agent ${agent.name} is outside availability hours`);
                    const absenceMessage = agent.absence_message || 'Merci pour votre message ! Nous sommes actuellement indisponibles. Nous vous répondrons dès que possible.';
                    
                    // Send absence message (only once per conversation per day)
                    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
                    const lastAbsenceMsg = await db.get(`
                        SELECT id FROM messages 
                        WHERE conversation_id = ? AND content = ? AND created_at >= ?
                    `, conversation.id, absenceMessage, twelveHoursAgo);
                    
                    if (!lastAbsenceMsg) {
                        await sock.sendMessage(replyToJidForSend, { text: absenceMessage });
                        const outMsgId = uuidv4();
                        await db.run(`
                            INSERT INTO messages (id, conversation_id, role, content, message_type, created_at)
                            VALUES (?, ?, 'assistant', ?, 'absence', ?)
                        `, outMsgId, conversation.id, absenceMessage, new Date().toISOString());
                    }
                    return;
                }
            }

            // ==================== CHECK HUMAN TRANSFER KEYWORDS ====================
            if (agent.human_transfer_enabled) {
                const keywords = (agent.human_transfer_keywords || '').toLowerCase().split(',').map(k => k.trim()).filter(k => k);
                const lowerMessage = messageText.toLowerCase();
                
                const shouldTransfer = keywords.some(keyword => lowerMessage.includes(keyword));
                
                if (shouldTransfer && !conversation.is_transferred) {
                    console.log(`[WhatsApp] Human transfer triggered for ${contactName}`);
                    const transferMessage = agent.human_transfer_message || 'Je vous transfère vers un conseiller. Veuillez patienter.';
                    
                    await sock.sendMessage(replyToJidForSend, { text: transferMessage });
                    
                    // Mark conversation as transferred
                    await db.run('UPDATE conversations SET is_transferred = 1, status = ? WHERE id = ?', 'transferred', conversation.id);
                    
                    const outMsgId = uuidv4();
                    await db.run(`
                        INSERT INTO messages (id, conversation_id, role, content, message_type, created_at)
                        VALUES (?, ?, 'assistant', ?, 'transfer', ?)
                    `, outMsgId, conversation.id, transferMessage, new Date().toISOString());
                    
                    return;
                }
            }
            
            // If conversation is already transferred, don't auto-reply
            if (conversation.is_transferred) {
                console.log(`[WhatsApp] Conversation with ${contactName} is transferred to human, skipping auto-reply`);
                return;
            }

            // ==================== SENTIMENT ANALYSIS (Basic) ====================
            const sentiment = this.analyzeSentiment(messageText);
            if (sentiment !== 'neutral') {
                await db.run('UPDATE conversations SET sentiment = ? WHERE id = ?', sentiment, conversation.id);
            }

            // Conversation context for AI: last 20 messages (same thread = same conversation_id)
            const historyRows = await db.all(`
                SELECT role, content FROM messages 
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT 20
            `, conversation.id);
            const history = Array.isArray(historyRows) ? historyRows : [];

            // E-commerce pipeline: catalogue + order rules + order detection only for template === 'ecommerce'
            const isEcommerce = agent.template === 'ecommerce';

            // Payload for downstream pipeline (same shape as param; uses DB conversation.id)
            const pipelinePayload = {
                tenant_id: agent.user_id,
                conversation_id: conversation.id,
                from: sender,
                message: messageText,
                timestamp: Date.now()
            };
            const pipelineStartMs = Date.now();

            // RAG: retrieve relevant knowledge chunks by semantic similarity (fallback: full load if no index)
            let agentKnowledge = [];
            let globalKnowledge = [];
            const retrieved = await retrieveRelevantChunks(agentId, messageText, 10);
            if (retrieved.length > 0) {
                agentKnowledge = retrieved;
                globalKnowledge = [];
            } else {
                agentKnowledge = await db.all('SELECT title, content FROM knowledge_base WHERE agent_id = ?', agentId);
                globalKnowledge = agentId
                    ? await db.all(`
                        SELECT gk.title, gk.content 
                        FROM global_knowledge gk
                        INNER JOIN agent_global_knowledge agk ON gk.id = agk.global_knowledge_id
                        WHERE agk.agent_id = ?
                    `, agentId)
                    : [];
            }

            // E-commerce only: inject catalogue + order rules. Other agents are generic (support, FAQ, RDV, etc.)
            const products = isEcommerce && userId
                ? await db.all('SELECT id, name, sku, price, stock, category, description, image_url FROM products WHERE user_id = ? AND is_active = 1', userId)
                : [];
            // Load all product_images for these products (so the AI can offer every image)
            let imagesByProductId = {};
            if (products.length > 0) {
                const productIds = products.map(p => p.id);
                const placeholders = productIds.map(() => '?').join(',');
                const extraImages = await db.all(`SELECT product_id, url FROM product_images WHERE product_id IN (${placeholders}) ORDER BY product_id, position ASC`, productIds);
                for (const row of extraImages) {
                    if (!imagesByProductId[row.product_id]) imagesByProductId[row.product_id] = [];
                    imagesByProductId[row.product_id].push(row.url);
                }
            }
            const productKnowledge = isEcommerce
                ? (products.length > 0
                    ? [{
                        title: '📦 CATALOGUE PRODUITS',
                        content: products.map(p => {
                            const allUrls = [...(p.image_url ? [p.image_url] : []), ...(imagesByProductId[p.id] || [])];
                            const uniqueUrls = [...new Set(allUrls)];
                            const imageLine = uniqueUrls.length > 0
                                ? (uniqueUrls.length === 1 ? `\n  Image: ${uniqueUrls[0]}` : `\n  Images: ${uniqueUrls.join(', ')}`)
                                : '';
                            return `- ${p.name}${p.sku ? ` (${p.sku})` : ''}: ${p.price} FCFA${p.stock === 0 ? ' ⛔ RUPTURE DE STOCK' : p.stock <= 5 ? ` ⚠️ STOCK LIMITÉ (${p.stock} unités)` : ` ✅ En stock (${p.stock})`}${p.category ? ` | ${p.category}` : ''}${p.description ? `\n  ${p.description}` : ''}${imageLine}`;
                        }).join('\n')
                    }, {
                        title: '⚠️ RÈGLES DE GESTION DES COMMANDES',
                        content: `IMPORTANT - Règles à suivre STRICTEMENT:

1. RUPTURE DE STOCK (⛔):
   - Si un client demande un produit en RUPTURE, dis-lui poliment que le produit n'est pas disponible
   - Propose des alternatives si possible
   - Dis: "Je vais transmettre votre demande à notre équipe pour vous tenir informé dès le retour en stock"

2. STOCK LIMITÉ (⚠️):
   - Si le client demande PLUS que le stock disponible, informe-le de la quantité maximale
   - Dis: "Nous avons actuellement X unités disponibles. Souhaitez-vous commander cette quantité?"

3. COMMANDE VALIDÉE:
   - Quand le client confirme une commande, résume: produit(s), quantité(s), prix total
   - Demande confirmation avant de finaliser

4. BESOIN D'INTERVENTION HUMAINE:
   - Stock insuffisant pour la demande
   - Demande de prix spécial ou négociation
   - Réclamation ou problème
   - Question hors de ta connaissance
   - Dans ces cas, dis: "Je transfère votre demande à un conseiller qui vous répondra rapidement"`
                    }]
                    : [{
                        title: '📦 CATALOGUE PRODUITS',
                        content: "Le catalogue produits est actuellement vide. Tu ne dois proposer aucun prix ni aucun produit. Si le client demande un produit, un prix ou une disponibilité, indique que le catalogue est vide ou que ce produit n'est pas dans le catalogue actuel et propose de le mettre en relation avec un conseiller si besoin."
                    }])
                : [];

            // Combine all knowledge bases
            const knowledge = [...globalKnowledge, ...agentKnowledge, ...productKnowledge];

            console.log(`[WhatsApp] Knowledge: ${globalKnowledge.length} global + ${agentKnowledge.length} agent + ${isEcommerce ? products.length : 0} products = ${knowledge.length} items`);

            // ============================================
            // PRE-ANALYSIS: Analyze message BEFORE AI response
            // This provides enriched context for better responses
            // ============================================
            const baseAnalysis = messageAnalyzer.analyzeBase(pipelinePayload, conversation);
            let templateAnalysis = {};
            if (isEcommerce) {
                templateAnalysis = await messageAnalyzer.analyzeEcommerce(pipelinePayload, conversation);
            } else if (agent.template === 'support') {
                templateAnalysis = supportAnalyzer.analyze(pipelinePayload);
            } else if (agent.template === 'faq') {
                templateAnalysis = faqAnalyzer.analyze(pipelinePayload);
            } else if (agent.template === 'appointment') {
                templateAnalysis = appointmentAnalyzer.analyze(pipelinePayload);
            }

            const messageAnalysis = { ...baseAnalysis, ...templateAnalysis };
            console.log(`[WhatsApp] Pre-analysis: Intent=${messageAnalysis.intent_hint ?? messageAnalysis.intent?.primary}, risk=${messageAnalysis.risk_level ?? 'n/a'}, ignore=${messageAnalysis.ignore}, escalate=${messageAnalysis.escalate}`);
            if (isEcommerce && messageAnalysis.products?.stockIssues?.length > 0) {
                console.log(`[WhatsApp] ⚠️ Stock issues detected: ${messageAnalysis.products.stockIssues.map(i => i.issue).join(', ')}`);
                if (userId) {
                    for (const issue of messageAnalysis.products.stockIssues) {
                        const isOut = issue.issue === 'out_of_stock';
                        const isInsufficient = issue.issue === 'insufficient_stock';
                        const isLow = issue.issue === 'low_stock';
                        if (!isOut && !isInsufficient && !isLow) continue;

                        const title = isOut
                            ? 'Rupture de stock'
                            : isInsufficient
                                ? 'Stock insuffisant'
                                : 'Stock faible';
                        const details = issue.message || `${issue.product} - stock à vérifier`;
                        notificationService.create(userId, {
                            type: isOut ? 'error' : 'warning',
                            title,
                            message: details,
                            link: '/dashboard/products',
                            metadata: {
                                productName: issue.product,
                                issue: issue.issue,
                                available: issue.available ?? null,
                                requested: issue.requested ?? null,
                                conversationId: conversation?.id || null
                            }
                        });
                    }
                }
            }

            const skipLlm = messageAnalysis.ignore === true || messageAnalysis.escalate === true;
            const intentHint = messageAnalysis.intent_hint ?? messageAnalysis.intent?.primary;
            
            // Fix: N'utiliser les réponses statiques que si AUCUN produit n'est mentionné
            // Cela évite de répondre "Bonjour !" quand le client dit "Bonjour je veux Samsung"
            const hasProductsMentioned = messageAnalysis.products?.matchedProducts?.length > 0;
            const canUseStaticResponse = !skipLlm 
                && intentHint 
                && staticResponses[intentHint]
                && !hasProductsMentioned
                && !messageAnalysis.isLikelyOrder;

            const isOrderConfirmation = isEcommerce && messageAnalysis.confirmation?.hasConfirmationProduct === true;
            /* Désactivé: on laisse l'IA traiter avec le message actuel au lieu d'un template statique
            if (isOrderConfirmation) {
                const matchedProducts = messageAnalysis.products?.matchedProducts || [];
                const lineItems = matchedProducts.map((p) => {
                    const qty = p.requestedQuantity || 1;
                    const total = (p.price || 0) * qty;
                    return `- ${p.name} x${qty} = ${total.toLocaleString()} FCFA`;
                });
                const orderTotal = matchedProducts.reduce((sum, p) => {
                    const qty = p.requestedQuantity || 1;
                    return sum + (p.price || 0) * qty;
                }, 0);
                const deliveryMissing = [];
                if (!messageAnalysis.deliveryInfo?.city) deliveryMissing.push('ville/commune');
                if (!messageAnalysis.deliveryInfo?.neighborhood) deliveryMissing.push('quartier');
                if (!messageAnalysis.deliveryInfo?.phone) deliveryMissing.push('numéro de téléphone');
                const recap = lineItems.length > 0
                    ? `Commande confirmée ✅\n${lineItems.join('\n')}\nTotal: ${orderTotal.toLocaleString()} FCFA`
                    : 'Commande confirmée ✅';
                const deliveryPrompt = deliveryMissing.length > 0
                    ? `Pour finaliser la livraison, merci d’indiquer: ${deliveryMissing.join(', ')}.`
                    : 'Merci, toutes les infos de livraison sont collectées.';
                const confirmationReply = `${recap}\n\n${deliveryPrompt}`;

                try {
                    const responseDelay = agent.response_delay || 0;
                    if (responseDelay > 0) {
                        console.log(`[WhatsApp] Waiting ${responseDelay}s before sending confirmation response...`);
                        await sock.sendPresenceUpdate('composing', replyToJidForSend);
                        await new Promise(resolve => setTimeout(resolve, responseDelay * 1000));
                        await sock.sendPresenceUpdate('paused', replyToJidForSend);
                    }
                    const sendResult = await sock.sendMessage(replyToJidForSend, { text: confirmationReply });
                    const whatsappMsgId = sendResult?.key?.id;
                    const outMsgId = uuidv4();
                    await db.run(`
                        INSERT INTO messages (id, conversation_id, role, content, tokens_used, whatsapp_id, sender_type, created_at)
                        VALUES (?, ?, 'assistant', ?, 0, ?, 'ai', ?)
                    `, outMsgId, conversation.id, confirmationReply, whatsappMsgId, new Date().toISOString());
                    console.log(`[WhatsApp] Sent confirmation recap to ${contactName}`);
                } catch (sendErr) {
                    console.error('[WhatsApp] Confirmation send error:', sendErr.message);
                }

                try {
                    await this.detectOrder(messageText, userId, conversation);
                } catch (err) {
                    console.error('[WhatsApp] Order detection error:', err.message);
                }
                console.log(`[WhatsApp] Skipping lead analysis - order confirmation detected`);
                return;
            }
            */
            if (isOrderConfirmation) {
                console.log(`[WhatsApp] Order confirmation - passing to AI with message actuel`);
            }

            if (canUseStaticResponse) {
                const staticText = staticResponses[intentHint];
                messageAiLogService.logMessageAi({
                    conversation_id: conversation.id,
                    tenant_id: userId,
                    direction: 'in',
                    payload: pipelinePayload,
                    prompt_version: null,
                    llm_output_summary: `Static response for ${intentHint}`,
                    auto_qa_result: null,
                    decision: 'static_response',
                    decision_reason: null,
                    response_time_ms: Date.now() - pipelineStartMs
                });
                const responseDelay = agent.response_delay || 0;
                if (responseDelay > 0) {
                    console.log(`[WhatsApp] Waiting ${responseDelay}s before sending static response...`);
                    await sock.sendPresenceUpdate('composing', replyToJidForSend);
                    await new Promise(resolve => setTimeout(resolve, responseDelay * 1000));
                    await sock.sendPresenceUpdate('paused', replyToJidForSend);
                }
                const sendResult = await sock.sendMessage(replyToJidForSend, { text: staticText });
                const whatsappMsgId = sendResult?.key?.id;
                const outMsgId = uuidv4();
                await db.run(`
                    INSERT INTO messages (id, conversation_id, role, content, tokens_used, whatsapp_id, sender_type, created_at)
                    VALUES (?, ?, 'assistant', ?, 0, ?, 'ai', ?)
                `, outMsgId, conversation.id, staticText, whatsappMsgId, new Date().toISOString());
                console.log(`[WhatsApp] Sent static response for intent "${intentHint}" to ${contactName}`);
                return;
            }

            let aiResponse = null;
            if (!skipLlm) {
                const hasImage = rawMessage?.message?.imageMessage;
                if (hasImage && rawMessage) {
                    try {
                        const buffer = await downloadMediaMessage(rawMessage, 'buffer', {});
                        const imageBase64 = buffer.toString('base64');
                        const mimeType = rawMessage.message?.imageMessage?.mimetype || 'image/jpeg';
                        const caption = messageText === '[Image]' ? null : messageText;
                        const userMediaModel = userId ? (await db.get('SELECT media_model FROM users WHERE id = ?', userId))?.media_model : null;
                        const platformDefault = (await db.get('SELECT value FROM platform_settings WHERE key = ?', 'default_media_model'))?.value;
                        const effectiveAgent = { ...agent, media_model: agent.media_model || userMediaModel || platformDefault || agent.model };
                        console.log(`[WhatsApp] Image reçue, analyse vision (caption: ${caption ? 'oui' : 'non'}, model: ${effectiveAgent.media_model || effectiveAgent.model})`);
                        aiResponse = await aiService.generateResponseFromImage(effectiveAgent, history, imageBase64, mimeType, caption, knowledge, userId);
                    } catch (imgErr) {
                        console.warn('[WhatsApp] Téléchargement/vision image échoué, fallback texte:', imgErr.message);
                        aiResponse = await aiService.generateResponse(agent, history, pipelinePayload, knowledge, messageAnalysis);
                    }
                } else {
                    aiResponse = await aiService.generateResponse(agent, history, pipelinePayload, knowledge, messageAnalysis);
                }
                if (aiResponse?.credit_warning) {
                    console.log(`[WhatsApp] Credit warning for user ${userId}: ${aiResponse.credit_warning}`);
                }
            }

            // When AI returns the generic escalation fallback but the user was greeting/inquiry with a product mentioned, send a helpful reply instead of escalating
            const aiEscalationFallback = 'Merci pour votre message. Un conseiller vous répondra si nécessaire.';
            if (aiResponse?.content === aiEscalationFallback && hasProductsMentioned && intentHint && ['greeting', 'inquiry'].includes(intentHint)) {
                const productNames = (messageAnalysis.products?.matchedProducts || []).map(p => p.name).slice(0, 2).join(', ');
                const friendlyReply = productNames
                    ? `Bonjour ! Je consulte le prix et la disponibilité pour ${productNames}. Un instant.`
                    : "Bonjour ! Je consulte notre catalogue pour vous. Quel produit vous intéresse ?";
                aiResponse = {
                    ...aiResponse,
                    content: friendlyReply,
                    need_human: false
                };
            }

            const llmOutput = aiResponse
                ? { content: aiResponse.content, need_human: messageAnalysis.needsHuman?.needed === true || aiResponse.need_human === true }
                : null;

            // Decision Engine: send, escalate, or fallback (single place for all logic)
            const preProcessing = {
                ignore: messageAnalysis.ignore === true,
                escalate: messageAnalysis.escalate === true,
                needsHuman: messageAnalysis.needsHuman?.needed === true,
                intent_hint: messageAnalysis.intent_hint ?? messageAnalysis.intent?.primary
            };
            let autoQaResult = null;
            if (aiResponse?.content && autoQaService.isAutoQaEnabled(userId)) {
                autoQaResult = await autoQaService.runAutoQa(aiResponse.content, { userMessage: messageText });
            }
            const decision = decisionEngine.decide(preProcessing, llmOutput, autoQaResult);

            messageAiLogService.logMessageAi({
                conversation_id: conversation.id,
                tenant_id: userId,
                direction: 'in',
                payload: pipelinePayload,
                prompt_version: aiResponse?.prompt_version ?? null,
                llm_output_summary: aiResponse?.content ?? null,
                auto_qa_result: autoQaResult,
                decision: decision.action,
                decision_reason: decision.reason ?? null,
                response_time_ms: Date.now() - pipelineStartMs
            });

            // Apply response delay if configured (only when we will send)
            const responseDelay = agent.response_delay || 0;
            if (responseDelay > 0 && decision.action === 'send') {
                console.log(`[WhatsApp] Waiting ${responseDelay}s before sending response...`);
                await sock.sendPresenceUpdate('composing', replyToJidForSend);
                await new Promise(resolve => setTimeout(resolve, responseDelay * 1000));
                await sock.sendPresenceUpdate('paused', replyToJidForSend);
            }

            if (decision.action === 'send') {
                // #region agent log
                debugIngest({
                    location: 'whatsapp.js:beforeSend',
                    message: 'before sendMessage',
                    data: {
                        replyToJid: replyToJidForSend,
                        sender,
                        rawSender: rawMessage?.key?.remoteJid,
                        fromLid: !!(rawMessage?.key?.remoteJid && String(rawMessage.key.remoteJid).endsWith('@lid'))
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'post-fix',
                    hypothesisId: 'H1'
                });
                // #endregion
                let sendResult;
                let sentAsVoice = false;
                const platformVoice = (await db.get('SELECT value FROM platform_settings WHERE key = ?', 'voice_responses_enabled'))?.value === '1';
                const userVoiceRow = await db.get('SELECT voice_responses_enabled FROM users WHERE id = ?', userId);
                const userVoice = !!(userVoiceRow?.voice_responses_enabled === 1 || userVoiceRow?.voice_responses_enabled === true);
                if (messageType === 'audio' && platformVoice && userVoice && ttsService.isAvailable()) {
                    const audioBuffer = await ttsService.generate(aiResponse.content, { lang: messageAnalysis?.language || 'fr' });
                    if (audioBuffer && audioBuffer.length > 0) {
                        try {
                            sendResult = await sock.sendMessage(replyToJidForSend, { audio: audioBuffer, mimetype: 'audio/mpeg' });
                            sentAsVoice = true;
                        } catch (e) {
                            console.warn('[WhatsApp] TTS audio send failed, falling back to text:', e?.message);
                        }
                    }
                }
                if (!sendResult) {
                    try {
                        sendResult = await sock.sendMessage(replyToJidForSend, { text: aiResponse.content });
                    } catch (sendErr) {
                    // #region agent log
                    debugIngest({
                        location: 'whatsapp.js:sendError',
                        message: 'sendMessage threw',
                        data: { err: sendErr.message },
                        timestamp: Date.now(),
                        sessionId: 'debug-session',
                        hypothesisId: 'H2'
                    });
                    // #endregion
                    throw sendErr;
                }
                }
                // #region agent log
                debugIngest({
                    location: 'whatsapp.js:afterSend',
                    message: 'after sendMessage',
                    data: {
                        keyId: sendResult?.key?.id,
                        remoteJid: sendResult?.key?.remoteJid,
                        hasResult: !!sendResult
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    hypothesisId: 'H4'
                });
                // #endregion
                const whatsappMsgId = sendResult?.key?.id;
                const outMsgId = uuidv4();
                await db.run(`
                    INSERT INTO messages (id, conversation_id, role, content, tokens_used, whatsapp_id, sender_type, message_type, created_at)
                    VALUES (?, ?, 'assistant', ?, ?, ?, 'ai', ?, ?)
                `, outMsgId, conversation.id, aiResponse.content, aiResponse.tokens || 0, whatsappMsgId, sentAsVoice ? 'audio' : null, new Date().toISOString());
                if (aiResponse.credits_deducted !== undefined) {
                    console.log(`[WhatsApp] Deducted ${aiResponse.credits_deducted} credits from user ${userId}. Remaining: ${aiResponse.credits_remaining}`);
                }
                console.log(`[WhatsApp] Replied to ${contactName}`);
                
                // SMART DE-ESCALATION: If conversation was in takeover but AI handled it well, release takeover
                if (isHumanTakeover && !aiResponse.need_human) {
                    await db.run('UPDATE conversations SET human_takeover = 0 WHERE id = ?', conversation.id);
                    console.log(`[WhatsApp] Smart de-escalation: AI handled message confidently, released human takeover for conversation ${conversation.id}`);
                }
            } else {
                // escalate or fallback: flag and optionally send fallback (do not send on pre_processing_ignore)
                humanInterventionService.flagConversation(
                    conversation.id,
                    userId,
                    decision.reason || (messageAnalysis.needsHuman?.reasons?.join(', ')) || 'escalation'
                );
                if (decision.reason !== 'pre_processing_ignore') {
                    const fallbackText = agent.fallback_message || 'Un conseiller vous répondra sous peu.';
                    await sock.sendMessage(replyToJidForSend, { text: fallbackText });
                    const outMsgId = uuidv4();
                    await db.run(`
                        INSERT INTO messages (id, conversation_id, role, content, message_type, sender_type, created_at)
                        VALUES (?, ?, 'assistant', ?, 'fallback', 'ai', ?)
                    `, outMsgId, conversation.id, fallbackText, new Date().toISOString());
                    console.log(`[WhatsApp] Escalated conversation ${conversation.id} (${decision.reason}), sent fallback to ${contactName}`);
                } else {
                    console.log(`[WhatsApp] Ignored short/empty message, no reply sent`);
                }
            }

            // ============================================
            // POST-PROCESSING: Order/Lead detection with pre-analysis
            // Order detection takes priority - don't create leads for orders
            // ============================================
            
            // Expanded order detection conditions:
            // 1. isLikelyOrder (product + order intent in current message)
            // 2. intent.primary === 'order' (explicit order intent)
            // 3. intent.primary === 'delivery_info' (delivery info often means order confirmation)
            // 4. (REMOVED) AI response confirmation should NOT create orders
            const shouldDetectOrder = isEcommerce && (
                messageAnalysis.isLikelyOrder ||
                messageAnalysis.intent?.primary === 'order' ||
                messageAnalysis.intent?.primary === 'delivery_info'
            );

            // #region agent log
            debugIngest({
                location: 'whatsapp.js:1045',
                message: 'shouldDetectOrder check',
                data: {
                    shouldDetectOrder,
                    isEcommerce,
                    isLikelyOrder: messageAnalysis.isLikelyOrder,
                    intent_primary: messageAnalysis.intent?.primary,
                    conversation_id: conversation.id
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                hypothesisId: 'H3'
            });
            // #endregion

            if (shouldDetectOrder) {
                // #region agent log
                debugIngest({
                    location: 'whatsapp.js:1046',
                    message: 'Calling detectOrder',
                    data: {
                        messageText: messageText.substring(0, 100),
                        userId,
                        conversation_id: conversation.id
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    hypothesisId: 'H3'
                });
                // #endregion

                this.detectOrder(messageText, userId, conversation).catch(err => {
                    console.error('[WhatsApp] Order detection error:', err.message);
                });
                console.log(`[WhatsApp] Skipping lead analysis - order intent detected`);
            } else {
                this.analyzeForLead(conversation, agentId, userId).catch(err => {
                    console.error('[WhatsApp] Lead analysis error:', err.message);
                });
            }

            if (decision.action === 'send' && aiResponse?.content) {
                const noInterventionCheck = ['greeting', 'order', 'inquiry'].includes(intentHint);
                if (!noInterventionCheck) {
                    this.checkHumanIntervention(messageText, aiResponse.content, conversation, userId).catch(err => {
                        console.error('[WhatsApp] Human intervention check error:', err.message);
                    });
                }
            }

        } catch (error) {
            console.error('[WhatsApp] Error handling message:', error);
        }
    }

    /**
     * Drain handler: process a batch of enqueued messages (save all, then one pipeline run with combined message).
     */
    async handleBatchDrain(toolId, conversationId, batch) {
        if (!batch.length) return;
        const sock = this.connections.get(toolId);
        if (!sock) {
            console.warn('[WhatsApp] handleBatchDrain: no socket for toolId', toolId, '- batch not processed');
            return;
        }
        const first = batch[0];
        const context = {
            conversation: first.conversation,
            agent: first.agent,
            sender: first.sender,
            contactName: first.contactName,
            contactNumberForConv: first.contactNumberForConv,
            replyToJidForSend: first.replyToJidForSend
        };
        const conversation = await db.get('SELECT * FROM conversations WHERE id = ?', conversationId);
        const agent = await db.get('SELECT * FROM agents WHERE id = ?', context.agent?.id);
        if (!conversation || !agent) {
            console.warn('[WhatsApp] handleBatchDrain: conversation or agent not found', { conversationId, agentId: context.agent?.id });
            return;
        }
        if (!agent.is_active) {
            console.log('[WhatsApp] Agent inactive, saving batch but not sending response');
        }
        context.conversation = conversation;
        context.agent = agent;
        const lastCreatedAt = batch[batch.length - 1].createdAt;
        let firstMsgId = null;
        for (const item of batch) {
            const inMsgId = uuidv4();
            if (!firstMsgId) firstMsgId = inMsgId;
            await db.run(`
                INSERT INTO messages (id, conversation_id, role, content, whatsapp_id, message_type, media_url, created_at)
                VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
            `, inMsgId, conversationId, item.content, item.whatsapp_id, item.messageType || 'text', item.mediaUrl || null, item.createdAt);
        }
        await db.run('UPDATE conversations SET last_message_at = ? WHERE id = ?', lastCreatedAt, conversationId);
        void workflowExecutor.executeMatchingWorkflowsSafe('new_message', {
            conversationId,
            messageId: firstMsgId,
            agentId: agent.id,
            userId: agent.user_id,
            contactJid: context.sender,
            contactName: context.contactName,
            contactNumber: context.contactNumberForConv,
            message: batch.map(m => m.content).join('\n\n').substring(0, 500),
            messageType: 'text'
        }, agent.id, agent.user_id);
        this.getProfilePicture(agent.id, context.sender).catch(() => {});
        const combinedMessage = batch.map(m => m.content).join('\n\n');
        const normalizedPayload = {
            tenant_id: agent.user_id,
            conversation_id: conversationId,
            from: context.sender,
            message: combinedMessage,
            timestamp: Date.now()
        };
        await this.runPipelineAndSend(toolId, sock, context, normalizedPayload, { messageType: 'text' });
    }

    /**
     * Check if human intervention is needed based on message and response
     */
    async checkHumanIntervention(userMessage, aiResponse, conversation, userId) {
        try {
            const needsHelp = humanInterventionService.checkForIntervention(
                userMessage, 
                aiResponse, 
                conversation, 
                userId
            );
            if (needsHelp) {
                console.log(`[WhatsApp] Human intervention flagged for conversation ${conversation.id}`);
            }
        } catch (error) {
            console.error('[WhatsApp] Human intervention check error:', error);
        }
    }

    /**
     * Handle outgoing messages (sent manually from WhatsApp by a human)
     * This catches messages sent directly from the WhatsApp app (not via our platform)
     */
    async handleOutgoingMessage(toolId, message, sender) {
        try {
            const whatsappMsgId = message.key?.id;
            const agent = await this.getAgentByToolId(toolId);
            if (!agent) {
                console.log(`[WhatsApp] No agent assigned to tool for outgoing message: ${toolId}`);
                return;
            }
            const agentId = agent.id;
            
            // For outgoing messages (fromMe), remoteJid might be in LID format
            // We need to resolve it to find the correct conversation
            let resolvedSender = sender;
            const store = this.stores.get(toolId);
            
            // If sender is LID format, try to resolve to phone number
            if (sender?.endsWith('@lid')) {
                // First, try our LID-to-phone mapping (built from incoming messages)
                const agentLidMap = this.lidToPhoneMap.get(toolId);
                if (agentLidMap?.has(sender)) {
                    resolvedSender = agentLidMap.get(sender);
                } else if (store?.contacts) {
                    // Fallback: Try to find the contact in store by LID
                    const contact = store.contacts[sender];
                    if (contact?.id && !contact.id.endsWith('@lid')) {
                        resolvedSender = contact.id;
                    } else {
                        // Try to find by iterating contacts
                        for (const [jid, contactInfo] of Object.entries(store.contacts)) {
                            if (jid.endsWith('@s.whatsapp.net') && contactInfo.lid === sender) {
                                resolvedSender = jid;
                                break;
                            }
                        }
                    }
                }
                
                // If still LID, try to find from existing conversations
                if (resolvedSender.endsWith('@lid')) {
                    const convWithLid = await db.get(`
                        SELECT contact_jid FROM conversations 
                        WHERE agent_id = ? AND contact_jid LIKE '%@s.whatsapp.net'
                        AND id IN (
                            SELECT DISTINCT conversation_id FROM messages 
                            WHERE content LIKE '%' || ? || '%' OR conversation_id IN (
                                SELECT id FROM conversations WHERE contact_jid = ?
                            )
                        )
                        LIMIT 1
                    `, agentId, sender, sender);
                    if (convWithLid?.contact_jid) {
                        resolvedSender = convWithLid.contact_jid;
                    }
                }
            }
            
            
            // FIRST: Check if this message was already saved by AI (by whatsapp_id)
            // This prevents the duplicate issue where AI sends a message and it gets captured here too
            if (whatsappMsgId) {
                const existingByWaId = await db.get('SELECT id, sender_type FROM messages WHERE whatsapp_id = ?', whatsappMsgId);
                if (existingByWaId) {
                    console.log(`[WhatsApp] Skipping - message already exists with whatsapp_id ${whatsappMsgId} (type: ${existingByWaId.sender_type})`);
                    return;
                }
            }
            
            // Extract message text
            const messageText = this.extractMessageText(message);
            if (!messageText) {
                console.log(`[WhatsApp] Could not extract text from outgoing message`);
                return;
            }

            // Use resolved sender for lookups (handles LID to phone number conversion)
            const lookupJid = resolvedSender.includes('@') ? resolvedSender : `${resolvedSender}@s.whatsapp.net`;
            const contactNumber = resolvedSender.split('@')[0];
            const originalLid = sender?.endsWith('@lid') ? sender : null;
            
            console.log(`[WhatsApp] Outgoing human message to ${contactNumber}: ${messageText.substring(0, 50)}...`);

            // Find conversation by contact_jid, contact_number, OR original LID (flexible lookup)
            let conversation = await db.get(`
                SELECT * FROM conversations 
                WHERE agent_id = ? AND (contact_jid = ? OR contact_jid = ? OR contact_number = ?)
            `, agentId, lookupJid, originalLid || lookupJid, contactNumber);
            
            if (!conversation) {
                const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await db.run(`
                    INSERT INTO conversations (id, agent_id, contact_jid, contact_number, contact_name, status, human_takeover)
                    VALUES (?, ?, ?, ?, ?, 'active', 1)
                `, conversationId, agentId, lookupJid, contactNumber, contactNumber);
                
                conversation = await db.get('SELECT * FROM conversations WHERE id = ?', conversationId);
                console.log(`[WhatsApp] Created new conversation for outgoing message: ${conversationId}`);
            }

            // Mark conversation as human takeover since human is responding
            if (!conversation.human_takeover) {
                await db.run('UPDATE conversations SET human_takeover = 1 WHERE id = ?', conversation.id);
            }

            const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
            const recentDuplicate = await db.get(`
                SELECT id FROM messages 
                WHERE conversation_id = ? AND content = ? AND role = 'assistant'
                AND created_at > ?
            `, conversation.id, messageText, sixtySecondsAgo);

            if (recentDuplicate) {
                console.log(`[WhatsApp] Skipping duplicate - same content sent recently: ${recentDuplicate.id}`);
                return;
            }

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.run(`
                INSERT INTO messages (id, conversation_id, role, content, sender_type, whatsapp_id, created_at)
                VALUES (?, ?, 'assistant', ?, 'human', ?, ?)
            `, messageId, conversation.id, messageText, whatsappMsgId, new Date().toISOString());

            await db.run('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', conversation.id);

            console.log(`[WhatsApp] Saved outgoing human message: ${messageId}`);
        } catch (error) {
            console.error('[WhatsApp] Error handling outgoing message:', error);
        }
    }

    /**
     * Send a message from the platform (human intervention)
     */
    async sendMessage(agentId, conversationId, messageText, userId) {
        try {
            // Get conversation
            const conversation = await db.get('SELECT * FROM conversations WHERE id = ?', conversationId);
            if (!conversation) {
                throw new Error('Conversation non trouvée');
            }

            const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', agentId, userId);
            if (!agent) {
                throw new Error('Agent non autorisé');
            }
            if (!agent.tool_id) {
                throw new Error('Aucun outil WhatsApp assigné à cet agent');
            }

            const sock = this.connections.get(agent.tool_id);
            if (!sock) {
                throw new Error('WhatsApp non connecté');
            }

            // Format recipient JID - prefer phone over LID for better delivery
            const recipientJid = resolveJidForSend(conversation) || resolveConversationJid(conversation);
            if (!recipientJid) {
                throw new Error('Contact JID invalide');
            }
            if (recipientJid.endsWith('@s.whatsapp.net')) {
                console.log(`[WhatsApp] Sending to phone JID: ${recipientJid}`);
            }

            // Send message via WhatsApp
            await sock.sendMessage(recipientJid, { text: messageText });

            // Save message to database with sender_type = 'human'
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.run(`
                INSERT INTO messages (id, conversation_id, role, content, sender_type, created_at)
                VALUES (?, ?, 'assistant', ?, 'human', ?)
            `, messageId, conversationId, messageText, new Date().toISOString());

            await db.run('UPDATE conversations SET human_takeover = 1 WHERE id = ?', conversationId);

            console.log(`[WhatsApp] Human message sent to ${conversation.contact_number}: ${messageText.substring(0, 50)}...`);

            return { success: true, messageId };
        } catch (error) {
            console.error('[WhatsApp] Error sending message:', error);
            throw error;
        }
    }

    /**
     * Toggle human takeover mode for a conversation
     */
    async toggleHumanTakeover(conversationId, enabled) {
        try {
            await db.run('UPDATE conversations SET human_takeover = ? WHERE id = ?', enabled ? 1 : 0, conversationId);
            console.log(`[WhatsApp] Human takeover ${enabled ? 'enabled' : 'disabled'} for conversation ${conversationId}`);
            return { success: true };
        } catch (error) {
            console.error('[WhatsApp] Error toggling human takeover:', error);
            throw error;
        }
    }

    /**
     * Detect potential orders from messages
     */
    async detectOrder(message, userId, conversation) {
        try {
            const order = await orderDetector.analyzeMessage(message, userId, conversation);
            // #region agent log
            debugIngest({
                location: 'whatsapp.js:detectOrder',
                message: 'detectOrder result',
                data: {
                    orderCreated: !!order,
                    orderId: order?.id
                },
                timestamp: Date.now(),
                hypothesisId: 'H1'
            });
            // #endregion
            if (order) {
                console.log(`[WhatsApp] Order detected: ${order.id} - ${order.total_amount} ${order.currency}`);
            }
        } catch (error) {
            console.error('[WhatsApp] Order detection error:', error);
        }
    }

    /**
     * Analyze conversation for potential leads
     */
    async analyzeForLead(conversation, agentId, userId) {
        try {
            // Get recent messages from this conversation
            const messages = await db.all(`
                SELECT role, content FROM messages 
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT 20
            `, conversation.id);

            if (messages.length < 2) {
                return; // Need at least 2 messages for meaningful analysis
            }

            // Analyze the conversation
            const analysis = await leadAnalyzer.analyzeConversation(conversation, messages, null, userId);

            if (analysis && analysis.shouldSuggest) {
                console.log(`[WhatsApp] Potential lead detected! Confidence: ${analysis.confidence}`);
                
                // Create suggested lead
                const lead = await leadAnalyzer.createSuggestedLead(
                    userId,
                    conversation,
                    agentId,
                    analysis
                );

                if (lead) {
                    console.log(`[WhatsApp] Created suggested lead: ${lead.name} (${lead.id})`);
                }
            }
        } catch (error) {
            console.error('[WhatsApp] Error in lead analysis:', error);
        }
    }

    /**
     * Check if current time is within agent's availability hours
     */
    checkAvailability(agent) {
        try {
            const now = new Date();
            const timezone = agent.availability_timezone || 'Europe/Paris';
            
            // Get current time in agent's timezone
            const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false };
            const timeString = now.toLocaleTimeString('fr-FR', options);
            const [currentHour, currentMinute] = timeString.split(':').map(Number);
            const currentTime = currentHour * 60 + currentMinute;

            // Parse availability times
            const [startHour, startMin] = (agent.availability_start || '09:00').split(':').map(Number);
            const [endHour, endMin] = (agent.availability_end || '18:00').split(':').map(Number);
            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;

            // Check day of week (0 = Sunday, 1 = Monday, etc.)
            const dayOfWeek = now.toLocaleDateString('fr-FR', { timeZone: timezone, weekday: 'short' });
            const dayMap = { 'dim.': 0, 'lun.': 1, 'mar.': 2, 'mer.': 3, 'jeu.': 4, 'ven.': 5, 'sam.': 6 };
            const currentDay = dayMap[dayOfWeek] ?? now.getDay();
            
            const availableDays = (agent.availability_days || '1,2,3,4,5').split(',').map(Number);
            
            if (!availableDays.includes(currentDay)) {
                return false;
            }

            // Check time range
            return currentTime >= startTime && currentTime <= endTime;
        } catch (error) {
            console.error('[WhatsApp] Error checking availability:', error);
            return true; // Default to available if error
        }
    }

    /**
     * Basic sentiment analysis
     */
    analyzeSentiment(text) {
        const lowerText = text.toLowerCase();
        
        const negativeWords = [
            'problème', 'problem', 'erreur', 'error', 'bug', 'nul', 'mauvais', 'horrible',
            'déçu', 'mécontent', 'inacceptable', 'scandaleux', 'arnaque', 'voleur',
            'colère', 'furieux', 'énervé', 'frustré', 'plainte', 'remboursement',
            'angry', 'disappointed', 'terrible', 'awful', 'worst', 'hate', 'refund'
        ];
        
        const positiveWords = [
            'merci', 'super', 'génial', 'excellent', 'parfait', 'bravo', 'content',
            'satisfait', 'recommande', 'top', 'formidable', 'incroyable', 'love',
            'thanks', 'great', 'amazing', 'awesome', 'perfect', 'wonderful', 'best'
        ];

        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;

        if (negativeCount > positiveCount && negativeCount >= 1) {
            return 'negative';
        } else if (positiveCount > negativeCount && positiveCount >= 1) {
            return 'positive';
        }
        return 'neutral';
    }

    extractMessageText(message) {
        const msg = message.message;
        if (!msg) return null;

        // Handle different message types
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        if (msg.imageMessage?.caption) return msg.imageMessage.caption;
        if (msg.videoMessage?.caption) return msg.videoMessage.caption;
        if (msg.documentMessage?.caption) return msg.documentMessage.caption;
        if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
        if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;
        if (msg.templateButtonReplyMessage?.selectedId) return msg.templateButtonReplyMessage.selectedId;
        
        // For media without caption, return a placeholder
        if (msg.imageMessage) return '[Image]';
        if (msg.videoMessage) return '[Vidéo]';
        if (msg.audioMessage) return '[Audio]';
        if (msg.documentMessage) return '[Document]';
        if (msg.stickerMessage) return '[Sticker]';
        if (msg.contactMessage) return '[Contact]';
        if (msg.locationMessage) return '[Localisation]';

        return null;
    }

    /**
     * Disconnect WhatsApp for a tool.
     * @param {string} toolId - Tool ID
     * @param {boolean} clearSessionData - If true (Option A), session files are removed and next connection requires a new QR scan.
     */
    async disconnect(toolId, clearSessionData = true) {
        const pendingId = this.pendingReconnects.get(toolId);
        if (pendingId) {
            clearTimeout(pendingId);
            this.pendingReconnects.delete(toolId);
        }

        const sock = this.connections.get(toolId);
        if (sock) {
            try {
                await sock.logout();
            } catch (err) {
                console.error(`[WhatsApp] Error during logout:`, err);
            }
        }

        this.connections.delete(toolId);
        this.stores.delete(toolId);
        this.qrCodes.delete(toolId);
        this.lastQrLogTime.delete(toolId);
        this.statuses.delete(toolId);

        // DB: mark tool and agent as disconnected so UI and reconnect logic stay consistent
        try {
            await db.run('UPDATE tools SET status = ?, meta = ? WHERE id = ?', 'disconnected', JSON.stringify({}), toolId);
            const agent = await this.getAgentByToolId(toolId);
            if (agent) {
                await db.run('UPDATE agents SET whatsapp_connected = 0, whatsapp_number = NULL WHERE id = ?', agent.id);
            }
        } catch (e) { /* ignore */ }

        if (clearSessionData) {
            this.clearSession(toolId);
        }
    }

    /**
     * Clear all conversations and messages for an agent
     * Used when changing WhatsApp accounts
     */
    async clearConversations(agentId) {
        try {
            const messagesResult = await db.run(`
                DELETE FROM messages 
                WHERE conversation_id IN (
                    SELECT id FROM conversations WHERE agent_id = ?
                )
            `, agentId);
            const conversationsResult = await db.run('DELETE FROM conversations WHERE agent_id = ?', agentId);
            const blacklistResult = await db.run('DELETE FROM blacklist WHERE agent_id = ?', agentId);
            
            console.log(`[WhatsApp] Cleared data for agent ${agentId}: ${conversationsResult.rowCount} conversations, ${messagesResult.rowCount} messages, ${blacklistResult.rowCount} blacklist entries`);
            
            return {
                conversations: conversationsResult.rowCount,
                messages: messagesResult.rowCount,
                blacklist: blacklistResult.rowCount
            };
        } catch (error) {
            console.error(`[WhatsApp] Error clearing conversations:`, error);
            throw error;
        }
    }

    /**
     * Resolve best JID for sending (LID preferred for delivery with WhatsApp's protocol).
     * 1. Try onWhatsApp to fetch LID from server
     * 2. Fallback to store lidToPhoneMap
     * 3. Fallback to phone JID
     */
    async resolveJidForSend(toolId, sock, phoneJid) {
        if (!phoneJid?.endsWith('@s.whatsapp.net')) return phoneJid;

        try {
            if (typeof sock.onWhatsApp === 'function') {
                const results = await sock.onWhatsApp(phoneJid);
                const entry = Array.isArray(results) ? results[0] : results?.[0];
                if (entry?.lid && entry?.exists) {
                    console.log(`[WhatsApp] Using LID for delivery (onWhatsApp): ${phoneJid} -> ${entry.lid}`);
                    return entry.lid;
                }
            }
        } catch (e) {
            console.warn('[WhatsApp] onWhatsApp failed, using phone JID:', e?.message);
        }

        this.ensureLidMapFromStore(toolId);
        const lidMap = this.lidToPhoneMap.get(toolId);
        if (lidMap) {
            for (const [lid, pn] of lidMap.entries()) {
                if (pn === phoneJid) {
                    console.log(`[WhatsApp] Using LID for delivery (store): ${phoneJid} -> ${lid}`);
                    return lid;
                }
            }
        }
        return phoneJid;
    }

    /**
     * Ensure conversation exists with correct display name/number for a contact (e.g. livreur).
     * Call before sendMessage so when the outgoing message event fires, the conversation shows the right contact.
     */
    async ensureConversationDisplay(toolId, agentId, phoneJid, displayName, displayPhone) {
        const sock = this.connections.get(toolId);
        if (!sock) return;

        const normalized = normalizeJid(phoneJid);
        if (!normalized) return;

        try {
            const lid = await this.resolveJidForSend(toolId, sock, normalized);
            const phoneDigits = String(displayPhone || normalized).replace(/\D/g, '');
            const name = (displayName || displayPhone || normalized.split('@')[0] || '').trim() || null;

            let conv = await db.get(`
                SELECT id FROM conversations
                WHERE agent_id = ? AND (contact_jid = ? OR contact_jid = ? OR contact_number = ? OR REPLACE(REPLACE(contact_number, ' ', ''), '+', '') = ?)
                LIMIT 1
            `, agentId, lid, normalized, displayPhone || normalized.split('@')[0], phoneDigits);

            if (conv) {
                await db.run('UPDATE conversations SET contact_name = ?, contact_number = ? WHERE id = ?', name, displayPhone || normalized.split('@')[0], conv.id);
            } else {
                const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await db.run(`
                    INSERT INTO conversations (id, agent_id, contact_jid, contact_number, contact_name, status, human_takeover)
                    VALUES (?, ?, ?, ?, ?, 'active', 1)
                `, conversationId, agentId, lid, displayPhone || normalized.split('@')[0], name);
            }
        } catch (e) {
            console.warn('[WhatsApp] ensureConversationDisplay failed:', e?.message);
        }
    }

    async sendMessage(toolId, to, text) {
        const sock = this.connections.get(toolId);
        if (!sock) {
            throw new Error('WhatsApp non connecté');
        }

        const phoneJid = normalizeJid(to);
        if (!phoneJid) {
            throw new Error('Contact JID invalide');
        }
        const jid = await this.resolveJidForSend(toolId, sock, phoneJid);
        await sock.sendMessage(jid, { text });

        return { success: true };
    }

    getQRCode(toolId) {
        return this.qrCodes.get(toolId);
    }

    getStatus(toolId) {
        return this.statuses.get(toolId) || { status: 'disconnected', message: 'Non connecté' };
    }

    isConnected(toolId) {
        const status = this.statuses.get(toolId);
        const sock = this.connections.get(toolId);
        // Both the status must be 'connected' AND the socket must exist
        return status?.status === 'connected' && !!sock;
    }

    // ==================== SYNC FUNCTIONALITY ====================

    /**
     * Sync chats - Only updates existing conversations, doesn't create empty ones
     * New conversations are created automatically when messages arrive
     */
    async syncChats(toolId) {
        const sock = this.connections.get(toolId);
        const store = this.stores.get(toolId);
        const agent = await this.getAgentByToolId(toolId);
        
        // Gracefully handle case where socket is not ready yet (race condition)
        if (!sock) {
            console.log(`[WhatsApp] Sync skipped - socket not ready for tool ${toolId}`);
            return { synced: 0, message: 'Connexion en cours, veuillez réessayer dans quelques secondes' };
        }
        if (!agent) {
            console.log(`[WhatsApp] Sync skipped - no agent assigned to tool ${toolId}`);
            return { synced: 0, message: 'Aucun agent assigné à cet outil' };
        }

        try {
            this.syncStatuses.set(toolId, { status: 'syncing', message: 'Synchronisation en cours...', progress: 0 });
            console.log(`[WhatsApp] Starting chat sync for tool ${toolId}`);

            const existingConvs = await db.all('SELECT * FROM conversations WHERE agent_id = ?', agent.id);
            console.log(`[WhatsApp] Found ${existingConvs.length} existing conversations`);

            // Get contacts from store to update names (store can be keyed by phone JID or LID)
            const allContacts = store?.contacts || {};
            console.log(`[WhatsApp] Found ${Object.keys(allContacts).length} contacts in store`);
            this.ensureLidMapFromStore(toolId);
            const lidMap = this.lidToPhoneMap.get(toolId);

            let updated = 0;

            // Update contact names for existing conversations
            for (const conv of existingConvs) {
                try {
                    let contact = allContacts[conv.contact_jid];
                    if (!contact && lidMap) {
                        for (const [lid, phoneJid] of lidMap.entries()) {
                            if (phoneJid === conv.contact_jid) {
                                contact = allContacts[lid];
                                break;
                            }
                        }
                    }
                    if (contact) {
                        const newName = contact.name || contact.notify || contact.verifiedName;
                        if (newName && newName !== conv.contact_name && newName !== conv.contact_number) {
                            await db.run('UPDATE conversations SET contact_name = ? WHERE id = ?', newName, conv.id);
                            console.log(`[WhatsApp] Updated name for ${conv.contact_number}: ${conv.contact_name} -> ${newName}`);
                            updated++;
                        }
                    }
                    
                    this.syncStatuses.set(toolId, { 
                        status: 'syncing', 
                        message: `Mise à jour: ${updated} noms mis à jour`,
                        progress: Math.round(((existingConvs.indexOf(conv) + 1) / existingConvs.length) * 100)
                    });
                } catch (err) {
                    console.error(`[WhatsApp] Error updating conversation:`, err);
                }
            }

            this.lastSyncTime.set(toolId, Date.now());
            this.syncStatuses.set(toolId, { 
                status: 'completed', 
                message: `${existingConvs.length} conversations, ${updated} noms mis à jour`,
                progress: 100,
                lastSync: Date.now()
            });

            console.log(`[WhatsApp] Sync completed for tool ${toolId}: ${updated} names updated`);
            return { conversations: existingConvs.length, updated };
        } catch (error) {
            console.error(`[WhatsApp] Sync error for tool ${toolId}:`, error);
            this.syncStatuses.set(toolId, { status: 'error', message: error.message });
            throw error;
        }
    }

    /**
     * Sync existing conversations in background when reconnecting
     * This catches messages that might have been missed during disconnection
     */
    async syncExistingConversations(toolId) {
        try {
            const sock = this.connections.get(toolId);
            const store = this.stores.get(toolId);
            const agent = await this.getAgentByToolId(toolId);
            
            if (!sock || !store) {
                console.log(`[WhatsApp] Sync skipped - not ready for tool ${toolId}`);
                return;
            }
            if (!agent) {
                console.log(`[WhatsApp] Sync skipped - no agent assigned to tool ${toolId}`);
                return;
            }

            const conversations = await db.all('SELECT * FROM conversations WHERE agent_id = ? ORDER BY last_message_at DESC LIMIT 20', agent.id);
            console.log(`[WhatsApp] Background sync: checking ${conversations.length} conversations for tool ${toolId}`);

            let totalSynced = 0;
            for (const conv of conversations) {
                try {
                    // Try to get recent messages from store
                    const storeMessages = store.messages?.[conv.contact_jid];
                    if (storeMessages && Array.isArray(storeMessages)) {
                        for (const msg of storeMessages.slice(-10)) { // Last 10 messages
                            const msgId = msg.key?.id;
                            if (!msgId) continue;

                            // Check if already exists
                            const exists = await db.get('SELECT id FROM messages WHERE whatsapp_id = ?', msgId);
                            if (exists) continue;

                            const messageText = this.extractMessageText(msg);
                            if (!messageText) continue;

                            const isFromMe = msg.key?.fromMe;
                            const role = isFromMe ? 'assistant' : 'user';
                            const senderType = isFromMe ? 'human' : null;

                            const newMsgId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            const syncCreatedAt = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();
                            await db.run(`
                                INSERT INTO messages (id, conversation_id, role, content, sender_type, whatsapp_id, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `, newMsgId, conv.id, role, messageText, senderType, msgId, syncCreatedAt);
                            totalSynced++;
                        }
                    }
                } catch (err) {
                    console.error(`[WhatsApp] Error syncing conversation ${conv.id}:`, err.message);
                }
            }

            if (totalSynced > 0) {
                console.log(`[WhatsApp] Background sync complete: synced ${totalSynced} messages`);
            }
        } catch (error) {
            console.error(`[WhatsApp] Background sync error:`, error);
        }
    }

    /**
     * Clean up empty conversations (no messages)
     */
    async cleanupEmptyConversations(toolId) {
        try {
            const agent = await this.getAgentByToolId(toolId);
            if (!agent) {
                return { deleted: 0, error: 'Aucun agent assigné à cet outil' };
            }
            const result = await db.run(`
                DELETE FROM conversations 
                WHERE agent_id = ? 
                AND id NOT IN (
                    SELECT DISTINCT conversation_id FROM messages
                )
            `, agent.id);
            
            console.log(`[WhatsApp] Cleaned up ${result.rowCount} empty conversations for tool ${toolId}`);
            return { deleted: result.rowCount };
        } catch (error) {
            console.error(`[WhatsApp] Cleanup error:`, error);
            return { deleted: 0, error: error.message };
        }
    }

    /**
     * Sync message history for a specific conversation
     */
    async syncMessages(toolId, conversationId, limit = 50) {
        const sock = this.connections.get(toolId);
        const store = this.stores.get(toolId);
        const agent = await this.getAgentByToolId(toolId);
        
        if (!sock) {
            throw new Error('WhatsApp non connecté');
        }
        if (!agent) {
            throw new Error('Aucun agent assigné à cet outil');
        }

        try {
            // Get conversation
            const conversation = await db.get('SELECT * FROM conversations WHERE id = ? AND agent_id = ?', conversationId, agent.id);
            if (!conversation) {
                throw new Error('Conversation non trouvée');
            }

            console.log(`[WhatsApp] Syncing messages for conversation ${conversationId}`);

            let messages = [];
            let synced = 0;
            
            // Method 1: Try to get messages from store
            if (store?.messages) {
                const jid = conversation.contact_jid;
                const storeMessages = store.messages[jid];
                if (storeMessages && Array.isArray(storeMessages)) {
                    messages = storeMessages.slice(-limit);
                    console.log(`[WhatsApp] Found ${messages.length} messages in store for ${jid}`);
                }
            }

            // Method 2: Try fetchMessageHistory if available
            if (messages.length === 0 && typeof sock.fetchMessageHistory === 'function') {
                try {
                    messages = await sock.fetchMessageHistory(limit, { jid: conversation.contact_jid }) || [];
                } catch (err) {
                    console.log(`[WhatsApp] fetchMessageHistory not available:`, err.message);
                }
            }
            
            for (const msg of messages) {
                try {
                    const msgKey = msg.key || {};
                    const msgId = msgKey.id;
                    
                    if (!msgId) continue;
                    
                    // Check if message already exists
                    const existingMsg = await db.get('SELECT id FROM messages WHERE whatsapp_id = ?', msgId);
                    if (existingMsg) continue;

                    const content = this.extractMessageText(msg);
                    if (!content) continue;

                    const role = msgKey.fromMe ? 'assistant' : 'user';
                    const newMsgId = uuidv4();
                    const timestamp = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();

                    await db.run(`
                        INSERT INTO messages (id, conversation_id, role, content, whatsapp_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, newMsgId, conversationId, role, content, msgId, timestamp);

                    synced++;
                } catch (err) {
                    console.error(`[WhatsApp] Error syncing message:`, err);
                }
            }

            // Update last message timestamp
            const lastMsg = await db.get('SELECT created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1', conversationId);
            if (lastMsg) {
                await db.run('UPDATE conversations SET last_message_at = ? WHERE id = ?', lastMsg.created_at, conversationId);
            }

            console.log(`[WhatsApp] Synced ${synced} messages for conversation ${conversationId}`);
            return { synced, total: messages.length };
        } catch (error) {
            console.error(`[WhatsApp] Message sync error:`, error);
            return { synced: 0, message: 'Historique non disponible - les nouveaux messages seront synchronisés automatiquement' };
        }
    }

    /**
     * Get contacts - ONLY from conversations (more relevant for SaaS)
     * Enriched with WhatsApp contact names when available
     */
    async getContacts(toolId) {
        const store = this.stores.get(toolId);
        const agent = await this.getAgentByToolId(toolId);
        if (!agent) {
            return { contacts: [] };
        }

        try {
            const conversations = await db.all(`
                SELECT 
                    c.contact_jid, 
                    c.contact_name, 
                    c.contact_number,
                    c.last_message_at,
                    COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.agent_id = ?
                AND c.contact_jid NOT LIKE '%@g.us'
                AND c.contact_jid NOT LIKE '%broadcast%'
                AND c.contact_jid NOT LIKE '%@lid'
                AND c.contact_jid LIKE '%@s.whatsapp.net'
                GROUP BY c.id
                ORDER BY c.last_message_at DESC
            `, agent.id);
            
            this.ensureLidMapFromStore(toolId);
            const lidMap = this.lidToPhoneMap.get(toolId);
            const contacts = conversations.map(conv => {
                // Try to get a better name from WhatsApp contacts (store can be keyed by phone JID or LID)
                let whatsappContact = store?.contacts?.[conv.contact_jid];
                if (!whatsappContact && lidMap && store?.contacts) {
                    for (const [lid, phoneJid] of lidMap.entries()) {
                        if (phoneJid === conv.contact_jid) {
                            whatsappContact = store.contacts[lid];
                            break;
                        }
                    }
                }
                const whatsappName = whatsappContact?.name || whatsappContact?.notify || whatsappContact?.verifiedName;
                let bestName = conv.contact_name;
                if (whatsappName && whatsappName !== conv.contact_number) {
                    bestName = whatsappName;
                }
                if (!bestName || bestName === conv.contact_number) {
                    bestName = conv.contact_number;
                }
                return {
                    jid: conv.contact_jid,
                    number: conv.contact_number,
                    name: bestName,
                    isMyContact: !!whatsappContact?.name,
                    lastMessageAt: conv.last_message_at,
                    messageCount: conv.message_count
                };
            });

            return contacts;
        } catch (error) {
            console.error(`[WhatsApp] Get contacts error:`, error);
            return [];
        }
    }

    /**
     * Get sync status for an agent
     */
    getSyncStatus(toolId) {
        return this.syncStatuses.get(toolId) || { status: 'idle', message: 'Pas de synchronisation en cours' };
    }

    /**
     * Get last sync time for an agent
     */
    getLastSyncTime(toolId) {
        return this.lastSyncTime.get(toolId) || null;
    }

    /**
     * Send a manual message and save to conversation
     */
    async sendMessageAndSave(toolId, conversationId, text) {
        const sock = this.connections.get(toolId);
        const agent = await this.getAgentByToolId(toolId);
        if (!sock) {
            throw new Error('WhatsApp non connecté');
        }
        if (!agent) {
            throw new Error('Aucun agent assigné à cet outil');
        }

        // Get conversation
        const conversation = await db.get('SELECT * FROM conversations WHERE id = ? AND agent_id = ?', conversationId, agent.id);
        if (!conversation) {
            throw new Error('Conversation non trouvée');
        }

        const recipientJid = resolveJidForSend(conversation) || resolveConversationJid(conversation);
        if (!recipientJid) {
            throw new Error('Contact JID invalide');
        }
        if (recipientJid.endsWith('@s.whatsapp.net')) {
            console.log(`[WhatsApp] sendMessageAndSave to phone JID: ${recipientJid}`);
        }
        const result = await sock.sendMessage(recipientJid, { text });

        const msgId = uuidv4();
        await db.run(`
            INSERT INTO messages (id, conversation_id, role, content, whatsapp_id, message_type, sender_type, created_at)
            VALUES (?, ?, 'assistant', ?, ?, 'manual', 'human', ?)
        `, msgId, conversationId, text, result.key.id, new Date().toISOString());

        await db.run('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP, human_takeover = 1 WHERE id = ?', conversationId);

        console.log(`[WhatsApp] Human message sent from platform to ${conversation.contact_number}: ${text.substring(0, 50)}...`);

        return { 
            success: true, 
            messageId: msgId,
            whatsappId: result.key.id
        };
    }

    /**
     * Get new messages since a specific timestamp
     */
    async getNewMessages(toolId, since) {
        const agent = await this.getAgentByToolId(toolId);
        if (!agent) return [];
        const conversations = await db.all(`
            SELECT c.id, c.contact_name, c.contact_number, m.id as message_id, m.role, m.content, m.created_at
            FROM conversations c
            JOIN messages m ON m.conversation_id = c.id
            WHERE c.agent_id = ? AND m.created_at > ?
            ORDER BY m.created_at ASC
        `, agent.id, since);

        return conversations;
    }

    /**
     * Update contact info in database from Baileys contact data.
     * contact.name = Name saved in YOUR WhatsApp contacts; contact.notify = name they set on WhatsApp.
     * Handles LID: resolves to phone JID via contact.jid or lidToPhoneMap.
     */
    async updateContactInDB(agentId, contact) {
        try {
            const rawId = contact.id || contact.jid;
            if (!rawId) return;
            const agentRow = await db.get('SELECT tool_id FROM agents WHERE id = ?', agentId);
            const toolId = agentRow?.tool_id || null;

            let phoneJid = rawId;
            if (rawId.endsWith('@lid')) {
                if (contact.jid && contact.jid.endsWith('@s.whatsapp.net')) {
                    phoneJid = contact.jid;
                } else {
                    if (toolId) {
                        this.ensureLidMapFromStore(toolId);
                        phoneJid = this.lidToPhoneMap.get(toolId)?.get(rawId) || rawId;
                    }
                }
                if (!phoneJid.endsWith('@s.whatsapp.net')) return;
            } else if (!rawId.endsWith('@s.whatsapp.net')) {
                return;
            }

            // Find conversation by phone JID or by raw LID (conversations may be stored with contact_jid = LID)
            let conversation;
            if (rawId.endsWith('@lid')) {
                conversation = await db.get('SELECT id, contact_name, saved_contact_name FROM conversations WHERE agent_id = ? AND (contact_jid = ? OR contact_jid = ?)', agentId, phoneJid, rawId);
            } else {
                conversation = await db.get('SELECT id, contact_name, saved_contact_name FROM conversations WHERE agent_id = ? AND contact_jid = ?', agentId, phoneJid);
            }
            if (!conversation) return;

            const contactNumber = phoneJid.split('@')[0];
            const savedName = contact.name;
            const notifyName = contact.notify;
            const updates = [];
            const values = [];
            const currentName = conversation.contact_name;
            const needContactName = !currentName || currentName === contactNumber;

            if (savedName && savedName !== contactNumber) {
                updates.push('saved_contact_name = ?');
                values.push(savedName);
                if (needContactName) {
                    updates.push('contact_name = ?');
                    values.push(savedName);
                }
            }

            if (notifyName) {
                updates.push('notify_name = ?', 'push_name = ?');
                values.push(notifyName, notifyName);
                if (needContactName && !(savedName && savedName !== contactNumber)) {
                    updates.push('contact_name = ?');
                    values.push(notifyName);
                }
            }

            if (updates.length > 0) {
                values.push(conversation.id);
                await db.run(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`, ...values);
                console.log(`[WhatsApp] Updated contact in DB: ${phoneJid} -> saved: "${savedName || ''}", notify: "${notifyName || ''}"`);
            }
        } catch (error) {
            console.error('[WhatsApp] Error updating contact in DB:', error.message);
        }
    }

    /**
     * Resolve contact JID to phone JID (numéro@s.whatsapp.net).
     * Baileys profilePictureUrl/fetchStatus expect this format; LID fails.
     */
    async resolveToPhoneJid(agentIdOrToolId, contactJid) {
        if (!contactJid) return contactJid;
        if (contactJid.endsWith('@s.whatsapp.net')) return contactJid;
        if (contactJid.endsWith('@lid')) {
            let toolId = agentIdOrToolId;
            if (!this.lidToPhoneMap.has(toolId)) {
                const agentRow = await db.get('SELECT tool_id FROM agents WHERE id = ?', agentIdOrToolId);
                toolId = agentRow?.tool_id || agentIdOrToolId;
            }
            this.ensureLidMapFromStore(toolId);
            const phoneJid = this.lidToPhoneMap.get(toolId)?.get(contactJid);
            return phoneJid || contactJid;
        }
        return contactJid;
    }

    /**
     * Get profile picture URL for a contact (with caching).
     * Baileys: sock.profilePictureUrl(jid, 'image'|'preview') - jid must be numéro@s.whatsapp.net.
     * Returns null if connection is closed/unstable or socket not available.
     */
    async getProfilePicture(agentId, contactJid) {
        const conversation = await db.get(`
            SELECT profile_picture, profile_picture_updated, contact_number
            FROM conversations
            WHERE agent_id = ? AND contact_jid = ?
        `, agentId, contactJid);
        
        if (conversation?.profile_picture) {
            const updatedAt = conversation.profile_picture_updated ? new Date(conversation.profile_picture_updated) : null;
            const now = new Date();
            const hoursSinceUpdate = updatedAt ? (now - updatedAt) / (1000 * 60 * 60) : 999;
            
            // Return cached if less than 24 hours old
            if (hoursSinceUpdate < 24) {
                return conversation.profile_picture;
            }
        }
        
        const agentRow = await db.get('SELECT tool_id FROM agents WHERE id = ?', agentId);
        const toolId = agentRow?.tool_id || null;
        const sock = toolId ? this.connections.get(toolId) : null;
        if (!sock) {
            return conversation?.profile_picture || null;
        }

        let phoneJid = await this.resolveToPhoneJid(agentId, contactJid);
        if (!phoneJid.endsWith('@s.whatsapp.net')) {
            // Fallback: use contact_number from conversation when LID has no mapping yet
            if (contactJid.endsWith('@lid') && conversation?.contact_number) {
                const num = String(conversation.contact_number).replace(/\D/g, '');
                if (num) phoneJid = num + '@s.whatsapp.net';
            }
            if (!phoneJid.endsWith('@s.whatsapp.net')) {
                return conversation?.profile_picture || null;
            }
        }

        let pictureUrl = null;
        let thumbnailUrl = null;
        try {
            try {
                pictureUrl = await sock.profilePictureUrl(phoneJid, 'image').catch(() => null);
            } catch (_) {}
            if (pictureUrl) {
                try {
                    await db.run(`UPDATE conversations SET profile_picture = ?, profile_picture_updated = CURRENT_TIMESTAMP WHERE agent_id = ? AND contact_jid = ?`, pictureUrl, agentId, contactJid);
                } catch (_) {}
                return pictureUrl;
            }
            try {
                thumbnailUrl = await sock.profilePictureUrl(phoneJid, 'preview').catch(() => null);
            } catch (_) {}
            if (thumbnailUrl) {
                try {
                    await db.run(`UPDATE conversations SET profile_picture = ?, profile_picture_updated = CURRENT_TIMESTAMP WHERE agent_id = ? AND contact_jid = ?`, thumbnailUrl, agentId, contactJid);
                } catch (_) {}
            }
            return thumbnailUrl || null;
        } catch (_) {
            return conversation?.profile_picture || null;
        }
    }

    /**
     * Get profile pictures for multiple contacts
     */
    async getProfilePictures(agentId, contactJids) {
        const pictures = {};
        
        for (const jid of contactJids) {
            const url = await this.getProfilePicture(agentId, jid);
            if (url) {
                pictures[jid] = url;
            }
        }
        
        return pictures;
    }

    /**
     * Update conversation with profile picture
     */
    async updateConversationProfilePicture(agentId, conversationId) {
        const conversation = await db.get('SELECT contact_jid FROM conversations WHERE id = ?', conversationId);
        
        if (!conversation) {
            return null;
        }

        const pictureUrl = await this.getProfilePicture(agentId, conversation.contact_jid);
        
        if (pictureUrl) {
            await db.run('UPDATE conversations SET profile_picture = ? WHERE id = ?', pictureUrl, conversationId);
        }
        
        return pictureUrl;
    }

    /**
     * Reconnect all agents that were previously connected
     * Called on server startup to restore WhatsApp connections
     */
    async reconnectAllAgents() {
        try {
            // Get agents that were connected and whose tool still exists (tool may have been deleted)
            const connectedAgents = await db.all(
                `SELECT a.id, a.name, a.tool_id FROM agents a
                 INNER JOIN tools t ON t.id = a.tool_id
                 WHERE a.whatsapp_connected = 1 AND a.is_active = 1 AND a.tool_id IS NOT NULL`
            );

            const list = Array.isArray(connectedAgents) ? connectedAgents : [];
            if (list.length === 0) {
                console.log('[WhatsApp] No agents to reconnect');
                return { reconnected: 0, failed: 0 };
            }

            console.log(`[WhatsApp] Attempting to reconnect ${list.length} agent(s)...`);

            let reconnected = 0;
            let failed = 0;

            for (const agent of list) {
                const toolId = agent.tool_id;
                if (!toolId) {
                    failed++;
                    continue;
                }
                try {
                    console.log(`[WhatsApp] Reconnecting agent "${agent.name}" (tool: ${toolId})...`);

                    await this.connect(toolId, false);

                    await new Promise(resolve => setTimeout(resolve, 2000));

                    reconnected++;
                } catch (error) {
                    console.error(`[WhatsApp] Failed to reconnect agent ${agent.id}:`, error.message);

                    await db.run('UPDATE agents SET whatsapp_connected = 0 WHERE id = ?', agent.id);

                    failed++;
                }
            }

            console.log(`[WhatsApp] Reconnection complete: ${reconnected} succeeded, ${failed} failed`);
            return { reconnected, failed };
        } catch (error) {
            console.error('[WhatsApp] Error during reconnection:', error);
            return { reconnected: 0, failed: 0, error: error.message };
        }
    }
}

export const whatsappManager = new WhatsAppManager();

// Initialize workflow executor with WhatsApp manager reference
workflowExecutor.setWhatsAppManager(whatsappManager);

export default whatsappManager;
