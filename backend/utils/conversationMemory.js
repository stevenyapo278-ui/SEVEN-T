/**
 * Conversation Memory Management
 * Intelligent context window with optional summarization
 */

import { countTokensSync } from './tokenizer.js';

/**
 * Select most relevant messages from conversation history
 * Uses a sliding window with prioritization for important messages
 * @param {Array<{role: string, content: string, timestamp?: number}>} history
 * @param {number} maxMessages - Maximum number of messages to keep
 * @param {Object} options - Additional options
 * @returns {Array}
 */
export function selectRelevantHistory(history, maxMessages = 10, options = {}) {
    if (!Array.isArray(history) || history.length === 0) {
        return [];
    }

    // If history is within limit, return as is
    if (history.length <= maxMessages) {
        return history;
    }

    const {
        prioritizeRecent = true,
        keepFirstMessage = true,
        maxTokens = null
    } = options;

    let selected = [];

    // Always keep the first message (usually contains important context)
    if (keepFirstMessage && history.length > 0) {
        selected.push(history[0]);
    }

    // Get recent messages
    const recentCount = maxMessages - (keepFirstMessage ? 1 : 0);
    const recentMessages = history.slice(-recentCount);

    selected = [...selected, ...recentMessages];

    // If maxTokens is specified, further trim to fit token budget
    if (maxTokens) {
        selected = trimToTokenBudget(selected, maxTokens);
    }

    return selected;
}

/**
 * Trim messages to fit within token budget
 * Removes messages from the middle, keeping first and last
 * @param {Array} messages
 * @param {number} maxTokens
 * @returns {Array}
 */
function trimToTokenBudget(messages, maxTokens) {
    if (messages.length === 0) return [];

    let totalTokens = 0;
    const tokenCounts = messages.map(msg => countTokensSync(msg.content || ''));
    
    for (const count of tokenCounts) {
        totalTokens += count;
    }

    // If already within budget, return as is
    if (totalTokens <= maxTokens) {
        return messages;
    }

    // Keep first and last, remove from middle
    const result = [];
    let currentTokens = 0;

    // Add first message
    if (messages.length > 0) {
        result.push(messages[0]);
        currentTokens += tokenCounts[0];
    }

    // Add messages from the end while within budget
    for (let i = messages.length - 1; i >= 1; i--) {
        if (currentTokens + tokenCounts[i] <= maxTokens) {
            result.unshift(messages[i]);
            currentTokens += tokenCounts[i];
        } else {
            break;
        }
    }

    return result;
}

/**
 * Compress conversation history by summarizing older messages
 * This is a placeholder for future AI-powered summarization
 * @param {Array} history
 * @param {number} summarizeThreshold - Number of messages before summarization kicks in
 * @returns {Array}
 */
export function compressHistory(history, summarizeThreshold = 20) {
    if (!Array.isArray(history) || history.length <= summarizeThreshold) {
        return history;
    }

    // For now, just use smart selection
    // In the future, this could use an AI model to generate summaries
    const recent = history.slice(-10);
    const older = history.slice(0, -10);

    // Create a summary placeholder for older messages
    const summary = {
        role: 'system',
        content: `[Résumé des ${older.length} messages précédents: La conversation a commencé et plusieurs échanges ont eu lieu.]`,
        isSummary: true
    };

    return [summary, ...recent];
}

/**
 * Calculate conversation statistics
 * @param {Array} history
 * @returns {Object}
 */
export function getConversationStats(history) {
    if (!Array.isArray(history)) {
        return { messageCount: 0, totalTokens: 0, userMessages: 0, assistantMessages: 0 };
    }

    let totalTokens = 0;
    let userMessages = 0;
    let assistantMessages = 0;

    for (const msg of history) {
        totalTokens += countTokensSync(msg.content || '');
        if (msg.role === 'user') userMessages++;
        if (msg.role === 'assistant') assistantMessages++;
    }

    return {
        messageCount: history.length,
        totalTokens,
        userMessages,
        assistantMessages,
        avgTokensPerMessage: history.length > 0 ? Math.round(totalTokens / history.length) : 0
    };
}

/**
 * Smart conversation window that adapts based on content
 * @param {Array} history
 * @param {Object} options
 * @returns {Array}
 */
export function getSmartWindow(history, options = {}) {
    const {
        maxMessages = 10,
        maxTokens = 2000,
        prioritizeRecent = true,
        enableCompression = false,
        compressionThreshold = 20
    } = options;

    let processed = history;

    // Apply compression if enabled and threshold is reached
    if (enableCompression && processed.length > compressionThreshold) {
        processed = compressHistory(processed, compressionThreshold);
    }

    // Select relevant messages
    processed = selectRelevantHistory(processed, maxMessages, {
        prioritizeRecent,
        keepFirstMessage: true,
        maxTokens
    });

    return processed;
}

export default {
    selectRelevantHistory,
    compressHistory,
    getConversationStats,
    getSmartWindow
};
