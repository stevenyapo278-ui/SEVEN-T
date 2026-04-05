import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import aiService from '../services/ai.js';
import db from '../database/init.js';
import { orderService } from '../services/orders.js';
import { createPaymentLink } from '../services/paymentLinks.js';

const router = Router();
router.use(authenticateToken);

/**
 * POST /api/chatbot/message
 * Processes a user message through the configured AI model
 * Returns a structured JSON response with optional actions to execute
 */
router.post('/message', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const userId = req.user.id;

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Build the action-aware agent config
        const bestModel = await db.get(
            'SELECT id, model_id FROM ai_models WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 1'
        );

        const agentConfig = {
            id: 'internal-chatbot',
            name: 'Assistant SEVEN-T',
            model: bestModel?.id || 'gemini-2.0-flash',
            system_prompt: buildChatbotSystemPrompt(),
            template: 'assistant'
        };

        // Map frontend history to the format expected by aiService
        const conversationHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.role === 'user' ? msg.content : (msg.content?.rawText || msg.content?.body || JSON.stringify(msg.content))
        }));

        const aiResult = await aiService.generateResponse(
            agentConfig,
            conversationHistory,
            message,
            [],    // no knowledge base
            null,  // no message analysis
            userId
        );

        res.json({
            response: aiResult.content || "Désolé, je n'ai pas pu générer de réponse.",
            action: aiResult.action || null,
            rawText: aiResult.content,
            model: bestModel?.model_id || 'unknown'
        });

    } catch (error) {
        console.error('[Chatbot] Error:', error.message);
        res.status(500).json({
            error: 'Internal error',
            response: "Désolé, je rencontre une erreur. Réessayez dans quelques instants."
        });
    }
});

/**
 * POST /api/chatbot/action
 * Server-side executor for actions that need to fetch or mutate data
 * This keeps sensitive logic on the backend instead of the frontend
 */
