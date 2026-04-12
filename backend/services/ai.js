import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from './credits.js';
import { adminAnomaliesService } from './adminAnomalies.js';
import { debugIngest } from '../utils/debugIngest.js';
import db from '../database/init.js';
import { AI_CONFIG, getModelName, getHistoryLimit, getGenerationConfig } from '../config/ai.config.js';
import { aiLogger } from '../utils/logger.js';
import { geminiCircuitBreaker, openaiCircuitBreaker, openrouterCircuitBreaker } from '../utils/circuitBreaker.js';
import { countTokensSync } from '../utils/tokenizer.js';
import { getSmartWindow } from '../utils/conversationMemory.js';
import { withExponentialBackoff } from '../utils/retryHelper.js';

/**
 * Service IA unifié - Gère Gemini, OpenAI et OpenRouter
 * Intègre le système de crédits pour la facturation
 */
class AIService {
    constructor() {
        this.openaiClient = null;
        this.geminiClient = null;
        this.openrouterClient = null;
        this.initialized = false;
    }

    /**
     * Initialise les clients IA au démarrage
     */
    initialize() {
        if (this.initialized) return;

        // Initialize Gemini (prioritaire)
        if (process.env.GEMINI_API_KEY) {
            try {
                this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                console.log('✅ [AI] Google Gemini initialisé');
            } catch (error) {
                console.error('❌ [AI] Erreur initialisation Gemini:', error.message);
            }
        }

        // Initialize OpenAI (fallback)
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key') {
            try {
                this.openaiClient = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
                console.log('✅ [AI] OpenAI initialisé');
            } catch (error) {
                console.error('❌ [AI] Erreur initialisation OpenAI:', error.message);
            }
        }

        // Initialize OpenRouter (multi-modèles)
        if (process.env.OPENROUTER_API_KEY) {
            try {
                this.openrouterClient = new OpenAI({
                    apiKey: process.env.OPENROUTER_API_KEY,
                    baseURL: 'https://openrouter.ai/api/v1'
                });
                console.log('✅ [AI] OpenRouter initialisé');
            } catch (error) {
                console.error('❌ [AI] Erreur initialisation OpenRouter:', error.message);
            }
        }

        if (!this.geminiClient && !this.openaiClient && !this.openrouterClient) {
            console.warn('⚠️ [AI] Aucun service IA configuré - réponses de fallback activées');
        }

