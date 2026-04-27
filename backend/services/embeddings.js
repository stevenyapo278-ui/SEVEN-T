import db from '../database/init.js';

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';
const MAX_INPUT_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 15_000;

export async function getEmbedding(text, modelOverride = null) {
    let apiKey = process.env.GEMINI_API_KEY;
    try {
        const record = await db.get('SELECT api_key FROM ai_api_keys WHERE provider = ? AND is_active = 1 LIMIT 1', 'gemini');
        if (record && record.api_key) apiKey = record.api_key;
    } catch (e) {
        // ignore DB error
    }

    if (!apiKey) {
        console.warn('[Embeddings] No GEMINI api key found in DB or env, skipping embedding');
        return null;
    }

    // Try to get model from DB if not provided
    let embeddingModel = modelOverride;
    if (!embeddingModel) {
        try {
            const setting = await db.get('SELECT value FROM platform_settings WHERE key = ?', 'embedding_model');
            embeddingModel = setting?.value || DEFAULT_EMBEDDING_MODEL;
        } catch (e) {
            embeddingModel = DEFAULT_EMBEDDING_MODEL;
        }
    }

    const truncated = typeof text === 'string' && text.length > MAX_INPUT_TOKENS * 4
        ? text.slice(0, MAX_INPUT_TOKENS * 4)
        : (text || '');
    if (!truncated.trim()) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${embeddingModel}`,
                content: {
                    parts: [{ text: truncated }]
                }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const err = await res.text();
            console.warn('[Embeddings] API error:', res.status, err);
            return null;
        }
        const data = await res.json();
        return data.embedding?.values ?? data.embeddings?.[0]?.values ?? null;
    } catch (e) {
        clearTimeout(timeoutId);
        const msg = e?.cause?.code === 'ETIMEDOUT' || e?.name === 'AbortError'
            ? 'timeout'
            : (e?.message || 'fetch failed');
        console.warn('[Embeddings] Request failed:', msg, e?.cause?.code || '');
        return null;
    }
}

export default { getEmbedding };
