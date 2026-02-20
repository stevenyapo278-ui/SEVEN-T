/**
 * Token estimation utilities
 * Provides accurate token counting for AI models
 */

let tiktokenEncoder = null;

/**
 * Try to load tiktoken (optional dependency)
 */
async function loadTiktoken() {
    if (tiktokenEncoder !== null) {
        return tiktokenEncoder;
    }
    
    try {
        const { encoding_for_model } = await import('tiktoken');
        tiktokenEncoder = encoding_for_model('gpt-4');
        console.log('[Tokenizer] tiktoken loaded successfully');
        return tiktokenEncoder;
    } catch (error) {
        console.log('[Tokenizer] tiktoken not available, using approximation');
        tiktokenEncoder = false;
        return false;
    }
}

/**
 * Estimate tokens using character count (fallback method)
 * Rule of thumb: 1 token ≈ 4 characters for English, ~2-3 for code
 * @param {string} text
 * @returns {number}
 */
function estimateTokensByCharCount(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // More accurate estimation considering different types of content
    const length = text.length;
    
    // Check if text contains a lot of code (braces, semicolons, etc.)
    const codeChars = (text.match(/[{};()[\]]/g) || []).length;
    const codeRatio = codeChars / length;
    
    // Code is denser, so fewer chars per token
    if (codeRatio > 0.1) {
        return Math.ceil(length / 3); // ~3 chars per token for code
    }
    
    // Regular text
    return Math.ceil(length / 4); // ~4 chars per token for text
}

/**
 * Count tokens accurately using tiktoken (if available) or approximation
 * @param {string} text - Text to count tokens for
 * @param {string} [model] - Model name (for tiktoken model selection)
 * @returns {Promise<number>}
 */
export async function countTokens(text, model = 'gpt-4') {
    if (!text || typeof text !== 'string') return 0;
    
    const encoder = await loadTiktoken();
    
    if (encoder) {
        try {
            const tokens = encoder.encode(text);
            return tokens.length;
        } catch (error) {
            console.warn('[Tokenizer] Error using tiktoken, falling back to approximation:', error.message);
            return estimateTokensByCharCount(text);
        }
    }
    
    // Fallback to character count estimation
    return estimateTokensByCharCount(text);
}

/**
 * Count tokens synchronously (always uses approximation)
 * Use this when you need immediate results without async
 * @param {string} text
 * @returns {number}
 */
export function countTokensSync(text) {
    return estimateTokensByCharCount(text);
}

/**
 * Estimate tokens for a conversation (array of messages)
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<number>}
 */
export async function countConversationTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    
    let total = 0;
    for (const msg of messages) {
        if (msg.content) {
            total += await countTokens(msg.content);
        }
        // Add overhead for role and formatting (~4 tokens per message)
        total += 4;
    }
    
    return total;
}

/**
 * Check if text would exceed token limit
 * @param {string} text
 * @param {number} maxTokens
 * @returns {Promise<boolean>}
 */
export async function exceedsTokenLimit(text, maxTokens) {
    const tokens = await countTokens(text);
    return tokens > maxTokens;
}

/**
 * Truncate text to fit within token limit
 * @param {string} text
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export async function truncateToTokenLimit(text, maxTokens) {
    const tokens = await countTokens(text);
    
    if (tokens <= maxTokens) {
        return text;
    }
    
    // Rough approximation: remove proportional characters
    const ratio = maxTokens / tokens;
    const targetLength = Math.floor(text.length * ratio * 0.95); // 95% to be safe
    
    return text.substring(0, targetLength) + '...';
}

export default {
    countTokens,
    countTokensSync,
    countConversationTokens,
    exceedsTokenLimit,
    truncateToTokenLimit
};
