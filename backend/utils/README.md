# Backend Utilities

This directory contains reusable utility modules for the SEVEN T SaaS application.

## 📦 Available Utilities

### 1. Logger (`logger.js`)

Structured logging with multiple log levels and context support.

```javascript
import { aiLogger, creditsLogger } from './utils/logger.js';

// Basic logging
aiLogger.info('User authenticated', { userId: '123' });
aiLogger.error('API call failed', { error: err.message, provider: 'openai' });

// Create child logger with default context
const requestLogger = aiLogger.child({ requestId: 'req-123' });
requestLogger.info('Processing request'); // Includes requestId automatically
```

**Log Levels:** DEBUG < INFO < WARN < ERROR < FATAL

**Environment Variables:**
- `LOG_LEVEL` - Set minimum log level (default: INFO)

---

### 2. Circuit Breaker (`circuitBreaker.js`)

Prevents cascading failures by stopping requests to failing services.

```javascript
import { geminiCircuitBreaker } from './utils/circuitBreaker.js';

// Execute with circuit breaker protection
try {
    const result = await geminiCircuitBreaker.execute(async () => {
        return await callGeminiAPI();
    });
} catch (error) {
    if (error.circuitBreakerOpen) {
        // Circuit is open, service is down
        console.log('Circuit breaker is open, using fallback');
    }
}

// Check circuit state
const state = geminiCircuitBreaker.getState();
console.log(state); // { state: 'CLOSED', failures: 0, ... }
```

**States:**
- `CLOSED` - Normal operation
- `OPEN` - Service is down, requests are blocked
- `HALF_OPEN` - Testing if service recovered

**Configuration:**
- `failureThreshold: 5` - Open after N consecutive failures
- `resetTimeout: 60000` - Wait 60s before trying again
- `timeout: 30000` - Request timeout (30s)

---

### 3. Tokenizer (`tokenizer.js`)

Accurate token counting for AI models.

```javascript
import { countTokens, countTokensSync } from './utils/tokenizer.js';

// Async (tries to use tiktoken if available)
const tokens = await countTokens('Hello, world!');

// Sync (always uses approximation)
const tokens = countTokensSync('Hello, world!');

// Count conversation tokens
const totalTokens = await countConversationTokens([
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
]);

// Truncate to fit token budget
const truncated = await truncateToTokenLimit(longText, 500);
```

**Features:**
- Uses `tiktoken` if installed (optional dependency)
- Falls back to character-based estimation
- ~4 chars/token for text, ~3 chars/token for code

---

### 4. Conversation Memory (`conversationMemory.js`)

Smart conversation history management.

```javascript
import { getSmartWindow, getConversationStats } from './utils/conversationMemory.js';

// Get smart conversation window
const relevantHistory = getSmartWindow(fullHistory, {
    maxMessages: 10,        // Max messages to keep
    maxTokens: 2000,        // Max tokens allowed
    prioritizeRecent: true, // Keep recent messages
    enableCompression: true // Summarize old messages
});

// Get conversation statistics
const stats = getConversationStats(history);
console.log(stats);
// {
//   messageCount: 25,
//   totalTokens: 3500,
//   userMessages: 13,
//   assistantMessages: 12,
//   avgTokensPerMessage: 140
// }
```

**Strategies:**
- Keeps first message (context anchor)
- Prioritizes recent messages
- Fits within token budget
- Optional compression/summarization

---

## 🔧 Configuration

### AI Configuration (`config/ai.config.js`)

Centralized configuration for all AI-related settings.

```javascript
import { AI_CONFIG, getModelName, getGenerationConfig } from './config/ai.config.js';

// Get model name for a provider
const model = getModelName('gemini', 'gemini-1.5-pro');
// Returns: 'gemini-1.5-pro-latest'

// Get generation config with defaults
const config = getGenerationConfig(agent);
// Returns: { temperature: 0.7, maxTokens: 500, topP: 0.95, topK: 40 }

// Access config directly
console.log(AI_CONFIG.models.gemini);
console.log(AI_CONFIG.conversationHistory.gemini); // 5
console.log(AI_CONFIG.retry.timeout); // 30000
```

**Configuration Sections:**
- `defaults` - Default generation parameters
- `models` - Model mappings for each provider
- `conversationHistory` - History limits per provider
- `retry` - Retry and timeout settings
- `circuitBreaker` - Circuit breaker configuration
- `validation` - Validation rules
- `tokenEstimation` - Token counting settings
- `debug` - Debug flags

---

## 🧪 Testing

### Unit Test Example

```javascript
import { countTokensSync } from './utils/tokenizer.js';
import { getSmartWindow } from './utils/conversationMemory.js';

// Test tokenizer
const text = 'Hello, world!';
const tokens = countTokensSync(text);
console.assert(tokens > 0, 'Should return positive token count');

// Test conversation memory
const history = [
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello' }
];
const window = getSmartWindow(history, { maxMessages: 1 });
console.assert(window.length === 1, 'Should return 1 message');
```

---

## 📝 Best Practices

### Logging
- Use appropriate log levels (DEBUG for verbose, ERROR for failures)
- Include relevant context (userId, requestId, etc.)
- Don't log sensitive data (passwords, API keys)

### Circuit Breaker
- Use separate circuit breakers for each external service
- Monitor circuit breaker states in production
- Set appropriate thresholds based on service SLA

### Tokenizer
- Use async `countTokens()` for accuracy (tries tiktoken)
- Use sync `countTokensSync()` when performance is critical
- Remember: estimates may vary by ±10-20%

### Conversation Memory
- Enable compression for long conversations (20+ messages)
- Adjust maxTokens based on model limits
- Keep first message for context continuity

---

## 🔄 Migration Guide

If you're updating from the old implementation:

### Before:
```javascript
// Old: Simple slice
const recentHistory = conversationHistory.slice(-5);

// Old: Character-based token count
const tokens = Math.ceil((text.length) / 4);

// Old: No circuit breaker
const response = await callAPI();
```

### After:
```javascript
// New: Smart window
const recentHistory = getSmartWindow(conversationHistory, {
    maxMessages: 5,
    maxTokens: 1500
});

// New: Accurate token count
const tokens = countTokensSync(text);

// New: Circuit breaker protection
const response = await circuitBreaker.execute(async () => {
    return await callAPI();
});
```

---

## 📚 Further Reading

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Tiktoken Documentation](https://github.com/openai/tiktoken)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)

---

**Last Updated:** February 6, 2026
