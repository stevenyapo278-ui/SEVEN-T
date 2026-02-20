/**
 * Currency utilities for backend
 */

// Supported currencies
export const CURRENCIES = {
    XOF: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (BCEAO)', position: 'after', decimals: 0 },
    XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)', position: 'after', decimals: 0 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', position: 'after', decimals: 2 },
    USD: { code: 'USD', symbol: '$', name: 'Dollar US', position: 'before', decimals: 2 },
    GBP: { code: 'GBP', symbol: '£', name: 'Livre Sterling', position: 'before', decimals: 2 },
    MAD: { code: 'MAD', symbol: 'DH', name: 'Dirham Marocain', position: 'after', decimals: 2 },
    TND: { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien', position: 'after', decimals: 2 },
    GNF: { code: 'GNF', symbol: 'GNF', name: 'Franc Guinéen', position: 'after', decimals: 0 },
    NGN: { code: 'NGN', symbol: '₦', name: 'Naira Nigérian', position: 'before', decimals: 2 },
};

// Default currency
export const DEFAULT_CURRENCY = 'XOF';

/**
 * Format a price according to the currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (XOF, EUR, USD, etc.)
 * @returns {string} - Formatted price string
 */
export function formatPrice(amount, currencyCode = DEFAULT_CURRENCY) {
    const curr = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
    
    // Format number
    const formattedNumber = curr.decimals === 0 
        ? Math.round(amount).toLocaleString('fr-FR')
        : Number(amount).toLocaleString('fr-FR', {
            minimumFractionDigits: curr.decimals,
            maximumFractionDigits: curr.decimals
        });
    
    // Position symbol
    if (curr.position === 'before') {
        return `${curr.symbol}${formattedNumber}`;
    } else {
        return `${formattedNumber} ${curr.symbol}`;
    }
}

/**
 * Get currency symbol
 * @param {string} currencyCode - The currency code
 * @returns {string} - Currency symbol
 */
export function getCurrencySymbol(currencyCode = DEFAULT_CURRENCY) {
    return CURRENCIES[currencyCode]?.symbol || CURRENCIES[DEFAULT_CURRENCY].symbol;
}

export default { CURRENCIES, DEFAULT_CURRENCY, formatPrice, getCurrencySymbol };
