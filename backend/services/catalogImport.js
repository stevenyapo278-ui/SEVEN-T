/**
 * Catalog import from URL: fetch a page and extract product-like items (meta, schema, heuristics).
 * Module: catalog_import (activatable per plan).
 */
import * as cheerio from 'cheerio';

const MAX_PRODUCTS = 50;
const FETCH_TIMEOUT_MS = 15000;

/**
 * Parse price string (e.g. "1 500 FCFA", "29.99 €") to number or null.
 */
function parsePrice(text) {
    if (text == null || text === '') return null;
    const cleaned = String(text)
        .replace(/\s/g, '')
        .replace(/[^\d.,]/g, '')
        .replace(/,/g, '.');
    const match = cleaned.match(/[\d.]+/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    return Number.isNaN(num) ? null : num;
}

/**
 * Extract products from HTML (and optional base URL for resolving relative links).
 * @param {string} html
 * @param {string} baseUrl - used to resolve relative image/link URLs
 * @returns {Promise<Array<{ title: string, price?: number, imageUrl?: string, description?: string }>>}
 */
export async function extractProductsFromHtml(html, baseUrl = '') {
    const $ = cheerio.load(html, { decodeEntities: true });
    const base = baseUrl ? new URL(baseUrl) : null;
    const resolve = (url) => {
        if (!url || !base) return url || null;
        try {
            return new URL(url, base).href;
        } catch {
            return url;
        }
    };

    const products = [];
    const seen = new Set();

    // 1) JSON-LD Product / ItemList
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const json = JSON.parse($(el).html() || '{}');
            const items = json['@graph'] || (json['@type'] ? [json] : []);
            for (const item of Array.isArray(items) ? items : [items]) {
                if (!item) continue;
                const type = item['@type'];
                if (type === 'Product') {
                    const name = item.name || item.title;
                    if (name && !seen.has(String(name).trim())) {
                        seen.add(String(name).trim());
                        products.push({
                            title: String(name).trim(),
                            price: parsePrice(item.offers?.price ?? item.offers?.[0]?.price ?? item.price) ?? undefined,
                            imageUrl: resolve(item.image?.[0] ?? item.image) ?? undefined,
                            description: item.description ? String(item.description).slice(0, 500) : undefined
                        });
                    }
                } else if (type === 'ItemList' && Array.isArray(item.itemListElement)) {
                    for (const entry of item.itemListElement) {
                        const name = entry.name ?? entry.title;
                        if (name && !seen.has(String(name).trim())) {
                            seen.add(String(name).trim());
                            products.push({
                                title: String(name).trim(),
                                price: parsePrice(entry.offers?.price ?? entry.price) ?? undefined,
                                imageUrl: resolve(entry.image?.[0] ?? entry.image) ?? undefined,
                                description: entry.description ? String(entry.description).slice(0, 500) : undefined
                            });
                        }
                    }
                }
            }
        } catch (e) {
            // ignore invalid JSON-LD
        }
    });

    // 2) Meta og:product (single product page)
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogTitle && !seen.has(ogTitle.trim())) {
        seen.add(ogTitle.trim());
        products.push({
            title: ogTitle.trim(),
            price: undefined,
            imageUrl: resolve(ogImage) ?? undefined,
            description: $('meta[property="og:description"]').attr('content')?.slice(0, 500)
        });
    }

    // 3) Heuristics: common product card / list selectors
    const selectors = [
        '[data-product]',
        '.product',
        '.product-item',
        '.product-card',
        '[class*="product"]',
        'article[itemtype*="Product"]',
        '.woocommerce-loop-product',
        '.product-list-item'
    ];

    for (const sel of selectors) {
        $(sel).each((_, el) => {
            if (products.length >= MAX_PRODUCTS) return false;
            const $el = $(el);
            const title =
                $el.find('[class*="title"], [class*="name"], .product-title, .product-name, h2, h3').first().text().trim() ||
                $el.attr('data-product-name') ||
                $el.attr('aria-label') ||
                '';
            if (!title || seen.has(title)) return;
            seen.add(title);

            let price = null;
            const priceEl = $el.find('[class*="price"], .amount, [data-price]').first();
            if (priceEl.length) {
                price = parsePrice(priceEl.text()) ?? parsePrice(priceEl.attr('data-price'));
            }
            let img = $el.find('img').attr('src') || $el.attr('data-image');
            if (img) img = resolve(img);

            products.push({
                title: title.slice(0, 255),
                price: price ?? undefined,
                imageUrl: img ?? undefined,
                description: $el.find('[class*="description"], [class*="desc"]').first().text().trim().slice(0, 500) || undefined
            });
        });
    }

    return products.slice(0, MAX_PRODUCTS);
}

/**
 * Fetch URL and extract products.
 * @param {string} url
 * @returns {Promise<Array<{ title: string, price?: number, imageUrl?: string, description?: string }>>}
 */
export async function importFromUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('URL invalide');
    }
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('URL invalide');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL doit être en http ou https');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEVEN-T-CatalogBot/1.0)'
            },
            redirect: 'follow'
        });
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            throw new Error('Délai dépassé lors du chargement de la page');
        }
        throw new Error(e?.message || 'Impossible de charger la page');
    }
    clearTimeout(timeout);

    if (!response.ok) {
        throw new Error(`Page non accessible (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        throw new Error('La URL ne pointe pas vers une page HTML');
    }

    const html = await response.text();
    const baseUrl = response.url || url;
    const products = await extractProductsFromHtml(html, baseUrl);

    if (products.length === 0) {
        throw new Error('Aucun produit détecté sur cette page');
    }

    return products;
}
