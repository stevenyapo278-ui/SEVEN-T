/**
 * WhatsApp utilities
 */

/**
 * Normalize an Ivorian phone number (or JID) by upgrading 8-digit numbers to 10-digit,
 * correcting common 255 typos, and ensuring proper 225 country code prefix.
 * @param {string} value
 * @returns {string}
 */
export function normalizeIvorianPhone(value) {
    if (!value || typeof value !== 'string') return value;
    if (value.endsWith('@lid') || value.endsWith('@g.us')) return value;

    const isJid = value.includes('@');
    let numberPart = isJid ? value.split('@')[0] : value;
    let cleanNumber = numberPart.replace(/\D/g, '');
    if (!cleanNumber) return value;

    // Correct common typo: 255 (Tanzania) instead of 225 (Côte d'Ivoire)
    if (cleanNumber.length === 13 && cleanNumber.startsWith('255') && /^(0[157]|2[157])/.test(cleanNumber.slice(3))) {
        cleanNumber = '225' + cleanNumber.slice(3);
    } else if (cleanNumber.length === 11 && cleanNumber.startsWith('255') && /^[0456789]/.test(cleanNumber.slice(3))) {
        if (!/^[67]/.test(cleanNumber.slice(3))) {
            cleanNumber = '225' + cleanNumber.slice(3);
        }
    }

    let localPart = '';
    let has225 = false;
    if (cleanNumber.startsWith('225')) {
        has225 = true;
        localPart = cleanNumber.slice(3);
    } else {
        localPart = cleanNumber;
    }

    // Upgrading 8-digit Ivorian numbers to 10-digit
    if (localPart.length === 8) {
        const orangeRegex = /^(0[789]|[456789][789])/;
        const mtnRegex = /^(0[456]|[456789][456])/;
        const moovRegex = /^(0[123]|[456789][123])/;
        const landlineRegex = /^[23]/;

        if (orangeRegex.test(localPart)) {
            localPart = '07' + localPart;
        } else if (mtnRegex.test(localPart)) {
            localPart = '05' + localPart;
        } else if (moovRegex.test(localPart)) {
            localPart = '01' + localPart;
        } else if (landlineRegex.test(localPart)) {
            if (/^(22|23|27|30|31|32|33|34|35|36)/.test(localPart)) {
                localPart = '27' + localPart;
            } else if (/^(20|24|35)/.test(localPart)) {
                localPart = '25' + localPart;
            } else {
                localPart = '21' + localPart;
            }
        }
        cleanNumber = (has225 ? '225' : '') + localPart;
    }

    // If local 10-digit Ivorian number, prefix with 225
    if (cleanNumber.length === 10 && /^(0[157]|2[157])/.test(cleanNumber)) {
        cleanNumber = '225' + cleanNumber;
    }

    return isJid ? `${cleanNumber}@s.whatsapp.net` : cleanNumber;
}

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
    if (value.endsWith('@lid') || value.endsWith('@g.us')) return value;
    const normalized = normalizeIvorianPhone(value);
    if (normalized.includes('@')) return normalized;
    const cleanNumber = normalized.replace(/\D/g, '');
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

