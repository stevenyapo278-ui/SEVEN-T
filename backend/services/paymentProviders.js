/**
 * Payment providers registry: per-user credentials + adapter per provider.
 * Used by createPaymentLink to resolve user config and call the right adapter.
 */

import db from '../database/init.js';
import geniuspay from './geniuspay.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const PROVIDER_IDS = ['geniuspay'];

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
        // Try to decrypt; if it fails, it might be legacy plain text
        const decrypted = decrypt(row.credentials);
        return JSON.parse(decrypted);
    } catch (e) {
        // Fallback for legacy plain text during migration
        try {
            return JSON.parse(row.credentials);
        } catch {
            return null;
        }
    }
}

/**
 * Encrypt and save credentials for a user and provider.
 */
export async function saveProviderConfig(userId, provider, credentialsObj) {
    if (!userId || !provider || !credentialsObj) return;
    const plainText = JSON.stringify(credentialsObj);
    const encrypted = encrypt(plainText);
    
    await db.run(`
        INSERT INTO user_payment_providers (user_id, provider, credentials, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, provider) DO UPDATE SET credentials = EXCLUDED.credentials, updated_at = CURRENT_TIMESTAMP
    `, userId, provider, encrypted);
}

/**
 * Check if a provider is configured for a user (for API responses, no secrets).
 */
export async function isProviderConfiguredForUser(userId, provider) {
    const config = await getProviderConfig(userId, provider);
    if (!config) return false;
    const adapter = getAdapter(provider);
    return adapter.isConfigured(config);
}

/**
 * Adapter interface: { isConfigured(credentials), createInvoice(credentials, params) }
 */
function getAdapter(provider) {
    switch (provider) {

        case 'geniuspay':
            return {
                isConfigured(credentials) {
                    return !!(credentials?.api_key && credentials?.api_secret);
                },
                async createInvoice(credentials, params) {
                    return geniuspay.createInvoiceWithCredentials(credentials, params);
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
        geniuspay: { id: 'geniuspay', name: 'GeniusPay', icon: '💎' }
    };
}

export function getSupportedProviderIds() {
    return [...PROVIDER_IDS];
}

