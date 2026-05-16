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
 * GET /api/subscription/status
 * Returns the current subscription state for the authenticated user
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            `SELECT plan, subscription_status, subscription_end_date, credits, trial_end_date FROM users WHERE id = ?`,
            req.user.id
        );
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const planRow = await db.get(
            `SELECT display_name, price, price_yearly, price_currency FROM subscription_plans WHERE name = ? AND is_active = 1`,
            user.plan
        );

        const isExpired = user.subscription_end_date && new Date(user.subscription_end_date) < new Date();

        res.json({
            plan: user.plan,
            planDisplayName: planRow?.display_name || user.plan,
            planPrice: planRow?.price ?? null,
            planPriceCurrency: planRow?.price_currency || 'XOF',
            status: isExpired ? 'expired' : (user.subscription_status || 'inactive'),
            subscriptionEndDate: user.subscription_end_date || null,
            credits: user.credits ?? 0
        });
    } catch (err) {
        console.error('Subscription status error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /api/subscription/history
 * Returns paginated payment history for the authenticated user
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        const [payments, countRow] = await Promise.all([
            db.all(
                `SELECT id, plan_id, billing_period, amount, original_amount, discount_amount, currency, status, coupon_code, created_at, paid_at
                 FROM saas_subscription_payments
                 WHERE user_id = ?
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                req.user.id, limit, offset
            ),
            db.get(`SELECT COUNT(*) as total FROM saas_subscription_payments WHERE user_id = ?`, req.user.id)
        ]);

        res.json({
            payments: payments || [],
            total: countRow?.total || 0,
            page,
            limit
        });
    } catch (err) {
        console.error('Subscription history error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

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
 * POST /api/subscription/create-geniuspay-subscription
 * Create a RECURRING subscription
 */
router.post('/create-geniuspay-subscription', authenticateToken, async (req, res) => {
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
        let couponRes = null;

        if (couponCode) {
            couponRes = await validateAndApplyCoupon(couponCode, amount);
            if (!couponRes.valid) return res.status(400).json({ error: couponRes.error });
            amount = couponRes.finalAmount;
            discountAmount = couponRes.discountAmount;
            finalCouponCode = couponRes.coupon.code;
        }

        const userId = req.user.id;
        const userRow = await db.get('SELECT name, email, notification_number as phone FROM users WHERE id = ?', userId);
        const subId = uuidv4();
        
        const returnUrl = `${baseUrl}/dashboard/settings`;
        const callbackUrl = process.env.BASE_URL 
            ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/subscription/webhook/geniuspay` 
            : `${baseUrl}/api/subscription/webhook/geniuspay`;

        const credentials = {
            api_key: process.env.GENIUSPAY_API_KEY,
            api_secret: process.env.GENIUSPAY_API_SECRET
        };

        const result = await geniuspay.createSubscriptionWithCredentials(credentials, {
            planId: planRow.name,
            billingCycle: billingPeriod,   // 'monthly' | 'yearly' — required by GeniusPay
            amount,
            currency: planRow.price_currency || 'XOF',
            description: `Abonnement SaaS ${planRow.display_name} (${billingPeriod})`,
            returnUrl,
            callbackUrl,
            customer: {
                name: userRow.name,
                email: userRow.email,
                phone: userRow.phone  // required — fallback handled in service
            },
            metadata: {
                user_id: userId,
                internal_sub_id: subId,
                coupon_code: finalCouponCode,
                billing_period: billingPeriod
            }
        });

        if (!result) {
            return res.status(500).json({
                error: 'Erreur GeniusPay : impossible de créer l\'abonnement. Vérifiez vos identifiants API et les paramètres du plan.'
            });
        }

        // Determine initial status based on GeniusPay response.
        // We only consider it fully active if amount is 0 (100% discount).
        // Otherwise, it must go through checkout and the webhook will activate it.
        const initialStatus = (amount === 0) ? 'active' : 'pending';

        // Record the subscription
        await db.run(`
            INSERT INTO saas_subscriptions (id, user_id, plan_id, geniuspay_sub_id, status, billing_cycle)
            VALUES (?, ?, ?, ?, ?, ?)
        `, subId, userId, planId, result.subscriptionId, initialStatus, billingPeriod);

        // If amount is 0, activate the plan now without waiting for the webhook
        if (amount === 0) {
            console.log(`[Subscription] Subscription amount is 0 for user ${userId}. Activating plan ${planId}.`);
            const endDate = new Date();
            if (billingPeriod === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }
            await applySubscriptionToUser(userId, planId, result.subscriptionId, endDate, 0);

            // Apply coupon usage if any
            if (finalCouponCode && couponRes?.coupon) {
                await db.run('UPDATE subscription_coupons SET used_count = used_count + 1 WHERE id = ?', couponRes.coupon.id);
            }

            // Return success with redirect
            return res.json({
                url: result.checkoutUrl || returnUrl,
                activated: true,
                message: 'Abonnement activé avec succès'
            });
        }

        let checkoutUrlToUse = result.checkoutUrl;

        // Fallback: If GeniusPay API doesn't return a checkout URL for a subscription,
        // create a one-off payment (invoice) to process the initial charge.
        if (!checkoutUrlToUse && amount > 0) {
            console.log(`[Subscription] No checkout URL returned for subscription ${result.subscriptionId}. Falling back to one-off payment...`);
            const paymentId = uuidv4();
            const invoice = await geniuspay.createInvoiceWithCredentials(credentials, {
                amount,
                currency: planRow.price_currency || 'XOF',
                description: `Paiement initial - Abonnement ${planRow.display_name}`,
                referenceId: paymentId,
                returnUrl,
                callbackUrl,
                customer: {
                    name: userRow.name,
                    email: userRow.email,
                    phone: userRow.phone
                }
            });

            if (invoice && invoice.paymentUrl) {
                checkoutUrlToUse = invoice.paymentUrl;
                // Insert into saas_subscription_payments so the webhook can find it
                await db.run(`
                    INSERT INTO saas_subscription_payments (id, user_id, plan_id, billing_period, amount, original_amount, discount_amount, currency, status, external_id, coupon_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, paymentId, userId, planId, billingPeriod, amount, originalAmount, discountAmount, planRow.price_currency || 'XOF', 'pending', invoice.invoiceId, finalCouponCode);
            } else {
                return res.status(500).json({ error: 'Impossible de générer le lien de paiement GeniusPay.' });
            }
        }

        // Otherwise redirect to checkout
        res.json({ url: checkoutUrlToUse || returnUrl });
    } catch (err) {
        console.error('GeniusPay sub creation error:', err);
        res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement', details: err.message });
    }
});

/**
 * Apply subscription to user: set plan, credits, subscription_status
 */
async function applySubscriptionToUser(userId, planName, externalSubscriptionId, endDate = null, bonusCredits = 0) {
    const plan = await getPlan(planName);
    const credits = (plan?.limits?.credits_per_month ?? 100) + bonusCredits;
    
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

        // Mandatory signature verification
        const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
        if (secret) {
            const crypto = await import('crypto');
            const signature = req.headers['x-webhook-signature'];
            const timestamp = req.headers['x-webhook-timestamp'] || '';
            const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : (typeof rawBody === 'string' ? rawBody : JSON.stringify(payload));
            const expected = crypto.default.createHmac('sha256', secret).update(timestamp + '.' + rawBodyStr).digest('hex');
            if (signature !== expected) {
                console.error('[GeniusPay sub webhook] Invalid signature');
                return res.status(401).send('Invalid signature');
            }
        }

        console.log(`[GeniusPay Webhook] Event: ${event}, ID: ${data.id}`);

        // Handle Legacy One-off Payment Webhook
        if (event === 'payment.success') {
            const externalId = String(data.id || data.reference);
            const payment = await db.get('SELECT * FROM saas_subscription_payments WHERE external_id = ? AND status != ?', externalId, 'paid');
            if (payment) {
                await finalizeSubscription(payment, `geniuspay_${payment.id}`);
                return res.status(200).send('OK');
            }
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

        // Handle SaaS Recurring Webhooks
        const geniuspaySubId = data.subscription_id || data.id;
        if (!geniuspaySubId) return res.status(200).send('OK');

        const sub = await db.get('SELECT * FROM saas_subscriptions WHERE geniuspay_sub_id = ?', geniuspaySubId);
        if (!sub) {
             console.warn(`[GeniusPay Webhook] No internal subscription found for GeniusPay ID: ${geniuspaySubId}`);
             return res.status(200).send('OK');
        }

        if (event === 'subscription.payment_success') {
            // Renewal success
            const nextBillingDate = data.next_billing_date;
            await finalizeSaaSSubscription(sub, 'active', nextBillingDate);
        } else if (event === 'subscription.payment_failed') {
            // Payment failed: mark as past_due to trigger grace period
            await db.run("UPDATE saas_subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP WHERE id = ?", sub.id);
            await db.run("UPDATE users SET subscription_status = 'past_due' WHERE id = ?", sub.user_id);
            
            const user = await db.get('SELECT name, email FROM users WHERE id = ?', sub.user_id);
            if (user) {
                await sendPaymentFailedEmail(user, 'Le renouvellement automatique de votre abonnement a échoué.');
                // Relance WhatsApp J (via sub manager or here)
                try {
                    const { sendSystemWhatsApp } = await import('../services/subscriptionManager.js');
                    await sendSystemWhatsApp(sub.user_id, `Bonjour ${user.name}, le paiement de votre abonnement SEVEN T a échoué. Vous disposez de 3 jours de période de grâce avant la suspension de votre service.`);
                } catch (e) {}
            }
        } else if (event === 'subscription.cancelled' || event === 'subscription.expired') {
            await db.run("UPDATE saas_subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?", sub.id);
            await removeSubscriptionFromUser(sub.user_id);
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('[GeniusPay sub webhook] Error:', error);
        res.status(500).send('Error');
    }
}

async function finalizeSaaSSubscription(sub, status, nextBillingDate) {
    const periodEnd = nextBillingDate ? new Date(nextBillingDate) : null;
    
    await db.run(`
        UPDATE saas_subscriptions SET 
            status = ?, 
            current_period_end = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, status, periodEnd, sub.id);

    // Get plan details
    const plan = await getPlan(sub.plan_id);
    const credits = plan?.limits?.credits_per_month ?? 100;

    await db.run(`
        UPDATE users SET 
            plan = ?, 
            credits = ?, 
            subscription_status = 'active',
            subscription_end_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, sub.plan_id, credits, periodEnd, sub.user_id);

    console.log(`[SubManager] SaaS Subscription finalized for user ${sub.user_id}. Next billing: ${nextBillingDate}`);
}

async function finalizeSubscription(payment, externalSubId) {
    if (payment.status === 'paid') return;
    await db.run("UPDATE saas_subscription_payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", payment.id);
    
    let bonusCredits = 0;
    if (payment.coupon_code) {
        const coupon = await db.get("SELECT * FROM subscription_coupons WHERE code = ?", payment.coupon_code);
        if (coupon) {
            await db.run("UPDATE subscription_coupons SET used_count = used_count + 1 WHERE id = ?", coupon.id);
            
            // Record detailed usage
            await db.run(`
                INSERT INTO coupon_usages (id, coupon_id, user_id, subscription_id, amount_total, discount_amount)
                VALUES (?, ?, ?, ?, ?, ?)
            `, uuidv4(), coupon.id, payment.user_id, payment.id, payment.original_amount, payment.discount_amount);
            
            // Apply bonus credits if any
            if (coupon.bonus_credits > 0) {
                bonusCredits = coupon.bonus_credits;
            }
        }
    }
    
    const endDate = new Date();
    if (payment.billing_period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
    }
    await applySubscriptionToUser(payment.user_id, payment.plan_id, externalSubId || `sub_${payment.id}`, endDate, bonusCredits);
}

export default router;
