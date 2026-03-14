/**
 * Retry helper with exponential backoff for SEVEN T
 * Used by the AI service to handle rate limits and transient API errors.
 */

/**
 * Execute a function with exponential backoff retry.
 *
 * @param {Function} fn - async function to execute
 * @param {object} options
 * @param {number} options.attempts - max attempts (default: 3)
 * @param {number} options.baseDelay - initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - max delay in ms (default: 30000)
 * @param {string} options.label - label for logging (default: 'operation')
 * @returns {Promise<*>}
 */
export async function withExponentialBackoff(fn, options = {}) {
    const {
        attempts = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        label = 'operation',
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            const isRetryable =
                error.status === 429 ||
                error.status === 503 ||
                error.status === 502 ||
                error.status === 504 ||
                error.message?.includes('UNAVAILABLE') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('rate limit') ||
                error.message?.includes('quota') ||
                error.message?.includes('timeout') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('ETIMEDOUT');

            if (!isRetryable || attempt === attempts) {
                throw error;
            }

            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
            const jitter = Math.random() * 1000;
            const totalDelay = Math.round(delay + jitter);

            console.warn(
                `[Retry] ${label} failed (attempt ${attempt}/${attempts}) — retrying in ${totalDelay}ms. Error: ${error.message}`
            );

            await new Promise((r) => setTimeout(r, totalDelay));
        }
    }

    throw lastError;
}
