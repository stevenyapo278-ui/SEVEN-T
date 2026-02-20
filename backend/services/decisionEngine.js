/**
 * Decision Engine — centralizes the decision to send, escalate, or fallback
 * based on pre-processing, LLM output, and optional Auto-QA result.
 * Used by the WhatsApp handler so all logic lives in one place.
 */
import { aiLogger } from '../utils/logger.js';

/**
 * @typedef {'send' | 'escalate' | 'fallback'} DecisionAction
 * @typedef {Object} PreProcessingInput
 * @property {boolean} [ignore] - Pre-processing says do not call LLM (no send)
 * @property {boolean} [escalate] - Pre-processing says escalate without LLM (e.g. insult, injection)
 * @property {boolean} [needsHuman] - Pre-analysis says human intervention needed
 * @property {string} [intent_hint] - Intent from pre-analysis (e.g. 'greeting', 'order', 'inquiry'); for these we do not escalate on need_human so the AI reply is sent
 * @typedef {Object} LlmOutputInput
 * @property {string} [content] - Text to send
 * @property {boolean} [need_human] - LLM or post-processing says human needed
 * @typedef {Object} AutoQaResultInput
 * @property {string} [status] - 'OK' | 'BLOCK'
 * @property {string} [reason]
 * @typedef {Object} DecisionResult
 * @property {DecisionAction} action
 * @property {string} [reason]
 */

/**
 * Decides the action for a given message: send AI response, escalate to human, or use fallback.
 *
 * Rules (plan):
 * - If Pre-Processing says "ignore" → no LLM was called; caller should not send (action can be 'send' with no content, or we use a dedicated no-op; we use 'fallback' with reason so caller can skip sending).
 * - If Pre-Processing says "escalate" → action: 'escalate'.
 * - If llmOutput.need_human === true and intent_hint not in ('greeting', 'order', 'inquiry') → action: 'escalate'.
 * - If Auto-QA present and status === 'BLOCK' → action: 'escalate' (or 'fallback').
 * - Else → action: 'send'.
 *
 * @param {PreProcessingInput} preProcessing - Result from message analyzer / pre-processing
 * @param {LlmOutputInput|null} llmOutput - LLM response (null if LLM was not called)
 * @param {AutoQaResultInput|null} autoQaResult - Optional Auto-QA result
 * @returns {DecisionResult}
 */
function decide(preProcessing, llmOutput, autoQaResult = null) {
    aiLogger.debug('decisionEngine.decide called', {
        preProcessing,
        llmOutput_need_human: llmOutput?.need_human,
        autoQaResult
    });
    
    if (preProcessing?.ignore) {
        return { action: 'fallback', reason: 'pre_processing_ignore' };
    }
    if (preProcessing?.escalate) {
        return { action: 'escalate', reason: 'pre_processing_escalate' };
    }
    // Intents where AI should respond even if need_human=true (AI has knowledge base)
    const noEscalateOnNeedHuman = ['greeting', 'order', 'inquiry', 'return_request'].includes(preProcessing?.intent_hint);
    const needHuman = Boolean(llmOutput?.need_human || preProcessing?.needsHuman);
    
    aiLogger.debug('decisionEngine.need_human check', {
        need_human: needHuman,
        noEscalateOnNeedHuman,
        intent_hint: preProcessing?.intent_hint
    });
    
    if (needHuman && !noEscalateOnNeedHuman) {
        aiLogger.info('decisionEngine.escalate due to need_human', {
            intent_hint: preProcessing?.intent_hint,
            noEscalateOnNeedHuman
        });
        return { action: 'escalate', reason: 'llm_need_human' };
    }
    if (autoQaResult && autoQaResult.status === 'BLOCK') {
        return { action: 'escalate', reason: autoQaResult.reason || 'auto_qa_block' };
    }
    return { action: 'send' };
}

export const decisionEngine = { decide };
