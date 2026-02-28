/**
 * Order Detector Service
 * Analyzes conversations to detect purchase intent and create pending orders
 * 
 * IMPROVED: Better quantity detection that doesn't confuse model numbers with quantities
 */

import db from '../database/init.js';
import { debugIngest } from '../utils/debugIngest.js';
import { orderService } from './orders.js';
import { workflowExecutor } from './workflowExecutor.js';
import { messageAnalyzer } from './messageAnalyzer.js';

// Keywords that indicate purchase intent (ORDER or DELIVERY confirmation)
const PURCHASE_KEYWORDS = [
    // Intention d'achat directe (IMPORTANT: "je veux" seul est une intention!)
    'je veux', 'je voudrais', 'je souhaite',
    'je veux commander', 'je voudrais commander', 'je commande',
    'j\'achète', 'je prends', 'j\'en veux', 'je veux acheter',
    'commander', 'passer commande', 'je confirme la commande',
    'ok pour la commande', 'c\'est bon pour la commande', 'je valide',
    // Demande de livraison (confirmation forte)
    'livrez-moi', 'livrer', 'me livrer', 'livraison',
    'envoyez-moi', 'envoie-moi', 'envoyez', 'envoyer',
    'je prend', 'je le prends', 'je la prends', 'je les prends',
    // Quantités explicites
    'donnez-moi', 'donne-moi', 'je prendrai',
    // English
    'i want', 'i\'d like', 'i want to buy', 'i\'ll take', 'deliver', 'send me', 'give me'
];

// Explicit confirmation keywords (strong signal to create order)
const EXPLICIT_CONFIRMATION_KEYWORDS = [
    'je confirme', 'je valide', 'ok pour la commande', 'c\'est bon', 'd\'accord',
    'je passe commande', 'passer commande', 'je commande', 'je veux commander',
    'j\'achète', 'je prends', 'je le prends', 'je la prends', 'je les prends',
    'livrez-moi', 'me livrer', 'livraison', 'envoyez-moi', 'envoie-moi',
    // Short confirmations after AI proposal (e.g. "Confirmez-vous ?" → "Oui oui" / "Okay")
    'oui oui', 'oui c\'est bon', 'okay', 'parfait', 'c\'est parti'
];

// Keywords that indicate REFUSAL (should block order detection)
const REFUSAL_KEYWORDS = [
    'non', 'pas', 'attends', 'attend', 'attendez',
    'plus tard', 'pas maintenant', 'pas encore', 'pas tout de suite',
    'je refuse', 'je ne veux pas', 'je ne souhaite pas',
    'annule', 'annuler', 'pas intéressé', 'pas interessé',
    // English
    'no', 'not', 'wait', 'later', 'not now', 'cancel'
];

// Keywords that indicate QUESTION/INQUIRY (should block order detection)
const QUESTION_KEYWORDS = [
    'quel', 'quelle', 'quels', 'quelles', 'combien', 'comment',
    'pourquoi', 'quoi', 'où', 'c\'est quoi', 'qu\'est-ce',
    'connaître', 'savoir', 'demander', 'informer', 'renseigner',
    'détails', 'détail', 'information', 'info', 'specs', 'spécifications',
    'caractéristiques', 'description', 'disponible', 'dispo',
    // Question markers
    '?',
    // English
    'what', 'which', 'how', 'why', 'where', 'when',
    'know', 'ask', 'tell me', 'details', 'specs', 'info'
];

// French number words to digits mapping
const FRENCH_NUMBERS = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
    'onze': 11, 'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15,
    'seize': 16, 'vingt': 20, 'trente': 30, 'quarante': 40, 'cinquante': 50
};

// Patterns to extract EXPLICIT quantities (before product name)
// These patterns ensure we capture "2 montre" not "montre K20"
const QUANTITY_PATTERNS = [
    /(?:je\s+(?:veux|prends|voudrais|commande|souhaite))\s+(\d+)\s+/i,  // "je veux 2 ..."
    /(\d+)\s*x\s+/i,                                            // "2 x ..."
    /(\d+)\s+(?:unités?|pièces?|articles?)\s+(?:de\s+)?/i,     // "2 unités de ..."
    /^(\d+)\s+(?![\d])/i,                                       // "2 montre" at start (not "15" from model)
    /\s(\d+)\s+(?=[a-zA-ZÀ-ÿ])/i                               // " 2 montre" (number followed by word)
];

