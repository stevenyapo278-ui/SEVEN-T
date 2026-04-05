import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import * as paymentProviders from './paymentProviders.js';
import { hasFeature } from '../config/plans.js';

export const baseUrl = () => (process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Common logic to create a payment link (manual or provider-based).
 * Used by BOTH the routes/payments.js and services/orders.js.
 */
export async function createPaymentLink(userId, opts) {
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
    const paymentModuleEnabled = planHasPayment || userFlag;

    if (provider !== 'manual' && paymentModuleEnabled) {
        const returnUrl = `${baseUrl()}/pay/${shortId}/return`;
        const webhookPath = '/api/payments/webhook/geniuspay';
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
    if (!payment) return null;

    const finalUrl = payment_url_external || `${baseUrl()}/pay/${shortId}`;
    
    return {
        ...payment,
        short_id: shortId,
        payment_url: finalUrl,
        // QR Code URL (high resolution for printing/whatsapp)
        payment_qr: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(finalUrl)}`
    };
}
