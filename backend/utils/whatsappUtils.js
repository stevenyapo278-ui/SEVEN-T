/**
 * WhatsApp utilities
 */

/**
 * Normalize a phone number or JID to a WhatsApp JID.
 * - If already a JID (contains '@'), return as-is.
 * - If LID JID, return as-is.
 * - Otherwise, strip non-digits and append '@s.whatsapp.net'.
 * @param {string} value
 * @returns {string|null}
 */
export function normalizeJid(value) {
    if (!value || typeof value !== 'string') return null;
    if (value.includes('@')) return value;
    const cleanNumber = value.replace(/\D/g, '');
    if (!cleanNumber) return null;
    return `${cleanNumber}@s.whatsapp.net`;
}

/**
 * Resolve conversation recipient JID with fallback.
 * @param {Object} conversation
 * @returns {string|null}
 */
export function resolveConversationJid(conversation) {
    if (!conversation) return null;
    return normalizeJid(conversation.contact_jid || conversation.contact_number);
}

/**
 * Resolve JID for SENDING - prefer phone number over LID (LID can fail to deliver).
 * @param {Object} conversation
 * @returns {string|null}
 */
export function resolveJidForSend(conversation) {
    if (!conversation) return null;
    const phone = conversation.contact_number;
    if (phone && typeof phone === 'string' && /^\d+$/.test(phone.replace(/\D/g, ''))) {
        return normalizeJid(phone);
    }
    return normalizeJid(conversation.contact_jid || conversation.contact_number);
}

