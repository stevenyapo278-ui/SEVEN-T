import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, createPaymentLinkSchema } from '../middleware/security.js';
import * as paymentProviders from '../services/paymentProviders.js';
import { hasFeature } from '../config/plans.js';

const router = Router();

const baseUrl = () => (process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

// Display list for UI (manual + supported providers)
const PAYMENT_PROVIDERS_DISPLAY = {
    manual: { name: 'Manuel', icon: '💵' },
    geniuspay: { name: 'GeniusPay', icon: '💎' },
    paymetrust: { name: 'PaymeTrust', icon: '🔒' },
    wave: { name: 'Wave', icon: '🌊' },
    orange_money: { name: 'Orange Money', icon: '🟠' },
    mtn_momo: { name: 'MTN MoMo', icon: '🟡' },
    stripe: { name: 'Stripe', icon: '💳' }
};

// Get all payment links for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM payment_links WHERE user_id = ?';
        const params = [req.user.id];
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const payments = await db.all(query, ...params);
        for (const p of payments) {
            p.short_id = p.id ? p.id.split('-')[0].toUpperCase() : null;
            p.payment_url = p.payment_url_external || `${baseUrl()}/pay/${p.short_id}`;
        }
        res.json({ payments });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Export payment links as CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM payment_links WHERE user_id = ?';
        const params = [req.user.id];
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT 5000';
        const payments = await db.all(query, ...params);
        const headers = ['id', 'short_id', 'date', 'statut', 'montant', 'devise', 'description', 'payé_le'];
        const escape = (v) => (v == null ? '' : String(v).replace(/"/g, '""'));
        const row = (p) => [
            escape(p.id),
            escape(p.id ? p.id.split('-')[0].toUpperCase() : ''),
            escape(p.created_at),
            escape(p.status),
            escape(p.amount),
            escape(p.currency),
            escape(p.description),
            escape(p.paid_at)
        ].map((c) => `"${c}"`).join(',');
        const csv = [headers.join(','), ...payments.map(row)].join('\n');
        const bom = '\uFEFF';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="paiements_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(bom + csv);
    } catch (error) {
        console.error('Export payments error:', error);
        res.status(500).json({ error: 'Erreur export' });
    }
});

