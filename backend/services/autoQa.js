/**
 * Auto-QA: second LLM call to validate the first LLM's response (judge).
 * Returns OK or BLOCK + reason. Used by Decision Engine to escalate on BLOCK.
 * Can be enabled via platform setting or env (cost/latency).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../database/init.js';

let geminiClient = null;

function getClient() {
    if (geminiClient) return geminiClient;
    if (process.env.GEMINI_API_KEY) {
        geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return geminiClient;
}

const JUDGE_PROMPT = `Tu es un vérificateur de réponses d'assistant commercial.
Règles: réponds UNIQUEMENT par une ligne commençant par OK ou BLOCK.
- BLOCK si: la réponse contient une promesse de garantie, un prix inventé, un ton inapproprié, une information non autorisée ou hors catalogue, ou une promesse de délai non autorisée.
- OK sinon.
Si BLOCK, écris ensuite une courte raison (ex: "BLOCK Promesse de garantie interdite.").
Exemple: "OK" ou "BLOCK Prix non présent dans le catalogue."`;

/**
 * Run Auto-QA judge on the proposed AI response.
 * @param {string} responseText - The text the first LLM produced
 * @param {Object} [options] - { userMessage?: string } optional context
 * @returns {Promise<{ status: 'OK' | 'BLOCK', reason?: string }>}
 */
export async function runAutoQa(responseText, options = {}) {
    const client = getClient();
    if (!client) {
        return { status: 'OK', reason: 'auto_qa_unavailable' };
    }
    try {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash-latest',
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 80
            }
        });
        const text = `Réponse à vérifier:\n"""\n${(responseText || '').slice(0, 1500)}\n"""\n\n${options.userMessage ? `Message du client: ${options.userMessage.slice(0, 200)}\n\n` : ''}${JUDGE_PROMPT}`;
        const result = await model.generateContent(text);
        const raw = (result.response?.text() || '').trim().toUpperCase();
        if (raw.startsWith('BLOCK')) {
            const reason = raw.slice(5).trim() || 'BLOCK';
            return { status: 'BLOCK', reason: reason || 'Auto-QA BLOCK' };
        }
        return { status: 'OK' };
    } catch (err) {
        console.warn('[Auto-QA] Judge call failed:', err.message);
        return { status: 'OK', reason: 'auto_qa_error' };
    }
}

/**
 * Whether Auto-QA is enabled (platform setting or env).
 * @param {string} [tenantId] - Optional tenant for future per-tenant flag
 * @returns {boolean}
 */
export function isAutoQaEnabled(tenantId = null) {
    const fromEnv = process.env.AUTO_QA_ENABLED === '1' || process.env.AUTO_QA_ENABLED === 'true';
    if (fromEnv) return true;
    try {
        const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('auto_qa_enabled');
        return row?.value === '1' || row?.value === 'true';
    } catch {
        return false;
    }
}

export const autoQaService = { runAutoQa, isAutoQaEnabled };
