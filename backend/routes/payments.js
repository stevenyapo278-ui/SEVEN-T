import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, createPaymentLinkSchema } from '../middleware/security.js';
import paymetrust from '../services/paymetrust.js';

const router = Router();

const baseUrl = () => (process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

// Payment providers configuration
const PAYMENT_PROVIDERS = {
    manual: { name: 'Manuel', icon: '💵' },
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

// PaymeTrust webhook: receive callback when payment status changes (no auth; body is raw)
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
        console.error('[PaymeTrust webhook] Missing invoice id in payload:', JSON.stringify(body).slice(0, 200));
        return res.status(400).send('Missing invoice id');
    }
    const successStatuses = ['paid', 'completed', 'success', 'settled'];
    if (!successStatuses.some(s => status.includes(s))) {
        return res.status(200).send('OK');
    }
    try {
        const payment = await db.get('SELECT * FROM payment_links WHERE external_id = ? AND status != ?', invoiceId, 'paid');
        if (!payment) {
            return res.status(200).send('OK');
        }
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

// Get payment providers
router.get('/providers', authenticateToken, (req, res) => {
    res.json({ providers: PAYMENT_PROVIDERS, paymetrustConfigured: paymetrust.isConfigured() });
});

/**
 * Helper: create a payment link (used by POST /payments and POST /orders/:id/payment-link)
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

    if (provider === 'paymetrust' && paymetrust.isConfigured()) {
        const returnUrl = `${baseUrl()}/pay/${shortId}/return`;
        const callbackUrl = process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/payments/webhook/paymetrust` : `${baseUrl()}/api/payments/webhook/paymetrust`;
        const result = await paymetrust.createInvoice({
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
