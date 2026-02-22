import crypto from 'crypto';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from './credits.js';
import { adminAnomaliesService } from './adminAnomalies.js';
import { debugIngest } from '../utils/debugIngest.js';
import { AI_CONFIG, getModelName, getHistoryLimit, getGenerationConfig } from '../config/ai.config.js';
import { aiLogger } from '../utils/logger.js';
import { geminiCircuitBreaker, openaiCircuitBreaker, openrouterCircuitBreaker } from '../utils/circuitBreaker.js';
import { countTokensSync } from '../utils/tokenizer.js';
import { getSmartWindow } from '../utils/conversationMemory.js';

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

        // Modèle OpenRouter (contient "/" ou ":free")
        if (modelName?.includes('/') || modelName?.includes(':')) {
            if (this.openrouterClient) return 'openrouter';
        }

        // Modèles explicitement Gemini (avant la règle "contient /" pour OpenRouter)
        if (modelName?.startsWith('gemini') || modelName?.startsWith('models/gemini')) {
            if (this.geminiClient) return 'gemini';
            if (this.openrouterClient) return 'openrouter';
            if (this.openaiClient) return 'openai';
        }
        // Modèles explicitement OpenAI
        if (modelName?.startsWith('gpt')) {
            if (this.openaiClient) return 'openai';
            if (this.openrouterClient) return 'openrouter';
            if (this.geminiClient) return 'gemini';
        }
        // Par défaut: Gemini > OpenAI > OpenRouter > Fallback
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
    async generateResponse(agent, conversationHistory, normalizedPayloadOrMessage, knowledgeBaseOrUserId = [], messageAnalysisOrKnowledge = null, messageAnalysisLegacy = null) {
        this.initialize();

        // Input validation
        if (!agent || typeof agent !== 'object') {
            throw new Error('[AI] Invalid agent: agent must be a valid object');
        }
        if (!agent.id) {
            console.warn('[AI] Warning: agent.id is missing');
        }
        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            throw new Error('[AI] Invalid conversationHistory: must be an array');
        }
        if (!normalizedPayloadOrMessage) {
            throw new Error('[AI] Invalid message: normalizedPayloadOrMessage is required');
        }

        const isPayload = normalizedPayloadOrMessage && typeof normalizedPayloadOrMessage === 'object' && 'message' in normalizedPayloadOrMessage;
        let userMessage, userId, knowledgeBase, messageAnalysis;
        if (isPayload) {
            userMessage = normalizedPayloadOrMessage.message;
            userId = normalizedPayloadOrMessage.tenant_id ?? null;
            knowledgeBase = Array.isArray(knowledgeBaseOrUserId) ? knowledgeBaseOrUserId : [];
            messageAnalysis = messageAnalysisOrKnowledge;
        } else {
            userMessage = normalizedPayloadOrMessage;
            knowledgeBase = Array.isArray(knowledgeBaseOrUserId) ? knowledgeBaseOrUserId : [];
            if (typeof messageAnalysisOrKnowledge === 'string' || typeof messageAnalysisOrKnowledge === 'number') {
                userId = messageAnalysisOrKnowledge;
                messageAnalysis = messageAnalysisLegacy ?? null;
            } else {
                userId = null;
                messageAnalysis = messageAnalysisOrKnowledge;
            }
        }

        const provider = this.getProvider(agent.model);
        const model = agent.model || 'gemini-1.5-flash';

        const intent = messageAnalysis?.intent?.primary || 'unknown';
        console.log(`[AI] Provider: ${provider} | Model: ${model} | Intent: ${intent} | Message: "${userMessage.substring(0, 30)}..."`);

        // Check credits if userId is provided
        if (userId && provider !== 'fallback') {
            if (!hasEnoughCredits(userId, 'ai_message')) {
                console.log(`[AI] User ${userId} has insufficient credits for ${model}`);
                // Return fallback response when out of credits
                const fallback = this.fallbackResponse(agent, userMessage);
                fallback.credit_warning = 'Crédits insuffisants - réponse de secours utilisée';
                return fallback;
            }
        }

        try {
            let response;
            
            switch (provider) {
                case 'gemini':
                    // Use circuit breaker for Gemini
                    response = await geminiCircuitBreaker.execute(async () => {
                        return await this.generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                    });
                    break;
                case 'openai':
                    // Use circuit breaker for OpenAI
                    response = await openaiCircuitBreaker.execute(async () => {
                        return await this.generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                    });
                    break;
                case 'openrouter':
                    // Use circuit breaker for OpenRouter
                    response = await openrouterCircuitBreaker.execute(async () => {
                        return await this.generateOpenRouterResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                    });
                    break;
                default:
                    response = this.fallbackResponse(agent, userMessage);
            }

            // Deduct credits only for real AI responses (not fallback)
            if (userId && provider !== 'fallback') {
                const tokensUsed = Number.isFinite(response?.tokens) ? response.tokens : 0;
                const deduction = deductCredits(userId, 'ai_message', 1, {
                    agent_id: agent.id,
                    tokens: tokensUsed
                });
                response.credits_deducted = deduction.cost;
                response.credits_remaining = deduction.credits_remaining;
                if (!deduction.success) {
                    console.warn(`[AI] Credit deduction failed: ${deduction.error}`);
                }
            }

            return response;
            
        } catch (error) {
            // Log error with context
            if (error.circuitBreakerOpen) {
                aiLogger.warn(`Circuit breaker is open for ${provider}`, { provider, error: error.message });
            } else if (error.timeout) {
                aiLogger.error(`Request timeout for ${provider}`, { provider, error: error.message });
            } else {
                aiLogger.error(`Error from ${provider}`, { provider, error: error.message });
            }
            
            // Essayer d'autres providers en cas d'erreur (skip si circuit breaker est open)
            if (provider === 'gemini' && this.openaiClient && !error.circuitBreakerOpen) {
                console.log('[AI] Fallback vers OpenAI...');
                try {
                    const response = await openaiCircuitBreaker.execute(async () => {
                        return await this.generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                    });
                    if (userId) {
                        const tokensUsed = Number.isFinite(response?.tokens) ? response.tokens : 0;
                        const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent.id, tokens: tokensUsed });
                        response.credits_deducted = deduction.cost;
                        response.credits_remaining = deduction.credits_remaining;
                    }
                    return response;
                } catch (e) {
                    console.error('[AI] Fallback OpenAI aussi échoué:', e.message);
                }
            } else if (provider === 'openai' && this.geminiClient && !error.circuitBreakerOpen) {
                console.log('[AI] Fallback vers Gemini...');
                try {
                    const response = await geminiCircuitBreaker.execute(async () => {
                        return await this.generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                    });
                    if (userId) {
                        const tokensUsed = Number.isFinite(response?.tokens) ? response.tokens : 0;
                        const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent.id, tokens: tokensUsed });
                        response.credits_deducted = deduction.cost;
                        response.credits_remaining = deduction.credits_remaining;
                    }
                    return response;
                } catch (e) {
                    console.error('[AI] Fallback Gemini aussi échoué:', e.message);
                }
            } else if (provider === 'openrouter' && !error.circuitBreakerOpen) {
                // OpenRouter a échoué, essayer Gemini ou OpenAI
                if (this.geminiClient) {
                    console.log('[AI] OpenRouter échoué, fallback vers Gemini...');
                    try {
                        const response = await geminiCircuitBreaker.execute(async () => {
                            return await this.generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                        });
                        if (userId) {
                            const tokensUsed = Number.isFinite(response?.tokens) ? response.tokens : 0;
                            const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent.id, tokens: tokensUsed });
                            response.credits_deducted = deduction.cost;
                            response.credits_remaining = deduction.credits_remaining;
                        }
                        return response;
                    } catch (e) {
                        console.error('[AI] Fallback Gemini aussi échoué:', e.message);
                    }
                }
                if (this.openaiClient) {
                    console.log('[AI] OpenRouter échoué, fallback vers OpenAI...');
                    try {
                        const response = await openaiCircuitBreaker.execute(async () => {
                            return await this.generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase, messageAnalysis);
                        });
                        if (userId) {
                            const tokensUsed = Number.isFinite(response?.tokens) ? response.tokens : 0;
                            const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent.id, tokens: tokensUsed });
                            response.credits_deducted = deduction.cost;
                            response.credits_remaining = deduction.credits_remaining;
                        }
                        return response;
                    } catch (e) {
                        console.error('[AI] Fallback OpenAI aussi échoué:', e.message);
                    }
                }
            }

            // Fallback after all APIs failed: no credit deduction (fallback response is free)
            const fallback = this.fallbackResponse(agent, userMessage);
            console.log('[AI] Using fallback response (no credits deducted)');
            return fallback;
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
        systemGlobal += '\n\n⚠️ RÈGLE FINALE — PRÉSENTATION: Ne dis JAMAIS "Je suis [nom]", "Je m\'appelle...", "votre assistant [type]..." ou toute phrase qui te présente. Réponds directement au message du client.';
        systemGlobal += '\n\n⚠️ RÈGLE — CONTEXTE: Utilise la CONVERSATION RÉCENTE fournie. Si le client a déjà été salué (échange précédent avec "Bonjour" ou salut), NE REDIS PAS "Bonjour" ni "Bonjour !" au début de ta réponse. Réponds directement à sa question ou demande (ex: produit, commande). Tu ne salues qu\'une seule fois au tout premier message du client.';
        systemGlobal += '\n\n⚠️ RÈGLE — FORMULATION: Quand tu transmets des informations du catalogue ou de la base de connaissances, utilise des formulations professionnelles comme "Voici les informations disponibles", "D\'après notre catalogue, ...", "Voici ce qui est indiqué : ...". Ne dis JAMAIS "C\'est tout ce que j\'ai comme information", "Je n\'ai que ça", ou des formulations qui sous-entendent un manque. Reste factuel et rassurant.';

        // [BUSINESS TENANT] — agent/catalogue et contexte temps réel
        let businessTenant = '';
        if (messageAnalysis) businessTenant += '\n\n' + this.buildAnalysisContext(messageAnalysis);
        if (knowledgeBase && knowledgeBase.length > 0) {
            businessTenant += '\n\n📚 BASE DE CONNAISSANCES:\n';
            for (const item of knowledgeBase) {
                const content = item.content.length > 2000 ? item.content.substring(0, 2000) + '...' : item.content;
                businessTenant += `### ${item.title}\n${content}\n\n`;
            }
            const hasCatalogue = knowledgeBase.some(item => item.title === '📦 CATALOGUE PRODUITS');
            if (hasCatalogue) {
                    businessTenant += '\n⚠️ RÈGLE — CATALOGUE: Pour les noms de produits, prix, disponibilité, description, caractéristiques et capacités techniques, utilise UNIQUEMENT la section "📦 CATALOGUE PRODUITS" ci-dessus. Chaque produit peut avoir une description sur la ligne suivante (indentation) : utilise-la pour répondre aux questions sur les capacités, spécifications ou fiche technique. N\'invente aucune caractéristique. Si le client demande les capacités/caractéristiques d\'un produit et qu\'aucune description n\'est indiquée pour ce produit dans le catalogue, dis-le clairement et propose de le mettre en relation avec un conseiller pour les détails techniques.\n';
                    businessTenant += '⚠️ IMAGES PRODUITS: Si le client demande une image/photo d\'un produit, fournis le lien présent dans le catalogue (champ "Image: <url>") et n\'invente jamais de lien. Si le produit n\'a pas de lien d\'image, dis-le simplement.\n';
            }
        }

        // [POLICY] — légal/sécurité
        const policy = '\n\n[POLICY] — RÈGLES LÉGALES / SÉCURITÉ: Ne fais jamais de promesse de garantie absolue, ni de promesse de délai non autorisée. N\'invente aucun prix ni information hors catalogue.\n\n⚠️ QUAND DEMANDER UN CONSEILLER (need_human: true):\n- Réclamation grave ou litige complexe\n- Problème technique critique nécessitant intervention\n- Informations de paiement ou données bancaires\n\n✅ TU PEUX RÉPONDRE DIRECTEMENT (need_human: false):\n- Questions sur produits, prix, disponibilité, capacités/caractéristiques/description (utilise le catalogue et la description produit)\n- Demandes de retour/remboursement (utilise la politique de retour dans la base de connaissance)\n- Questions sur livraison, délais, zones desservies\n- Informations générales présentes dans ta base de connaissance';

        const fullPrompt = `[SYSTEM GLOBAL]\n${systemGlobal}\n\n[BUSINESS TENANT]\n${businessTenant}\n${policy}`;
        const promptHash = crypto.createHash('sha256').update(fullPrompt).digest('hex').slice(0, 16);
        return { prompt: fullPrompt, promptHash };
    }

    /**
     * Get default prompt for agent without custom prompt
     */
    getDefaultPrompt(agent) {
        return `Tu es un assistant commercial professionnel pour une boutique. Tu aides les clients avec leurs achats.

## ⚠️ PRÉSENTATION — RÈGLE CRITIQUE
- NE JAMAIS te présenter en disant ton nom ou ton rôle (ex: "Je suis [nom], votre assistant...", "Je m'appelle..."). Le client sait qu'il parle à un assistant.
- En cas de salut ("Bonjour", "Salut"), réponds par un salut court puis propose ton aide. Ex: "Bonjour ! Comment puis-je vous aider ?"
- Va TOUJOURS droit au but.

## RÈGLES FONDAMENTALES
- Réponds TOUJOURS dans la langue du client
- Sois CONCIS: 2-3 phrases maximum
- Va DROIT AU BUT, pas de formules longues
- Utilise les informations de contexte fournies
- Ne JAMAIS inventer d'informations`;
    }

    /**
     * Get default instructions
     */
    getDefaultInstructions() {
        return `\n\n📋 INSTRUCTIONS IMPORTANTES:
- Réponds dans la langue de l'utilisateur
- Maximum 2-3 phrases pour les réponses simples
- Si tu ne sais pas, dis-le honnêtement
- Utilise le contexte et la base de connaissances
- Ne répète pas les informations déjà données`;
    }

    /**
     * Build analysis context string for AI
     */
    buildAnalysisContext(analysis) {
        if (!analysis) return '';
        
        const parts = ['🔍 CONTEXTE TEMPS RÉEL:'];
        
        // Language: force reply in the same language as the client
        if (analysis.language && analysis.language !== 'unknown') {
            const langLabel = analysis.language === 'fr' ? 'français' : analysis.language === 'en' ? 'anglais' : analysis.language;
            parts.push(`\n🌐 Langue du message client : ${langLabel}. Réponds UNIQUEMENT dans cette langue.`);
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
        }
        
        // Delivery info collected
        if (analysis.deliveryInfo?.hasDeliveryInfo) {
            parts.push('\n📍 Infos livraison détectées:');
            if (analysis.deliveryInfo.city) parts.push(`- Ville: ${analysis.deliveryInfo.city}`);
            if (analysis.deliveryInfo.neighborhood) parts.push(`- Quartier: ${analysis.deliveryInfo.neighborhood}`);
            if (analysis.deliveryInfo.phone) parts.push(`- Tél: ${analysis.deliveryInfo.phone}`);
        }
        
        // Order guidance
        if (analysis.isLikelyOrder) {
            const missing = [];
            if (!analysis.deliveryInfo?.city) missing.push('ville/commune');
            if (!analysis.deliveryInfo?.neighborhood) missing.push('quartier');
            if (!analysis.deliveryInfo?.phone) missing.push('numéro de téléphone');
            
            if (missing.length > 0) {
                parts.push(`\n📝 POUR FINALISER LA COMMANDE, demande: ${missing.join(', ')}`);
            } else {
                parts.push('\n✅ Toutes les infos de livraison sont collectées!');
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
    async generateGeminiResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null) {
        // Use centralized config for model mapping
        const geminiModel = getModelName('gemini', agent.model);

        console.log(`[AI] Using Gemini model: ${geminiModel}`);

        // Use centralized config for generation parameters
        const genConfig = getGenerationConfig(agent);
        // Min 2048 tokens pour éviter la troncation (réponses commande, récap livraison, etc.)
        const maxOutputTokens = Math.max(genConfig.maxTokens || 500, 2048);
        const model = this.geminiClient.getGenerativeModel({ 
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
                conversationText += `${role}: ${msg.content}\n`;
            }
        }

        const messageActuelLabel = '\n\n---\n📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message en priorité):\n';
        const structuredInstruction = '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec: "response" (string: ton message au client), "need_human" (boolean: true si tu recommandes de transférer à un humain), et optionnellement "confidence" (number 0-1). Exemple: {"response": "Bonjour, voici les informations...", "need_human": false, "confidence": 0.9}';
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
                if (depth === 0) return str.slice(0, i + 1);
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
        
        if ('need_human' in obj && typeof obj.need_human !== 'boolean') {
            errors.push('Field "need_human" must be a boolean');
        }
        
        if ('confidence' in obj) {
            if (typeof obj.confidence !== 'number') {
                errors.push('Field "confidence" must be a number');
            } else if (obj.confidence < 0 || obj.confidence > 1) {
                errors.push('Field "confidence" must be between 0 and 1');
            }
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
        
        const normalizeParsed = (obj) => ({
            response: obj.response,
            need_human: Boolean(obj.need_human ?? obj.need_confirmation),
            confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined
        });

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
                aiLogger.info('Salvaged response from truncated JSON');
                return { response: text, need_human: true, confidence: undefined };
            }
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
        
        return { content, need_human };
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
        if (!raw || typeof raw !== 'string') return 'gemini-1.5-flash-latest';
        const m = raw.toLowerCase();
        if (m.includes('gemini-1.5-pro') || m.includes('gemini-pro')) return 'gemini-1.5-pro-latest';
        if (m.includes('gemini-2.5') || m.includes('models/gemini-2.5-flash')) return 'gemini-2.5-flash';
        if (m.includes('gemini')) return 'gemini-1.5-flash-latest';
        return 'gemini-1.5-flash-latest';
    }

    /**
     * Transcrit un message audio (notes vocales) via Gemini.
     * @param {Object} agent - Agent configuration
     * @param {string} audioBase64 - Audio data (base64)
     * @param {string} mimeType - e.g. 'audio/ogg', 'audio/mpeg'
     * @param {string|null} userId - For credit deduction
     */
    async transcribeAudio(agent, audioBase64, mimeType, userId = null) {
        this.initialize();
        if (!this.geminiClient) {
            console.warn('[AI] Audio: Gemini non configuré, transcription impossible');
            return { text: null, provider: 'fallback', model: null };
        }

        const geminiModel = this.resolveMediaModel(agent);
        if (userId && !hasEnoughCredits(userId, 'ai_message')) {
            return {
                text: null,
                credit_warning: 'Crédits insuffisants',
                provider: 'gemini',
                model: geminiModel
            };
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
                const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent?.id, tokens: tokensUsed });
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
        if (!this.geminiClient) {
            console.warn('[AI] Vision: Gemini non configuré, fallback texte');
            return {
                content: "Je ne peux pas analyser les images pour le moment. Décrivez-moi ce que vous cherchez ou envoyez un message texte.",
                tokens: 0,
                provider: 'fallback',
                model: null
            };
        }

        const geminiModel = this.resolveMediaModel(agent);
        if (userId && !hasEnoughCredits(userId, 'ai_message')) {
            return {
                content: "Crédits insuffisants pour l'analyse d'image. Réessayez plus tard.",
                credit_warning: 'Crédits insuffisants',
                tokens: 0,
                provider: 'gemini',
                model: geminiModel
            };
        }

        try {
            const model = this.geminiClient.getGenerativeModel({
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
                const deduction = deductCredits(userId, 'ai_message', 1, { agent_id: agent?.id, tokens: tokensUsed });
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
    async generateOpenAIResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null) {
        const { prompt: systemPrompt } = this.buildSystemPrompt(agent, knowledgeBase, messageAnalysis);
        const structuredInstruction = '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec: "response" (string: ton message au client), "need_human" (boolean: true si tu recommandes de transférer à un humain), et optionnellement "confidence" (number 0-1). Exemple: {"response": "Bonjour, voici les informations...", "need_human": false, "confidence": 0.9}';

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
                content: msg.content
            });
        }

        // Message actuel (explicite pour que le modèle sache à quoi répondre)
        messages.push({
            role: 'user',
            content: `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message):\n\n${userMessage}`
        });

        // Use centralized config for model mapping
        const openaiModel = getModelName('openai', agent.model);

        // Use centralized config for generation parameters
        const genConfig = getGenerationConfig(agent);
        const maxTokens = Math.max(genConfig.maxTokens || 500, 2048);
        const completion = await this.openaiClient.chat.completions.create({
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
            tokens: tokensUsed,
            provider: 'openai',
            model: openaiModel
        };
    }

    /**
     * Génère une réponse avec OpenRouter (accès à plusieurs modèles)
     * Avec retry automatique et fallback vers d'autres modèles gratuits
     */
    async generateOpenRouterResponse(agent, conversationHistory, userMessage, knowledgeBase = [], messageAnalysis = null) {
        const { prompt: systemPrompt } = this.buildSystemPrompt(agent, knowledgeBase, messageAnalysis);
        const structuredInstruction = '\n\n⚠️ FORMAT DE RÉPONSE — Réponds UNIQUEMENT par un objet JSON valide avec: "response" (string: ton message au client), "need_human" (boolean: true si tu recommandes de transférer à un humain), et optionnellement "confidence" (number 0-1). Exemple: {"response": "Bonjour, voici les informations...", "need_human": false, "confidence": 0.9}';

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
                content: msg.content
            });
        }

        // Message actuel (explicite pour que le modèle sache à quoi répondre)
        messages.push({
            role: 'user',
            content: `📩 MESSAGE ACTUEL DU CLIENT (réponds à ce message):\n\n${userMessage}`
        });

        // Use centralized config for model selection (mapping agent.model -> ID OpenRouter)
        const primaryModel = getModelName('openrouter', agent.model || AI_CONFIG.models.openrouter.default);
        
        // Use centralized config for fallback models
        const fallbackModels = AI_CONFIG.models.openrouter.freeFallbacks
            .filter(m => m !== primaryModel);

        // Essayer le modèle principal d'abord, puis les fallbacks
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

                const completion = await this.openrouterClient.chat.completions.create({
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
}

export const aiService = new AIService();
export default aiService;
