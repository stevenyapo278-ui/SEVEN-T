import { Router } from 'express';
import Stripe from 'stripe';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { getPlan } from '../config/plans.js';

const router = Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * POST /api/subscription/create-checkout-session
 * Create a Stripe Checkout Session for the given plan. Redirect user to Stripe to pay.
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Paiement Stripe non configuré (STRIPE_SECRET_KEY)' });
    }
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ error: 'planId requis' });
        }
        const planRow = await db.get(`
            SELECT name, display_name, stripe_price_id FROM subscription_plans
            WHERE name = ? AND is_active = 1
        `, planId);
        if (!planRow) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }
        if (!planRow.stripe_price_id) {
            return res.status(400).json({ error: 'Ce plan n\'est pas disponible à l\'achat en ligne. Contactez-nous.' });
        }
        const userId = req.user.id;
        const userRow = await db.get('SELECT stripe_customer_id, email, name FROM users WHERE id = ?', userId);
        let customerId = userRow?.stripe_customer_id;
        if (!customerId && userRow?.email) {
            const customer = await stripe.customers.create({
                email: userRow.email,
                name: userRow.name || undefined,
                metadata: { user_id: userId }
            });
            customerId = customer.id;
            await db.run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', customerId, userId);
        }
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: planRow.stripe_price_id, quantity: 1 }],
            success_url: `${baseUrl}/dashboard/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/dashboard/settings?subscription=cancelled`,
            client_reference_id: userId,
            subscription_data: {
                metadata: { user_id: userId },
                trial_period_days: 0
            },
            allow_promotion_codes: true
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Create checkout session error:', err);
        res.status(500).json({ error: err.message || 'Erreur lors de la création de la session de paiement' });
    }
});

/**
 * POST /api/subscription/create-portal-session
 * Create a Stripe Customer Portal session so the user can manage subscription / payment method.
 */
router.post('/create-portal-session', authenticateToken, async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe non configuré' });
    }
    try {
        const userId = req.user.id;
        const user = await db.get('SELECT stripe_customer_id FROM users WHERE id = ?', userId);
        if (!user?.stripe_customer_id) {
            return res.status(400).json({ error: 'Aucun abonnement à gérer' });
        }
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${baseUrl}/dashboard/settings`
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Create portal session error:', err);
        res.status(500).json({ error: err.message || 'Erreur' });
    }
});

/**
 * Apply subscription to user: set plan, credits, stripe_subscription_id, subscription_status
 */
async function applySubscriptionToUser(userId, planName, stripeSubscriptionId) {
    const plan = await getPlan(planName);
    const credits = plan?.limits?.credits_per_month ?? 100;
    await db.run(`
        UPDATE users SET 
            plan = ?, 
            credits = ?, 
            stripe_subscription_id = ?, 
            subscription_status = 'active',
            subscription_end_date = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, planName, credits, stripeSubscriptionId || null, userId);
}

/**
 * Remove subscription: set plan to free, clear stripe_subscription_id, set credits to free tier
 */
async function removeSubscriptionFromUser(userId) {
    const plan = await getPlan('free');
    const credits = plan?.limits?.credits_per_month ?? 100;
    await db.run(`
        UPDATE users SET 
            plan = 'free', 
            credits = ?, 
            stripe_subscription_id = NULL, 
            subscription_status = 'canceled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, credits, userId);
}

/**
 * POST /api/subscription/webhook
 * Stripe webhook. Must be registered with express.raw({ type: 'application/json' }) before body parser.
 * req.body is a Buffer (raw).
 */
export async function handleStripeWebhook(req, res) {
    if (!stripe || !stripeWebhookSecret) {
        return res.status(503).send('Webhook non configuré');
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id || session.subscription_data?.metadata?.user_id;
                if (!userId) break;
                const subscriptionId = session.subscription;
                if (!subscriptionId) break;
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = sub.items?.data?.[0]?.price?.id;
                const planRow = await db.get('SELECT name FROM subscription_plans WHERE stripe_price_id = ?', priceId);
                const planName = planRow?.name || 'starter';
                await applySubscriptionToUser(userId, planName, subscriptionId);
                break;
            }
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const userId = sub.metadata?.user_id;
                if (!userId) break;
                if (sub.status === 'active' || sub.status === 'trialing') {
                    const priceId = sub.items?.data?.[0]?.price?.id;
                    const planRow = await db.get('SELECT name FROM subscription_plans WHERE stripe_price_id = ?', priceId);
                    const planName = planRow?.name || 'starter';
                    await applySubscriptionToUser(userId, planName, sub.id);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const userId = sub.metadata?.user_id;
                if (userId) await removeSubscriptionFromUser(userId);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const user = await db.get('SELECT id FROM users WHERE stripe_customer_id = ?', customerId);
                if (user) {
                    await db.run('UPDATE users SET subscription_status = ? WHERE id = ?', 'past_due', user.id);
                }
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error('Stripe webhook handler error:', err);
        return res.status(500).send('Webhook handler failed');
    }
    res.send();
}

export default router;
