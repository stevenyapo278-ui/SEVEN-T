import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireModule } from '../middleware/requireModule.js';
import { validate, createPaymentLinkSchema } from '../middleware/security.js';
import * as paymentProviders from '../services/paymentProviders.js';
import { hasFeature } from '../config/plans.js';

const router = Router();

const baseUrl = () => (process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
import { createPaymentLink } from '../services/paymentLinks.js';

// Display list for UI (manual + supported providers)
const PAYMENT_PROVIDERS_DISPLAY = {
    manual: { name: 'Manuel', icon: '💵' },
    geniuspay: { name: 'GeniusPay', icon: '💎' }
};

// 1. PUBLIC ROUTES (No auth)
// GeniusPay webhook
router.post('/webhook/geniuspay', async (req, res) => {
    try {
        const payload = req.body;
        const event = payload.event;
        const data = payload.data;

        console.log('[GeniusPay webhook] Event received:', event);

        if (event !== 'payment.success') {
            return res.status(200).send('OK');
        }

        const externalId = String(data.id || data.reference);
        const refId = data.metadata?.reference_id;

        // Find the payment link first to know which user this belongs to
        const payment = await db.get(
            'SELECT * FROM payment_links WHERE (external_id = ? OR id = ?) AND status != ?', 
            externalId, refId || '', 'paid'
        );

        if (!payment) {
            console.log('[GeniusPay webhook] Payment link not found or already paid');
            return res.status(200).send('OK');
        }

        // Get user config to verify signature with THEIR secret
        const config = await paymentProviders.getProviderConfig(payment.user_id, 'geniuspay');
        const userSecret = config?.webhook_secret;
        const platformSecret = process.env.GENIUSPAY_WEBHOOK_SECRET;
        
        const secret = userSecret || platformSecret;

        if (secret) {
            const crypto = await import('crypto');
            const signature = req.headers['x-webhook-signature'];
            const timestamp = req.headers['x-webhook-timestamp'];
            const rawBody = JSON.stringify(payload);
            const expected = crypto.default.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
            
            if (signature !== expected) {
                console.error('[GeniusPay webhook] Invalid signature for user:', payment.user_id);
                return res.status(401).send('Invalid signature');
            }
        }

        // Update payment status
        await db.run("UPDATE payment_links SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.id);
        if (payment.order_id) {
            await db.run("UPDATE orders SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.order_id);
        }
        
        console.log('[GeniusPay webhook] Payment confirmed for id:', payment.id);
        return res.status(200).send('OK');
    } catch (error) {
        console.error('[GeniusPay webhook] Error:', error);
        res.status(500).send('Error');
    }
});

// 2. PROTECTED ROUTES (Auto-auth + requireModule)
router.use(authenticateToken);
router.use(requireModule('payment_module'));

// Get payment providers (list + per-user configured status). Only if plan includes payment_module and admin enabled for this user.
router.get('/providers', async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment || userFlag;
        const providerIds = paymentProviders.getSupportedProviderIds();
        const providers = { ...PAYMENT_PROVIDERS_DISPLAY };
        const configured = {};
        if (paymentModuleEnabled) {
            for (const id of providerIds) {
                configured[id] = await paymentProviders.isProviderConfiguredForUser(req.user.id, id);
            }
        }
        res.json({ providers, configured, paymentModuleEnabled });
    } catch (error) {
        console.error('Get payment providers error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Put provider config (save credentials for current user). Only if plan + admin enabled payment module for this user.
router.put('/providers/:provider', async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment || userFlag;
        if (!paymentModuleEnabled) {
            return res.status(403).json({ error: 'Le module Moyens de paiement n\'est pas activé pour votre compte. Contactez l\'administrateur.' });
        }
        const { provider } = req.params;
        if (!paymentProviders.getSupportedProviderIds().includes(provider)) {
            return res.status(400).json({ error: 'Provider non supporté' });
        }
        if (provider === 'geniuspay') {
            const { api_key, api_secret, webhook_secret } = req.body || {};
            if (!api_key || !api_secret) return res.status(400).json({ error: 'api_key et api_secret requis' });
            const credentials = { 
                api_key: api_key.trim(), 
                api_secret: api_secret.trim(),
                webhook_secret: webhook_secret?.trim() 
            };
            await paymentProviders.saveProviderConfig(req.user.id, provider, credentials);
        } else {
            return res.status(400).json({ error: 'Provider non supporté' });
        }
        res.json({ message: 'Configuration enregistrée', provider });
    } catch (error) {
        console.error('Put payment provider error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete provider config for current user. Only if plan + admin enabled payment module.
router.delete('/providers/:provider', async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment || userFlag;
        if (!paymentModuleEnabled) {
            return res.status(403).json({ error: 'Le module Moyens de paiement n\'est pas activé pour votre compte.' });
        }
        const { provider } = req.params;
        if (!paymentProviders.getSupportedProviderIds().includes(provider)) {
            return res.status(400).json({ error: 'Provider non supporté' });
        }
        await db.run('DELETE FROM user_payment_providers WHERE user_id = ? AND provider = ?', req.user.id, provider);
        res.json({ message: 'Configuration supprimée', provider });
    } catch (error) {
        console.error('Delete payment provider error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Helper is now in services/paymentLinks.js and imported above.

// Get payment links for user
router.get('/', async (req, res) => {
    try {
        const payments = await db.all(`
            SELECT * FROM payment_links 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, req.user.id);
        
        // Add short_id and payment_url to each result
        const enhanced = payments.map(p => ({
            ...p,
            short_id: p.id.split('-')[0].toUpperCase(),
            payment_url: p.payment_url_external || `${baseUrl()}/pay/${p.id.split('-')[0].toUpperCase()}`
        }));

        res.json({ payments: enhanced });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create payment link
router.post('/', validate(createPaymentLinkSchema), async (req, res) => {
    try {
        const { amount, currency, description, provider, order_id, conversation_id, expires_in_hours } = req.body;
        const payment = await createPaymentLink(req.user.id, {
            amount, currency, description, provider, order_id, conversation_id, expires_in_hours
        });
        if (!payment) return res.status(500).json({ error: 'Erreur lors de la création du lien' });
        res.status(201).json({ payment });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payment by short ID (public)
router.get('/public/:shortId', async (req, res) => {
    try {
        const prefix = req.params.shortId.toLowerCase();
        const payment = await db.get(`
            SELECT pl.*, u.company as merchant_name
            FROM payment_links pl
            JOIN users u ON pl.user_id = u.id
            WHERE pl.id LIKE ?
        `, `${prefix}%`);

        if (!payment) {
            return res.status(404).json({ error: 'Lien de paiement non trouvé' });
        }

        if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Ce lien de paiement a expiré' });
        }

        if (payment.status === 'paid') {
            return res.status(400).json({ error: 'Ce paiement a déjà été effectué' });
        }

        payment.payment_url = payment.payment_url_external || `${baseUrl()}/pay/${payment.id.split('-')[0].toUpperCase()}`;
        res.json({ payment });
    } catch (error) {
        console.error('Get public payment error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mark payment as paid (webhook or manual)
router.post('/:id/confirm', async (req, res) => {
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        await db.run("UPDATE payment_links SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
        if (payment.order_id) {
            await db.run("UPDATE orders SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.order_id);
        }
        res.json({ message: 'Paiement confirmé' });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Cancel payment
router.post('/:id/cancel', async (req, res) => {
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        if (payment.status === 'paid') {
            return res.status(400).json({ error: 'Impossible d\'annuler un paiement effectué' });
        }
        await db.run("UPDATE payment_links SET status = 'cancelled' WHERE id = ?", req.params.id);
        res.json({ message: 'Paiement annulé' });
    } catch (error) {
        console.error('Cancel payment error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete payment link
router.delete('/:id', async (req, res) => {
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        await db.run('DELETE FROM payment_links WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        res.json({ message: 'Lien supprimé' });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payment stats
router.get('/stats', async (req, res) => {
    try {
        const [t, p, pd, ta, pa] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM payment_links WHERE user_id = ?', req.user.id),
            db.get("SELECT COUNT(*) as count FROM payment_links WHERE user_id = ? AND status = 'pending'", req.user.id),
            db.get("SELECT COUNT(*) as count FROM payment_links WHERE user_id = ? AND status = 'paid'", req.user.id),
            db.get("SELECT SUM(amount) as sum FROM payment_links WHERE user_id = ? AND status = 'paid'", req.user.id),
            db.get("SELECT SUM(amount) as sum FROM payment_links WHERE user_id = ? AND status = 'pending'", req.user.id)
        ]);
        const stats = {
            total: t?.count ?? 0,
            pending: p?.count ?? 0,
            paid: pd?.count ?? 0,
            totalAmount: ta?.sum ?? 0,
            pendingAmount: pa?.sum ?? 0
        };
        res.json({ stats });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get payment stats overview (alias)
router.get('/stats/overview', async (req, res) => {
    try {
        const [t, p, pd, c, ta, pa] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM payment_links WHERE user_id = ?', req.user.id),
            db.get("SELECT COUNT(*) as count FROM payment_links WHERE user_id = ? AND status = 'pending'", req.user.id),
            db.get("SELECT COUNT(*) as count FROM payment_links WHERE user_id = ? AND status = 'paid'", req.user.id),
            db.get("SELECT COUNT(*) as count FROM payment_links WHERE user_id = ? AND status = 'cancelled'", req.user.id),
            db.get("SELECT SUM(amount) as sum FROM payment_links WHERE user_id = ? AND status = 'paid'", req.user.id),
            db.get("SELECT SUM(amount) as sum FROM payment_links WHERE user_id = ? AND status = 'pending'", req.user.id)
        ]);
        const stats = {
            total: t?.count ?? 0,
            pending: p?.count ?? 0,
            paid: pd?.count ?? 0,
            cancelled: c?.count ?? 0,
            totalAmount: ta?.sum ?? 0,
            pendingAmount: pa?.sum ?? 0
        };

        const recentPaid = await db.all(`
            SELECT DATE(paid_at) as date, COUNT(*) as count, SUM(amount) as total
            FROM payment_links 
            WHERE user_id = ? AND status = 'paid' AND paid_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
            GROUP BY DATE(paid_at)
            ORDER BY date ASC
        `, req.user.id);

        res.json({ stats, recentActivity: recentPaid || [] });
    } catch (error) {
        console.error('Get payment stats overview error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Generate payment message for WhatsApp
router.get('/:id/message', async (req, res) => {
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        const shortId = payment.id.split('-')[0].toUpperCase();
        const paymentUrl = payment.payment_url_external || `${baseUrl()}/pay/${shortId}`;

        const message = `💰 *Lien de paiement*

${payment.description ? `📝 ${payment.description}\n` : ''}
💵 Montant: *${Number(payment.amount).toLocaleString()} ${payment.currency}*

🔗 Cliquez ici pour payer:
${paymentUrl}

⏰ Ce lien expire dans 24h.`;

        res.json({ message, url: paymentUrl });
    } catch (error) {
        console.error('Get payment message error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
