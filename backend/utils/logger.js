/**
 * Structured Logger for SEVEN T SaaS
 * Provides consistent logging with levels, context, and correlation IDs
 */

class Logger {
    constructor(serviceName = 'app') {
        this.serviceName = serviceName;
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            FATAL: 4
        };
        // Default log level from environment or INFO
        this.currentLevel = this.levels[process.env.LOG_LEVEL?.toUpperCase()] || this.levels.INFO;
    }

    /**
     * Generate a correlation ID for request tracking
     */
    generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Format log entry with timestamp, level, and context
     */
    formatLog(level, message, context = {}) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            ...context
        });
    }

    /**
     * Log at DEBUG level (verbose)
     */
    debug(message, context = {}) {
        if (this.currentLevel <= this.levels.DEBUG) {
            console.log(this.formatLog('DEBUG', message, context));
        }
    }

    /**
     * Log at INFO level (normal operations)
     */
    info(message, context = {}) {
        if (this.currentLevel <= this.levels.INFO) {
            console.log(this.formatLog('INFO', message, context));
        }
    }

    /**
     * Log at WARN level (potential issues)
     */
    warn(message, context = {}) {
        if (this.currentLevel <= this.levels.WARN) {
            console.warn(this.formatLog('WARN', message, context));
        }
    }

    /**
     * Log at ERROR level (errors that need attention)
     */
    error(message, context = {}) {
        if (this.currentLevel <= this.levels.ERROR) {
            console.error(this.formatLog('ERROR', message, context));
        }
    }

    /**
     * Log at FATAL level (critical failures)
     */
    fatal(message, context = {}) {
        if (this.currentLevel <= this.levels.FATAL) {
            console.error(this.formatLog('FATAL', message, context));
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(context = {}) {
        const childLogger = new Logger(this.serviceName);
        childLogger.currentLevel = this.currentLevel;
        childLogger.defaultContext = { ...this.defaultContext, ...context };
        
        // Override formatLog to include default context
        const originalFormatLog = childLogger.formatLog.bind(childLogger);
        childLogger.formatLog = (level, message, additionalContext = {}) => {
            return originalFormatLog(level, message, { ...childLogger.defaultContext, ...additionalContext });
        };
        
        return childLogger;
    }
}

// Export singleton instances for different services
export const logger = new Logger('app');
export const aiLogger = new Logger('ai-service');
export const creditsLogger = new Logger('credits-service');

export default logger;
