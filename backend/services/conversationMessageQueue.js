/**
 * Per-conversation message queue with debounce and mutex.
 * Ensures only one pipeline runs at a time per conversation and optionally
 * batches multiple messages into a single AI response.
 */

const DEFAULT_DEBOUNCE_MS = 1500;
const DEFAULT_MAX_BATCH_SIZE = 10;

function getDebounceMs() {
    const v = process.env.CONVERSATION_DEBOUNCE_MS;
    if (v === undefined || v === '') return DEFAULT_DEBOUNCE_MS;
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n < 0 ? DEFAULT_DEBOUNCE_MS : n;
}

function getMaxBatchSize() {
    const v = process.env.CONVERSATION_MAX_BATCH_SIZE;
    if (v === undefined || v === '') return DEFAULT_MAX_BATCH_SIZE;
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n < 1 ? DEFAULT_MAX_BATCH_SIZE : n;
}

function key(toolId, conversationId) {
    return `${toolId}:${conversationId}`;
}

class ConversationMessageQueue {
    constructor(options = {}) {
        this.debounceMs = options.debounceMs ?? getDebounceMs();
        this.maxBatchSize = options.maxBatchSize ?? getMaxBatchSize();
        this.batchEnabled = options.batchEnabled !== false;
        /** @type {Map<string, { messages: object[], timer: NodeJS.Timeout | null, lock: Promise<void> }>} */
        this.state = new Map();
        /** @type {(toolId: string, conversationId: string, messages: object[]) => Promise<void>} */
        this.drainHandler = null;
    }

    /**
     * Set the callback invoked when a batch is drained (timer fired or flush).
     * @param {((toolId: string, conversationId: string, messages: object[]) => Promise<void>)} fn
     */
    setDrainHandler(fn) {
        this.drainHandler = fn;
    }

    _getState(toolId, conversationId) {
        const k = key(toolId, conversationId);
        if (!this.state.has(k)) {
            this.state.set(k, {
                messages: [],
                timer: null,
                lock: Promise.resolve()
            });
        }
        return this.state.get(k);
    }

    _clearTimer(toolId, conversationId) {
        const s = this._getState(toolId, conversationId);
        if (s.timer) {
            clearTimeout(s.timer);
            s.timer = null;
        }
    }

    _scheduleDrain(toolId, conversationId) {
        const s = this._getState(toolId, conversationId);
        this._clearTimer(toolId, conversationId);
        const ms = this.batchEnabled ? this.debounceMs : 0;
        s.timer = setTimeout(() => {
            s.timer = null;
            this.drain(toolId, conversationId).catch(err => {
                console.error('[ConversationMessageQueue] drain error:', err);
            });
        }, ms);
    }

    /**
     * Add a message payload to the queue. Starts or resets the debounce timer.
     * @param {string} toolId
     * @param {string} conversationId
     * @param {object} payload - Normalized message data (content, messageType, whatsapp_id, createdAt, etc.)
     */
    enqueue(toolId, conversationId, payload) {
        const s = this._getState(toolId, conversationId);
        s.messages.push(payload);
        if (s.messages.length >= this.maxBatchSize) {
            this._clearTimer(toolId, conversationId);
            this.drain(toolId, conversationId).catch(err => {
                console.error('[ConversationMessageQueue] drain (max size) error:', err);
            });
            return;
        }
        this._scheduleDrain(toolId, conversationId);
    }

    /**
     * Process the current batch immediately (e.g. when a media message arrives).
     * Clears the timer and runs drain so the batch is handled now.
     * @param {string} toolId
     * @param {string} conversationId
     */
    async flush(toolId, conversationId) {
        this._clearTimer(toolId, conversationId);
        await this.drain(toolId, conversationId);
    }

    /**
     * Take all queued messages, run the drain handler under the conversation lock, then clean up.
     * @param {string} toolId
     * @param {string} conversationId
     */
    async drain(toolId, conversationId) {
        const k = key(toolId, conversationId);
        const s = this._getState(toolId, conversationId);
        const batch = s.messages.length ? s.messages.splice(0) : [];
        if (batch.length === 0) {
            this._maybeRemove(toolId, conversationId);
            return;
        }
        const run = async () => {
            if (!this.drainHandler) {
                console.warn('[ConversationMessageQueue] No drain handler set');
                return;
            }
            await this.drainHandler(toolId, conversationId, batch);
        };
        s.lock = s.lock.then(run).catch(err => {
            console.error('[ConversationMessageQueue] Batch handler error:', err);
        });
        await s.lock;
        this._maybeRemove(toolId, conversationId);
    }

    _maybeRemove(toolId, conversationId) {
        const k = key(toolId, conversationId);
        const s = this.state.get(k);
        if (s && s.messages.length === 0 && s.timer === null) {
            this.state.delete(k);
        }
    }
}

export const conversationMessageQueue = new ConversationMessageQueue({
    debounceMs: getDebounceMs(),
    maxBatchSize: getMaxBatchSize(),
    batchEnabled: process.env.CONVERSATION_BATCH_ENABLED !== 'false'
});

export { ConversationMessageQueue, getDebounceMs, getMaxBatchSize };
