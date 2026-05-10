/**
 * Emit real-time events to connected frontend clients (per user).
 * Used for conversation updates so the UI can refetch instead of polling.
 */
import db from '../database/init.js';

let io = null;

export function setIO(socketIO) {
    io = socketIO;
}

/**
 * Notify a user that a conversation has new messages or was updated.
 * @param {string} conversationId
 * @param {object|null} message - Optional message object to push instantly to frontend
 * @param {string|null} targetOwnerId - Optional owner ID to skip DB lookup
 */
export async function notifyConversationUpdate(conversationId, message = null, targetOwnerId = null) {
    if (!io || !conversationId) return;
    try {
        let ownerId = targetOwnerId;
        
        if (!ownerId) {
            const row = await db.get(
                'SELECT a.user_id FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE c.id = ?',
                conversationId
            );
            ownerId = row?.user_id;
        }

        if (ownerId) {
            console.log(`[Socket] Emitting conversation:update to room ${ownerId} for conv ${conversationId}`);
            io.to(String(ownerId)).emit('conversation:update', { 
                conversationId,
                message: message ? {
                    ...message,
                    conversation_id: conversationId
                } : null
            });
        } else {
            console.warn(`[Socket] No owner ID found for conversation ${conversationId}`);
        }
    } catch (err) {
        console.error('[socketEmitter] notifyConversationUpdate error:', err?.message || err);
    }
}

/**
 * Notify a user about WhatsApp connection status changes.
 * @param {string} toolId
 * @param {object} status - { status: 'qr'|'connecting'|'connected'|'disconnected', message: string, ... }
 */
export async function notifyWhatsAppStatus(toolId, status) {
    if (!io || !toolId) return;
    try {
        const row = await db.get('SELECT user_id FROM tools WHERE id = ?', toolId);
        if (row?.user_id) {
            io.to(String(row.user_id)).emit('whatsapp:status', { toolId, ...status });
        }
    } catch (err) {
        console.error('[socketEmitter] notifyWhatsAppStatus error:', err.message);
    }
}

/**
 * Notify a user about a new WhatsApp QR code.
 * @param {string} toolId
 * @param {string} qrDataUrl
 */
export async function notifyWhatsAppQR(toolId, qrDataUrl) {
    if (!io || !toolId) return;
    try {
        const row = await db.get('SELECT user_id FROM tools WHERE id = ?', toolId);
        if (row?.user_id) {
            io.to(String(row.user_id)).emit('whatsapp:qr', { toolId, qr: qrDataUrl });
        }
    } catch (err) {
        console.error('[socketEmitter] notifyWhatsAppQR error:', err.message);
    }
}

/**
 * Notify a user about a new app notification.
 * @param {string} userId
 * @param {object} notification
 */
export function notifyNotification(userId, notification) {
    if (!io || !userId) return;
    io.to(String(userId)).emit('notification:new', notification);
}