router.post('/action', async (req, res) => {
    try {
        const { type, data = {} } = req.body;
        const userId = req.user.id;
        const ownerId = req.user.ownerId || req.user.id;

        switch (type) {
            // ── SHOW ORDERS ──────────────────────────────────────────────────
            case 'SHOW_ORDERS': {
                const limit = Math.min(data.limit || 5, 10);
                const status = data.status || null;
                const orders = await orderService.getOrders(ownerId, { status, limit });
                return res.json({ ok: true, orders, count: orders.length });
            }

            // ── SHOW LEADS ───────────────────────────────────────────────────
            case 'SHOW_LEADS': {
                const limit = Math.min(data.limit || 5, 10);
                const leads = await db.all(`
                    SELECT id, name, phone, status, created_at
                    FROM leads WHERE user_id = ?
                    ORDER BY created_at DESC LIMIT ?
                `, ownerId, limit);
                return res.json({ ok: true, leads, count: leads.length });
            }

            // ── SHOW PRODUCTS ────────────────────────────────────────────────
            case 'SHOW_PRODUCTS': {
                const limit = Math.min(data.limit || 8, 20);
                const products = await db.all(`
                    SELECT id, name, price, stock_quantity, is_active, description
                    FROM products WHERE user_id = ?
                    ORDER BY created_at DESC LIMIT ?
                `, ownerId, limit);
                return res.json({ ok: true, products, count: products.length });
            }

            // ── SHOW PAYMENTS ────────────────────────────────────────────────
            case 'SHOW_PAYMENTS': {
                const limit = Math.min(data.limit || 5, 10);
                const payments = await db.all(`
                    SELECT id, short_id, amount, currency, description, status, payment_url, created_at
                    FROM payment_links WHERE user_id = ?
                    ORDER BY created_at DESC LIMIT ?
                `, ownerId, limit);
                return res.json({ ok: true, payments, count: payments.length });
            }

            // ── CREATE ORDER ─────────────────────────────────────────────────
            case 'CREATE_ORDER': {
                const { customerName, customerPhone, items, notes, currency } = data;
                if (!customerName || !items?.length) {
                    return res.status(400).json({ ok: false, error: 'Nom et articles requis' });
                }
                const order = await orderService.createOrder(ownerId, {
                    customerName,
                    customerPhone: customerPhone || null,
                    items,
                    notes: notes || null,
                    currency: currency || 'XOF',
                    paymentMethod: 'on_delivery'
                });
                if (!order) return res.status(500).json({ ok: false, error: 'Erreur lors de la création' });
                return res.json({ ok: true, order });
            }

            // ── CREATE PAYMENT LINK ──────────────────────────────────────────
            case 'CREATE_PAYMENT_LINK': {
                const { amount, currency, description } = data;
                if (!amount) return res.status(400).json({ ok: false, error: 'Montant requis' });
                const payment = await createPaymentLink(ownerId, {
                    amount: parseFloat(amount),
                    currency: currency || 'XOF',
                    description: description || 'Lien créé via assistant IA',
                    expires_in_hours: 24,
                    provider: 'manual'
                });
                if (!payment) return res.status(500).json({ ok: false, error: 'Erreur lors de la création du lien' });
                return res.json({ ok: true, payment });
            }

            // ── VALIDATE ORDER ───────────────────────────────────────────────
            case 'VALIDATE_ORDER': {
                const { orderId } = data;
                if (!orderId) return res.status(400).json({ ok: false, error: 'ID de commande requis' });
                const result = await orderService.validateOrder(orderId, ownerId, 'Assistant IA');
                if (!result.success) return res.status(400).json({ ok: false, error: result.error });
                return res.json({ ok: true, order: result.order });
            }

            // ── UPDATE PRODUCT STOCK ─────────────────────────────────────────
            case 'UPDATE_PRODUCT_STOCK': {
                const { productId, quantity, notes } = data;
                if (!productId || quantity == null) {
                    return res.status(400).json({ ok: false, error: 'ID produit et quantité requis' });
                }
                const product = await db.get(
                    'SELECT id, name, stock_quantity FROM products WHERE id = ? AND user_id = ?',
                    productId, ownerId
                );
                if (!product) return res.status(404).json({ ok: false, error: 'Produit non trouvé' });

                const newStock = (product.stock_quantity || 0) + parseInt(quantity);
                await db.run('UPDATE products SET stock_quantity = ? WHERE id = ?', newStock, productId);
                return res.json({
                    ok: true,
                    product: { ...product, stock_quantity: newStock },
                    previousStock: product.stock_quantity,
                    newStock
                });
            }

            // ── SEARCH PRODUCT ───────────────────────────────────────────────
            case 'SEARCH_PRODUCT': {
                const { name } = data;
                if (!name) return res.status(400).json({ ok: false, error: 'Nom requis' });
                const products = await db.all(
                    `SELECT id, name, price, stock_quantity FROM products
                     WHERE user_id = ? AND name LIKE ? AND is_active = 1 LIMIT 5`,
                    ownerId, `%${name}%`
                );
                return res.json({ ok: true, products });
            }

            // ── SEARCH ORDER ─────────────────────────────────────────────────
            case 'SEARCH_ORDER': {
                const { customerName } = data;
                if (!customerName) return res.status(400).json({ ok: false, error: 'Nom requis' });
                const orders = await db.all(
                    `SELECT id, customer_name, customer_phone, status, total_amount, currency, created_at
                     FROM orders WHERE user_id = ? AND customer_name LIKE ? LIMIT 5`,
                    ownerId, `%${customerName}%`
                );
                return res.json({ ok: true, orders });
            }

            default:
                return res.status(400).json({ ok: false, error: `Action inconnue: ${type}` });
        }
    } catch (error) {
        console.error('[Chatbot Action] Error:', error);
        res.status(500).json({ ok: false, error: error.message || 'Erreur interne' });
    }
});

