/**
 * Text-to-Speech service for voice replies (e.g. when client sends a voice message).
 * Uses OpenAI TTS when OPENAI_API_KEY is set; otherwise returns null (fallback to text).
 */

import OpenAI from 'openai';

let openaiClient = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key') {
    try {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
        console.warn('[TTS] OpenAI client init failed:', e?.message);
    }
}

const DEFAULT_VOICE = 'nova'; // neutral, works well for FR/EN
const MAX_INPUT_LENGTH = 4096;

/**
 * Generate audio buffer from text (OpenAI TTS).
 * @param {string} text - Text to speak
 * @param {{ lang?: string, voice?: string }} options - Optional language hint and voice
 * @returns {Promise<Buffer|null>} - Audio buffer (mp3) or null if TTS unavailable/failed
 */
export async function generate(text, options = {}) {
    if (!openaiClient || !text || !text.trim()) return null;
    const trimmed = text.trim().slice(0, MAX_INPUT_LENGTH);
    if (!trimmed) return null;

    try {
        const model = 'tts-1-hd'; // or 'tts-1', 'gpt-4o-mini-tts'
        const voice = options.voice || DEFAULT_VOICE;
        const response = await openaiClient.audio.speech.create({
            model,
            voice,
            input: trimmed,
            response_format: 'mp3'
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.warn('[TTS] Generate error:', error?.message);
        return null;
    }
}

export function isAvailable() {
    return !!openaiClient;
}

export default { generate, isAvailable };
