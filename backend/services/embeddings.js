/**
 * Embedding service for RAG (vectorization of knowledge base).
 * Uses Google Gemini Embedding API (gemini-embedding-001).
 * Legacy text-embedding-004 is deprecated / removed in v1beta.
 */

const EMBEDDING_MODEL = 'gemini-embedding-001';
const MAX_INPUT_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 15_000;

export async function getEmbedding(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('[Embeddings] GEMINI_API_KEY not set, skipping embedding');
        return null;
    }
    const truncated = typeof text === 'string' && text.length > MAX_INPUT_TOKENS * 4
        ? text.slice(0, MAX_INPUT_TOKENS * 4)
        : (text || '');
    if (!truncated.trim()) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${EMBEDDING_MODEL}`,
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