        this.initialized = true;
    }

    /**
     * Détermine le meilleur provider selon le modèle et la disponibilité
     */
    getProvider(modelName) {
        // If only OpenRouter is configured, route everything there
        if (this.openrouterClient && !this.geminiClient && !this.openaiClient) {
            return 'openrouter';
        }

        // Liste des IDs connus pour OpenRouter (sans / ni :)
        const openrouterIds = ['deepseek-r1t-chimera', 'qwen3-80b', 'liquid-lfm-40b'];
        if (openrouterIds.includes(modelName)) return 'openrouter';

        // Modèle OpenRouter (contient "/" ou ":free")
        if (modelName?.includes('/') || modelName?.includes(':')) {
            return 'openrouter';
        }

        // Modèles explicitement Gemini
        if (modelName?.startsWith('gemini') || modelName?.startsWith('models/gemini')) {
            return 'gemini';
        }

        // Modèles explicitement OpenAI
        if (modelName?.startsWith('gpt')) {
            return 'openai';
        }

        // Par défaut: Ordre de préférence selon les clients configurés
        if (this.geminiClient) return 'gemini';
        if (this.openaiClient) return 'openai';
        if (this.openrouterClient) return 'openrouter';
        return 'fallback';
    }

    /**
     * Génère une réponse IA avec gestion des crédits et contexte enrichi
     * @param {Object} agent - Agent configuration
     * @param {Array} conversationHistory - Previous messages
     * @param {Object|string} normalizedPayloadOrMessage - Normalized payload { tenant_id, conversation_id, from, message, timestamp } or raw user message (legacy)
     * @param {Array} [knowledgeBaseOrUserId] - Knowledge base items (new) or userId (legacy 6-arg)
     * @param {Object|string} [messageAnalysisOrKnowledge] - Pre-analysis (new) or knowledge (legacy)
     * @param {Object} [messageAnalysisLegacy] - Pre-analysis (legacy 6-arg only)
     */
    /**
     * Get API key for a specific provider and optional modelId
     */
    async getApiKey(provider, modelId = null) {
        try {
            if (modelId) {
                const modelRecord = await db.get('SELECT api_key FROM ai_models WHERE (id = ? OR model_id = ?) AND provider = ?', modelId, modelId, provider);
                if (modelRecord?.api_key) return modelRecord.api_key;
            }
            const keyRecord = await db.get('SELECT api_key FROM ai_api_keys WHERE provider = ? AND is_active = 1', provider);
            if (keyRecord?.api_key) return keyRecord.api_key;
            return {
                gemini: process.env.GEMINI_API_KEY,
                openai: process.env.OPENAI_API_KEY,
                openrouter: process.env.OPENROUTER_API_KEY
            }[provider] || null;
        } catch (error) {
            console.error(`[AI] Error fetching API key for ${provider}:`, error.message);
            return null;
        }
    }

    /**
     * Refresh provider clients using keys stored in DB (when .env keys are missing).
     * Called before each generateResponse so DB-configured keys are always available.
     */
    async refreshClientsFromDb() {
        try {
            const keys = await db.all('SELECT provider, api_key FROM ai_api_keys WHERE is_active = 1 AND api_key IS NOT NULL');
            for (const { provider, api_key } of keys) {
                if (!api_key) continue;
                if (provider === 'openrouter') {
                    // Always reinitialize to pick up key changes from admin panel
                    this.openrouterClient = new OpenAI({ apiKey: api_key.trim(), baseURL: 'https://openrouter.ai/api/v1' });
                } else if (provider === 'openai' && !this.openaiClient) {
                    this.openaiClient = new OpenAI({ apiKey: api_key });
                    console.log('[AI] OpenAI client initialized from DB key');
                } else if (provider === 'gemini' && !this.geminiClient) {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    this.geminiClient = new GoogleGenerativeAI(api_key);
                    console.log('[AI] Gemini client initialized from DB key');
                }
            }
        } catch (err) {
            // Non-blocking — DB may not be ready
        }
    }

    /**
     * @param {Object} agent - Agent configuration
     * @param {Array} conversationHistory - Previous messages
     * @param {string} userMessage - New message from user
     * @param {Array} knowledgeBase - RAG data
     * @param {Object} messageAnalysis - Pre-analysis
     * @param {string|null} userId - For credits
     * @param {boolean} skipFallback - Disable fallback for manual testing
     */
    async generateResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null, userId = null, skipFallback = false) {
        this.initialize();
        await this.refreshClientsFromDb();

        // Sanitize user message
        let actualMessage = userMessage;
        if (userMessage && typeof userMessage === 'object' && typeof userMessage.message === 'string') {
            actualMessage = userMessage.message;
        } else if (typeof userMessage !== 'string') {
            actualMessage = String(userMessage || '');
        }
        const sanitizedUserMessage = actualMessage ? actualMessage.substring(0, 2000) : '';

        const agentModelId = agent.model || 'gemini-2.0-flash';
        let resolvedModelId = agentModelId;

        // Fast path: _resolvedModel + _resolvedProvider already set (e.g. from test route)
        // Skip all DB resolution and call the exact model directly
        if (agent._resolvedModel && agent._resolvedProvider) {
            const provider = agent._resolvedProvider;
            const finalModelString = agent._resolvedModel;
            const apiKey = await this.getApiKey(provider, finalModelString);
            console.log(`[AI] Direct | Provider: ${provider} | Model: ${finalModelString}`);
            try {
                return await this.executeProviderCall(provider, agent, conversationHistory, sanitizedUserMessage, knowledgeBase || [], messageAnalysis, apiKey, userId, finalModelString);
            } catch (error) {
                throw error; // skipFallback from test route
            }
        }

        // 1. Resolve model ID from DB (handles UI UUID -> actual model string mapping)
        try {
            const modelRecord = await db.get(
                'SELECT model_id FROM ai_models WHERE id = ? OR model_id = ?',
                agentModelId, agentModelId
            );
            if (modelRecord?.model_id) {
                resolvedModelId = modelRecord.model_id;
            }
        } catch (err) {
            // DB not ready or error
        }

        // 1.b Check credits/trial BEFORE calling LLM
        if (userId) {
            const hasCredits = await hasEnoughCredits(userId, resolvedModelId);
            if (!hasCredits) {
                console.warn(`[AI] Blocking request for user ${userId}: Insufficient credits or expired trial`);
                return { 
                    content: 'Merci pour votre message. Un conseiller vous répondra dès que possible.', 
                    need_human: true,
                    tokens: 0,
                    provider: 'fallback',
                    credit_warning: 'Votre compte ne dispose pas d\'assez de crédits ou votre période d\'essai est expirée.'
                };
            }
        }

        // 2. Identify Provider based on resolved model — prefer what the DB says
        let provider = this.getProvider(resolvedModelId);
        let finalModelString = resolvedModelId;

        // If the model record has an explicit provider column in DB, always use it
        try {
            const modelRecord2 = await db.get(
                'SELECT provider, model_id FROM ai_models WHERE id = ? OR model_id = ?',
                agentModelId, agentModelId
            );
            if (modelRecord2?.provider) {
                provider = modelRecord2.provider;
            }
        } catch (e) { /* non-blocking */ }

        // OpenRouter needs prefix stripping
        if (provider === 'openrouter' && finalModelString.startsWith('openrouter/')) {
            finalModelString = finalModelString.slice('openrouter/'.length);
        }

        // For OpenRouter, ensure we use the openrouterClient - refresh if API key exists in DB
        if (provider === 'openrouter' && !this.openrouterClient) {
            const orKey = await this.getApiKey('openrouter');
            if (orKey) {
                this.openrouterClient = new OpenAI({ apiKey: orKey.trim(), baseURL: 'https://openrouter.ai/api/v1' });
            }
        }

        const agentWithResolvedModel = { ...agent, _resolvedModel: finalModelString };
        const apiKey = await this.getApiKey(provider, finalModelString);

        console.log(`[AI] Provider: ${provider} | Model: ${finalModelString} | User: ${userId || 'anonymous'}`);

        // Limit knowledge base size to prevent prompt bloat and keep costs down
        let sanitizedKB = knowledgeBase || [];
        if (sanitizedKB.length > 10) {
            sanitizedKB = sanitizedKB.slice(0, 10); // Max 10 chunks
        }
        
        // Final token cap for KB (~25000 chars = ~6000 tokens, safe for GEMINI/OPENAI)
        let totalChars = 0;
        sanitizedKB = sanitizedKB.filter(item => {
            totalChars += (item.content || '').length;
            return totalChars < 25000;
        });

        try {
            // Load customer context (long-term memory)
            let customerContext = '{}';
            const conversationId = userMessage?.conversation_id || (messageAnalysis?.conversation_id);
            if (conversationId) {
                const conv = await db.get('SELECT customer_context FROM conversations WHERE id = ?', conversationId);
                if (conv?.customer_context) customerContext = conv.customer_context;
            }

            // 4. Try Primary Model with exponential backoff
            const response = await withExponentialBackoff(() => 
                this.executeProviderCall(provider, agentWithResolvedModel, conversationHistory, sanitizedUserMessage, sanitizedKB, { ...messageAnalysis, customerContext }, apiKey, userId, resolvedModelId)
            );

            // 5. Extraction of new facts (Side task - Async)
            if (response?.content && conversationId) {
                this.extractAndSaveCustomerContext(conversationId, sanitizedUserMessage, response.content, customerContext).catch(err => {
                    console.error('[AI] Customer context extraction error:', err.message);
                });
            }

            return response;
            
        } catch (error) {
            console.error(`[AI] Primary model failed (${provider}):`, error.message);
            
            if (skipFallback) throw error; 

            // 5. Dynamic Fallback: Try other active models from your Admin list
            try {
                const fallbackModels = await db.all(
                    'SELECT * FROM ai_models WHERE is_active = 1 AND id != ? ORDER BY sort_order ASC LIMIT 2',
                    resolvedModelId
                );

                for (const fallbackModel of fallbackModels) {
                    console.log(`[AI] Attempting dynamic fallback to: ${fallbackModel.name} (${fallbackModel.provider})`);
                    try {
                        // Use the DB-stored provider field — never guess from model name
                        const fbProvider = fallbackModel.provider || this.getProvider(fallbackModel.model_id);
                        let fbModelString = fallbackModel.model_id;
                        if (fbProvider === 'openrouter' && fbModelString.startsWith('openrouter/')) {
                            fbModelString = fbModelString.slice('openrouter/'.length);
                        }
                        
                        const fbApiKey = await this.getApiKey(fbProvider, fbModelString);
                        const fbAgent = { ...agent, _resolvedModel: fbModelString };
                        
                        return await withExponentialBackoff(() => 
                            this.executeProviderCall(fbProvider, fbAgent, conversationHistory, sanitizedUserMessage, sanitizedKB, messageAnalysis, fbApiKey, userId, fallbackModel.model_id)
                        );
                    } catch (fbErr) {
                        console.error(`[AI] Fallback to ${fallbackModel.name} also failed:`, fbErr.message);
                        continue; // Try next fallback
                    }
                }
            } catch (dbErr) {
                console.error('[AI] Error fetching fallback models:', dbErr.message);
            }

            // Ultimate Fallback (Hardcoded polite message)
            return this.fallbackResponse(agent, sanitizedUserMessage);
        }
    }

    /**
     * Specialized method to improve/rewrite text (e.g. for campaigns)
     */
    async improveText(originalText, context = "marketing WhatsApp", userId = null) {
        this.initialize();
        await this.refreshClientsFromDb();

        // Resolve best model from Admin DB (prefer 'fast' category for speed)
        const bestRecord = await db.get(
            `SELECT id, model_id, provider FROM ai_models 
             WHERE is_active = 1 
             ORDER BY CASE WHEN category = 'fast' THEN 0 ELSE 1 END, sort_order ASC 
             LIMIT 1`
        );
        const modelId = bestRecord?.model_id || 'gemini-2.5-flash';
        const provider = bestRecord?.provider || 'gemini';
        const apiKey = await this.getApiKey(provider, modelId);

        const systemPrompt = `Tu es un automate de réécriture marketing. 
TA SEULE MISSION : Optimiser le texte fourni pour le rendre plus percutant (${context}).
INTERDICTION : Ne salue pas, ne te présente pas, ne fais aucune phrase d'introduction.
FORMAT : Réponds UNIQUEMENT par JSON {"response": "le nouveau texte ici"}.
Si le texte contient des questions, ne les résouts pas, réécris-les simplement mieux.`;

        const mockAgent = {
            id: 'internal-chatbot', 
            name: 'Rewriter', 
            model: bestRecord?.id || modelId,
            _resolvedModel: modelId,
            _resolvedProvider: provider,
            system_prompt: systemPrompt,
            template: 'assistant'
        };

        try {
            const wrappedInput = `--- DEBUT DU TEXTE À RÉÉCRIRE ---\n${originalText}\n--- FIN DU TEXTE À RÉÉCRIRE ---`;
            const response = await this.generateResponse(mockAgent, [], wrappedInput, [], null, userId, false);
            return response.content;
        } catch (error) {
            console.error('[AI] Improve text fatal error:', error.message);
            // Last resort: return original text so the UI doesn't crash
            return originalText;
        }
    }

    /**
     * Helper to execute a provider call with credits and logging
     * Refactored to be reusable for fallback loops
     */
    async executeProviderCall(provider, agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis, apiKey, userId, modelIdForCredits) {
        let response;
        const startTime = Date.now();
        
        try {
            if (provider === 'gemini') {
                response = await geminiCircuitBreaker.execute(() => 
                    this.generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis, apiKey)
                );
            } else if (provider === 'openai') {
                response = await openaiCircuitBreaker.execute(() => 
                    this.generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis, apiKey)
                );
            } else if (provider === 'openrouter') {
                response = await openrouterCircuitBreaker.execute(() => 
                    this.generateOpenRouterResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis, apiKey)
                );
            } else {
                response = this.fallbackResponse(agent, userMessage);
            }

            const responseTime = Date.now() - startTime;
            if (response) response.response_time = responseTime;

            // Deduct Credits & Log Stats if successful
            if (userId && provider !== 'fallback' && response?.content) {
                const tokensUsed = response.tokens || 0;
                const deduction = await deductCredits(userId, modelIdForCredits, 1, {
                    agent_id: agent.id,
                    tokens: tokensUsed
                });
                
                response.credits_deducted = deduction.cost;
                response.credits_remaining = deduction.credits_remaining;

                try {
                    // Check if agent exists before inserting usage (internal-chatbot doesn't exist in DB)
                    const agentExists = agent.id === 'internal-chatbot' ? false : await db.get('SELECT id FROM agents WHERE id = ?', agent.id);
                    await db.run(`
                        INSERT INTO ai_model_usage (id, model_id, user_id, agent_id, tokens_used, credits_used, success, response_time_ms)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, uuidv4(), modelIdForCredits, userId, agentExists ? agent.id : null, tokensUsed, deduction.cost || 0, 1, responseTime);
                } catch (e) {
                    console.error('[AI] Stats log error:', e.message);
                }
            }

            return response;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            // Failure logging
            if (userId && provider !== 'fallback') {
                try {
                    const agentExists = agent.id === 'internal-chatbot' ? false : await db.get('SELECT id FROM agents WHERE id = ?', agent.id);
                    await db.run(`
                        INSERT INTO ai_model_usage (id, model_id, user_id, agent_id, tokens_used, credits_used, success, response_time_ms)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, uuidv4(), modelIdForCredits, userId, agentExists ? agent.id : null, 0, 0, 0, responseTime);
                } catch (dbErr) {
                    console.error('[AI] Error stats log error:', dbErr.message);
                }
            }
            throw error;
        }
    }

    /**
     * Construit le prompt système en blocs [SYSTEM GLOBAL], [BUSINESS TENANT], [POLICY].
     * Retourne { prompt, promptHash } pour versioning dans les logs.
     * @param {Object} agent - Agent configuration
     * @param {Array} knowledgeBase - Knowledge base items
     * @param {Object} messageAnalysis - Pre-analysis of the user message (optional)
     */
    /** Decode HTML entities in stored prompts so the LLM receives normal quotes/apostrophes */
    decodeHtmlEntities(str) {
        if (!str || typeof str !== 'string') return str;
        return str
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }

    /**
     * Validate and sanitize system prompt to prevent prompt injection
     * @param {string} prompt - The system prompt to validate
     * @returns {{ valid: boolean, sanitized: string, warnings: string[] }}
     */
    validateAndSanitizePrompt(prompt) {
        const warnings = [];
        
        if (!prompt || typeof prompt !== 'string') {
            return { valid: false, sanitized: '', warnings: ['Prompt is empty or invalid'] };
        }

        let sanitized = prompt.trim();

        // Size limit: 10000 characters
        const MAX_PROMPT_LENGTH = 10000;
        if (sanitized.length > MAX_PROMPT_LENGTH) {
            sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
            warnings.push(`Prompt truncated to ${MAX_PROMPT_LENGTH} characters`);
        }

        // Detect potential prompt injection patterns
        const dangerousPatterns = [
            /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
            /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
            /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
            /new\s+instructions?:/gi,
            /system\s*:\s*you\s+are\s+now/gi,
            /\[INST\]/gi,
            /\[\/INST\]/gi,
            /<\|im_start\|>/gi,
            /<\|im_end\|>/gi,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitized)) {
                warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
            }
        }

        return {
            valid: warnings.length === 0,
            sanitized,
            warnings
        };
    }

    buildSystemPrompt(agent, knowledgeBase, messageAnalysis = null) {
        const hasCustomPrompt = agent.system_prompt && agent.system_prompt.trim().length > 0;

        // [SYSTEM GLOBAL] — verrouillé: présentation et contexte
        let systemGlobal;
        if (hasCustomPrompt) {
            const decoded = this.decodeHtmlEntities(agent.system_prompt);
            const validation = this.validateAndSanitizePrompt(decoded);
            
            if (validation.warnings.length > 0) {
                console.warn(`[AI] System prompt warnings for agent ${agent.id}:`, validation.warnings);
            }
            
            systemGlobal = validation.sanitized;
        } else {
            systemGlobal = this.getDefaultPrompt(agent);
        }
        if (!hasCustomPrompt) systemGlobal += this.getDefaultInstructions();
        
        // 🚨 Ne pas appliquer les règles conversationnelles WhatsApp B2C à l'assistant interne du dashboard (SaaS)
        if (agent.id !== 'internal-chatbot') {
            systemGlobal += '\n\n⚠️ RÈGLE FINALE — PRÉSENTATION: Ne dis JAMAIS "Je suis [nom]", "Je m\'appelle...", "votre assistant [type]..." ou toute phrase qui te présente. Réponds directement au message du client.';
            systemGlobal += '\n\n⚠️ RÈGLE — CONTEXTE: Utilise la CONVERSATION RÉCENTE fournie. Si le client a déjà été salué (échange précédent avec "Bonjour" ou salut), NE REDIS PAS "Bonjour" ni "Bonjour !" au début de ta réponse. Réponds directement à sa question ou demande (ex: produit, commande). Tu ne salues qu\'une seule fois au tout premier message du client.';
            systemGlobal += '\n\n⚠️ RÈGLE — FORMULATION: Quand tu transmets des informations du catalogue ou de la base de connaissances, utilise des formulations professionnelles comme "Voici les informations disponibles", "D\'après notre catalogue, ...", "Voici ce qui est indiqué : ...". Ne dis JAMAIS "C\'est tout ce que j\'ai comme information", "Je n\'ai que ça", ou des formulations qui sous-entendent un manque. Reste factuel et rassurant.';
            systemGlobal += '\n\n⚠️ RÈGLE — CANAL WHATSAPP: Tu discutes **ACTUELLEMENT ET DIRECTEMENT** avec le client sur WhatsApp. NE DEMANDE JAMAIS par quel canal/moyen (email, SMS, WhatsApp) il souhaite recevoir une information ou une photo. Envoie TOUJOURS les photos, informations ou liens DIRECTEMENT ici dans ta réponse.';

            // 🎭 Règles de tonalité humaine — appliquées à TOUS les agents sauf assistant interne
            systemGlobal += `\n\n🎭 RÈGLES DE TONALITÉ NATURELLE (applique toujours ces règles):

1. VARIE TES ACCUSÉS DE RÉCEPTION — Ne dis JAMAIS deux fois de suite le même mot.
   Au lieu de toujours "Parfait ! 🎉", utilise une sélection naturelle:
   Court: "Noté !", "Super !", "Bien sûr !", "Avec plaisir !", "C\'est bon.", "Entendu.", "Ok !"
   Chaleureux: "Très bien !", "Excellent choix !", "Je comprends.", "Bien reçu !"
   Neutre: "D\'accord.", "Certainement !", "Je m\'en occupe.", "Vu."

2. ADAPTE LA LONGUEUR DE TA RÉPONSE au type de message reçu:
   - Message court ("ok", "merci", 👍, émoji seul) → réponse ULTRA-COURTE: 1 phrase max ou juste un émoji de retour
   - Question simple → 1-2 phrases
   - Question complexe ou commande → 2-4 phrases maximum
   - Ne rédige JAMAIS des paragraphes entiers si le client pose une question simple

3. RÉAGIS AUX EXPRESSIONS HUMAINES:
   - "Je suis pressé" → "Pas de souci, je fais vite ! [réponse directe]"
   - "Bonne soirée" → "Merci, bonne soirée à vous aussi ! [si fin de conversation]"
   - "Vous êtes super" / "Merci" en fin de transaction → réponse courte et chaleureuse, pass le relais à un humain (need_human: true)
   - "Je suis déçu" / frustration → empathie courte avant la réponse

4. MESSAGES TRÈS COURTS (emojis, "ok", "ouais", "top", nombre seul, 1-3 mots sans question):
   → Réponds en 1-3 mots maximum. Pas de paragraphe. Sois aussi bref que le client.
   Exemple client: "👍" → toi: "Super ! 😊"
   Exemple client: "Ok" → toi: "Parfait !"
   Exemple client: "Merci" → toi: "De rien ! 😊" (+ need_human: true si commande vient d\'être finalisée)

5. TON VARIABLE selon le contexte:
   - Premier message du client: légèrement plus formel et accueillant
   - Conversation déjà entamée: plus naturel et direct
   - Client régulier: familier et personnalisé`;
        }

        // 📅 Amélioration #4 : Contexte temporel pour l'agent
        const timezone = agent.availability_timezone || 'Europe/Paris';
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('fr-FR', {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const timeContext = `\n\n📅 CONTEXTE TEMPOREL (Ne partage pas cette info sauf si le client pose une question temporelle):\n- Date et Heure: ${formatter.format(now).replace(',', ' à')}\n- Période: ${isWeekend ? 'Week-end' : 'Jour de semaine'}\n- Fuseau horaire: ${timezone}`;
        systemGlobal += timeContext;

        // 🧠 Relational Memory (Long-term Context)
        if (messageAnalysis?.customerContext) {
            try {
                const facts = JSON.parse(messageAnalysis.customerContext);
                const factEntries = Object.entries(facts);
                if (factEntries.length > 0) {
                    systemGlobal += '\n\n👤 CE QUE TU SAIS SUR CE CLIENT (Mémoire long terme):\n';
                    for (const [key, value] of factEntries) {
                        systemGlobal += `- ${key}: ${value}\n`;
                    }
                    systemGlobal += 'INSTRUCTION: Utilise ces infos pour personnaliser ta réponse (ex: "comme d\'habitude au quartier X") sans paraître trop intrusif.';
                }
            } catch (e) { /* ignore parse error */ }
        }

        // [BUSINESS TENANT] — agent/catalogue et contexte temps réel
        let businessTenant = '';
        if (messageAnalysis) businessTenant += '\n\n' + this.buildAnalysisContext(messageAnalysis, agent);
        if (knowledgeBase && knowledgeBase.length > 0) {
            businessTenant += '\n\n📚 BASE DE CONNAISSANCES:\n';
            for (const item of knowledgeBase) {
                // Do not aggressively truncate catalogues to ensure AI sees all products and categories
                const isCatalogue = item.title && item.title.includes('CATALOGUE PRODUITS');
                const maxLength = isCatalogue ? 25000 : 2000;
                const content = item.content.length > maxLength ? item.content.substring(0, maxLength) + '...' : item.content;
                businessTenant += `### ${item.title}\n${content}\n\n`;
            }
            const hasCatalogue = knowledgeBase.some(item => item.title === '📦 CATALOGUE PRODUITS');
            if (hasCatalogue) {
                    businessTenant += '\n⚠️ RÈGLE — CATALOGUE: Pour les noms de produits, prix, disponibilité, description, caractéristiques et capacités techniques, utilise UNIQUEMENT la section "📦 CATALOGUE PRODUITS" ci-dessus. Chaque produit peut avoir une description sur la ligne suivante (indentation) : utilise-la pour répondre aux questions sur les capacités, spécifications ou fiche technique. N\'invente aucune caractéristique. Si le client demande les capacités/caractéristiques d\'un produit et qu\'aucune description n\'est indiquée pour ce produit dans le catalogue, dis-le clairement et propose de le mettre en relation avec un conseiller pour les détails techniques.\n';
                    businessTenant += '⚠️ IMAGES PRODUITS: Si le client demande une image/photo d\'un produit, fournis le lien présent dans le catalogue (champ "Image: <url>") et n\'invente jamais de lien. Si le produit n\'a pas de lien d\'image, dis-le simplement.\n';
            }
        }

        // [POLICY] — légal/sécurité
        const policy = '\n\n[POLICY] — RÈGLES LÉGALES / SÉCURITÉ: Ne fais jamais de promesse de garantie absolue, ni de promesse de délai non autorisée. N\'invente aucun prix ni information hors catalogue.\n\n⚠️ QUAND DEMANDER UN CONSEILLER (need_human: true):\n- Réclamation grave ou litige complexe\n- Problème technique critique nécessitant intervention\n- Informations de paiement ou données bancaires\n- Remerciements de fin de transaction (ex: "Merci", "super merci", "c\'est noté") après une commande ou une finalisation, pour que l\'humain prenne le relais sur la suite opérationnelle.\n\n✅ TU PEUX RÉPONDRE DIRECTEMENT (need_human: false):\n- Questions sur produits, prix, disponibilité, capacités/caractéristiques/description (utilise le catalogue et la description produit)\n- Demandes de retour/remboursement (utilise la politique de retour dans la base de connaissance)\n- Questions sur livraison, délais, zones desservies\n- Informations générales présentes dans ta base de connaissance';

        const fullPrompt = `[SYSTEM GLOBAL]\n${systemGlobal}\n\n[BUSINESS TENANT]\n${businessTenant}\n${policy}`;
        const promptHash = crypto.createHash('sha256').update(fullPrompt).digest('hex').slice(0, 16);
        return { prompt: fullPrompt, promptHash };
    }


    /**
     * Get default prompt for agent without custom prompt
     */
    getDefaultPrompt(agent) {
        const isEcommerce = agent.template === 'ecommerce';
        const isCommercial = agent.template === 'commercial';
        const isSupport = agent.template === 'support';
        
        let prompt = `Tu es l'assistant expert de "${agent.name || 'notre établissement'}" sur WhatsApp.
Ton objectif est d'être ultra-efficace, chaleureux et direct. Le temps des clients sur WhatsApp est précieux : va DROIT au but.

## 🎭 TONALITÉ & STYLE
- Style: Direct, moderne, accueillant.
- Emojis: Utilise 1-2 emojis pertinents par message (✅, 📦, 💡, 🚀) pour rester humain mais professionnel.
- Concision: Phrases COURTES. Pas de paragraphes de plus de 3 lignes.
- Un seul point par message: Ne pose JAMAIS deux questions différentes dans le même message.

## 🛠️ COMPORTEMENT SELON TON RÔLE (${agent.template || 'généraliste'})`;

        if (isEcommerce) {
            prompt += `
- Tu es un EXPERT VENTE. Ta mission est de convertir chaque question en commande.
- Si un produit est disponible, sois enthousiaste : "C'est disponible ! ✅"
- Ne demande JAMAIS "souhaitez-vous commander cette quantité" si le stock est élevé. Dis plutôt : "On en a en stock. Je vous en prépare un pour votre commande ?"
- Envoi d'images : Si le client demande à voir ou veut des photos, envoie-les IMMÉDIATEMENT (en utilisant la balise [ENVOYER_IMAGES:...]).
- Finalisation : Dès que l'intention d'achat est là, passe à la livraison (ville, quartier, tél).

## 🎁 UPSELL (vente additionnelle) — OBLIGATOIRE
Propose UN seul upsell naturel UNIQUEMENT si le client ne l'a pas encore mentionné :
- Burger / sandwich seul → "Souhaitez-vous ajouter des frites et une boisson pour un menu complet ?"
- Plat principal seul (sans boisson) → "Je vous conseille une boisson pour accompagner, on a [exemples du catalogue] 😊"
- Pizza → "Souhaitez-vous ajouter une saveur ou une boisson ?"
- Repas complet déjà mentionné → NE PROPOSE PAS d'upsell, confirme directement.

## 📦 COMMANDES MULTI-DESTINATAIRES
Si le client mentionne plusieurs adresses ou personnes différentes ("pour mon ami à Cocody", "à Yopougon et Adjamé"):
- Détecte-le immédiatement et dis : "Pour plusieurs adresses différentes, nous allons traiter ça en deux commandes séparées. D'abord pour quelle adresse commencer ?"
- Ne tente PAS de fusionner les infos de livraison de destinataires différents.`;
        } else if (isCommercial) {
            prompt += `
- Tu es un CONSEILLER RELATIONNEL. Ta mission est de présenter nos services et de fixer des rendez-vous.
- Valorise l'expertise de l'entreprise.
- Propose activement un rendez-vous ou un rappel dès que le client exprime un besoin précis.`;
        } else if (isSupport) {
            prompt += `
- Tu es un EXPERT SUPPORT. Ta mission est de résoudre les problèmes ou répondre aux questions techniques (FAQ) avec empathie.
- Sois rassurant et clair. Si un problème est complexe, n'hésite pas à dire que tu passes le relais à un humain.`;
        }

        prompt += `

## ⚠️ INTERDICTIONS ABSOLUES (MURS)
1. NE JAMAIS te présenter ("Je suis l'assistant de..."). Le client le sait déjà.
2. NE JAMAIS demander un canal d'envoi (Email/WhatsApp). Tu es SUR WhatsApp, envoie tout ICI.
3. NE JAMAIS saluer deux fois de suite si une conversation est déjà lancée.
4. NE JAMAIS inventer de prix ou de caractéristiques techniques hors catalogue/connaissance.`;

        return prompt;
    }

    /**
     * Get default instructions
     */
    getDefaultInstructions() {
        return `

📋 RÈGLES D'EXÉCUTION WHATSAPP:
1. RÉPONSE COURTE: Si le client dit "ok", "merci" ou "super", réponds par 3-4 mots max + émoji.
2. DIRECTIVITÉ: Si le client cherche un produit, donne le prix et la disponibilité IMMÉDIATEMENT. Ne tourne pas autour du pot.
3. ADAPTATION: Si le client écrit mal (argot, abréviations), reste professionnel mais simple dans ton vocabulaire.
4. PAS DE RÉPÉTITION: Si l'info est déjà dans le haut de la conversation, ne la répète pas sauf si le client le redemande.`;
    }

    /**
     * Build analysis context string for AI
     */
    buildAnalysisContext(analysis, agent) {
        if (!analysis) return '';
        
        const parts = ['🔍 CONTEXTE TEMPS RÉEL:'];
        
        // Language: force reply in the same language as the client
        if (analysis.language && analysis.language !== 'unknown') {
            const langLabel = analysis.language === 'fr' ? 'français' : analysis.language === 'en' ? 'anglais' : analysis.language;
            parts.push(`\n🌐 Langue du message client : ${langLabel}. Réponds UNIQUEMENT dans cette langue.`);
        }

        // Sentiment routing hint (hesitant → suggest offer or FAQ)
        if (analysis.sentiment_hint === 'suggest_offer_or_faq') {
            parts.push('\n💡 Le client semble hésitant: privilégie une proposition d\'offre ou une FAQ ciblée pour le rassurer.');
        }

        // Intent
        if (analysis.intent) {
            const intentLabels = {
                order: 'COMMANDE',
                inquiry: 'DEMANDE D\'INFO',
                complaint: 'RÉCLAMATION',
                greeting: 'SALUTATION',
                delivery_info: 'INFO LIVRAISON',
                human_request: 'DEMANDE HUMAIN',
                general: 'GÉNÉRAL'
            };
            parts.push(`Intention: ${intentLabels[analysis.intent.primary] || analysis.intent.primary}`);
        }

        // P1.4 & P1.5 — Automatic order updates
        if (analysis.orderCancelled) {
            parts.push('\n🔴 COMMANDE ANNULÉE: Une commande en attente vient d\'être annulée automatiquement suite à la demande du client.');
            parts.push('→ ACTION: Confirme au client que sa commande a été annulée comme demandé.');
        } else if (analysis.orderPostponed) {
            parts.push('\n🟠 COMMANDE REPORTÉE: Une commande en attente vient d\'être reportée automatiquement suite à la demande du client.');
            parts.push('→ ACTION: Confirme au client que sa commande a été mise en attente/reportée et que vous restez à sa disposition.');
        }
        
        // Products with real-time stock
        if (analysis.products?.matchedProducts?.length > 0) {
            parts.push('\nProduits mentionnés:');
            for (const p of analysis.products.matchedProducts) {
                const status = p.stockStatus === 'available' ? '✅ Disponible' :
                              p.stockStatus === 'low' ? '⚠️ Stock limité' :
                              p.stockStatus === 'insufficient' ? '⚠️ Stock insuffisant' : '⛔ Rupture';
                parts.push(`- ${p.name}: ${p.price} FCFA | ${status} (${p.stock} en stock) | Qté demandée: ${p.requestedQuantity}`);
            }
        }
        
        // Stock issues - CRITICAL INFO
        if (analysis.products?.stockIssues?.length > 0) {
            parts.push('\n⚠️ ALERTES STOCK:');
            for (const issue of analysis.products.stockIssues) {
                parts.push(`- ${issue.message}`);
            }
            parts.push('→ INFORME le client de ces problèmes de stock!');
        }
        
        // Customer history
        if (analysis.customerHistory) {
            const h = analysis.customerHistory;
            if (h.isRepeatCustomer) {
                parts.push(`\n👤 Client fidèle (${h.validatedOrders} commande(s), ${h.totalSpent} FCFA dépensés)`);
            } else if (h.isNewCustomer) {
                parts.push('\n👤 Nouveau client');
            }
            if (analysis.isNewConversation) {
                parts.push('📍 Nouvelle conversation avec un nouveau client.');
            }
        }

        // Current time for scheduling/rdv
        const now = new Date();
        const timezone = agent?.availability_timezone || 'Europe/Paris';
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone };
        parts.push(`\n🕒 DATE ET HEURE ACTUELLE: ${now.toLocaleString('fr-FR', dateOptions)}`);
        parts.push(`- ISO Timestamp: ${now.toISOString()}`);
        parts.push(`- Fuseau horaire: ${timezone}`);
        
        // Delivery info collected
        if (analysis.deliveryInfo?.hasDeliveryInfo) {
            parts.push('\n📍 Infos livraison détectées:');
            if (analysis.deliveryInfo.city) parts.push(`- Ville: ${analysis.deliveryInfo.city}`);
            if (analysis.deliveryInfo.neighborhood) parts.push(`- Quartier: ${analysis.deliveryInfo.neighborhood}`);
            if (analysis.deliveryInfo.phone) parts.push(`- Tél: ${analysis.deliveryInfo.phone}`);
        }

        // Support context
        if (analysis.support?.ticketIntent) {
            const s = analysis.support;
            const catLabels = { technical: 'TECHNIQUE', delivery: 'LIVRAISON', refund: 'REMBOURSEMENT', complaint: 'RÉCLAMATION', account: 'COMPTE', other: 'AUTRE' };
            parts.push(`\n🆘 INTENTION SUPPORT DÉTECTÉE:`);
            parts.push(`- Catégorie: ${catLabels[s.category] || s.category}`);
            parts.push(`- Urgence: ${s.urgency === 'high' ? '🔴 HAUTE (Prioritaire)' : '⚪ Normale'}`);
            if (s.urgency === 'high') parts.push('→ INSTRUCTION: Sois particulièrement empathique et rassurant.');
        }

        // Appointment context
        if (analysis.appointment?.rdvIntent) {
            const a = analysis.appointment;
            parts.push(`\n📅 INTENTION RENDEZ-VOUS DÉTECTÉE:`);
            if (a.serviceType) parts.push(`- Type de service: ${a.serviceType}`);
            if (a.extractedSlots?.length > 0) parts.push(`- Créneaux mentionnés: ${a.extractedSlots.join(', ')}`);
            parts.push('→ INSTRUCTION: Si des créneaux sont mentionnés, ne les redemande pas. Valide-les ou demande les infos manquantes (nom, motif si absent).');
        }
        
        // P.22 — Order status request: inject the real order status into context
        if (analysis.intent?.primary === 'order_status') {
            parts.push('\n📦 DEMANDE DE STATUT DE COMMANDE DÉTECTÉE:');
            if (analysis.lastOrderStatus) {
                const statusLabels = {
                    pending: 'En attente de validation',
                    validated: 'Validée — en cours de préparation',
                    delivered: 'Livrée / Payée',
                    cancelled: 'Annulée',
                    rejected: 'Rejetée'
                };
                parts.push(`- Statut: ${statusLabels[analysis.lastOrderStatus] || analysis.lastOrderStatus}`);
                if (analysis.lastOrderTotal) parts.push(`- Total: ${Number(analysis.lastOrderTotal).toLocaleString()} ${analysis.lastOrderCurrency || 'XOF'}`);
            } else {
                parts.push('- Aucune commande en cours trouvée pour ce client.');
            }
            parts.push('INSTRUCTION: Réponds avec le statut réel ci-dessus. Ne dis pas "je vérifie" — l\'info est déjà disponible.');
        }

        // P1.4 — Cancelled order context
        if (analysis.orderCancelled) {
            parts.push('\n❌ COMMANDE ANNULÉE: La commande en cours vient d\'être annulée avec succès.');
            parts.push('INSTRUCTION: Confirme l\'annulation chaleureusement et propose de passer une nouvelle commande si le client le souhaite.');
        }

        // P2.1 — Product options detected
        if (analysis.productOptions && analysis.productOptions.length > 0) {
            parts.push(`\n📋 OPTIONS PRODUIT DÉTECTÉES: ${analysis.productOptions.join(', ')}`);
            parts.push('INSTRUCTION: Confirme bien ces options dans ta réponse (ex: "noté pour ${options}").');
        }

        // Order guidance — INTELLIGENT FLOW
        if (analysis.orderCreated) {
            parts.push('\n✅ COMMANDE ENREGISTRÉE: La commande a bien été créée dans le système.');
            parts.push('INSTRUCTION CRITIQUE: Confirme simplement que la commande est reçue avec un message chaleureux. Ne redemande JAMAIS de confirmation.');
            parts.push('Demande ensuite les infos de livraison manquantes si nécessaire (ville, quartier, téléphone).');
        } else if (analysis.isLikelyOrder) {
            const missing = [];
            if (!analysis.deliveryInfo?.city) missing.push('ville/commune de livraison');
            if (!analysis.deliveryInfo?.neighborhood) missing.push('quartier précis');
            if (!analysis.deliveryInfo?.phone) missing.push('numéro de téléphone de contact');

            if (analysis.confirmation?.isConfirmation || analysis.confirmation?.hasConfirmationProduct) {
                // Client a confirmé ("oui", "je veux", "oui oui", etc.) → NE PAS redemander une confirmation !
                parts.push('\n🎯 INTENTION CONFIRMÉE: Le client a déjà exprimé son intention d\'achat clairement.');
                if (missing.length > 0) {
                    parts.push('INSTRUCTION CRITIQUE: NE REDEMANDE JAMAIS "Confirmez-vous la commande ?". Le client a déjà dit OUI.');
                    parts.push(`PROCHAINE ÉTAPE: Passe directement à la collecte des infos de livraison. Demande de façon naturelle et directe: ${missing.join(', ')}.`);
                    parts.push('Exemple de réponse CORRECTE: "Parfait ! 🎉 Pour finaliser votre livraison, j\'ai besoin de votre ville et quartier, ainsi qu\'un numéro de contact."');
                    parts.push('INTERDIT: Proposer un récapitulatif suivi d\'une question de confirmation.');
                } else if (!analysis.orderCreated) {
                    parts.push('Toutes les infos de livraison sont là, mais la commande n\'a pas pu être créée automatiquement (produit non identifié dans la base structurée).');
                    parts.push('INSTRUCTION: Informe le client que sa demande est bien transmise et qu\'un conseiller va finaliser la commande avec lui dès que possible. Ne dis PAS que c\'est déjà enregistré.');
                    parts.push('Passe le relais à un humain (need_human: true).');
                } else {
                    parts.push('Toutes les infos de livraison sont collectées et la commande est créée. Synthétise-les et confirme que tout est en ordre.');
                }
            } else {

                // Client exprime une intention mais sans confirmation explicite → demander les infos ou confirmer
                if (missing.length > 0) {
                    parts.push(`\n📝 POUR FINALISER LA COMMANDE: Présente un bref récapitulatif et demande: ${missing.join(', ')}.`);
                } else {
                    parts.push('\n✅ Toutes les infos de livraison sont collectées! Confirme la commande.');
                }
            }
        }
        
        // Support hints
        if (analysis.support?.ticketIntent) {
            parts.push('\n🛠️ SUPPORT:');
            if (analysis.support.category) parts.push(`- Catégorie: ${analysis.support.category}`);
            if (analysis.support.urgency) parts.push(`- Urgence: ${analysis.support.urgency}`);
        }

        // FAQ hints
        if (analysis.faq?.category && analysis.faq.category !== 'other') {
            parts.push('\n❓ FAQ:');
            parts.push(`- Catégorie: ${analysis.faq.category}`);
        }

        // Appointment hints
        if (analysis.appointment?.rdvIntent) {
            parts.push('\n📅 RENDEZ-VOUS:');
            if (analysis.appointment.serviceType) parts.push(`- Service: ${analysis.appointment.serviceType}`);
            if (analysis.appointment.extractedSlots?.length > 0) {
                parts.push(`- Créneaux détectés: ${analysis.appointment.extractedSlots.join(', ')}`);
            }
        }

        // Human intervention needed
        if (analysis.needsHuman?.needed) {
            parts.push('\n🚨 RECOMMANDATION: Propose de transférer à un humain');
            parts.push(`Raison: ${analysis.needsHuman.reasons.join(', ')}`);
        }
        
        return parts.join('\n');
    }

    /**
     * Génère une réponse avec Google Gemini
     */
    async generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null, customApiKey = null) {
        // Use the model_id exactly as configured in Admin — no mapping/override
        // _resolvedModel is already resolved from DB; agent.model fallback for direct calls
        const geminiModel = agent._resolvedModel || agent.model;
        console.log(`[AI] Using Gemini model: ${geminiModel}`);

        // Get the actual API key to use
        let genAI = null;
        if (customApiKey) {
            try {
                genAI = new GoogleGenerativeAI(customApiKey);
            } catch (e) {
                console.error('[AI] Invalid Gemini API key:', e.message);
            }
        }

        // Fallback to initial client if custom key failed or wasn't provided
        if (!genAI) genAI = this.geminiClient;

        if (!genAI) {
            throw new Error('Google Gemini non initialisé (clé manquante)');
        }

        // Use centralized config for generation parameters
        const genConfig = getGenerationConfig(agent);
        // Min 2048 tokens pour éviter la troncation (réponses commande, récap livraison, etc.)
        const maxOutputTokens = Math.max(genConfig.maxTokens || 500, 2048);
        const model = genAI.getGenerativeModel({ 
            model: geminiModel,
            generationConfig: {
                temperature: genConfig.temperature,
                maxOutputTokens,
            }
        });

        const { prompt: systemPrompt, promptHash } = this.buildSystemPrompt(agent, knowledgeBase, messageAnalysis);

        // Use smart conversation window for better context management
        let conversationText = '';
        const historyLimit = getHistoryLimit('gemini');
        const recentHistory = getSmartWindow(conversationHistory, {
            maxMessages: historyLimit,
            maxTokens: 1500,
            prioritizeRecent: true,
            enableCompression: conversationHistory.length > 20
        });
        
        if (recentHistory.length > 0) {
            conversationText = '\n\n💬 CONVERSATION RÉCENTE (contexte uniquement):\n';
            for (const msg of recentHistory) {
                const role = msg.role === 'user' ? '👤 Client' : '🤖 Assistant';
                const contentText = msg.role === 'assistant' 
                    ? JSON.stringify({ response: msg.content, need_human: false })
                    : msg.content;
                conversationText += `${role}: ${contentText}\n`;
            }
        }

        const messageActuelLabel = '\n\n---\n📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message en priorité):\n';
        const structuredInstruction = agent.template === 'assistant' 
            ? '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide contenant "response" (string) et "action" (optionnel, format objet dicté dans tes instructions système).'
            : '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec:\n- "response" (string: ton message au client)\n- "need_human" (boolean: true si transfert nécessaire)\n- "booking" (optionnel, objet: {"summary": string, "startTime": ISO_STRING, "endTime": ISO_STRING} si tu dois enregistrer un rdv)\nExemple: {"response": "C\'est noté pour demain 10h !", "need_human": false, "booking": {"summary": "RDV Client", "startTime": "2026-03-14T10:00:00Z", "endTime": "2026-03-14T11:00:00Z"}}';
        const fullPrompt = `${systemPrompt}${conversationText}${messageActuelLabel}${userMessage}\n---\n\n🤖 Assistant:${structuredInstruction}`;

        const result = await model.generateContent(fullPrompt);
        const rawResponse = result.response.text();

        // Use tokenizer for more accurate token counting
        const tokensUsed = countTokensSync(fullPrompt) + countTokensSync(rawResponse);
        const parsed = this.parseStructuredLlmResponse(rawResponse);
        const validated = this.validateStructuredOutput(parsed, 4096);

        console.log(`[AI] Gemini réponse (${tokensUsed} tokens), need_human=${validated.need_human}: "${validated.content.substring(0, 50)}..."`);

        return {
            content: validated.content,
            need_human: validated.need_human,
            action: validated.action || null,
            tokens: tokensUsed,
            provider: 'gemini',
            model: geminiModel,
            prompt_version: promptHash
        };
    }

    /**
     * Extract first top-level JSON object from string (brace-matching, respect strings).
     * @param {string} str - String starting with {
     * @returns {string | null}
     */
    _extractJsonObject(str) {
        if (!str || str[0] !== '{') return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        let quote = '';
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (escape) {
                escape = false;
                continue;
            }
            if (inString) {
                if (c === '\\') escape = true;
                else if (c === quote) inString = false;
                continue;
            }
            if (c === '"' || c === "'") {
                inString = true;
                quote = c;
                continue;
            }
            if (c === '{') depth++;
            else if (c === '}') {
                depth--;
                if (depth === 0) {
                    const candidate = str.slice(0, i + 1);
                    try {
                        JSON.parse(candidate);
                        return candidate;
                    } catch (e) {
                        // Might be a fragment, keep looking
                    }
                }
            }
        }
        return null;
    }

    /**
     * Validate parsed LLM response schema
     * @param {any} obj - Object to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateLlmResponseSchema(obj) {
        const errors = [];
        
        if (!obj || typeof obj !== 'object') {
            errors.push('Response must be an object');
            return { valid: false, errors };
        }
        
        if (!('response' in obj)) {
            errors.push('Missing required field: response');
        } else if (typeof obj.response !== 'string') {
            errors.push('Field "response" must be a string');
        } else if (obj.response.length === 0) {
            errors.push('Field "response" cannot be empty');
        }
        
        if (obj.need_human !== undefined && obj.need_human !== null && typeof obj.need_human !== 'boolean' && typeof obj.need_human !== 'string') {
            errors.push('Field "need_human" must be a boolean or string');
        }
        
        if ('confidence' in obj) {
            if (typeof obj.confidence !== 'number') {
                errors.push('Field "confidence" must be a number');
            } else if (obj.confidence < 0 || obj.confidence > 1) {
                errors.push('Field "confidence" must be between 0 and 1');
            }
        }

        if ('booking' in obj && typeof obj.booking !== 'object') {
            errors.push('Field "booking" must be an object');
        }
        
        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse LLM raw text as structured JSON { response, need_human, confidence? }.
     * Enhanced with schema validation
     * @param {string} raw
     * @returns {{ response: string, need_human: boolean, confidence?: number } | null}
     */
    parseStructuredLlmResponse(raw) {
        if (!raw || typeof raw !== 'string') {
            aiLogger.warn('Invalid LLM response: empty or not a string');
            return null;
        }
        
        const trimmed = raw.trim();
        
        const normalizeParsed = (obj) => {
            const result = {
                response: obj.response,
                need_human: obj.need_human === true || obj.need_human === 'true' || obj.need_confirmation === true || obj.need_confirmation === 'true',
                confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined,
                booking: obj.booking || null,
                action: obj.action || null
        };
        return result;
    };

        // Try 1: Direct JSON parse
        try {
            const obj = JSON.parse(trimmed);
            const validation = this.validateLlmResponseSchema({ ...obj, need_human: obj.need_human ?? obj.need_confirmation });
            if (validation.valid) return normalizeParsed(obj);
            else aiLogger.warn('Invalid LLM response schema', { errors: validation.errors });
        } catch (error) {
            // Not valid JSON, try extracting
        }

        // Try 2: Extract JSON block from markdown or mixed content
        const jsonBlock = trimmed.match(/\{[\s\S]*"response"[\s\S]*\}/);
        if (jsonBlock) {
            try {
                const obj = JSON.parse(jsonBlock[0]);
                const validation = this.validateLlmResponseSchema({ ...obj, need_human: obj.need_human ?? obj.need_confirmation });
                if (validation.valid) {
                    aiLogger.info('Extracted JSON from mixed content');
                    return normalizeParsed(obj);
                } else aiLogger.warn('Extracted JSON has invalid schema', { errors: validation.errors });
            } catch (error) {
                aiLogger.warn('Failed to parse extracted JSON block', { error: error.message });
            }
        }
        
        // Try 3: Code block (```json ... ``` or ``` ... ```) - capture content then parse
        const codeBlockOpen = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*)/);
        if (codeBlockOpen) {
            const blockContent = codeBlockOpen[1].split('```')[0].trim();
            const firstBrace = blockContent.indexOf('{');
            if (firstBrace !== -1) {
                const extracted = this._extractJsonObject(blockContent.slice(firstBrace));
                if (extracted) {
                    try {
                        const obj = JSON.parse(extracted);
                        const validation = this.validateLlmResponseSchema({ ...obj, need_human: obj.need_human ?? obj.need_confirmation });
                        if (validation.valid) {
                            aiLogger.info('Extracted JSON from code block');
                            return normalizeParsed(obj);
                        }
                    } catch (e) { /* continue */ }
                }
            }
        }

        // Try 4: First top-level JSON object by brace matching (robust when code block is unclosed)
        const firstBrace = trimmed.indexOf('{');
        if (firstBrace !== -1) {
            const extracted = this._extractJsonObject(trimmed.slice(firstBrace));
            if (extracted) {
                try {
                    const obj = JSON.parse(extracted);
                    const validation = this.validateLlmResponseSchema({ ...obj, need_human: obj.need_human ?? obj.need_confirmation });
                    if (validation.valid) {
                        aiLogger.info('Extracted JSON by brace matching');
                        return normalizeParsed(obj);
                    }
                } catch (e) { /* continue */ }
            }
        }

        // Try 5: Salvage truncated JSON - extract "response": "..." (handles escaped quotes, optional closing quote)
        const responseMatch = trimmed.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
        if (responseMatch && responseMatch[1]?.trim()) {
            const text = responseMatch[1].replace(/\\"/g, '"').trim();
            if (text.length > 0) {
                // Also try to salvage action if present
                let action = null;
                const actionMatch = trimmed.match(/"action"\s*:\s*(\{[\s\S]*?\})|("action"\s*:\s*"([^"]*)")/);
                if (actionMatch) {
                    try {
                        const actionStr = actionMatch[1] || actionMatch[3];
                        action = actionStr.startsWith('{') ? JSON.parse(actionStr) : actionStr;
                    } catch (e) { /* ignore */ }
                }
                
                aiLogger.info('Salvaged response and action from truncated JSON');
                return { response: text, need_human: true, confidence: undefined, action };
            }
        }

        // Try 6: Final fallback - if it's plain text (no braces) and looks like a response
        if (trimmed.length > 0 && !trimmed.includes('{') && !trimmed.includes('}')) {
            aiLogger.info('Using plain text as fallback response');
            return { response: trimmed, need_human: false, confidence: 1 };
        }

        aiLogger.error('Failed to parse LLM response as structured JSON', { 
            preview: trimmed.substring(0, 200) 
        });
        return null;
    }

    /** Forbidden phrases (business rule): block or force need_human */
    static getForbiddenPhrases() {
        return ['garanti', 'garantie absolue', 'promesse de délai', 'je garantis', '100% garanti'];
    }

    /**
     * Validate and sanitize structured output; on failure force need_human and fallback text.
     * Applies max length, forbidden phrases, and low-confidence rule.
     * @param {{ response: string, need_human: boolean, confidence?: number } | null} parsed
     * @param {number} maxLength
     * @returns {{ content: string, need_human: boolean }}
     */
    validateStructuredOutput(parsed, maxLength = 4096) {
        const fallbackContent = 'Merci pour votre message. Un conseiller vous répondra si nécessaire.';
        if (!parsed || typeof parsed.response !== 'string') {
            return { content: fallbackContent, need_human: true };
        }
        let content = parsed.response.trim();
        let need_human = Boolean(parsed.need_human);
        
        // Debug logging (only if enabled via environment variable)
        if (process.env.ENABLE_AGENT_DEBUG_LOGS === 'true') {
            this.logDebug('ai.js:validateStructuredOutput', 'Initial need_human from AI', {
                need_human_from_ai: parsed.need_human,
                confidence: parsed.confidence,
                content_preview: content.substring(0, 100)
            });
        }
        
        if (content.length > maxLength) content = content.slice(0, maxLength - 1) + '…';
        if (!content) content = fallbackContent;
        const lower = content.toLowerCase();
        for (const phrase of AIService.getForbiddenPhrases()) {
            if (lower.includes(phrase)) {
                if (process.env.ENABLE_AGENT_DEBUG_LOGS === 'true') {
                    this.logDebug('ai.js:validateStructuredOutput', 'need_human triggered by forbidden phrase', {
                        phrase,
                        content_preview: content.substring(0, 100)
                    });
                }
                need_human = true;
                break;
            }
        }
        if (typeof parsed.confidence === 'number' && parsed.confidence < 0.6) {
            if (process.env.ENABLE_AGENT_DEBUG_LOGS === 'true') {
                this.logDebug('ai.js:validateStructuredOutput', 'need_human triggered by low confidence', {
                    confidence: parsed.confidence,
                    was_need_human_before: need_human
                });
            }
            need_human = true;
        }
        
        if (process.env.ENABLE_AGENT_DEBUG_LOGS === 'true') {
            this.logDebug('ai.js:validateStructuredOutput', 'Final need_human value', {
                need_human,
                content_preview: content.substring(0, 100)
            });
        }
        
        return { content, need_human, action: parsed.action || null };
    }

    /**
     * Génère une réponse à partir d'une image (vision) - Gemini uniquement
     * @param {Object} agent - Agent configuration
     * @param {Array} conversationHistory - Previous messages
     * @param {string} imageBase64 - Image data (base64)
     * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
     * @param {string|null} caption - Optional caption from the user
     * @param {Array} knowledgeBase - Knowledge + products catalog
     * @param {string|null} userId - For credit deduction
     */
    /**
     * Resolve Gemini model id for vision/audio (images, notes vocales).
     * Uses agent.media_model if set, else agent.model. Only Gemini models are used for vision.
     */
    resolveMediaModel(agent) {
        const raw = agent?.media_model || agent?.model;
        if (!raw || typeof raw !== 'string') return 'gemini-2.0-flash';
        const m = raw.toLowerCase();
        if (m.includes('gemini-1.5-pro') || m.includes('gemini-pro')) return 'gemini-1.5-pro';
        if (m.includes('gemini-2.5') || m.includes('models/gemini-2.5-flash') || m.includes('gemini-2.0')) return 'gemini-2.0-flash';
        if (m.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
        if (m.includes('gemini')) return 'gemini-2.0-flash';
        return 'gemini-2.0-flash';
    }

    /**
     * Transcrit un message audio (notes vocales) via Gemini.
     * @param {Object} agent - Agent configuration
     * @param {string} audioBase64 - Audio data (base64)
     * @param {string} mimeType - e.g. 'audio/ogg', 'audio/mpeg'
     * @param {string|null} userId - Pour décompte des crédits
     */
    async transcribeAudio(agent, audioBase64, mimeType, userId = null) {
        this.initialize();
        if (!this.geminiClient) {
            console.warn('[AI] Audio: Gemini non configuré, transcription impossible');
            return { text: null, provider: 'fallback', model: null };
        }

        const geminiModel = this.resolveMediaModel(agent);
        if (userId) {
            const hasCredits = await hasEnoughCredits(userId, 'ai_message');
            if (!hasCredits) {
                return {
                    text: null,
                    credit_warning: 'Crédits insuffisants',
                    provider: 'gemini',
                    model: geminiModel
                };
            }
        }

        try {
            const model = this.geminiClient.getGenerativeModel({
                model: geminiModel,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 400,
                }
            });

            const instruction = "Transcris précisément le message vocal. Réponds uniquement avec le texte, sans ajout ni commentaire.";
            const audioPart = {
                inlineData: {
                    data: audioBase64,
                    mimeType: mimeType || 'audio/ogg'
                }
            };

            const result = await model.generateContent([instruction, audioPart]);
            const response = result.response.text();
            const tokensUsed = countTokensSync(instruction) + countTokensSync(response || '') + 512;

            if (userId) {
                const deduction = await deductCredits(userId, geminiModel, 1, { agent_id: agent?.id, tokens: tokensUsed });
                if (!deduction.success) {
                    console.warn(`[AI] Credit deduction failed: ${deduction.error ?? 'unknown'}`);
                }
                return {
                    text: response,
                    tokens: tokensUsed,
                    provider: 'gemini',
                    model: geminiModel,
                    credits_deducted: deduction.cost,
                    credits_remaining: deduction.credits_remaining
                };
            }
            return {
                text: response,
                tokens: tokensUsed,
                provider: 'gemini',
                model: geminiModel
            };
        } catch (error) {
            console.error('[AI] Audio transcription erreur:', error.message);
            return { text: null, error: error.message, provider: 'gemini', model: geminiModel };
        }
    }

    async generateResponseFromImage(agent, conversationHistory, imageBase64, mimeType, caption, knowledgeBase = [], userId = null) {
        this.initialize();
        const geminiModel = this.resolveMediaModel(agent);

        if (userId) {
            const hasCredits = await hasEnoughCredits(userId, geminiModel);
            if (!hasCredits) {
                console.warn(`[AI-Vision] Blocking request for user ${userId}: Insufficient credits or expired trial`);
                return { 
                    content: 'Merci pour votre message. Un conseiller vous répondra dès que possible.', 
                    need_human: true,
                    tokens: 0,
                    provider: 'fallback',
                    credit_warning: 'Votre compte ne dispose pas d\'assez de crédits ou votre période d\'essai est expirée.'
                };
            }
        }
        
        // Get the actual API key to use
        const apiKey = await this.getApiKey('gemini', geminiModel);
        let genAI = this.geminiClient;
        if (apiKey) {
            try {
                genAI = new GoogleGenerativeAI(apiKey);
            } catch (e) {
                console.error('[AI] Vision: Erreur clé API custom:', e.message);
            }
        }

        if (!genAI) {
            console.warn('[AI] Vision: Gemini non configuré, fallback texte');
            return {
                content: "Je ne peux pas analyser les images pour le moment. Décrivez-moi ce que vous cherchez ou envoyez un message texte.",
                tokens: 0,
                provider: 'fallback',
                model: null
            };
        }

        if (userId) {
            const hasCredits = await hasEnoughCredits(userId, 'ai_message');
            if (!hasCredits) {
                return {
                    content: "Crédits insuffisants pour l'analyse d'image. Réessayez plus tard.",
                    credit_warning: 'Crédits insuffisants',
                    tokens: 0,
                    provider: 'gemini',
                    model: geminiModel
                };
            }
        }

        try {
            const model = genAI.getGenerativeModel({
                model: geminiModel,
                generationConfig: {
                    temperature: agent?.temperature ?? 0.7,
                    maxOutputTokens: agent?.max_tokens ?? 500,
                }
            });

            const { prompt: systemPrompt } = this.buildSystemPrompt(agent, knowledgeBase, null);
            let conversationText = '';
            const recentHistory = conversationHistory.slice(-10);
            if (recentHistory.length > 0) {
                conversationText = '\n\n💬 CONVERSATION RÉCENTE:\n';
                for (const msg of recentHistory) {
                    const role = msg.role === 'user' ? '👤 Client' : '🤖 Assistant';
                    conversationText += `${role}: ${msg.content}\n`;
                }
            }

            const imageInstruction = caption
                ? `Le client a envoyé cette image avec le message: "${caption}". Analyse l'image en tenant compte de sa demande et réponds de manière utile (identification produit, prix, stock si pertinent).`
                : `Le client a envoyé cette image sans texte. Décris ce que tu vois. Si cela ressemble à un produit du catalogue, identifie le produit le plus proche et donne son nom, prix et disponibilité. Sinon, réponds de manière courtoise et utile.`;

            const textPart = `${systemPrompt}${conversationText}\n\n📷 MESSAGE IMAGE:\n${imageInstruction}\n\n🤖 Assistant:`;

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType || 'image/jpeg'
                }
            };

            const result = await model.generateContent([textPart, imagePart]);
            const response = result.response.text();
            // Use tokenizer for more accurate token counting (add extra for image tokens)
            const tokensUsed = countTokensSync(textPart) + countTokensSync(response || '') + 258; // ~258 tokens for image

            if (userId) {
                const deduction = await deductCredits(userId, geminiModel, 1, { agent_id: agent?.id, tokens: tokensUsed });
                if (!deduction.success) {
                    console.warn(`[AI] Credit deduction failed: ${deduction.error ?? 'unknown'}`);
                }
                return {
                    content: response,
                    tokens: tokensUsed,
                    provider: 'gemini',
                    model: geminiModel,
                    credits_deducted: deduction.cost,
                    credits_remaining: deduction.credits_remaining
                };
            }
            return {
                content: response,
                tokens: tokensUsed,
                provider: 'gemini',
                model: geminiModel
            };
        } catch (error) {
            console.error('[AI] Vision erreur:', error.message);
            return {
                content: "Je n'ai pas pu analyser cette image. Pouvez-vous décrire ce que vous cherchez en texte ?",
                tokens: 0,
                provider: 'fallback',
                model: null
            };
        }
    }

    /**
     * Génère une réponse avec OpenAI
     */
    async generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null, customApiKey = null) {
        // Use custom API key if provided
        let client = this.openaiClient;
        if (customApiKey) {
            try {
                client = new OpenAI({ apiKey: customApiKey });
            } catch (e) {
                console.error('[AI] Invalid custom OpenAI API key:', e.message);
            }
        }

        if (!client) {
            throw new Error('OpenAI non initialisé (clé manquante)');
        }
        const { prompt: systemPrompt } = this.buildSystemPrompt(agent, knowledgeBase, messageAnalysis);
        const structuredInstruction = agent.template === 'assistant' 
            ? '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide contenant "response" (string) et "action" (optionnel, format objet dicté dans tes instructions système).'
            : '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec:\n- "response" (string: ton message au client)\n- "need_human" (boolean: true si transfert nécessaire)\n- "booking" (optionnel, objet: {"summary": string, "startTime": ISO_STRING, "endTime": ISO_STRING} si tu dois enregistrer un rdv)\nExemple: {"response": "C\'est noté pour demain 10h !", "need_human": false, "booking": {"summary": "RDV Client", "startTime": "2026-03-14T10:00:00Z", "endTime": "2026-03-14T11:00:00Z"}}';

        // Construire les messages
        const messages = [
            { role: 'system', content: `${systemPrompt}${structuredInstruction}` }
        ];

        // Use smart conversation window for better context management
        const historyLimit = getHistoryLimit('openai');
        const recentHistory = getSmartWindow(conversationHistory, {
            maxMessages: historyLimit,
            maxTokens: 2000,
            prioritizeRecent: true,
            enableCompression: conversationHistory.length > 20
        });
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.role === 'assistant' 
                    ? JSON.stringify({ response: msg.content, need_human: false })
                    : msg.content
            });
        }

        // Message actuel (explicite pour que le modèle sache à quoi répondre)
        messages.push({
            role: 'user',
            content: `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message):\n\n${userMessage}`
        });

        // Use the model_id exactly as configured in Admin — no mapping/override
        const openaiModel = agent._resolvedModel || agent.model;

        // Use centralized config for generation parameters
        const genConfig = getGenerationConfig(agent);
        const maxTokens = Math.max(genConfig.maxTokens || 500, 2048);
        const completion = await client.chat.completions.create({
            model: openaiModel,
            messages,
            temperature: genConfig.temperature,
            max_tokens: maxTokens
        });

        const rawResponse = completion.choices[0]?.message?.content || '';
        const tokensUsed = completion.usage?.total_tokens || 0;
        const parsed = this.parseStructuredLlmResponse(rawResponse);
        const validated = this.validateStructuredOutput(parsed, 4096);

        console.log(`[AI] OpenAI réponse (${tokensUsed} tokens), need_human=${validated.need_human}: "${validated.content.substring(0, 50)}..."`);

        return {
            content: validated.content,
            need_human: validated.need_human,
            action: validated.action || null,
            tokens: tokensUsed,
            provider: 'openai',
            model: openaiModel
        };
    }

    /**
     * Génère une réponse avec OpenRouter (accès à plusieurs modèles)
     * Avec retry automatique et fallback vers d'autres modèles gratuits
     */
    async generateOpenRouterResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null, customApiKey = null) {
        // Use custom API key if provided and non-empty
        let client = this.openrouterClient;
        if (customApiKey && customApiKey.trim()) {
            try {
                client = new OpenAI({ 
                    apiKey: customApiKey.trim(),
                    baseURL: 'https://openrouter.ai/api/v1' 
                });
            } catch (e) {
                console.error('[AI] Invalid custom OpenRouter API key:', e.message);
            }
        }

        if (!client) {
            throw new Error('OpenRouter non initialisé (clé API manquante ou non configurée dans Admin → Clés API)');
        }
        const { prompt: systemPrompt } = this.buildSystemPrompt(agent, knowledgeBase, messageAnalysis);
        const structuredInstruction = agent.template === 'assistant' 
            ? '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide contenant "response" (string) et "action" (optionnel, format objet dicté dans tes instructions système).'
            : '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec:\n- "response" (string: ton message au client)\n- "need_human" (boolean: true si transfert nécessaire)\n- "booking" (optionnel, objet: {"summary": string, "startTime": ISO_STRING, "endTime": ISO_STRING} si tu dois enregistrer un rdv)\nExemple: {"response": "C\'est noté pour demain 10h !", "need_human": false, "booking": {"summary": "RDV Client", "startTime": "2026-03-14T10:00:00Z", "endTime": "2026-03-14T11:00:00Z"}}';

        // Construire les messages
        const messages = [
            { role: 'system', content: `${systemPrompt}${structuredInstruction}` }
        ];

        // Use smart conversation window for better context management
        const historyLimit = getHistoryLimit('openrouter');
        const recentHistory = getSmartWindow(conversationHistory, {
            maxMessages: historyLimit,
            maxTokens: 2000,
            prioritizeRecent: true,
            enableCompression: conversationHistory.length > 20
        });
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.role === 'assistant' 
                    ? JSON.stringify({ response: msg.content, need_human: false })
                    : msg.content
            });
        }

        // Message actuel (explicite pour que le modèle sache à quoi répondre)
        messages.push({
            role: 'user',
            content: `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message):\n\n${userMessage}`
        });

        // Use model_id directly from DB (_resolvedModel), no remapping
        const primaryModel = agent._resolvedModel || agent.model;
        
        // In test mode (_resolvedProvider set), test ONLY the chosen model — no internal fallbacks
        // In production, fetch fallback OpenRouter models from Admin DB (not hardcoded list)
        const skipInternalFallback = !!agent._resolvedProvider;
        let fallbackModels = [];
        if (!skipInternalFallback) {
            try {
                const dbFallbacks = await db.all(
                    `SELECT model_id FROM ai_models 
                     WHERE provider = 'openrouter' AND is_active = 1 AND model_id != ?
                     ORDER BY sort_order ASC`,
                    primaryModel
                );
                fallbackModels = (Array.isArray(dbFallbacks) ? dbFallbacks : [])
                    .map(r => r.model_id)
                    .filter(Boolean);
            } catch (e) {
                // DB error — proceed without internal fallback
            }
        }

        // Try primary model first, then Admin-configured fallbacks (empty in test mode)
        const modelsToTry = [primaryModel, ...fallbackModels];

        // Use centralized config for generation parameters
        const genConfig = getGenerationConfig(agent);
        const maxTokens = Math.max(genConfig.maxTokens || 500, 2048);
        
        for (let i = 0; i < modelsToTry.length; i++) {
            const modelName = modelsToTry[i];
            const isRetry = i > 0;
            
            try {
                if (isRetry) {
                    console.log(`[AI] Tentative avec modèle alternatif: ${modelName}`);
                } else {
                    console.log(`[AI] Using OpenRouter model: ${modelName}`);
                }

                const completion = await client.chat.completions.create({
                    model: modelName,
                    messages,
                    temperature: genConfig.temperature,
                    max_tokens: maxTokens
                });

                let rawResponse = completion.choices[0]?.message?.content || '';
                const tokensUsed = completion.usage?.total_tokens || 0;

                let parsed = this.parseStructuredLlmResponse(rawResponse);
                if (!parsed) {
                    const cleaned = this.cleanReasoningResponse(rawResponse);
                    parsed = this.parseStructuredLlmResponse(cleaned);
                }
                const validated = this.validateStructuredOutput(parsed, 4096);

                console.log(`[AI] OpenRouter réponse (${tokensUsed} tokens), need_human=${validated.need_human}: "${validated.content.substring(0, 50)}..."`);

                return {
                    content: validated.content,
                    need_human: validated.need_human,
                    action: validated.action || null,
                    tokens: tokensUsed,
                    provider: 'openrouter',
                    model: modelName
                };
                
            } catch (error) {
                const is429 = error.status === 429 || error.message?.includes('429');
                const isLastModel = i === modelsToTry.length - 1;
                
                console.error(`[AI] Erreur openrouter (${modelName}): ${error.status || ''} ${error.message?.substring(0, 50)}`);
                
                // Log rate limit for admin
                if (is429) {
                    try {
                        const userId = agent.user_id;
                        adminAnomaliesService.logRateLimit(userId, modelName);
                    } catch (e) { /* ignore */ }
                }
                
                if (is429 && !isLastModel) {
                    // Rate limit - attendre un peu avant d'essayer le modèle suivant
                    const waitTime = 1000 * (i + 1); // 1s, 2s, 3s...
                    console.log(`[AI] Rate limit atteint, attente ${waitTime/1000}s avant modèle suivant...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                if (isLastModel) {
                    // Dernier modèle aussi échoué, propager l'erreur pour fallback Gemini
                    throw error;
                }
            }
        }
        
        // Ne devrait jamais arriver, mais au cas où
        throw new Error('Tous les modèles OpenRouter ont échoué');
    }

    /**
     * Nettoie les réponses des modèles de raisonnement (supprime la partie "thinking")
     * Optimisé pour DeepSeek R1 et autres modèles qui exposent leur réflexion
     */
    cleanReasoningResponse(response) {
        if (!response) return response;

        let cleaned = response;

        // 1. Supprimer les balises <think>...</think> (format standard DeepSeek R1)
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // 2. Patterns de salutations/début de vraie réponse (FR + EN)
        const greetingPatterns = [
            /^(Bonjour|Salut|Hello|Hi|Hey|Bienvenue|Bonsoir|Coucou|Cher|Chère)/i,
            /^(Merci|Thank|Thanks|Je vous|Je te|Avec plaisir|Bien sûr|Certainement|Absolument)/i,
            /^(Nos|Notre|Votre|Vos|Le|La|Les|Un|Une|Pour|Voici|Concernant)/i,
            /^[👋😊🙌💬✨🎯📋]/,  // Commence par emoji
        ];

        // 3. Patterns de thinking à supprimer (EN principalement car DeepSeek pense en anglais)
        const thinkingStartPatterns = [
            /^(Okay|Ok|Alright|Right|Well|So|Now|First|Let me|I need|I should|I'll|I will|I can|I have|I want)/i,
            /^(The user|This user|They|He|She|Looking|Considering|Given|Since|Based|According)/i,
            /^(That should|This should|That covers|This covers|That's|This is|It's|Here's what)/i,
            /^(Hmm|Hm|Um|Uh|Let's|Got it|Sure|Yeah|Yes|No problem)/i,
            /^(My response|My answer|I think|I believe|I understand|I see|I notice)/i,
            /^(Friendly|Professional|Clear|Concise|Brief|Short|Simple)/i,
            /^(Step|Point|Note|Remember|Keep|Make sure|Don't forget)/i,
        ];

        // 4. Chercher la vraie réponse en scannant ligne par ligne
        const lines = cleaned.split('\n');
        let realContentStartIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Vérifier si c'est une ligne de greeting/vraie réponse
            const isGreeting = greetingPatterns.some(pattern => pattern.test(line));
            if (isGreeting) {
                realContentStartIndex = i;
                break;
            }

            // Vérifier si c'est du thinking
            const isThinking = thinkingStartPatterns.some(pattern => pattern.test(line));
            if (!isThinking) {
                // Ce n'est ni un greeting ni du thinking évident
                // Vérifier si ça ressemble à du contenu (pas en anglais si contexte FR)
                const looksLikeThinking = line.match(/(should|would|could|need to|have to|going to|want to|the user|their|they)/i);
                if (!looksLikeThinking) {
                    realContentStartIndex = i;
                    break;
                }
            }
        }

        // Si on a trouvé le début du vrai contenu
        if (realContentStartIndex > 0) {
            cleaned = lines.slice(realContentStartIndex).join('\n').trim();
        }

        // 5. Nettoyage final par paragraphes
        const paragraphs = cleaned.split('\n\n');
        const filteredParagraphs = paragraphs.filter(p => {
            const trimmed = p.trim().toLowerCase();
            
            // Exclure les paragraphes qui sont clairement du thinking
            const thinkingPhrases = [
                'okay,', 'alright,', 'let me ', 'i need to ', 'i should ', 
                'the user ', 'i\'ll ', 'i will ', 'that should ', 'this should ',
                'that covers', 'friendly,', 'professional,', 'my response',
                'here\'s what', 'looking at', 'considering', 'based on',
                'step 1', 'first,', 'now,', 'so,', 'well,'
            ];
            
            const isThinkingParagraph = thinkingPhrases.some(phrase => 
                trimmed.startsWith(phrase) || trimmed.includes(phrase)
            );

            // Garder si ce n'est pas du thinking
            return !isThinkingParagraph;
        });

        if (filteredParagraphs.length > 0) {
            cleaned = filteredParagraphs.join('\n\n').trim();
        }

        // 6. Dernier recours: chercher après un pattern de fin de thinking
        if (cleaned.match(/^(Okay|Alright|That|This|So|Now|First|Let)/i)) {
            // Chercher la première vraie phrase FR ou salutation
            const match = cleaned.match(/(Bonjour|Salut|Hello|Hi|Merci|Nos |Notre |Votre |Pour |Voici |👋|😊)[^]*/i);
            if (match) {
                cleaned = match[0].trim();
            }
        }

        // Log pour debug
        if (cleaned !== response) {
            console.log(`[AI] Cleaned thinking from response. Original: ${response.length} chars, Cleaned: ${cleaned.length} chars`);
        }

        return cleaned || response;
    }

    /**
     * Réponses de fallback quand aucune IA n'est disponible
     */
    fallbackResponse(agent, userMessage) {
        const lowerMessage = userMessage.toLowerCase().trim();
        
        // Réponses intelligentes basées sur des mots-clés
        const responses = {
            // Salutations
            'bonjour': `Bonjour ! 👋 Je suis ${agent.name || 'votre assistant'}. Comment puis-je vous aider aujourd'hui ?`,
            'salut': `Salut ! 😊 Comment puis-je vous aider ?`,
            'hello': `Hello! 👋 How can I help you today?`,
            'hi': `Hi there! 👋 How can I help you?`,
            'hey': `Hey ! 👋 Comment ça va ?`,
            'coucou': `Coucou ! 😊 Que puis-je faire pour vous ?`,
            
            // Remerciements
            'merci': `Je vous en prie ! 😊 N'hésitez pas si vous avez d'autres questions.`,
            'thanks': `You're welcome! 😊 Feel free to ask if you need anything else.`,
            'thank you': `You're welcome! 😊`,
            
            // Demandes d'aide
            'aide': `Je suis là pour vous aider ! 🙌 Posez-moi vos questions.`,
            'help': `I'm here to help! 🙌 What do you need?`,
            
            // Questions fréquentes
            'prix': `Pour connaître nos tarifs, je vous invite à consulter notre site web ou à nous contacter directement. 💰`,
            'tarif': `Pour les tarifs, veuillez nous contacter ou visiter notre site. 💰`,
            'horaire': `Nos horaires sont disponibles sur notre site web. Notre assistant est disponible 24/7 ! ⏰`,
            'contact': `Vous pouvez nous contacter directement ici sur WhatsApp ! 📱`,
            'adresse': `Pour notre adresse, veuillez consulter notre site web ou nous contacter. 📍`,
            
            // Au revoir
            'bye': `Au revoir ! 👋 À bientôt !`,
            'au revoir': `Au revoir ! 👋 N'hésitez pas à revenir si vous avez des questions.`,
            'bonne journée': `Merci, bonne journée à vous aussi ! ☀️`,
            
            // Oui/Non
            'oui': `Parfait ! 👍 Comment puis-je vous aider ?`,
            'non': `D'accord. Y a-t-il autre chose que je puisse faire pour vous ?`,
            'ok': `Super ! 👍`,
        };

        // Chercher une correspondance
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key) || lowerMessage === key) {
                return { content: response, tokens: 0, provider: 'fallback' };
            }
        }

        // Réponse par défaut
        return {
            content: `Merci pour votre message ! 😊 Je suis ${agent.name || 'votre assistant'}. Notre équipe vous répondra très bientôt. En attendant, n'hésitez pas à me poser d'autres questions !`,
            tokens: 0,
            provider: 'fallback'
        };
    }

    /**
     * Debug logging helper (only executes if ENABLE_AGENT_DEBUG_LOGS=true)
     * Sends logs to external debug endpoint
     */
    logDebug(location, message, data) {
        if (process.env.ENABLE_AGENT_DEBUG_LOGS !== 'true') return;
        
        try {
            debugIngest({
                location,
                message,
                data,
                timestamp: Date.now(),
                sessionId: 'debug-session',
                hypothesisId: 'H1'
            });
        } catch (error) {
            // Ignore any errors to prevent debug logging from breaking the app
        }
    }

    /**
     * Extraite et sauvegarde les nouveaux faits sur le client
     */
    async extractAndSaveCustomerContext(conversationId, userMsg, aiResponse, currentContext = '{}') {
        try {
            const extractionPrompt = `Tu es un expert en profilage client. Analyse l'échange suivant et extrais les faits persistants sur le client (goûts, lieu de livraison, habitudes, contraintes).
            
FAITS ACTUELS : ${currentContext}

ÉCHANGE :
Client: "${userMsg}"
Assistant: "${aiResponse}"

MISSION : Retourne un objet JSON contenant TOUS les faits (anciens + nouveaux mis à jour). 
- Ne garde que les infos UTILES pour le futur. 
- FORMAT: JSON UNIQUEMENT (ex: {"quartier": "Cocody", "pref_livraison": "matin"}). 
- Si rien de nouveau, renvoie les faits actuels.`;

            const model = this.geminiClient?.getGenerativeModel({ model: 'gemini-1.5-flash' });
            if (!model) return;

            const result = await model.generateContent(extractionPrompt);
            const text = result.response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const newContext = jsonMatch[0];
                await db.run('UPDATE conversations SET customer_context = ? WHERE id = ?', newContext, conversationId);
                console.log(`[AI-Memory] Context updated for conv ${conversationId}`);
            }
        } catch (e) {
            console.warn('[AI-Memory] Extraction failed:', e.message);
        }
    }
}

export const aiService = new AIService();
export default aiService;
