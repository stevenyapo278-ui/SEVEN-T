/**
 * Message Analyzer Service
 * Pre-analyzes messages BEFORE AI response to provide enriched context
 * 
 * This service provides:
 * - Intent detection (order, info, complaint, greeting)
 * - Product matching with real-time stock check
 * - Customer history
 * - Delivery info extraction
 */

import db from '../database/init.js';
import MESSAGE_ANALYZER_CONFIG from '../config/messageAnalyzer.config.js';
import INTENT_PATTERNS from '../config/messageAnalyzer.intents.js';
import { INJECTION_REGEXES, INSULT_WORDS } from '../config/messageAnalyzer.security.js';
import { FRENCH_NUMBERS, QUANTITY_EXPRESSIONS } from '../config/messageAnalyzer.numbers.js';

const NORMALIZED_INSULT_WORDS = INSULT_WORDS.map(word =>
    word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class MessageAnalyzer {
    constructor() {
        // 2.2 Product cache for performance optimization
        this.productCache = new Map();
        this.productIndexCache = new Map();
        this.quantityPatternCache = new Map();
        this.CACHE_TTL = 60000; // 60 seconds TTL
        this._validateConfig();
    }

    /**
     * Full pre-analysis of a message.
     * Accepts either normalized payload (from listener) or legacy (message, userId, conversation).
     * @param {Object|string} payloadOrMessage - Normalized payload { tenant_id, conversation_id, from, message, timestamp } or raw message string
     * @param {string|Object} userIdOrConversation - User ID (if legacy) or conversation object (if payload)
     * @param {Object} [conversation] - Conversation object (legacy only)
     * @returns {Object} - Analysis result
     */
    analyze(payloadOrMessage, userIdOrConversation, conversation) {
        const isPayload = payloadOrMessage && typeof payloadOrMessage === 'object' && 'message' in payloadOrMessage && 'tenant_id' in payloadOrMessage;
        if (isPayload) {
            return this.analyzePayload(payloadOrMessage, userIdOrConversation);
        }
        return this.analyzeMessage(payloadOrMessage, userIdOrConversation, conversation);
    }

    /**
     * Base pre-analysis shared across templates.
     * Accepts either normalized payload (from listener) or legacy (message, userId, conversation).
     * @param {Object|string} payloadOrMessage - Normalized payload { tenant_id, conversation_id, from, message, timestamp } or raw message string
     * @param {string|Object} userIdOrConversation - User ID (if legacy) or conversation object (if payload)
     * @param {Object} [conversation] - Conversation object (legacy only)
     * @returns {Object} - Base analysis result
     */
    analyzeBase(payloadOrMessage, userIdOrConversation, conversation) {
        const isPayload = payloadOrMessage && typeof payloadOrMessage === 'object' && 'message' in payloadOrMessage && 'tenant_id' in payloadOrMessage;
        if (isPayload) {
            return this.analyzeBasePayload(payloadOrMessage, userIdOrConversation);
        }
        return this.analyzeBaseMessage(payloadOrMessage, userIdOrConversation, conversation);
    }

    /**
     * E-commerce analysis (legacy full analysis).
     * Accepts either normalized payload (from listener) or legacy (message, userId, conversation).
     * @param {Object|string} payloadOrMessage - Normalized payload { tenant_id, conversation_id, from, message, timestamp } or raw message string
     * @param {string|Object} userIdOrConversation - User ID (if legacy) or conversation object (if payload)
     * @param {Object} [conversation] - Conversation object (legacy only)
     * @returns {Object} - Full analysis result (e-commerce)
     */
    async analyzeEcommerce(payloadOrMessage, userIdOrConversation, conversation) {
        const isPayload = payloadOrMessage && typeof payloadOrMessage === 'object' && 'message' in payloadOrMessage && 'tenant_id' in payloadOrMessage;
        if (isPayload) {
            return await this.analyzePayload(payloadOrMessage, userIdOrConversation);
        }
        return await this.analyzeMessage(payloadOrMessage, userIdOrConversation, conversation);
    }

    /**
     * Analyze a normalized payload (preferred)
     * @param {Object} payload - Normalized payload { tenant_id, conversation_id, from, message, timestamp }
     * @param {Object} [conversation] - Conversation object
     */
    async analyzePayload(payload, conversation = null) {
        return await this._analyze(payload?.message, payload?.tenant_id, conversation);
    }

    /**
     * Analyze a raw message string (legacy)
     * @param {string} message
     * @param {string} userId
     * @param {Object} [conversation]
     */
    async analyzeMessage(message, userId, conversation = null) {
        return await this._analyze(message, userId, conversation);
    }

    /**
     * Analyze a normalized payload (base analysis only)
     * @param {Object} payload - Normalized payload { tenant_id, conversation_id, from, message, timestamp }
     * @param {Object} [conversation] - Conversation object
     */
    analyzeBasePayload(payload, conversation = null) {
        return this._analyzeBase(payload?.message, payload?.tenant_id, conversation);
    }

    /**
     * Analyze a raw message string (base analysis only)
     * @param {string} message
     * @param {string} userId
     * @param {Object} [conversation]
     */
    analyzeBaseMessage(message, userId, conversation = null) {
        return this._analyzeBase(message, userId, conversation);
    }

    _analyzeBase(message, userId, conv) {
        // 1.4 Input validation
        if (!message || typeof message !== 'string') {
            console.error('[MessageAnalyzer][Base] Invalid message input:', typeof message);
            return this._getBaseEmptyAnalysisResult('unknown', true);
        }

        // 0. Message size cap
        let sanitizedMessage = message;
        if (sanitizedMessage.length > MESSAGE_ANALYZER_CONFIG.MAX_MESSAGE_LENGTH) {
            sanitizedMessage = sanitizedMessage.slice(0, MESSAGE_ANALYZER_CONFIG.MAX_MESSAGE_LENGTH);
            console.warn('[MessageAnalyzer][Base] Message truncated due to MAX_MESSAGE_LENGTH');
        }

        const lowerMessage = sanitizedMessage.toLowerCase();
        const trimmed = sanitizedMessage.trim();

        // 0. Short message → ignore (no LLM call)
        if (trimmed.length < MESSAGE_ANALYZER_CONFIG.MIN_MESSAGE_LENGTH) {
            return this._getBaseEmptyAnalysisResult('unknown', true);
        }

        // 0b. Prompt injection & insult detection (pre-processing security)
        const injection = this.detectPromptInjection(sanitizedMessage);
        const insult = this.detectInsult(sanitizedMessage);
        const language = this.detectLanguage(sanitizedMessage);

        // Minimal intent detection for static responses
        const intent = this.detectBaseIntent(lowerMessage);
        const intent_hint = insult ? 'insulte' : intent.primary;

        let needsHuman = { needed: false, reasons: [] };
        if (insult) {
            needsHuman = { needed: true, reasons: ['Insulte ou langage offensant détecté'] };
        }

        const risk_level = injection ? 'high' : (insult ? 'medium' : 'low');
        const escalate = injection || insult;

        const result = {
            intent,
            needsHuman,
            ignore: false,
            escalate,
            risk_level,
            language,
            intent_hint,
            timestamp: Date.now()
        };

        console.log('[MessageAnalyzer][Base]', {
            intent: intent_hint || intent.primary,
            risk_level,
            ignore: false,
            escalate,
            userId: userId || conv?.id || 'unknown'
        });

        return result;
    }

    async _analyze(message, userId, conv) {
        if (!message || typeof message !== 'string') {
            console.error('[MessageAnalyzer] Invalid message input:', typeof message);
            return this._getEmptyAnalysisResult('unknown', true);
        }

        let sanitizedMessage = message;
        if (sanitizedMessage.length > MESSAGE_ANALYZER_CONFIG.MAX_MESSAGE_LENGTH) {
            sanitizedMessage = sanitizedMessage.slice(0, MESSAGE_ANALYZER_CONFIG.MAX_MESSAGE_LENGTH);
            console.warn('[MessageAnalyzer] Message truncated due to MAX_MESSAGE_LENGTH');
        }

        const lowerMessage = sanitizedMessage.toLowerCase();
        const trimmed = sanitizedMessage.trim();

        if (trimmed.length < MESSAGE_ANALYZER_CONFIG.MIN_MESSAGE_LENGTH) {
            return this._getEmptyAnalysisResult('unknown', true);
        }

        const injection = this.detectPromptInjection(sanitizedMessage);
        const insult = this.detectInsult(sanitizedMessage);
        const language = this.detectLanguage(sanitizedMessage);

        const intent = this.detectIntent(lowerMessage);
        const intent_hint = insult ? 'insulte' : intent.primary;

        const isConfirmation = this._isConfirmationMessage(lowerMessage);
        const contextText = conv?.id ? await this._getRecentConversationContext(conv.id) : null;
        const productAnalysis = await this.analyzeProducts(sanitizedMessage, userId, {
            contextText,
            useContextIfNoMatch: isConfirmation
        });

        const hasConfirmationProduct = isConfirmation && productAnalysis.matchedProducts.length > 0;
        if (hasConfirmationProduct && (intent.primary === 'general' || intent.primary === 'greeting')) {
            intent.primary = 'order';
            intent.confidence = 'high';
        }

        // 3. Get customer history
        const customerHistory = await this.getCustomerHistory(userId, conv);

        // 4. Extract delivery info if present
        const deliveryInfo = this.extractDeliveryInfo(lowerMessage);

        // 5. Check for quantity mentions
        const quantities = this.extractQuantities(lowerMessage);

        // 6. Determine if this is likely an order
        const isLikelyOrder = intent.primary === 'order' && productAnalysis.matchedProducts.length > 0;

        // 7. Check if human intervention is needed
        let needsHuman = this.checkNeedsHuman(intent, productAnalysis);
        if (insult) {
            needsHuman = { needed: true, reasons: [...(needsHuman.reasons || []), 'Insulte ou langage offensant détecté'] };
        }

        const risk_level = injection ? 'high' : (insult ? 'medium' : 'low');
        const escalate = injection || insult;

        const result = {
            intent,
            products: productAnalysis,
            customerHistory,
            deliveryInfo,
            quantities,
            isLikelyOrder,
            confirmation: {
                isConfirmation,
                hasConfirmationProduct,
                usedContext: productAnalysis.usedContext === true
            },
            needsHuman,
            ignore: false,
            escalate,
            risk_level,
            language,
            intent_hint,
            timestamp: Date.now()
        };

        // 1.3 Logging/monitoring
        console.log('[MessageAnalyzer]', {
            intent: intent_hint || intent.primary,
            risk_level,
            ignore: false,
            escalate,
            matchedProducts: productAnalysis.matchedProducts.length,
            userId: userId || 'unknown',
            conversationId: conv?.id || 'unknown'
        });

        return result;
    }

    /**
     * Validate required config keys
     */
    _validateConfig() {
        const required = ['MIN_MESSAGE_LENGTH', 'MAX_MESSAGE_LENGTH', 'MIN_QUANTITY', 'MAX_QUANTITY', 'LOW_STOCK_THRESHOLD'];
        for (const key of required) {
            if (MESSAGE_ANALYZER_CONFIG[key] === undefined) {
                throw new Error(`[MessageAnalyzer] Missing config: ${key}`);
            }
        }
    }

    /**
     * Normalize input for security checks (NFKC + leetspeak + strip diacritics)
     */
    _normalizeForSecurity(message) {
        const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g' };
        let normalized = String(message || '').normalize('NFKC');
        normalized = normalized.replace(/[0-9]/g, (digit) => leetMap[digit] || digit);
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const alphaWithSpaces = normalized
            .toLowerCase()
            .replace(/[^a-z]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return {
            alphaWithSpaces,
            alphaCollapsed: alphaWithSpaces.replace(/\s+/g, '')
        };
    }

    _isConfirmationMessage(lowerMessage) {
        const trimmed = lowerMessage.trim();
        if (!trimmed) return false;
        const patterns = [
            /^(oui|ok|okay|d'accord|je confirme|c'est bon|parfait|super)\b/i,
            /^(confirmé|je valide|valide|je prends)\b/i,
            /^j'en veux\b/i,
            /^j'en prends\b/i,
            /^(donne|donnez)\s*m['']en\b/i
        ];
        return patterns.some((pattern) => pattern.test(trimmed));
    }

    async _getRecentConversationContext(conversationId, limit = 5) {
        try {
            const rows = await db.all(`
                SELECT content FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `, conversationId, limit);
            const list = Array.isArray(rows) ? rows : [];
            return list.map(r => r.content).reverse().join(' ');
        } catch (error) {
            console.error('[MessageAnalyzer] Error fetching conversation context:', error, { conversationId });
            return null;
        }
    }

    _hasNegationNearProduct(messageLower, productName) {
        const productFirstWord = escapeRegex(productName.toLowerCase().split(/\s+/)[0] || '');
        if (!productFirstWord) return false;
        const negationPatterns = [
            new RegExp(`\\bpas\\s+(?:de\\s+)?(?:\\w+\\s+){0,3}${productFirstWord}`, 'i'),
            new RegExp(`\\bne\\s+\\w+\\s+pas\\s+(?:\\w+\\s+){0,3}${productFirstWord}`, 'i'),
            new RegExp(`\\bsans\\s+(?:\\w+\\s+){0,3}${productFirstWord}`, 'i'),
            new RegExp(`\\baucun\\w*\\s+(?:\\w+\\s+){0,3}${productFirstWord}`, 'i')
        ];
        return negationPatterns.some((pattern) => pattern.test(messageLower));
    }

    detectPromptInjection(message) {
        const normalized = this._normalizeForSecurity(message).alphaWithSpaces;
        return INJECTION_REGEXES.some((pattern) => pattern.test(normalized));
    }

    detectInsult(message) {
        const { alphaWithSpaces } = this._normalizeForSecurity(message);
        const words = alphaWithSpaces.split(/\s+/).filter(Boolean);

        // Exact word match (normalized)
        for (const w of words) {
            if (NORMALIZED_INSULT_WORDS.includes(w)) return true;
        }

        // Obfuscated match (allow separators between letters)
        for (const word of NORMALIZED_INSULT_WORDS) {
            if (word.length < 3) continue;
            const chars = word.split('').map((c) => c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
            const pattern = new RegExp(`(^|\\s)${chars.join('\\s*')}(\\s|$)`, 'i');
            if (pattern.test(alphaWithSpaces)) return true;
        }

        return false;
    }

    detectLanguage(message) {
        if (!message || !message.trim()) return 'unknown';
        const trimmed = message.trim();
        const lower = trimmed.toLowerCase();
        
        // 2.3 Improved language detection with common word patterns
        const frCommonWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'et', 'est', 'sont', 'avec', 'pour', 'dans', 'sur', 'bonjour', 'merci', 'oui', 'non', 'comment', 'pourquoi', 'quand', 'où'];
        const enCommonWords = ['i', 'you', 'he', 'she', 'we', 'they', 'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'with', 'for', 'in', 'on', 'hello', 'thanks', 'yes', 'no', 'how', 'why', 'when', 'where'];
        
        const words = lower.split(/\s+/).filter(Boolean);
        
        // Count common words
        let frScore = 0;
        let enScore = 0;
        
        for (const word of words) {
            if (frCommonWords.includes(word)) frScore++;
            if (enCommonWords.includes(word)) enScore++;
        }
        
        // Check for French accents
        const frPattern = /[àâäéèêëïîôùûüç]/gi;
        const frCount = (trimmed.match(frPattern) || []).length;
        if (frCount > 0) frScore += frCount * 0.5;
        
        // Decide based on scores
        if (frScore > enScore) return 'fr';
        if (enScore > frScore) return 'en';
        
        // Fallback to accent ratio
        if (frCount / trimmed.length > MESSAGE_ANALYZER_CONFIG.LANGUAGE_FR_ACCENT_RATIO) return 'fr';
        
        return 'en'; // Default to English if unclear
    }

    /**
     * Detect the primary intent of the message
     */
    detectIntent(message) {
        const scores = {};
        const matchedKeywords = {};
        
        for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
            scores[intent] = 0;
            matchedKeywords[intent] = [];
            
            for (const keyword of config.keywords) {
                if (message.includes(keyword)) {
                    scores[intent] += config.weight;
                    matchedKeywords[intent].push(keyword);
                }
            }
        }
        
        // Find primary intent
        const sortedIntents = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1]);
        
        const primary = sortedIntents[0]?.[0] || 'general';
        const secondary = sortedIntents[1]?.[0] || null;
        
        return {
            primary,
            secondary,
            scores,
            confidence: sortedIntents[0]?.[1] > 10 ? 'high' : sortedIntents[0]?.[1] > 5 ? 'medium' : 'low',
            matchedKeywords: matchedKeywords[primary] || []
        };
    }

    /**
     * Detect a minimal intent set for all templates (greeting, human_request, general)
     */
    detectBaseIntent(message) {
        const scores = {};
        const matchedKeywords = {};
        const minimalIntents = {
            greeting: INTENT_PATTERNS.greeting,
            human_request: INTENT_PATTERNS.human_request
        };

        for (const [intent, config] of Object.entries(minimalIntents)) {
            scores[intent] = 0;
            matchedKeywords[intent] = [];

            for (const keyword of config.keywords || []) {
                if (message.includes(keyword)) {
                    scores[intent] += config.weight || 1;
                    matchedKeywords[intent].push(keyword);
                }
            }
        }

        const sortedIntents = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1]);

        const primary = sortedIntents[0]?.[0] || 'general';
        const secondary = sortedIntents[1]?.[0] || null;
        const topScore = sortedIntents[0]?.[1] || 0;

        return {
            primary,
            secondary,
            scores,
            confidence: topScore > 10 ? 'high' : topScore > 5 ? 'medium' : topScore > 0 ? 'low' : 'low',
            matchedKeywords: matchedKeywords[primary] || []
        };
    }

    /**
     * 2.2 Get products from cache or DB
     * @private
     */
    async _getProducts(userId) {
        const cacheKey = `products_${userId}`;
        const cached = this.productCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        try {
            const products = await db.all(`
                SELECT id, name, sku, price, stock, category, description
                FROM products 
                WHERE user_id = ? AND is_active = 1
            `, userId);

            const list = Array.isArray(products) ? products : [];
            this.productCache.set(cacheKey, {
                data: list,
                timestamp: Date.now()
            });

            return list;
        } catch (error) {
            console.error('[MessageAnalyzer] Error fetching products:', error, { userId });
            return null;
        }
    }

    /**
     * 2.2 Invalidate product cache for a user (call this when products are updated)
     */
    invalidateProductCache(userId) {
        const cacheKey = `products_${userId}`;
        this.productCache.delete(cacheKey);
        this.productIndexCache.delete(`index_${userId}`);
    }

    /**
     * 2.2 Build inverted index for faster product matching
     * Maps tokens (words) to products that contain them
     * @private
     */
    _buildProductIndex(products) {
        const index = new Map();
        const list = Array.isArray(products) ? products : [];

        for (const product of list) {
            const tokens = new Set();
            
            // Tokenize product name
            const nameTokens = product.name.toLowerCase().split(/\s+/).filter(w => w.length > MESSAGE_ANALYZER_CONFIG.MIN_WORD_LENGTH);
            nameTokens.forEach(t => tokens.add(t));
            
            // Add SKU if present
            if (product.sku) {
                tokens.add(product.sku.toLowerCase());
            }
            
            // Add each token to the index
            for (const token of tokens) {
                if (!index.has(token)) {
                    index.set(token, []);
                }
                index.get(token).push(product);
            }
        }
        
        return index;
    }

    /**
     * 2.2 Get (or build) cached product index for a user
     * @private
     */
    _getProductIndex(userId, products) {
        const cacheKey = `index_${userId}`;
        const cached = this.productIndexCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const index = this._buildProductIndex(products);
        this.productIndexCache.set(cacheKey, { data: index, timestamp: Date.now() });
        return index;
    }

    /**
     * 2.2 Get candidate products using inverted index
     * @private
     */
    _getCandidateProducts(message, index) {
        const lowerMessage = message.toLowerCase();
        const messageTokens = lowerMessage.split(/\s+/).filter(w => w.length > MESSAGE_ANALYZER_CONFIG.MIN_WORD_LENGTH);

        // Find products that match at least one token
        const candidateSet = new Set();
        if (index) {
            for (const token of messageTokens) {
                const matches = index.get(token);
                if (matches) {
                    matches.forEach(p => candidateSet.add(p));
                }
            }
        }
        
        return Array.from(candidateSet);
    }

    /**
     * Analyze products mentioned and check stock
     */
    async analyzeProducts(message, userId, options = {}) {
        const { contextText = null, useContextIfNoMatch = false } = options;
        const lowerMessage = message.toLowerCase();

        const products = await this._getProducts(userId);

        if (products === null) {
            return {
                matchedProducts: [],
                stockIssues: [],
                hasStockProblems: false,
                totalProducts: 0,
                totalRequestedItems: 0,
                error: true
            };
        }
        
        const matchedProducts = [];
        const stockIssues = [];
        
        // 2.2 Use cached inverted index to get candidate products
        const index = this._getProductIndex(userId, products);
        const candidateProducts = this._getCandidateProducts(lowerMessage, index);
        
        const addProductMatch = (product, quantity, source = 'message') => {
            if (matchedProducts.some(p => p.id === product.id)) return;
            const productInfo = {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                stock: product.stock,
                category: product.category,
                requestedQuantity: quantity,
                stockStatus: this.getStockStatus(product.stock, quantity),
                matchedFrom: source
            };
            matchedProducts.push(productInfo);

            if (product.stock === 0) {
                stockIssues.push({
                    product: product.name,
                    issue: 'out_of_stock',
                    message: `${product.name} est en rupture de stock`
                });
            } else if (product.stock < quantity) {
                stockIssues.push({
                    product: product.name,
                    issue: 'insufficient_stock',
                    available: product.stock,
                    requested: quantity,
                    message: `Stock insuffisant pour ${product.name}: ${product.stock} disponible(s), ${quantity} demandé(s)`
                });
            } else if (product.stock <= MESSAGE_ANALYZER_CONFIG.LOW_STOCK_THRESHOLD) {
                stockIssues.push({
                    product: product.name,
                    issue: 'low_stock',
                    available: product.stock,
                    message: `Stock limité pour ${product.name}: ${product.stock} restant(s)`
                });
            }
        };

        const matchProductsInText = (text, source) => {
            const lowerText = text.toLowerCase();
            const textCandidates = source === 'message'
                ? candidateProducts
                : this._getCandidateProducts(lowerText, index);

            for (const product of textCandidates) {
                const productLower = product.name.toLowerCase();
                const words = productLower.split(/\s+/).filter(w => w.length > MESSAGE_ANALYZER_CONFIG.MIN_WORD_LENGTH);
                const matchedWords = words.filter(word => lowerText.includes(word));
                const minWordsRequired = words.length === 0 ? 1 : Math.min(2, words.length);
                const skuMatch = product.sku && lowerText.includes(product.sku.toLowerCase());

                if (lowerText.includes(productLower) || matchedWords.length >= minWordsRequired || skuMatch) {
                    if (this._hasNegationNearProduct(lowerText, product.name)) {
                        continue;
                    }
                    const quantity = this.extractQuantityForProduct(text, product.name);
                    addProductMatch(product, quantity, source);
                }
            }
        };

        matchProductsInText(message, 'message');

        if (matchedProducts.length === 0 && useContextIfNoMatch && contextText) {
            matchProductsInText(contextText, 'context');
        }
        
        // 2.5 Calculate total requested items across all products
        const totalRequestedItems = matchedProducts.reduce((sum, p) => sum + p.requestedQuantity, 0);
        
        return {
            matchedProducts,
            stockIssues,
            hasStockProblems: stockIssues.some(i => i.issue === 'out_of_stock' || i.issue === 'insufficient_stock'),
            totalProducts: products.length,
            totalRequestedItems,  // Total items across all matched products
            usedContext: matchedProducts.some(p => p.matchedFrom === 'context')
        };
    }

    /**
     * Get stock status text
     */
    getStockStatus(stock, requestedQty) {
        if (stock === 0) return 'out_of_stock';
        if (stock < requestedQty) return 'insufficient';
        if (stock <= MESSAGE_ANALYZER_CONFIG.LOW_STOCK_THRESHOLD) return 'low';
        return 'available';
    }

    /**
     * Extract quantity for a specific product
     * 2.4 Enhanced to handle vague quantities and edge cases
     */
    extractQuantityForProduct(message, productName) {
        const lowerMessage = message.toLowerCase();
        const productLower = productName.toLowerCase();
        const productFirstWord = productLower.split(' ')[0];
        const patterns = this._getQuantityPatterns(productFirstWord);

        // Try quantity expressions first (beaucoup, plusieurs, etc.)
        for (const { regex, value } of patterns.expressions) {
            if (regex.test(lowerMessage)) {
                return value;
            }
        }

        // Try French number words
        for (const { regex, value } of patterns.frenchWords) {
            if (regex.test(lowerMessage)) {
                return value;
            }
        }

        // Try numeric patterns
        for (const pattern of patterns.numeric) {
            const match = lowerMessage.match(pattern);
            if (match && match[1]) {
                const qty = parseInt(match[1]);
                // Reject negative or aberrant quantities
                if (qty < 0) return MESSAGE_ANALYZER_CONFIG.MIN_QUANTITY;
                if (qty >= MESSAGE_ANALYZER_CONFIG.MIN_QUANTITY && qty <= MESSAGE_ANALYZER_CONFIG.MAX_QUANTITY) {
                    return qty;
                }
                // Cap at max if above
                if (qty > MESSAGE_ANALYZER_CONFIG.MAX_QUANTITY) {
                    return MESSAGE_ANALYZER_CONFIG.MAX_QUANTITY;
                }
            }
        }
        
        return MESSAGE_ANALYZER_CONFIG.MIN_QUANTITY; // Default
    }

    _getQuantityPatterns(productFirstWord) {
        const key = productFirstWord || '';
        const cached = this.quantityPatternCache.get(key);
        if (cached) return cached;

        if (this.quantityPatternCache.size > 5000) {
            const oldestKeys = Array.from(this.quantityPatternCache.keys()).slice(0, 2500);
            oldestKeys.forEach((cacheKey) => this.quantityPatternCache.delete(cacheKey));
        }

        const safeWord = escapeRegex(productFirstWord);
        const expressions = Object.entries(QUANTITY_EXPRESSIONS).map(([expr, num]) => ({
            regex: new RegExp(`(${escapeRegex(expr)})\\s+(?:[a-zà-ÿ]*\\s+)?${safeWord}`, 'i'),
            value: num
        }));

        const frenchWords = Object.entries(FRENCH_NUMBERS).map(([word, num]) => ({
            regex: new RegExp(`(${escapeRegex(word)})\\s+(?:[a-zà-ÿ]*\\s+)?${safeWord}`, 'i'),
            value: num
        }));

        const numeric = [
            new RegExp(`(\\d+)\\s+(?:[a-zà-ÿ]*\\s+)?${safeWord}`, 'i'),
            new RegExp(`(\\d+)\\s*x\\s*${safeWord}`, 'i')
        ];

        const compiled = { expressions, frenchWords, numeric };
        this.quantityPatternCache.set(key, compiled);
        return compiled;
    }

    /**
     * Get customer order history
     */
    async getCustomerHistory(userId, conversation) {
        if (!conversation || !userId) return null;

        let orders, messageStats;
        try {
            orders = await db.all(`
                SELECT id, status, total_amount, created_at
                FROM orders 
                WHERE user_id = ? AND conversation_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `, userId, conversation.id);

            messageStats = await db.get(`
                SELECT COUNT(*) as total_messages,
                       SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages
                FROM messages 
                WHERE conversation_id = ?
            `, conversation.id);
        } catch (error) {
            console.error('[MessageAnalyzer] Error fetching customer history:', error, { userId, conversationId: conversation.id });
            return null;
        }

        const list = Array.isArray(orders) ? orders : [];
        const validatedOrders = list.filter(o => o.status === 'validated');
        const totalSpent = validatedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        return {
            totalOrders: list.length,
            validatedOrders: validatedOrders.length,
            pendingOrders: list.filter(o => o.status === 'pending').length,
            totalSpent,
            isNewCustomer: list.length === 0,
            isRepeatCustomer: validatedOrders.length > 0,
            messageCount: Number(messageStats?.total_messages ?? 0),
            engagement: Number(messageStats?.total_messages ?? 0) > MESSAGE_ANALYZER_CONFIG.HIGH_ENGAGEMENT_THRESHOLD ? 'high' :
                        Number(messageStats?.total_messages ?? 0) > MESSAGE_ANALYZER_CONFIG.MEDIUM_ENGAGEMENT_THRESHOLD ? 'medium' : 'low'
        };
    }

    /**
     * 1.5 Helper to apply regex patterns and extract matched value
     * @private
     */
    _applyPatterns(message, patterns, transformFn = (val) => val.trim()) {
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return transformFn(match[1]);
            }
        }
        return null;
    }

    /**
     * Extract delivery information
     */
    extractDeliveryInfo(message) {
        const info = {
            hasDeliveryInfo: false,
            city: null,
            neighborhood: null,
            phone: null
        };
        const trim = (v) => (v && String(v).trim()) || null;

        // Pattern "Lieu, Quartier 0xxxxxxxx" or "Lieu Quartier 0758519080" (one or two words + phone)
        const lieuNumeroMatch = message.match(/\b([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s-]{1,40}),\s*([A-ZÀ-Ÿa-zà-ÿ0-9][A-ZÀ-Ÿa-zà-ÿ0-9\s-]{1,40})\s+(\+?[\d\s-]{8,})\b/i)
            || message.match(/\b([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s-]{1,40})\s+([A-ZÀ-Ÿa-zà-ÿ0-9][A-ZÀ-Ÿa-zà-ÿ0-9\s-]{1,40})\s+(\+?[\d\s-]{8,})\b/i);
        if (lieuNumeroMatch) {
            info.city = trim(lieuNumeroMatch[1]);
            info.neighborhood = trim(lieuNumeroMatch[2]);
            info.phone = trim((lieuNumeroMatch[3] || '').replace(/\s|-/g, ''));
            if (info.phone) info.hasDeliveryInfo = true;
            if (info.city) info.hasDeliveryInfo = true;
            if (info.neighborhood) info.hasDeliveryInfo = true;
            if (info.hasDeliveryInfo) return info;
        }

        // City/commune patterns
        const cityPatterns = [
            /(?:ville|commune|à)\s*:?\s*([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s-]{0,60})(?:\s*,|\s*$|\s+quartier|\s+numéro)/i,
            /(?:je\s+suis\s+à|j'habite\s+à)\s+([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s-]{0,60})(?:\s*,|\s*$)/i
        ];
        const city = this._applyPatterns(message, cityPatterns);
        if (city) {
            info.city = city;
            info.hasDeliveryInfo = true;
        }

        // Neighborhood/quartier patterns
        const neighborhoodPatterns = [
            /quartier\s*:?\s*([A-ZÀ-Ÿa-zà-ÿ0-9][A-ZÀ-Ÿa-zà-ÿ0-9\s-]{0,60})(?:\s*,|\s*$|\s+numéro)/i,
            /(?:au|à)\s+quartier\s+([A-ZÀ-Ÿa-zà-ÿ0-9][A-ZÀ-Ÿa-zà-ÿ0-9\s-]{0,60})(?:\s*,|\s*$)/i
        ];
        const neighborhood = this._applyPatterns(message, neighborhoodPatterns);
        if (neighborhood) {
            info.neighborhood = neighborhood;
            info.hasDeliveryInfo = true;
        }

        // Phone number patterns
        const phonePatterns = [
            /(?:numéro|tel|téléphone|contact)\s*:?\s*(\+?[\d\s-]{8,})/i,
            /(?:^|\s)(\+?(?:225|229|226|228|221|223|224)?\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2,3})(?:\s|$)/,
            /\b(0\d{8,9})\b/,
            /\b(\+?(?:225|224)\s*\d[\d\s]{7,})\b/
        ];
        const phone = this._applyPatterns(message, phonePatterns, (val) => val.replace(/\s|-/g, ''));
        if (phone) {
            info.phone = phone;
            info.hasDeliveryInfo = true;
        }

        return info;
    }

    /**
     * Extract all quantities mentioned
     */
    extractQuantities(message) {
        const quantities = [];
        
        // Numeric quantities
        const numericMatches = message.matchAll(/(\d+)\s+(?:unités?|pièces?|articles?)?/gi);
        for (const match of numericMatches) {
            const qty = parseInt(match[1]);
            if (qty >= MESSAGE_ANALYZER_CONFIG.MIN_QUANTITY && qty <= MESSAGE_ANALYZER_CONFIG.MAX_QUANTITY) {
                quantities.push({ value: qty, type: 'numeric', raw: match[0] });
            }
        }
        
        // French word quantities
        for (const [word, num] of Object.entries(FRENCH_NUMBERS)) {
            if (message.includes(word)) {
                quantities.push({ value: num, type: 'word', raw: word });
            }
        }
        
        return quantities;
    }

    /**
     * Check if human intervention is needed based on analysis
     */
    checkNeedsHuman(intent, productAnalysis) {
        const reasons = [];
        
        // Human request
        if (intent.primary === 'human_request') {
            reasons.push('Demande explicite de parler à un humain');
        }
        
        // Complaint
        if (intent.primary === 'complaint') {
            reasons.push('Réclamation ou plainte détectée');
        }
        
        // Out of stock for order
        if (intent.primary === 'order' && productAnalysis.stockIssues.some(i => i.issue === 'out_of_stock')) {
            reasons.push('Produit en rupture de stock');
        }
        
        // Insufficient stock
        if (productAnalysis.stockIssues.some(i => i.issue === 'insufficient_stock')) {
            reasons.push('Stock insuffisant pour la quantité demandée');
        }
        
        return {
            needed: reasons.length > 0,
            reasons
        };
    }

    /**
     * Build a context string for the AI from analysis
     */
    buildContextString(analysis) {
        const parts = [];
        
        // Intent
        parts.push(`🎯 INTENTION DÉTECTÉE: ${analysis.intent.primary.toUpperCase()} (confiance: ${analysis.intent.confidence})`);
        
        // Products
        if (analysis.products.matchedProducts.length > 0) {
            parts.push('\n📦 PRODUITS MENTIONNÉS:');
            for (const p of analysis.products.matchedProducts) {
                const stockEmoji = p.stockStatus === 'available' ? '✅' : 
                                  p.stockStatus === 'low' ? '⚠️' : '⛔';
                parts.push(`  - ${p.name}: ${p.price} FCFA | Stock: ${p.stock} ${stockEmoji} | Qté demandée: ${p.requestedQuantity}`);
            }
        }
        
        // Stock issues
        if (analysis.products.stockIssues.length > 0) {
            parts.push('\n⚠️ ALERTES STOCK:');
            for (const issue of analysis.products.stockIssues) {
                parts.push(`  - ${issue.message}`);
            }
        }
        
        // Customer history
        if (analysis.customerHistory) {
            const h = analysis.customerHistory;
            if (h.isRepeatCustomer) {
                parts.push(`\n👤 CLIENT FIDÈLE: ${h.validatedOrders} commande(s) passée(s), ${h.totalSpent} FCFA dépensés`);
            } else if (h.isNewCustomer) {
                parts.push('\n👤 NOUVEAU CLIENT: Première interaction');
            }
        }
        
        // Delivery info
        if (analysis.deliveryInfo.hasDeliveryInfo) {
            parts.push('\n📍 INFOS LIVRAISON DÉTECTÉES:');
            if (analysis.deliveryInfo.city) parts.push(`  - Ville: ${analysis.deliveryInfo.city}`);
            if (analysis.deliveryInfo.neighborhood) parts.push(`  - Quartier: ${analysis.deliveryInfo.neighborhood}`);
            if (analysis.deliveryInfo.phone) parts.push(`  - Téléphone: ${analysis.deliveryInfo.phone}`);
        }
        
        // Human intervention
        if (analysis.needsHuman.needed) {
            parts.push('\n🚨 INTERVENTION HUMAINE RECOMMANDÉE:');
            for (const reason of analysis.needsHuman.reasons) {
                parts.push(`  - ${reason}`);
            }
        }
        
        return parts.join('\n');
    }

    /**
     * Helper to return empty analysis result (for short/invalid messages)
     * @private
     */
    _getEmptyAnalysisResult(language = 'unknown', ignore = true) {
        return {
            intent: { primary: 'unknown', scores: {}, matchedKeywords: {} },
            products: { matchedProducts: [], stockIssues: [], hasStockProblems: false, totalProducts: 0, totalRequestedItems: 0 },
            customerHistory: null,
            deliveryInfo: { hasDeliveryInfo: false, city: null, neighborhood: null, phone: null },
            quantities: [],
            isLikelyOrder: false,
            needsHuman: { needed: false, reasons: [] },
            ignore,
            escalate: false,
            risk_level: 'low',
            language,
            intent_hint: 'unknown',
            timestamp: Date.now()
        };
    }

    _getBaseEmptyAnalysisResult(language = 'unknown', ignore = true) {
        return {
            intent: { primary: 'unknown', secondary: null, scores: {}, confidence: 'low', matchedKeywords: [] },
            needsHuman: { needed: false, reasons: [] },
            ignore,
            escalate: false,
            risk_level: 'low',
            language,
            intent_hint: 'unknown',
            timestamp: Date.now()
        };
    }
}

export const messageAnalyzer = new MessageAnalyzer();
export { MessageAnalyzer }; // Export class for testing
export default messageAnalyzer;
