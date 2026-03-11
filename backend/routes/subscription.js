import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { getPlan } from '../config/plans.js';

const router = Router();
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
import geniuspay from '../services/geniuspay.js';
import { v4 as uuidv4 } from 'uuid';
import { getEffectivePlanName } from '../config/plans.js';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '../services/email.js';

/**
 * Helper to validate a coupon
 */
async function validateAndApplyCoupon(couponCode, amount) {
    if (!couponCode) return { finalAmount: amount, discountAmount: 0, originalAmount: amount, valid: false, error: 'Code manquant' };
    const coupon = await db.get('SELECT * FROM subscription_coupons WHERE code = ? AND is_active = 1', couponCode.trim().toUpperCase());
    if (!coupon) return { finalAmount: amount, discountAmount: 0, originalAmount: amount, valid: false, error: 'Code invalide ou expiré' };
    
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return { finalAmount: amount, discountAmount: 0, originalAmount: amount, valid: false, error: 'Ce coupon a atteint sa limite d\'utilisation' };
    }
    
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { finalAmount: amount, discountAmount: 0, originalAmount: amount, valid: false, error: 'Ce coupon a expiré' };
    }
    
    let finalAmount = amount;
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
        discountAmount = amount * (coupon.discount_value / 100);
        finalAmount = amount - discountAmount;
    } else if (coupon.discount_type === 'fixed') {
        discountAmount = coupon.discount_value;
        finalAmount = amount - discountAmount;
    }
    
    if (finalAmount < 0) finalAmount = 0;
    
    return {
        finalAmount: Math.round(finalAmount),
        discountAmount: Math.round(discountAmount),
        originalAmount: Math.round(amount),
        valid: true,
        coupon
    };
}

/**
 * POST /api/subscription/validate-coupon
 */
router.post('/validate-coupon', authenticateToken, async (req, res) => {
    try {
        const { planId, billingPeriod = 'monthly', couponCode } = req.body;
        if (!planId || !couponCode) return res.status(400).json({ error: 'planId et couponCode requis' });

        const planRow = await db.get('SELECT * FROM subscription_plans WHERE name = ? AND is_active = 1', planId);
        if (!planRow) return res.status(404).json({ error: 'Plan non trouvé' });

        const amount = billingPeriod === 'yearly' ? planRow.price_yearly : planRow.price;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Prix non configuré pour ce plan' });

        const result = await validateAndApplyCoupon(couponCode, amount);
        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            valid: true,
            originalAmount: result.originalAmount,
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount,
            code: result.coupon.code,
            name: result.coupon.name
        });
    } catch (err) {
        console.error('Validate coupon error:', err);
        res.status(500).json({ error: 'Erreur lors de la validation du coupon' });
    }
});

/**
 * POST /api/subscription/create-geniuspay-checkout
 */
router.post('/create-geniuspay-checkout', authenticateToken, async (req, res) => {
    try {
        const { planId, billingPeriod = 'monthly', couponCode } = req.body;
        if (!planId) return res.status(400).json({ error: 'planId requis' });

        const planRow = await db.get('SELECT * FROM subscription_plans WHERE name = ? AND is_active = 1', planId);
        if (!planRow) return res.status(404).json({ error: 'Plan non trouvé' });

        let amount = billingPeriod === 'yearly' ? planRow.price_yearly : planRow.price;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Prix non configuré' });
        
        let originalAmount = amount;
        let discountAmount = 0;
        let finalCouponCode = null;

        if (couponCode) {
            const couponRes = await validateAndApplyCoupon(couponCode, amount);
            if (!couponRes.valid) return res.status(400).json({ error: couponRes.error });
            amount = couponRes.finalAmount;
            discountAmount = couponRes.discountAmount;
            finalCouponCode = couponRes.coupon.code;
        }

        const userId = req.user.id;
        const userRow = await db.get('SELECT name, email FROM users WHERE id = ?', userId);
        const id = uuidv4();
        
        const returnUrl = `${baseUrl}/dashboard/settings?subscription=success&gp_id=${id}`;
        const callbackUrl = process.env.BASE_URL 
            ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/subscription/webhook/geniuspay` 
            : `${baseUrl}/api/subscription/webhook/geniuspay`;

        // GeniusPay uses platform keys for SaaS subscriptions (not per-user keys)
        const credentials = {
            api_key: process.env.GENIUSPAY_API_KEY,
            api_secret: process.env.GENIUSPAY_API_SECRET
        };

        if (!credentials.api_key || !credentials.api_secret) {
            return res.status(503).json({ error: 'GeniusPay non configuré sur le serveur' });
        }

        const result = await geniuspay.createInvoiceWithCredentials(credentials, {
            amount,
            currency: planRow.price_currency || 'XOF',
            description: `Abonnement ${planRow.display_name} (${billingPeriod})` + (couponRes?.coupon?.name ? ` - Coupon: ${couponRes.coupon.name}` : (finalCouponCode ? ` - Coupon: ${finalCouponCode}` : '')),
            referenceId: id,
            returnUrl,
            callbackUrl,
            customer: {
                name: userRow.name,
                email: userRow.email
            }
        });

        if (!result) return res.status(500).json({ error: 'Erreur GeniusPay' });

        await db.run(`
            INSERT INTO saas_subscription_payments (id, user_id, plan_id, billing_period, amount, currency, external_id, coupon_code, discount_amount, original_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, id, userId, planId, billingPeriod, amount, planRow.price_currency || 'XOF', result.invoiceId, finalCouponCode, discountAmount, originalAmount);

        res.json({ url: result.paymentUrl });
    } catch (err) {
        console.error('GeniusPay sub error:', err);
        res.status(500).json({ 
            error: 'Erreur lors de la création du paiement',
            message: err.message,
            code: 'GENIUSPAY_ERROR'
        });
    }
});

