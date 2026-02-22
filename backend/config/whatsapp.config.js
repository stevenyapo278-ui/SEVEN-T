/**
 * WhatsApp conversation queue / batching configuration.
 * Read from environment or defaults.
 */

function parseIntEnv(name, defaultVal) {
    const v = process.env[name];
    if (v === undefined || v === '') return defaultVal;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? defaultVal : n;
}

export const whatsappQueueConfig = {
    /** Debounce window (ms) after last message before processing the batch. Default 1500. */
    debounceMs: parseIntEnv('CONVERSATION_DEBOUNCE_MS', 1500),
    /** Max messages per batch. Default 10. */
    maxBatchSize: parseIntEnv('CONVERSATION_MAX_BATCH_SIZE', 10),
    /** Enable batching (group multiple messages into one AI response). Set to 'false' to disable. */
    batchEnabled: process.env.CONVERSATION_BATCH_ENABLED !== 'false'
};
