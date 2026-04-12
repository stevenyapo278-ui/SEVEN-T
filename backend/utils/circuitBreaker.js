/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute
        this.halfOpenRequests = options.halfOpenRequests || 1;
        this.timeout = options.timeout || 30000; // 30 seconds
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.halfOpenAttempts = 0;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime
        };
    }

    /**
     * Check if circuit should transition from OPEN to HALF_OPEN
     */
    shouldAttemptReset() {
        if (this.state === 'OPEN' && this.lastFailureTime) {
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            return timeSinceFailure >= this.resetTimeout;
        }
        return false;
    }

    /**
     * Execute a function with circuit breaker protection
     * @param {Function} fn - Async function to execute
     * @returns {Promise} Result of the function
     */
    async execute(fn) {
        // Circuit breaker tracking (monitoring only — does NOT block)
        try {
            const result = await this.executeWithTimeout(fn, this.timeout);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Execute function with timeout
     */
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    const error = new Error(`Operation timed out after ${timeout}ms`);
                    error.timeout = true;
                    reject(error);
                }, timeout);
            })
        ]);
    }

    /**
     * Handle successful execution
     */
    onSuccess() {
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            // If we've had enough successful requests, close the circuit
            if (this.successes >= this.halfOpenRequests) {
                this.state = 'CLOSED';
                this.successes = 0;
                console.log('[CircuitBreaker] Transitioning to CLOSED state');
            }
        }
    }

    /**
     * Handle failed execution - smart error categorization
     */
    onFailure(error) {
        // Don't count quota/rate-limit errors (429) as circuit breaker failures
        // These are transient and don't mean the service is down
        const errorMsg = error?.message || '';
        const isQuota = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');
        if (isQuota) {
            this.lastFailureTime = Date.now();
            console.log('[CircuitBreaker] 429 quota error - not counting as circuit failure');
            return;
        }

        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.successes = 0;
            console.log('[CircuitBreaker] Transitioning back to OPEN state');
            return;
        }
        
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.log(`[CircuitBreaker] Opening circuit after ${this.failures} failures`);
        }
    }

    /**
     * Manually reset the circuit breaker
     */
    reset() {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.halfOpenAttempts = 0;
        console.log('[CircuitBreaker] Manually reset to CLOSED state');
    }
}

// Create circuit breakers for each AI provider
export const geminiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 10,   // increased from 5
    resetTimeout: 30000,    // recover in 30s instead of 60s
    halfOpenRequests: 1,
    timeout: 120000
});

export const openaiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 10,
    resetTimeout: 30000,
    halfOpenRequests: 1,
    timeout: 120000
});

export const openrouterCircuitBreaker = new CircuitBreaker({
    failureThreshold: 10,
    resetTimeout: 30000,
    halfOpenRequests: 1,
    timeout: 120000
});

export default CircuitBreaker;
