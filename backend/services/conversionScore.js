/**
 * Conversion score: compute a 0-100 score for a conversation (potential purchase, engagement, risk).
 * Module: conversion_score (activatable per plan).
 */
import db from '../database/init.js';

/**
 * Compute conversion score for a conversation and optionally persist it.
 * Factors: message count, last activity, sentiment, presence of order intent, human_takeover.
 * @param {string} conversationId
 * @param {Object} [options] - { save: true }
 * @returns {Promise<{ score: number, factors: Object }>}
 */
export async function computeConversionScore(conversationId, options = { save: true }) {
    const conv = await db.get(`
        SELECT c.id, c.sentiment, c.human_takeover, c.last_message_at, c.needs_human
        FROM conversations c
        WHERE c.id = ?
    `, conversationId);
    if (!conv) return { score: 0, factors: {} };

    const msgCount = await db.get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', conversationId);
    const count = Number(msgCount?.count ?? 0);

    const hasOrder = await db.get(`
        SELECT 1 FROM orders o
        JOIN conversations c ON c.id = o.conversation_id
        WHERE c.id = ?
        LIMIT 1
    `, conversationId);

    const lastAt = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0;
    const hoursSinceActive = (Date.now() - lastAt) / (1000 * 60 * 60);

    let score = 50; // base
    const factors = { message_count: count, has_order: !!hasOrder, sentiment: conv.sentiment || 'neutral' };

    if (count >= 5) score += 15;
    else if (count >= 2) score += 5;
    if (hasOrder) score += 20;
    if (conv.sentiment === 'positive') score += 10;
    if (conv.sentiment === 'frustrated' || conv.needs_human) score -= 15;
    if (conv.human_takeover) score += 5; // already engaged
    if (hoursSinceActive < 24) score += 5;
    if (hoursSinceActive > 72) score -= 10;

    score = Math.max(0, Math.min(100, score));
    factors.score = score;

    // Suggested action for merchant
    let suggested_action = null;
    if (conv.sentiment === 'frustrated' || conv.needs_human) {
        suggested_action = 'transfer_human';
    } else if (score >= 70 && !hasOrder) {
        suggested_action = 'send_offer';
    } else if (hoursSinceActive >= 24 && hoursSinceActive < 72 && score >= 40 && score < 70) {
        suggested_action = 'relance_2h';
    }
    factors.suggested_action = suggested_action;

    if (options.save) {
        await db.run(
            'UPDATE conversations SET conversion_score = ?, conversion_score_updated_at = CURRENT_TIMESTAMP, suggested_action = ? WHERE id = ?',
            score,
            suggested_action,
            conversationId
        );
    }
    return { score, factors };
}

/**
 * Update conversion score for a conversation (call after new message or order).
 */
export async function updateConversionScore(conversationId) {
    return computeConversionScore(conversationId, { save: true });
}
