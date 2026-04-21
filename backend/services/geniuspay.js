/**
 * GeniusPay API Service
 * Documentation: https://pay.genius.ci/docs/api
 */

import fetch from 'node-fetch';

const GENIUSPAY_BASE_URL = process.env.GENIUSPAY_BASE_URL || 'https://pay.genius.ci/api/v1/merchant';

/**
 * Check if GeniusPay is configured in environment (for platform-wide usage if needed).
 */
const isConfigured = () => !!(process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_API_SECRET);

/**
 * Create invoice/payment link using explicit credentials (per-user config).
 * @param {Object} credentials - { api_key, api_secret }
 * @param {Object} params - amount, currency, description, referenceId, returnUrl, callbackUrl, customer
 * @returns {Promise<{ invoiceId: string, paymentUrl: string }|null>}
 */
async function createInvoiceWithCredentials(credentials, { amount, currency, description, referenceId, returnUrl, callbackUrl, customer }) {
    const apiKey = credentials?.api_key || credentials?.apiKey;
    const apiSecret = credentials?.api_secret || credentials?.apiSecret;

    if (!apiKey || !apiSecret) {
        console.warn('[GeniusPay] credentials missing api_key or api_secret');
        return null;
    }

    const body = {
        amount: Number(amount),
        currency: currency || 'XOF',
        description: description || `Paiement ${referenceId}`,
        success_url: returnUrl,
        error_url: returnUrl, // GeniusPay docs mention error_url
        metadata: {
            reference_id: referenceId
        }
    };

    if (customer) {
        body.customer = {
            name: customer.name || undefined,
            email: customer.email || undefined,
            phone: customer.phone || undefined
        };
    }

    const url = `${GENIUSPAY_BASE_URL.replace(/\/$/, '')}/payments`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[GeniusPay] Create payment error:', res.status, data);
            return null;
        }

        if (data.success && data.data) {
            return {
                invoiceId: String(data.data.id || data.data.reference),
                paymentUrl: data.data.payment_url || data.data.checkout_url
            };
        }

        console.error('[GeniusPay] Invalid response structure:', data);
        return null;
    } catch (err) {
        console.error('[GeniusPay] Request error:', err.message);
        return null;
    }
}

/**
 * Create a recurring subscription using explicit credentials.
 * @param {Object} credentials - { api_key, api_secret }
 * @param {Object} params - planId, amount, currency, description, customer, callbackUrl, metadata
 * @returns {Promise<{ subscriptionId: string, checkoutUrl: string }|null>}
 */
async function createSubscriptionWithCredentials(credentials, { planId, amount, currency, description, customer, returnUrl, callbackUrl, metadata }) {
    const apiKey = credentials?.api_key || credentials?.apiKey;
    const apiSecret = credentials?.api_secret || credentials?.apiSecret;

    if (!apiKey || !apiSecret) {
        console.warn('[GeniusPay] credentials missing api_key or api_secret');
        return null;
    }

    const body = {
        plan_id: planId,
        amount: Number(amount),
        currency: currency || 'XOF',
        description: description || `Abonnement ${planId}`,
        success_url: returnUrl,
        error_url: returnUrl,
        callback_url: callbackUrl,
        customer: {
            name: customer?.name || undefined,
            email: customer?.email || undefined,
            phone: customer?.phone || undefined
        },
        metadata: metadata || {}
    };

    const url = `${GENIUSPAY_BASE_URL.replace(/\/$/, '')}/subscriptions`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[GeniusPay] Create subscription error:', res.status, data);
            return null;
        }

        if (data.success && data.data) {
            return {
                subscriptionId: String(data.data.id || data.data.uuid),
                checkoutUrl: data.data.payment_url || data.data.checkout_url
            };
        }

        return null;
    } catch (err) {
        console.error('[GeniusPay] Subscription request error:', err.message);
        return null;
    }
}

/**
 * Cancel a subscription.
 */
async function cancelSubscriptionWithCredentials(credentials, subscriptionId) {
    const apiKey = credentials?.api_key || credentials?.apiKey;
    const apiSecret = credentials?.api_secret || credentials?.apiSecret;

    const url = `${GENIUSPAY_BASE_URL.replace(/\/$/, '')}/subscriptions/${subscriptionId}/cancel`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            }
        });
        const data = await res.json();
        return data.success;
    } catch (err) {
        console.error('[GeniusPay] Cancel subscription error:', err.message);
        return false;
    }
}

export default {
    isConfigured,
    createInvoiceWithCredentials,
    createSubscriptionWithCredentials,
    cancelSubscriptionWithCredentials
};
