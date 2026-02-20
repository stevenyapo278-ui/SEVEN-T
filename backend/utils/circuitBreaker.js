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
        // Check if circuit should transition to HALF_OPEN
        if (this.shouldAttemptReset()) {
            this.state = 'HALF_OPEN';
            this.halfOpenAttempts = 0;
            console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
        }

        // Reject immediately if circuit is OPEN
        if (this.state === 'OPEN') {
            const error = new Error('Circuit breaker is OPEN');
            error.circuitBreakerOpen = true;
            throw error;
        }

        // Reject if we've exceeded half-open attempts
        if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenRequests) {
            const error = new Error('Circuit breaker HALF_OPEN: max attempts reached');
            error.circuitBreakerOpen = true;
            throw error;
        }

        if (this.state === 'HALF_OPEN') {
            this.halfOpenAttempts++;
        }

        try {
            // Execute with timeout
            const result = await this.executeWithTimeout(fn, this.timeout);
            
            // Success
            this.onSuccess();
            return result;
            
        } catch (error) {
            // Failure
            this.onFailure();
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
     * Handle failed execution
     */
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            // Failure in HALF_OPEN, go back to OPEN
            this.state = 'OPEN';
            this.successes = 0;
            console.log('[CircuitBreaker] Transitioning back to OPEN state');
            return;
        }
        
        // Check if we should open the circuit
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
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenRequests: 1,
    timeout: 30000
});

export const openaiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenRequests: 1,
    timeout: 30000
});

export const openrouterCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenRequests: 1,
    timeout: 30000
});

export default CircuitBreaker;
