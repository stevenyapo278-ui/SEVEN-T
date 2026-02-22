/**
 * PaymeTrust / PaymentsTrust API
 * Documentation: https://portal.paymentstrust.com/docs/en/integration/payments/h2h
 * Création d'invoice → URL de paiement (HPP) pour envoyer au client
 */

const PAYMETRUST_BASE_URL = process.env.PAYMETRUST_BASE_URL || 'https://api.paymentstrust.com';
const PAYMETRUST_ACCOUNT_ID = process.env.PAYMETRUST_ACCOUNT_ID;
const PAYMETRUST_API_KEY = process.env.PAYMETRUST_API_KEY;

const isConfigured = () => !!(PAYMETRUST_ACCOUNT_ID && PAYMETRUST_API_KEY);

/**
 * Create invoice using explicit credentials (per-user config).
 * @param {Object} credentials - { account_id, api_key }
 * @param {Object} params - amount, currency, description, referenceId, returnUrl, callbackUrl, service
 * @returns {Promise<{ invoiceId: string, paymentUrl: string }|null>}
 */
async function createInvoiceWithCredentials(credentials, { amount, currency, description, referenceId, returnUrl, callbackUrl, service }) {
    const accountId = credentials?.account_id || credentials?.accountId;
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!accountId || !apiKey) {
        console.warn('[PaymeTrust] credentials missing account_id or api_key');
        return null;
    }

    const safeService = service || getServiceForCurrency(currency);
    const body = {
        data: {
            type: 'payment-invoices',
            attributes: {
                reference_id: referenceId,
                description: description || `Paiement ${referenceId}`,
                currency: currency || 'XOF',
                amount: Number(amount),
                service: safeService,
                return_url: returnUrl,
                callback_url: callbackUrl
            }
        }
    };

    const auth = Buffer.from(`${accountId}:${apiKey}`).toString('base64');
    const url = `${(process.env.PAYMETRUST_BASE_URL || PAYMETRUST_BASE_URL).replace(/\/$/, '')}/api/payment-invoices`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[PaymeTrust] Create invoice error:', res.status);
            return null;
        }

        const attrs = data?.data?.attributes;
        const paymentUrl = attrs?.flow_data?.action || attrs?.flow_data?.metadata?.action;
        const invoiceId = data?.data?.id;

        if (!paymentUrl || !invoiceId) {
            console.error('[PaymeTrust] Response missing flow_data.action or id');
            return null;
        }

        return { invoiceId, paymentUrl };
    } catch (err) {
        console.error('[PaymeTrust] Request error:', err.message);
        return null;
    }
}

/**
 * Créer une facture de paiement (env or credentials).
 * Si credentials est fourni, l'utiliser ; sinon variables d'env (test/admin).
 * @param {Object} params
 * @param {Object} [params.credentials] - optional { account_id, api_key }
 * @returns {Promise<{ invoiceId: string, paymentUrl: string }|null>}
 */
async function createInvoice({ amount, currency, description, referenceId, returnUrl, callbackUrl, service, credentials }) {
    if (credentials && (credentials.account_id || credentials.accountId) && (credentials.api_key || credentials.apiKey)) {
        return createInvoiceWithCredentials(credentials, { amount, currency, description, referenceId, returnUrl, callbackUrl, service });
    }
    if (!isConfigured()) {
        console.warn('[PaymeTrust] PAYMETRUST_ACCOUNT_ID / PAYMETRUST_API_KEY non configurés');
        return null;
    }

    const safeService = service || getServiceForCurrency(currency);
    const body = {
        data: {
            type: 'payment-invoices',
            attributes: {
                reference_id: referenceId,
                description: description || `Paiement ${referenceId}`,
                currency: currency || 'XOF',
                amount: Number(amount),
                service: safeService,
                return_url: returnUrl,
                callback_url: callbackUrl
            }
        }
    };

    const auth = Buffer.from(`${PAYMETRUST_ACCOUNT_ID}:${PAYMETRUST_API_KEY}`).toString('base64');
    const url = `${PAYMETRUST_BASE_URL.replace(/\/$/, '')}/api/payment-invoices`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[PaymeTrust] Create invoice error:', res.status);
            return null;
        }

        const attrs = data?.data?.attributes;
        const paymentUrl = attrs?.flow_data?.action || attrs?.flow_data?.metadata?.action;
        const invoiceId = data?.data?.id;

        if (!paymentUrl || !invoiceId) {
            console.error('[PaymeTrust] Response missing flow_data.action or id');
            return null;
        }

        return { invoiceId, paymentUrl };
    } catch (err) {
        console.error('[PaymeTrust] Request error:', err.message);
        return null;
    }
}

/**
 * Service PaymentsTrust selon la devise (à adapter selon votre contrat)
 */
function getServiceForCurrency(currency) {
    const upper = (currency || 'XOF').toUpperCase();
    const map = {
        USD: 'payment_card_usd_hpp',
        EUR: 'payment_card_eur_hpp',
        XOF: 'payment_card_xof_hpp'
    };
    return map[upper] || map.XOF || 'payment_card_usd_hpp';
}

export default {
    isConfigured,
    createInvoice,
    createInvoiceWithCredentials
};
