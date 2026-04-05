import express from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, orderPaymentLinkSchema } from '../middleware/security.js';
import { orderService, ORDER_STATUSES } from '../services/orders.js';
import { createPaymentLink } from '../services/paymentLinks.js';
import * as paymentProviders from '../services/paymentProviders.js';
import { whatsappManager } from '../services/whatsapp.js';
import { hasFeature } from '../config/plans.js';

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
    try {
        const status = req.query.status || null;
        const limit = parseInt(req.query.limit) || 50;
        
        const orders = await orderService.getOrders(req.user.ownerId, { status, limit });
        res.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get order stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await orderService.getStats(req.user.ownerId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get detailed analytics
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query; // 7d, 30d, 90d, all
        const analytics = await orderService.getAnalytics(req.user.ownerId, period);
        res.json(analytics);
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get pending orders count
router.get('/pending-count', authenticateToken, async (req, res) => {
    try {
        const count = await orderService.getPendingCount(req.user.ownerId);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Export orders as CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const status = req.query.status || null;
        const limit = parseInt(req.query.limit) || 5000;
        const orders = await orderService.getOrders(req.user.ownerId, { status, limit });
        const headers = ['id', 'date', 'client', 'téléphone', 'statut', 'montant', 'devise', 'payé_le'];
        const escape = (v) => (v == null ? '' : String(v).replace(/"/g, '""'));
        const row = (o) => [
            escape(o.id),
            escape(o.created_at),
            escape(o.customer_name),
            escape(o.customer_phone),
            escape(o.status),
            escape(o.total_amount),
            escape(o.currency),
            escape(o.paid_at)
        ].map((c) => `"${c}"`).join(',');
        const csv = [headers.join(','), ...orders.map(row)].join('\n');
        const bom = '\uFEFF';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="commandes_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(bom + csv);
    } catch (error) {
        console.error('Export orders error:', error);
        res.status(500).json({ error: 'Erreur export' });
    }
});

// Get all product logs (must be before /:id to avoid "logs" matching as order id)
router.get('/logs/all', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await orderService.getAllProductLogs(req.user.ownerId, limit);
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get product logs for one product (must be before /:id)
router.get('/products/:productId/logs', authenticateToken, async (req, res) => {
    try {
        const logs = await orderService.getProductLogs(req.params.productId, req.user.ownerId);
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id, req.user.ownerId);
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.json({ order });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create order manually
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { customerName, customerPhone, items, notes, currency, paymentMethod } = req.body;
        
        if (!customerName || !items || items.length === 0) {
            return res.status(400).json({ error: 'Nom du client et articles requis' });
        }

        const order = await orderService.createOrder(req.user.ownerId, {
            customerName,
            customerPhone,
            items,
            notes,
            currency,
            paymentMethod: paymentMethod || 'on_delivery'
        });

        if (!order) {
            return res.status(500).json({ error: 'Erreur lors de la création' });
        }

        res.status(201).json({ order });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Validate order
router.post('/:id/validate', authenticateToken, async (req, res) => {
    try {
        const result = await orderService.validateOrder(req.params.id, req.user.ownerId, req.user.name);
        
        if (!result.success) {
            return res.status(400).json({ 
                error: result.error,
                stockIssues: result.stockIssues 
            });
        }

        // Auto-generation is now handled inside orderService.validateOrder
        // to ensure paymentUrl/paymentQr are available for workflows triggerData.

        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Validate order error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Update order payment method
router.patch('/:id/payment-method', authenticateToken, async (req, res) => {
    try {
        const { payment_method: paymentMethod } = req.body;
        const result = await orderService.updatePaymentMethod(req.params.id, req.user.ownerId, paymentMethod);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Update payment method error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Mark order as delivered (paiement à la livraison reçu)
router.post('/:id/mark-delivered', authenticateToken, async (req, res) => {
    try {
        const result = await orderService.markAsDelivered(req.params.id, req.user.ownerId);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Mark delivered error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Unmark order as delivered (back to validated)
router.post('/:id/unmark-delivered', authenticateToken, async (req, res) => {
    try {
        const result = await orderService.unmarkAsDelivered(req.params.id, req.user.ownerId);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Unmark delivered error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Revert order to pending (restores stock)
router.post('/:id/revert-to-pending', authenticateToken, async (req, res) => {
    try {
        const result = await orderService.revertToPending(req.params.id, req.user.ownerId);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Revert to pending error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Bulk validate orders
router.post('/bulk-validate', authenticateToken, async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'Liste d\'identifiants requise' });
        const results = await orderService.bulkValidateOrders(orderIds, req.user.ownerId, req.user.name);
        res.json(results);
    } catch (error) {
        console.error('Bulk validate error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Bulk mark as delivered
router.post('/bulk-mark-delivered', authenticateToken, async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'Liste d\'identifiants requise' });
        const results = await orderService.bulkMarkAsDelivered(orderIds, req.user.ownerId);
        res.json(results);
    } catch (error) {
        console.error('Bulk mark delivered error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Send payment link in WhatsApp conversation (checkout 100% in-app)
router.post('/:id/send-payment-link-in-conversation', authenticateToken, async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.ownerId);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment || userFlag;
        if (!paymentModuleEnabled) {
            return res.status(403).json({ error: 'Module paiement non inclus dans votre plan ou désactivé par l\'administrateur' });
        }
        const order = await orderService.getOrderById(req.params.id, req.user.ownerId);
        if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
        if (order.status === 'rejected' || order.status === 'cancelled') {
            return res.status(400).json({ error: 'Impossible d\'envoyer un lien pour cette commande' });
        }
        if (!order.conversation_id) {
            return res.status(400).json({ error: 'Cette commande n\'est pas liée à une conversation WhatsApp' });
        }

        const conversation = await db.get(`
            SELECT c.id, c.agent_id, a.tool_id FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, order.conversation_id, req.user.ownerId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }
        if (!conversation.tool_id) {
            return res.status(400).json({ error: 'L\'agent n\'a pas de connexion WhatsApp configurée' });
        }

        const itemsList = (order.items || [])
            .map(i => `${i.product_name || 'Article'} x${i.quantity || 1}`)
            .join(', ');
        const description = itemsList ? `Commande: ${itemsList}` : `Commande #${(order.id || '').slice(0, 8)}`;
        const useGeniusPay = paymentModuleEnabled && await paymentProviders.isProviderConfiguredForUser(req.user.ownerId, 'geniuspay');
        const provider = useGeniusPay ? 'geniuspay' : 'manual';
        const payment = await createPaymentLink(req.user.ownerId, {
            amount: order.total_amount,
            currency: order.currency || 'XOF',
            description,
            order_id: order.id,
            conversation_id: order.conversation_id,
            provider,
            expires_in_hours: 24
        });
        if (!payment) {
            return res.status(500).json({ error: 'Erreur lors de la création du lien de paiement' });
        }

        const customerName = order.customer_name || 'Client';
        const messageText = `Bonjour ${customerName},

Voici votre lien de paiement pour la commande :

📝 ${description}
💵 Montant total : *${Number(order.total_amount).toLocaleString()} ${order.currency || 'XOF'}*

🔗 Payer en ligne (lien sécurisé) :
${payment.payment_url}

⏰ Ce lien est valable 24h.`;

        await whatsappManager.sendMessageAndSave(conversation.tool_id, order.conversation_id, messageText);

        res.json({
            success: true,
            message: 'Lien de paiement envoyé dans la conversation WhatsApp',
            payment_url: payment.payment_url
        });
    } catch (error) {
        console.error('Send payment link in conversation error:', error);
        const msg = error.message || 'Erreur serveur';
        if (msg === 'WhatsApp non connecté' || msg.includes('non connecté')) {
            return res.status(400).json({ error: 'Connectez l\'agent WhatsApp (scan du QR code) pour envoyer le lien dans la conversation.' });
        }
        if (msg === 'Contact JID invalide' || msg === 'Conversation non trouvée') {
            return res.status(400).json({ error: msg });
        }
        res.status(500).json({ error: msg });
    }
});

// Reject order
router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await orderService.rejectOrder(req.params.id, req.user.ownerId, reason);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, order: result.order });
    } catch (error) {
        console.error('Reject order error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create payment link from order (for sending to client - e.g. WhatsApp)
router.post('/:id/payment-link', authenticateToken, validate(orderPaymentLinkSchema), async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.ownerId);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment || userFlag;
        if (!paymentModuleEnabled) {
            return res.status(403).json({ error: 'Module paiement non inclus dans votre plan ou désactivé par l\'administrateur' });
        }
        const order = await orderService.getOrderById(req.params.id, req.user.ownerId);
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        if (order.status === 'rejected' || order.status === 'cancelled') {
            return res.status(400).json({ error: 'Impossible de créer un lien pour cette commande' });
        }

        const itemsList = (order.items || [])
            .map(i => `${i.product_name || 'Article'} x${i.quantity || 1}`)
            .join(', ');
        const description = itemsList
            ? `Commande: ${itemsList}`
            : `Commande #${(order.id || '').slice(0, 8)}`;

        const provider = req.body.provider;
        const payment = await createPaymentLink(req.user.ownerId, {
            amount: order.total_amount,
            currency: order.currency || 'XOF',
            description,
            order_id: order.id,
            conversation_id: order.conversation_id || null,
            provider,
            expires_in_hours: 24
        });

        if (!payment) {
            return res.status(500).json({ error: 'Erreur lors de la création du lien de paiement' });
        }

        const customerName = order.customer_name || 'Client';
        const message = `Bonjour ${customerName},

Voici votre lien de paiement pour la commande :

📝 ${description}
💵 Montant total : *${Number(order.total_amount).toLocaleString()} ${order.currency || 'XOF'}*

🔗 Payer en ligne (lien sécurisé) :
${payment.payment_url}

⏰ Ce lien est valable 24h.`;

        res.status(201).json({
            payment: {
                id: payment.id,
                short_id: payment.short_id,
                payment_url: payment.payment_url,
                amount: payment.amount,
                currency: payment.currency,
                description: payment.description
            },
            message,
            url: payment.payment_url
        });
    } catch (error) {
        console.error('Create order payment link error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a single order
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await orderService.deleteOrder(req.params.id, req.user.ownerId);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, message: 'Commande supprimée' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Bulk delete orders by status
router.delete('/bulk/:status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.params;
        const validStatuses = ['pending', 'validated', 'rejected', 'cancelled', 'completed', 'delivered'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const result = await orderService.deleteOrdersByStatus(req.user.ownerId, status);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, deleted: result.deleted, message: `${result.deleted} commande(s) supprimée(s)` });
    } catch (error) {
        console.error('Bulk delete orders error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Cleanup old orders
router.post('/cleanup', authenticateToken, async (req, res) => {
    try {
        const { daysOld = 30, statuses = ['rejected', 'cancelled'] } = req.body;
        
        const result = await orderService.cleanupOldOrders(req.user.ownerId, daysOld, statuses);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ 
            success: true, 
            deleted: result.deleted,
            message: `${result.deleted} ancienne(s) commande(s) nettoyée(s)`
        });
    } catch (error) {
        console.error('Cleanup orders error:', error);
        res.status(500).json({ error: 'Erreur lors du nettoyage' });
    }
});

// Clear product logs
router.delete('/logs/clear', authenticateToken, async (req, res) => {
    try {
        const { daysOld } = req.query;
        
        const result = await orderService.clearProductLogs(req.user.ownerId, daysOld ? parseInt(daysOld) : null);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ 
            success: true, 
            deleted: result.deleted,
            message: `${result.deleted} log(s) supprimé(s)`
        });
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression des logs' });
    }
});

export default router;
