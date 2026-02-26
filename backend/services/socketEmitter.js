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
 * Call this after inserting/updating messages in the DB.
 * @param {string} conversationId
 */
export async function notifyConversationUpdate(conversationId) {
    if (!io || !conversationId) return;
    try {
        const row = await db.get(
            'SELECT a.user_id FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE c.id = ?',
            conversationId
        );
        if (row?.user_id) {
            io.to(String(row.user_id)).emit('conversation:update', { conversationId });
        }
    } catch (err) {
        console.error('[socketEmitter] notifyConversationUpdate error:', err?.message || err);
    }
}