/**
 * Apply subscription to user: set plan, credits, subscription_status
 */
async function applySubscriptionToUser(userId, planName, externalSubscriptionId, endDate = null) {
    const plan = await getPlan(planName);
    const credits = plan?.limits?.credits_per_month ?? 100;
    
    // If no explicit endDate is provided but it's a non-GeniusPay payment, 
    // we might want to default to 1 month/year.
    let finalEndDate = endDate;
    if (!finalEndDate) {
        // Default to 31 days if manual and no date given
        const d = new Date();
        d.setDate(d.getDate() + 31);
        finalEndDate = d;
    }

    await db.run(`
        UPDATE users SET 
            plan = ?, 
            credits = ?, 
            subscription_status = 'active',
            subscription_end_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, planName, credits, finalEndDate, userId);

    // Send confirmation email
    try {
        const user = await db.get('SELECT email, name FROM users WHERE id = ?', userId);
        if (user) {
            await sendPaymentSuccessEmail(user, {
                planName: plan?.display_name || planName,
                amount: '–', // Amount not always easily available here
                date: new Date().toLocaleDateString('fr-FR'),
                number: externalSubscriptionId || 'N/A',
                credits: credits
            });
        }
    } catch (emailErr) {
        console.error('Error sending subscription confirmation email:', emailErr);
    }
}

/**
 * Remove subscription: set plan to free, set credits to free tier
 */
async function removeSubscriptionFromUser(userId) {
    const plan = await getPlan('free');
    const credits = plan?.limits?.credits_per_month ?? 100;
    await db.run(`
        UPDATE users SET 
            plan = 'free', 
            credits = ?, 
            subscription_status = 'canceled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, credits, userId);
}

/**
 * GeniusPay Webhook for SaaS Subscriptions
 */
export async function handleGeniusPaySubscriptionWebhook(req, res) {
    try {
        const rawBody = req.body;
        let payload;
        try {
            payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : rawBody);
        } catch (e) {
            return res.status(400).send('Invalid JSON');
        }

        const event = payload?.event;
        const data = payload?.data || {};

        // Optional signature verification
        const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
        if (secret) {
            const crypto = await import('crypto');
            const signature = req.headers['x-webhook-signature'];
            const timestamp = req.headers['x-webhook-timestamp'];
            const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : (typeof rawBody === 'string' ? rawBody : JSON.stringify(payload));
            const expected = crypto.default.createHmac('sha256', secret).update(timestamp + '.' + rawBodyStr).digest('hex');
            if (signature !== expected) {
                console.error('[GeniusPay sub webhook] Invalid signature');
                return res.status(401).send('Invalid signature');
            }
        }

        if (event !== 'payment.success') {
            return res.status(200).send('OK');
        }

        const externalId = String(data.id || data.reference);
        const payment = await db.get('SELECT * FROM saas_subscription_payments WHERE external_id = ? AND status != ?', externalId, 'paid');
        
        if (!payment) {
            // Check by reference_id in metadata
            const refId = data.metadata?.reference_id;
            if (refId) {
                const p2 = await db.get('SELECT * FROM saas_subscription_payments WHERE id = ? AND status != ?', refId, 'paid');
                if (p2) {
                    await finalizeSubscription(p2, `geniuspay_${p2.id}`);
                }
            }
            return res.status(200).send('OK');
        }

        await finalizeSubscription(payment, `geniuspay_${payment.id}`);
        return res.status(200).send('OK');
    } catch (error) {
        console.error('[GeniusPay sub webhook] Error:', error);
        res.status(500).send('Error');
    }
}

async function finalizeSubscription(payment, externalSubId) {
    if (payment.status === 'paid') return;
    await db.run("UPDATE saas_subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.id);
    
    if (payment.coupon_code) {
        await db.run("UPDATE subscription_coupons SET used_count = used_count + 1 WHERE code = ?", payment.coupon_code);
    }
    
    const endDate = new Date();
    if (payment.billing_period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
    }
    await applySubscriptionToUser(payment.user_id, payment.plan_id, externalSubId || `sub_${payment.id}`, endDate);
}

export default router;