// Patterns for French number words
const FRENCH_QUANTITY_PATTERNS = [
    /(?:je\s+(?:veux|prends|voudrais|commande|souhaite))\s+(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente)\s+/i,
    /\s(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(?=[a-zA-ZÀ-ÿ])/i
];

class OrderDetector {
    /**
     * Extract quantity from message, being careful not to match model numbers
     * Handles both numeric (2, 3) and French words (deux, trois)
     * @param {string} message - The message to analyze
     * @param {string} productName - The product name to check against
     * @returns {number} - Detected quantity (default 1)
     */
    extractQuantity(message, productName) {
        const lowerMessage = message.toLowerCase();
        const lowerProductName = productName.toLowerCase();
        
        const productWords = lowerProductName.split(/\s+/).filter(w => w.length > 2);
        const searchWord = productWords.length > 0 ? productWords[0] : lowerProductName;
        
        let productIndex = lowerMessage.lastIndexOf(searchWord);
        if (productIndex === -1) {
            // Check for numeric quantity patterns as fallback
            const match = lowerMessage.match(/(?:je\s+(?:veux|prends|voudrais|commande|souhaite))\s+(\d+)/i);
            if (match && match[1]) return Math.min(Math.max(parseInt(match[1]), 1), 100);
            return 1;
        }

        // Check text AFTER the product first (e.g., "Savon x 3", "Savon (3)")
        const textAfter = lowerMessage.substring(productIndex + searchWord.length, Math.min(lowerMessage.length, productIndex + searchWord.length + 20));
        const afterMatch = textAfter.match(/^[\sx:\-()]*(\d+)\b/i);
        if (afterMatch && afterMatch[1]) {
            const qty = parseInt(afterMatch[1]);
            if (qty >= 1 && qty <= 100 && !lowerProductName.includes(afterMatch[1])) {
                return qty;
            }
        }

        // Check text BEFORE the product
        const textBefore = lowerMessage.substring(Math.max(0, productIndex - 60), productIndex).trim();
        const tokens = textBefore.split(/[\s,.'"]+/);
        let lastQty = null;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (/^\d+$/.test(token)) {
                if (!lowerProductName.includes(token)) {
                    lastQty = parseInt(token);
                }
            } else if (FRENCH_NUMBERS[token]) {
                lastQty = FRENCH_NUMBERS[token];
            }
        }
        
        if (lastQty !== null && lastQty >= 1 && lastQty <= 100) {
            return lastQty;
        }

        return 1;
    }

    /**
     * Check if product name matches in message
     * More intelligent matching that handles partial matches
     */
    matchProduct(message, product) {
        const lowerMessage = message.toLowerCase();
        const productNameLower = product.name.toLowerCase();
        
        // Exact match
        if (lowerMessage.includes(productNameLower)) {
            return { matched: true, score: 10 };
        }
        
        // Singular/Plural handling (Pluralized in text or singular in DB/text)
        if (lowerMessage.includes(productNameLower + 's') || lowerMessage.includes(productNameLower.replace(/s$/, ''))) {
             return { matched: true, score: 9 };
        }

        // Word-based matching
        const stopwords = ['pour', 'avec', 'les', 'des', 'une', 'aux', 'sur'];
        const productWords = productNameLower.split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));
        
        // Helper to check if a single word is inside the message
        const wordInMessage = (word) => {
            if (lowerMessage.includes(word)) return true;
            if (!word.endsWith('s') && lowerMessage.includes(word + 's')) return true; // match plural
            if (word.endsWith('s') && lowerMessage.includes(word.slice(0, -1))) return true; // match singular
            return false;
        };

        const matchedWords = productWords.filter(wordInMessage);
        
        // Dynamic formula: at least half of the significant words must match
        const requiredWords = Math.max(1, Math.ceil(productWords.length / 2));
        
        if (matchedWords.length >= requiredWords) {
            return { matched: true, score: matchedWords.length };
        }
        
        // Check SKU if available
        if (product.sku && lowerMessage.includes(product.sku.toLowerCase())) {
            return { matched: true, score: 8 };
        }
        
        return { matched: false, score: 0 };
    }

    /**
     * Check if message contains delivery information
     * @private
     */
    _hasDeliveryInfo(lowerMessage) {
        const deliveryIndicators = [
            /\b\d{10}\b/,  // Phone number (10 digits)
            /\b\d{8}\b/,   // Phone number (8 digits)
            /quartier/i,
            /ville/i,
            /commune/i,
            /adresse/i,
            /livraison/i
        ];
        
        return deliveryIndicators.some(pattern => pattern.test(lowerMessage));
    }

    /**
     * Analyze a message to detect purchase intent
     * @param {string} message - User message
     * @param {string} userId - User ID
     * @param {Object} conversation - Conversation object
     * @returns {Object|null} - Detected order or null
     */
    async analyzeMessage(message, userId, conversation) {
        const lowerMessage = message.toLowerCase();
        const trimmedMessage = lowerMessage.trim();

        // #region agent log
        debugIngest({
            location: 'orderDetector.js:analyzeMessage',
            message: 'entry',
            data: { messageSnippet: message.substring(0, 80), conversationId: conversation?.id },
            timestamp: Date.now(),
            hypothesisId: 'H1'
        });
        // #endregion

        // FIRST: Check for REFUSAL - if customer says "no", don't detect order
        const isRefusal = REFUSAL_KEYWORDS.some(keyword => {
            const keywordLower = keyword.toLowerCase();
            // Check if refusal is at start of message (strongest signal)
            if (trimmedMessage.startsWith(keywordLower)) return true;
            // Or check if it's a standalone word
            const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');
            return regex.test(lowerMessage);
        });

        if (isRefusal) {
            console.log(`[OrderDetector] Refusal detected in message: "${message.substring(0, 50)}..."`);
            return null; // Customer is refusing, don't create order
        }

        // SECOND: Check for QUESTION - if customer is asking, not buying
        const isQuestion = QUESTION_KEYWORDS.some(keyword => {
            const keywordLower = keyword.toLowerCase();
            return lowerMessage.includes(keywordLower);
        });

        if (isQuestion) {
            console.log(`[OrderDetector] Question detected in message: "${message.substring(0, 50)}..."`);
            return null; // Customer is asking questions, not confirming order
        }

        // Check if message contains purchase intent
        const hasPurchaseIntent = PURCHASE_KEYWORDS.some(keyword => 
            lowerMessage.includes(keyword.toLowerCase())
        );

        // Explicit confirmation (stronger than intent)
        const hasExplicitConfirmation = EXPLICIT_CONFIRMATION_KEYWORDS.some(keyword =>
            lowerMessage.includes(keyword.toLowerCase())
        );

        // NOUVEAU: Aussi accepter si le message contient des infos de livraison
        const hasDeliveryInfo = this._hasDeliveryInfo(lowerMessage);

        // Si ni purchase intent ni delivery info, abandonner
        // #region agent log
        debugIngest({
            location: 'orderDetector.js:analyzeMessage',
            message: 'intent flags',
            data: { hasPurchaseIntent, hasExplicitConfirmation, hasDeliveryInfo },
            timestamp: Date.now(),
            hypothesisId: 'H2'
        });
        // #endregion
        if (!hasPurchaseIntent && !hasExplicitConfirmation && !hasDeliveryInfo) {
            return null;
        }

        // If message has delivery info, update any pending order so validation recap includes lieu/phone
        if (hasDeliveryInfo) {
            const deliveryInfo = messageAnalyzer.extractDeliveryInfo(message);
            if (deliveryInfo?.hasDeliveryInfo) {
                const pending = await db.get(`
                    SELECT id, notes FROM orders WHERE conversation_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1
                `, conversation.id);
                if (pending) {
                    const parts = [];
                    if (deliveryInfo.city) parts.push(`ville:${deliveryInfo.city}`);
                    if (deliveryInfo.neighborhood) parts.push(`quartier:${deliveryInfo.neighborhood}`);
                    if (deliveryInfo.phone) parts.push(`tel:${deliveryInfo.phone}`);
                    if (parts.length > 0) {
                        const livraisonBlock = `[LIVRAISON]${parts.join('|')}`;
                        const notesRaw = pending.notes || '';
                        const newNotes = notesRaw.includes('[LIVRAISON]')
                            ? notesRaw.replace(/\[LIVRAISON\][^\n]*/, livraisonBlock)
                            : `${notesRaw}\n${livraisonBlock}`.trim();
                        await db.run('UPDATE orders SET notes = ? WHERE id = ?', newNotes, pending.id);
                        console.log(`[OrderDetector] Updated pending order ${pending.id} with delivery info`);
                    }
                }
            }
        }

        // Require explicit confirmation or delivery info to create an order
        if (!hasExplicitConfirmation && !hasDeliveryInfo) {
            console.log('[OrderDetector] Purchase intent detected but missing explicit confirmation/delivery info');
            return null;
        }


        // Get user's products
        const products = await db.all(`
            SELECT id, name, sku, price, stock, category 
            FROM products 
            WHERE user_id = ? AND is_active = 1
        `, userId);
        const productList = Array.isArray(products) ? products : [];

        if (productList.length === 0) {
            return null; // No products to match
        }

        const recentMessages = await db.all(`
            SELECT content, role FROM messages 
            WHERE conversation_id = ? 
            ORDER BY created_at DESC LIMIT 10
        `, conversation.id);
        const recentList = Array.isArray(recentMessages) ? recentMessages : [];
        const conversationContext = recentList.map(m => m.content).join(' ').toLowerCase();

        const detectedItems = [];

        for (const product of productList) {
            const matchResult = this.matchProduct(message, product);
            
            // Also check if product was mentioned in recent conversation context
            const contextMatch = this.matchProduct(conversationContext, product);
            
            // #region agent log
            if (productList.indexOf(product) === 0) {
                debugIngest({
                    location: 'orderDetector.js:productLoop',
                    message: 'first product match',
                    data: {
                        productName: product.name,
                        matchResult: matchResult.matched,
                        contextMatch: contextMatch.matched
                    },
                    timestamp: Date.now(),
                    hypothesisId: 'H3'
                });
            }
            // #endregion
            
            // Product in current message → add with quantity from message
            if (matchResult.matched) {
                const quantity = this.extractQuantity(message, product.name);
                detectedItems.push({
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    quantity: quantity,
                    unitPrice: product.price,
                    availableStock: product.stock
                });
            } else if ((hasPurchaseIntent || hasExplicitConfirmation || hasDeliveryInfo) && contextMatch.matched) {
                // No product in current message but intent/delivery info + product in recent context (e.g. "Bingerville, Santai 0758519080" after discussing t-shirt) → add from context
                const quantity = this.extractQuantity(conversationContext, product.name);
                detectedItems.push({
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    quantity: quantity,
                    unitPrice: product.price,
                    availableStock: product.stock
                });
            }
        }

        if (detectedItems.length === 0) {
            // #region agent log
            debugIngest({
                location: 'orderDetector.js:analyzeMessage',
                message: 'return null no items',
                data: { reason: 'no product in current message', conversationContextSnippet: conversationContext.substring(0, 120) },
                timestamp: Date.now(),
                hypothesisId: 'H4'
            });
            // #endregion
            return null; // No products matched
        }

        const existingOrder = await db.get(`
            SELECT id, notes FROM orders 
            WHERE conversation_id = ? AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        `, conversation.id);

        if (existingOrder) {
            // If this message contains delivery info, update the pending order notes so validation includes lieu/phone
            const deliveryInfo = messageAnalyzer.extractDeliveryInfo(message);
            if (deliveryInfo?.hasDeliveryInfo) {
                const parts = [];
                if (deliveryInfo.city) parts.push(`ville:${deliveryInfo.city}`);
                if (deliveryInfo.neighborhood) parts.push(`quartier:${deliveryInfo.neighborhood}`);
                if (deliveryInfo.phone) parts.push(`tel:${deliveryInfo.phone}`);
                if (parts.length > 0) {
                    const livraisonBlock = `[LIVRAISON]${parts.join('|')}`;
                    const notesRaw = existingOrder.notes || '';
                    const hasLivraison = notesRaw.includes('[LIVRAISON]');
                    const newNotes = hasLivraison
                        ? notesRaw.replace(/\[LIVRAISON\][^\n]*/, livraisonBlock)
                        : `${notesRaw}\n${livraisonBlock}`.trim();
                    await db.run('UPDATE orders SET notes = ? WHERE id = ?', newNotes, existingOrder.id);
                    console.log(`[OrderDetector] Updated pending order ${existingOrder.id} with delivery info: ${livraisonBlock}`);
                }
            }
            // Add new items to existing pending order (commande combinée) instead of creating a duplicate
            const existingItemCount = (await db.all('SELECT id FROM order_items WHERE order_id = ?', existingOrder.id)).length;
            const updated = await orderService.addItemsToOrder(existingOrder.id, userId, detectedItems);
            if (updated && updated.items && updated.items.length > existingItemCount) {
                console.log(`[OrderDetector] Added items to pending order ${existingOrder.id} (combined order)`);
            } else {
                console.log(`[OrderDetector] Pending order already exists for conversation ${conversation.id}`);
            }
            return updated || null;
        }

        // Get customer info from conversation
        const customerName = conversation.saved_contact_name || 
                           conversation.contact_name || 
                           conversation.push_name || 
                           conversation.notify_name || 
                           conversation.contact_number || 
                           'Client WhatsApp';

        const customerPhone = conversation.contact_number || null;

        // Extract delivery info from message for livreur notification
        const deliveryInfo = messageAnalyzer.extractDeliveryInfo(message);
        let notes = `Commande détectée automatiquement depuis WhatsApp\nMessage: "${message.substring(0, 200)}..."`;
        if (deliveryInfo?.hasDeliveryInfo) {
            const parts = [];
            if (deliveryInfo.city) parts.push(`ville:${deliveryInfo.city}`);
            if (deliveryInfo.neighborhood) parts.push(`quartier:${deliveryInfo.neighborhood}`);
            if (deliveryInfo.phone) parts.push(`tel:${deliveryInfo.phone}`);
            if (parts.length > 0) notes += `\n[LIVRAISON]${parts.join('|')}`;
        }

        // Create the order
        console.log(`[OrderDetector] Detected purchase intent: ${detectedItems.length} items from ${customerName}`);

        const order = await orderService.createOrder(userId, {
            conversationId: conversation.id,
            customerName,
            customerPhone,
            items: detectedItems,
            notes,
            currency: 'XOF'
        });
        // #region agent log
        debugIngest({
            location: 'orderDetector.js:createOrder',
            message: 'order created',
            data: { orderId: order?.id, itemsCount: detectedItems.length },
            timestamp: Date.now(),
            hypothesisId: 'H5'
        });
        // #endregion

        // Trigger workflow: order_created
        if (order) {
            workflowExecutor.executeMatchingWorkflowsSafe('order_created', {
                orderId: order.id,
                conversationId: conversation.id,
                agentId: conversation.agent_id,
                userId,
                contactJid: conversation.contact_jid,
                contactName: customerName,
                contactNumber: customerPhone,
                items: detectedItems,
                totalAmount: detectedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
            }, conversation.agent_id, userId).then((result) => {
                if (!result?.executed) {
                    console.warn(`[OrderDetector] No workflow matched for order_created (user ${userId})`);
                }
            });
        }

        return order;
    }

    /**
     * Check if a message looks like order confirmation
     */
    isOrderConfirmation(message) {
        const confirmPatterns = [
            /^(oui|yes|ok|d'accord|je confirme|c'est bon|parfait|super)/i,
            /je (confirme|valide|prends|veux)/i,
            /^(ok|oui)\s*(pour|je)/i
        ];

        return confirmPatterns.some(pattern => pattern.test(message.trim()));
    }
}

export const orderDetector = new OrderDetector();
export default orderDetector;
