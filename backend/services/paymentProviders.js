/**
 * Payment providers registry: per-user credentials + adapter per provider.
 * Used by createPaymentLink to resolve user config and call the right adapter.
 */

import db from '../database/init.js';
import paymetrust from './paymetrust.js';

const PROVIDER_IDS = ['paymetrust'];

/**
 * Get stored credentials for a user and provider (no secrets in logs).
 * @param {string} userId
 * @param {string} provider - e.g. 'paymetrust'
 * @returns {Promise<Object|null>} credentials object or null if not configured
 */
export async function getProviderConfig(userId, provider) {
    if (!userId || !provider) return null;
    const row = await db.get(
        'SELECT credentials FROM user_payment_providers WHERE user_id = ? AND provider = ?',
        userId,
        provider
    );
    if (!row || !row.credentials) return null;
    try {
        return JSON.parse(row.credentials);
    } catch {
        return null;
    }
}

/**
 * Check if a provider is configured for a user (for API responses, no secrets).
 */
export async function isProviderConfiguredForUser(userId, provider) {
    const config = await getProviderConfig(userId, provider);
    return !!config && getAdapter(provider).isConfigured(config);
}

/**
 * Adapter interface: { isConfigured(credentials), createInvoice(credentials, params) }
 */
function getAdapter(provider) {
    switch (provider) {
        case 'paymetrust':
            return {
                isConfigured(credentials) {
                    return !!(credentials?.account_id && credentials?.api_key);
                },
                async createInvoice(credentials, params) {
                    return paymetrust.createInvoiceWithCredentials(credentials, params);
                }
            };
        default:
            return {
                isConfigured() { return false; },
                async createInvoice() { return null; }
            };
    }
}

/**
 * Create an invoice via the given provider using the user's credentials.
 * @param {string} userId
 * @param {string} provider - e.g. 'paymetrust'
 * @param {Object} params - amount, currency, description, referenceId, returnUrl, callbackUrl, etc.
 * @returns {Promise<{ invoiceId: string, paymentUrl: string }|null>}
 */
export async function createInvoiceForUser(userId, provider, params) {
    const credentials = await getProviderConfig(userId, provider);
    if (!credentials) return null;
    const adapter = getAdapter(provider);
    if (!adapter.isConfigured(credentials)) return null;
    return adapter.createInvoice(credentials, params);
}

/**
 * List of supported providers with display info (no secrets).
 * Used by GET /payments/providers to build list; configured status is added per user in the route.
 */
export function getSupportedProviders() {
    return {
        paymetrust: { id: 'paymetrust', name: 'PaymeTrust', icon: '🔒' }
    };
}

export function getSupportedProviderIds() {
    return [...PROVIDER_IDS];
}