// PaymeTrust webhook
router.post('/webhook/paymetrust', async (req, res) => {
    let body;
    try {
        const raw = req.body;
        body = typeof raw === 'string' ? JSON.parse(raw) : (Buffer.isBuffer(raw) ? JSON.parse(raw.toString('utf8')) : raw);
    } catch (e) {
        console.error('[PaymeTrust webhook] Invalid JSON:', e.message);
        return res.status(400).send('Invalid JSON');
    }
    const invoiceId = body?.data?.id ?? body?.data?.attributes?.id ?? body?.id ?? body?.invoice_id;
    const status = (body?.data?.attributes?.status ?? body?.data?.status ?? body?.status ?? '').toLowerCase();
    if (!invoiceId) {
        console.error('[PaymeTrust webhook] Missing invoice id in payload');
        return res.status(400).send('Missing invoice id');
    }
    const successStatuses = ['paid', 'completed', 'success', 'settled'];
    if (!successStatuses.some(s => status.includes(s))) {
        return res.status(200).send('OK');
    }
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE external_id = ? AND status != ?', String(invoiceId), 'paid');
        if (!payment) return res.status(200).send('OK');
        await db.run("UPDATE payment_links SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.id);
        if (payment.order_id) {
            await db.run("UPDATE orders SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.order_id);
        }
        return res.status(200).send('OK');
    } catch (err) {
        console.error('[PaymeTrust webhook] Error updating payment:', err);
        return res.status(500).send('Error');
    }
});

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

        // 1. Find the payment link first to know which user this belongs to
        const payment = await db.get(
            'SELECT * FROM payment_links WHERE (external_id = ? OR id = ?) AND status != ?', 
            externalId, refId || '', 'paid'
        );

        if (!payment) {
            console.log('[GeniusPay webhook] Payment link not found or already paid');
            return res.status(200).send('OK');
        }

        // 2. Get user config to verify signature with THEIR secret
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

        // 3. Update payment status
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

// Get payment providers (list + per-user configured status). Only if plan includes payment_module and admin enabled for this user.
router.get('/providers', authenticateToken, async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment && userFlag;
        const providerIds = paymentProviders.getSupportedProviderIds();
        const providers = { ...PAYMENT_PROVIDERS_DISPLAY };
        const configured = {};
        if (paymentModuleEnabled) {
            for (const id of providerIds) {
                configured[id] = await paymentProviders.isProviderConfiguredForUser(req.user.id, id);
            }
        }
        res.json({ providers, configured, paymetrustConfigured: configured.paymetrust ?? false, paymentModuleEnabled });
    } catch (error) {
        console.error('Get payment providers error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Put provider config (save credentials for current user). Only if plan + admin enabled payment module for this user.
router.put('/providers/:provider', authenticateToken, async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment && userFlag;
        if (!paymentModuleEnabled) {
            return res.status(403).json({ error: 'Le module Moyens de paiement n\'est pas activé pour votre compte. Contactez l\'administrateur.' });
        }
        const { provider } = req.params;
        if (!paymentProviders.getSupportedProviderIds().includes(provider)) {
            return res.status(400).json({ error: 'Provider non supporté' });
        }
        if (provider === 'paymetrust') {
            const { account_id, api_key } = req.body || {};
            if (!account_id || !api_key) return res.status(400).json({ error: 'account_id et api_key requis' });
            const credentials = JSON.stringify({ account_id: account_id.trim(), api_key: api_key.trim() });
            await db.run(`
                INSERT INTO user_payment_providers (user_id, provider, credentials, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, provider) DO UPDATE SET credentials = EXCLUDED.credentials, updated_at = CURRENT_TIMESTAMP
            `, req.user.id, provider, credentials);
        } else if (provider === 'geniuspay') {
            const { api_key, api_secret, webhook_secret } = req.body || {};
            if (!api_key || !api_secret) return res.status(400).json({ error: 'api_key et api_secret requis' });
            const credentials = JSON.stringify({ 
                api_key: api_key.trim(), 
                api_secret: api_secret.trim(),
                webhook_secret: webhook_secret?.trim() 
            });
            await db.run(`
                INSERT INTO user_payment_providers (user_id, provider, credentials, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, provider) DO UPDATE SET credentials = EXCLUDED.credentials, updated_at = CURRENT_TIMESTAMP
            `, req.user.id, provider, credentials);
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
router.delete('/providers/:provider', authenticateToken, async (req, res) => {
    try {
        const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
        const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
        const paymentModuleEnabled = planHasPayment && userFlag;
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

/**
 * Helper: create a payment link (used by POST /payments and POST /orders/:id/payment-link)
 * Uses per-user provider config from user_payment_providers; no platform env for receiving.
 */
export async function createPaymentLink(userId, opts = {}) {
    const {
        amount,
        currency = 'XOF',
        description,
        provider = 'manual',
        order_id,
        conversation_id,
        expires_in_hours = 24
    } = opts;

    if (!amount || amount <= 0) return null;

    const id = uuidv4();
    const shortId = id.split('-')[0].toUpperCase();
    const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();

    let payment_url_external = null;
    let external_id = null;

    const userRow = await db.get('SELECT plan, payment_module_enabled FROM users WHERE id = ?', userId);
    const planHasPayment = await hasFeature(userRow?.plan || 'free', 'payment_module');
    const userFlag = !!(userRow?.payment_module_enabled === 1 || userRow?.payment_module_enabled === true);
    const paymentModuleEnabled = planHasPayment && userFlag;

    if (provider !== 'manual' && paymentModuleEnabled) {
        const returnUrl = `${baseUrl()}/pay/${shortId}/return`;
        const webhookPath = provider === 'geniuspay' ? '/api/payments/webhook/geniuspay' : '/api/payments/webhook/paymetrust';
        const callbackUrl = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}${webhookPath}` : `${baseUrl()}${webhookPath}`;
        const result = await paymentProviders.createInvoiceForUser(userId, provider, {
            amount: Number(amount),
            currency: currency || 'XOF',
            description: description || `Paiement ${shortId}`,
            referenceId: id,
            returnUrl,
            callbackUrl
        });
        if (result) {
            payment_url_external = result.paymentUrl;
            external_id = result.invoiceId;
        }
    }

    await db.run(`
        INSERT INTO payment_links (id, user_id, order_id, conversation_id, amount, currency, description, provider, expires_at, external_id, payment_url_external)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, id, userId, order_id || null, conversation_id || null, amount, currency, description || null, provider, expires_at, external_id, payment_url_external);

    const payment = await db.get('SELECT * FROM payment_links WHERE id = ?', id);
    payment.short_id = shortId;
    payment.payment_url = payment_url_external || `${baseUrl()}/pay/${shortId}`;
    return payment;
}

// Create payment link
router.post('/', authenticateToken, validate(createPaymentLinkSchema), async (req, res) => {
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
router.post('/:id/confirm', authenticateToken, async (req, res) => {
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
router.post('/:id/cancel', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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
router.get('/stats', authenticateToken, async (req, res) => {
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
router.get('/stats/overview', authenticateToken, async (req, res) => {
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
router.get('/:id/message', authenticateToken, async (req, res) => {
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
