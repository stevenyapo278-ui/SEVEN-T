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
 * Créer une facture de paiement et obtenir l'URL de la page de paiement (HPP)
 * @param {Object} params
 * @param {number} params.amount - Montant
 * @param {string} params.currency - ISO (USD, EUR, XOF...)
 * @param {string} params.description - Description / référence commande
 * @param {string} params.referenceId - ID unique (ex: order_id ou payment_link id)
 * @param {string} params.returnUrl - URL de retour après paiement
 * @param {string} params.callbackUrl - URL webhook pour notification de statut
 * @param {string} [params.service] - Service PaymentsTrust (ex: payment_card_usd_hpp). Si non fourni, déduit de la devise.
 * @returns {Promise<{ invoiceId: string, paymentUrl: string }|null>}
 */
async function createInvoice({ amount, currency, description, referenceId, returnUrl, callbackUrl, service }) {
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
            console.error('[PaymeTrust] Create invoice error:', res.status, data);
            return null;
        }

        const attrs = data?.data?.attributes;
        const paymentUrl = attrs?.flow_data?.action || attrs?.flow_data?.metadata?.action;
        const invoiceId = data?.data?.id;

        if (!paymentUrl || !invoiceId) {
            console.error('[PaymeTrust] Response missing flow_data.action or id:', data);
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
    createInvoice
};