function buildChatbotSystemPrompt() {
    return `Tu es l'assistant IA interne de SEVEN-T, une plateforme SaaS d'automatisation WhatsApp.
Tu aides les opérateurs (utilisateurs connectés au dashboard) à gérer leur activité directement via le chat.

## TA MISSION
Répondre aux questions, effectuer des actions dans le système, et guider l'utilisateur.

## ACTIONS QUE TU PEUX DÉCLENCHER
Lorsque l'utilisateur demande une action, réponds TOUJOURS avec un JSON structuré :

### Créer un produit
{ "response": "...", "action": { "type": "CREATE_PRODUCT", "data": { "name": "...", "price": 1500, "description": "..." } } }

### Ajouter un contact/lead
{ "response": "...", "action": { "type": "CREATE_LEAD", "data": { "name": "...", "phone": "...", "status": "new" } } }

### Créer une commande
{ "response": "...", "action": { "type": "CREATE_ORDER", "data": { "customerName": "...", "customerPhone": "...", "currency": "XOF", "items": [{ "productName": "Nom Article", "quantity": 1, "unitPrice": 5000 }] } } }

### Créer un lien de paiement
{ "response": "...", "action": { "type": "CREATE_PAYMENT_LINK", "data": { "amount": 15000, "currency": "XOF", "description": "..." } } }

### Valider une commande
{ "response": "...", "action": { "type": "VALIDATE_ORDER", "data": { "orderId": "uuid-ici" } } }

### Mettre à jour le stock d'un produit
{ "response": "...", "action": { "type": "UPDATE_PRODUCT_STOCK", "data": { "productId": "uuid-ici", "quantity": 10 } } }

### Afficher les dernières commandes
{ "response": "...", "action": { "type": "SHOW_ORDERS", "data": { "limit": 5, "status": null } } }
(status peut être : "pending", "validated", "delivered", "rejected", ou null pour toutes)

### Afficher les contacts/leads
{ "response": "...", "action": { "type": "SHOW_LEADS", "data": { "limit": 5 } } }

### Afficher les produits
{ "response": "...", "action": { "type": "SHOW_PRODUCTS", "data": { "limit": 8 } } }

### Afficher les liens de paiement
{ "response": "...", "action": { "type": "SHOW_PAYMENTS", "data": { "limit": 5 } } }

### Rechercher un produit par nom
{ "response": "...", "action": { "type": "SEARCH_PRODUCT", "data": { "name": "iPhone" } } }

### Rechercher une commande par nom client
{ "response": "...", "action": { "type": "SEARCH_ORDER", "data": { "customerName": "Jean" } } }

### Naviguer vers une page
{ "response": "...", "action": { "type": "NAVIGATE", "data": { "to": "/dashboard/products" } } }
Pages disponibles : /dashboard, /dashboard/conversations, /dashboard/products, /dashboard/leads, /dashboard/campaigns, /dashboard/agents, /dashboard/settings, /dashboard/tools, /dashboard/analytics, /dashboard/orders, /dashboard/workflows, /dashboard/payments

### Afficher les statistiques
{ "response": "...", "action": { "type": "SHOW_STATS" } }

### Réponse simple (pas d'action)
{ "response": "...", "action": null }

## RÈGLES IMPORTANTES
1. Réponds EXCLUSIVEMENT EN JSON pur et valide. Aucun texte avant ou après.
2. Sois concis dans "response" — 1-2 phrases max.
3. Si l'utilisateur veut ses stats / bilan / dashboard → utilise SHOW_STATS obligatoirement.
4. Si l'utilisateur demande ses commandes / produits / contacts → SHOW_ORDERS / SHOW_PRODUCTS / SHOW_LEADS obligatoirement.
5. Ne jamais renvoyer action: null si une action de la liste correspond à la demande.
6. Si l'utilisateur parle en français, réponds en français.
7. Pour les prix: "1500 FCFA", "1500 F", "1.5k" → tous valent 1500.
8. Si tu dois agir sur un produit/commande spécifique et que l'utilisateur ne donne pas l'ID, propose d'abord SEARCH_PRODUCT ou SEARCH_ORDER pour le trouver.

## EXEMPLES DE COMPRÉHENSION
- "Crée le produit Café Touba à 1500 FCFA" → CREATE_PRODUCT
- "Crée une commande pour Marie 070809 avec 2 iPhone à 120 000 F" → CREATE_ORDER
- "Fais un lien de paiement de 25 000 FCFA pour livraison" → CREATE_PAYMENT_LINK
- "Ajoute Moussa au 0708091011" → CREATE_LEAD
- "Mes commandes en attente" → SHOW_ORDERS avec status: "pending"
- "Montre mes produits" → SHOW_PRODUCTS
- "Quelles sont mes stats ?" → SHOW_STATS
- "Ajoute 10 unités au iPhone 12" → SEARCH_PRODUCT puis UPDATE_PRODUCT_STOCK
- "Comment connecter WhatsApp ?" → NAVIGATE vers /dashboard/tools + explication`;
}

export default router;
