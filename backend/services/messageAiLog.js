/**
 * Structured logging for AI message pipeline (audit, debug, billing).
 * One record per message processed by the AI path, after Decision Engine.
 * No secrets or unnecessary PII; payload hashed for integrity.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';

const MAX_SUMMARY_LENGTH = 500;

function hashPayload(payload) {
    if (!payload) return null;
    try {
        const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return crypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
    } catch {
        return null;
    }
}

/**
 * Write one audit log row for an AI-handled message.
 * @param {Object} params
 * @param {string} params.conversation_id
 * @param {string} params.tenant_id
 * @param {string} [params.direction='in']
 * @param {Object} [params.payload] - Normalized payload (will be hashed)
 * @param {string} [params.prompt_version]
 * @param {string} [params.llm_output_summary] - Truncated or hashed LLM response (no PII)
 * @param {Object} [params.auto_qa_result] - { status, reason } (optional)
 * @param {string} params.decision - 'send' | 'escalate' | 'fallback'
 * @param {string} [params.decision_reason]
 * @param {number} [params.response_time_ms]
 */
export async function logMessageAi(params) {
    try {
        const id = uuidv4();
        const payload_hash = params.payload ? hashPayload(params.payload) : null;
        let llm_output_summary = params.llm_output_summary ?? null;
        if (typeof llm_output_summary === 'string' && llm_output_summary.length > MAX_SUMMARY_LENGTH) {
            llm_output_summary = llm_output_summary.slice(0, MAX_SUMMARY_LENGTH) + '…';
        }
        const auto_qa_result = params.auto_qa_result != null
            ? JSON.stringify(params.auto_qa_result)
            : null;

        await db.run(`
            INSERT INTO message_ai_logs (
                id, conversation_id, tenant_id, direction, payload_hash,
                prompt_version, llm_output_summary, auto_qa_result,
                decision, decision_reason, response_time_ms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
            id,
            params.conversation_id,
            params.tenant_id,
            params.direction ?? 'in',
            payload_hash,
            params.prompt_version ?? null,
            llm_output_summary,
            auto_qa_result,
            params.decision,
            params.decision_reason ?? null,
            params.response_time_ms ?? null
        );
    } catch (err) {
        console.error('[messageAiLog] Failed to write log:', err.message);
    }
}

export const messageAiLogService = { logMessageAi };
