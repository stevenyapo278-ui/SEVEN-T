/**
 * AI Service Configuration
 * Centralized configuration for all AI-related settings
 */

import { agentDefaults } from './agentDefaults.js';

export const AI_CONFIG = {
    // Default generation parameters
    defaults: {
        temperature: agentDefaults.temperature,
        maxTokens: agentDefaults.max_tokens,
        topP: 0.95,
        topK: 40
    },

    // Model mappings for different providers
    models: {
        gemini: {
            'gemini-1.5-flash': 'gemini-1.5-flash-latest',
            'gemini-1.5-pro': 'gemini-1.5-pro-latest',
            'gemini-pro': 'gemini-1.5-pro-latest',
            'gemini-2.0-flash': 'gemini-1.5-flash-latest',
            'models/gemini-2.5-flash': 'gemini-2.5-flash',
            'default': 'gemini-1.5-flash-latest'
        },
        openai: {
            'gpt-4o': 'gpt-4o',
            'gpt-4o-mini': 'gpt-4o-mini',
            'gpt-4-turbo': 'gpt-4-turbo',
            'default': 'gpt-4o-mini'
        },
        openrouter: {
            // Mapping des modèles agent -> ID OpenRouter
            'models/gemini-2.5-flash': 'google/gemini-2.5-flash',
            'gemini-2.5-flash': 'google/gemini-2.5-flash',
            'gemini-1.5-flash': 'google/gemini-2.0-flash-exp:free',
            'gemini-1.5-pro': 'google/gemini-2.0-flash-exp:free',
            // Free models (fallback order)
            freeFallbacks: [
                'google/gemma-2-9b-it:free',
                'meta-llama/llama-3.2-3b-instruct:free',
                'microsoft/phi-3-mini-128k-instruct:free',
                'qwen/qwen-2-7b-instruct:free'
            ],
            default: 'meta-llama/llama-3.1-8b-instruct:free'
        }
    },

    // Conversation history limits
    conversationHistory: {
        gemini: 5,      // Last N messages for Gemini
        openai: 10,     // Last N messages for OpenAI
        openrouter: 10  // Last N messages for OpenRouter
    },

    // Retry and timeout settings
    retry: {
        maxRetries: 3,
        initialBackoff: 1000,  // ms
        maxBackoff: 10000,     // ms
        timeout: 30000         // ms - global timeout per request
    },

    // Circuit breaker settings
    circuitBreaker: {
        enabled: true,
        failureThreshold: 5,        // Open after N consecutive failures
        resetTimeout: 60000,        // ms - time before trying again
        halfOpenRequests: 1         // Number of test requests in half-open state
    },

    // Validation settings
    validation: {
        maxPromptLength: 10000,
        maxResponseLength: 2000,
        minConfidence: 0.6
    },

    // Token estimation (for providers without usage reporting)
    tokenEstimation: {
        charsPerToken: 4,  // Rough estimate: 1 token ≈ 4 characters
        useRealTokenizer: false  // Set to true to use tiktoken/real tokenizer
    },

    // Debug settings
    debug: {
        enableAgentLogs: process.env.ENABLE_AGENT_DEBUG_LOGS === 'true',
        logPrompts: process.env.LOG_AI_PROMPTS === 'true',
        logResponses: process.env.LOG_AI_RESPONSES === 'true'
    }
};

/**
 * Get model name for a provider
 * @param {string} provider - 'gemini', 'openai', 'openrouter'
 * @param {string} requestedModel - The model name requested
 * @returns {string} The actual model name to use
 */
export function getModelName(provider, requestedModel) {
    if (!AI_CONFIG.models[provider]) {
        return requestedModel || AI_CONFIG.models.gemini.default;
    }

    const providerModels = AI_CONFIG.models[provider];
    
    // Check if there's a direct mapping
    if (providerModels[requestedModel]) {
        return providerModels[requestedModel];
    }

    // Return default for provider
    return providerModels.default || requestedModel;
}

/**
 * Get conversation history limit for a provider
 * @param {string} provider
 * @returns {number}
 */
export function getHistoryLimit(provider) {
    return AI_CONFIG.conversationHistory[provider] || 5;
}

/**
 * Get generation config with defaults
 * @param {Object} agent - Agent configuration
 * @returns {Object}
 */
export function getGenerationConfig(agent) {
    return {
        temperature: agent.temperature ?? AI_CONFIG.defaults.temperature,
        maxTokens: agent.max_tokens ?? AI_CONFIG.defaults.maxTokens,
        topP: agent.top_p ?? AI_CONFIG.defaults.topP,
        topK: agent.top_k ?? AI_CONFIG.defaults.topK
    };
}

export default AI_CONFIG;
