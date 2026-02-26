/**
 * Next-best-action: proactive messages (abandoned cart, cold relance).
 * Module: next_best_action (activatable per plan).
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { hasModule } from '../config/plans.js';
import { whatsappManager } from './whatsapp.js';

const ABANDONED_CART_HOURS = 24;
const ABANDONED_CART_COOLDOWN_HOURS = 48;
const COLD_RELANCE_DAYS = 7;
const COLD_RELANCE_COOLDOWN_DAYS = 14;

/**
 * Get user IDs that have the next_best_action module (from plan).
 */
async function getUsersWithNextBestAction() {
    const users = await db.all('SELECT id, plan FROM users');
    const out = [];
    for (const u of users || []) {
        const planName = u.plan || 'free';
        if (await hasModule(planName, 'next_best_action')) {
            out.push(u.id);
        }
    }
    return out;
}

/**
 * Check if we already sent a proactive message of this type for this conversation recently.
 */
async function hasRecentProactive(conversationId, type, withinHours) {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    const row = await db.get(
        'SELECT 1 FROM proactive_message_log WHERE conversation_id = ? AND type = ? AND sent_at >= ? LIMIT 1',
        conversationId,
        type,
        since
    );
    return !!row;
}

/**
 * Log a proactive send and optionally save the message to the conversation.
 */
async function logProactiveSend(conversationId, userId, type, messageText) {
    const id = uuidv4();
    await db.run(
        'INSERT INTO proactive_message_log (id, conversation_id, user_id, type, sent_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        id,
        conversationId,
        userId,
        type
    );
    return id;
}

/**
 * Abandoned cart: last message > 24h ago, no order for this conversation, no abandoned_cart send in 48h.
 * Returns list of { conversation, agent, toolId, userId }.
 */
async function getAbandonedCartCandidates(userId) {
    const agents = await db.all(
        `SELECT a.id as agent_id, a.tool_id, a.user_id FROM agents a
         INNER JOIN tools t ON t.id = a.tool_id AND t.type = 'whatsapp'
         WHERE a.user_id = ?`,
        userId
    );
    if (!agents?.length) return [];

    const cutoff = new Date(Date.now() - ABANDONED_CART_HOURS * 60 * 60 * 1000).toISOString();
    const cooldown = new Date(Date.now() - ABANDONED_CART_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const candidates = [];

    for (const agent of agents) {
        if (!whatsappManager.isConnected(agent.tool_id)) continue;

        const convs = await db.all(
            `SELECT c.id, c.contact_jid, c.contact_name, c.last_message_at
             FROM conversations c
             WHERE c.agent_id = ?
             AND c.contact_jid NOT LIKE '%@g.us'
             AND c.contact_jid NOT LIKE '%broadcast%'
             AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
             AND c.last_message_at IS NOT NULL
             AND c.last_message_at < ?`,
            agent.agent_id,
            cutoff
        );

        for (const conv of convs || []) {
            const hasOrder = await db.get(
                'SELECT 1 FROM orders WHERE conversation_id = ? LIMIT 1',
                conv.id
            );
            if (hasOrder) continue;

            const recent = await db.get(
                'SELECT 1 FROM proactive_message_log WHERE conversation_id = ? AND type = ? AND sent_at >= ? LIMIT 1',
                conv.id,
                'abandoned_cart',
                cooldown
            );
            if (recent) continue;

            candidates.push({
                conversation: conv,
                agent,
                toolId: agent.tool_id,
                userId: agent.user_id
            });
        }
    }
    return candidates;
}

/**
 * Cold relance: no message since N days, no cold_relance in cooldown period.
 */
async function getColdRelanceCandidates(userId) {
    const agents = await db.all(
        `SELECT a.id as agent_id, a.tool_id, a.user_id FROM agents a
         INNER JOIN tools t ON t.id = a.tool_id AND t.type = 'whatsapp'
         WHERE a.user_id = ?`,
        userId
    );
    if (!agents?.length) return [];

    const cutoff = new Date(Date.now() - COLD_RELANCE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const cooldown = new Date(Date.now() - COLD_RELANCE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const candidates = [];

    for (const agent of agents) {
        if (!whatsappManager.isConnected(agent.tool_id)) continue;

        const convs = await db.all(
            `SELECT c.id, c.contact_jid, c.contact_name, c.last_message_at
             FROM conversations c
             WHERE c.agent_id = ?
             AND c.contact_jid NOT LIKE '%@g.us'
             AND c.contact_jid NOT LIKE '%broadcast%'
             AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
             AND c.last_message_at IS NOT NULL
             AND c.last_message_at < ?`,
            agent.agent_id,
            cutoff
        );

        for (const conv of convs || []) {
            const recent = await db.get(
                'SELECT 1 FROM proactive_message_log WHERE conversation_id = ? AND type = ? AND sent_at >= ? LIMIT 1',
                conv.id,
                'cold_relance',
                cooldown
            );
            if (recent) continue;

            candidates.push({
                conversation: conv,
                agent,
                toolId: agent.tool_id,
                userId: agent.user_id
            });
        }
    }
    return candidates;
}

const DEFAULT_ABANDONED_CART_MESSAGE = 'Bonjour ! Vous aviez commencé une commande ou consulté nos produits. Souhaitez-vous que l\'on vous aide à finaliser ?';
const DEFAULT_COLD_RELANCE_MESSAGE = 'Bonjour ! Nous ne vous avons pas vu depuis un moment. Une question, une commande ? Nous sommes là pour vous.';

/**
 * Run next-best-action for one user: send abandoned_cart and cold_relance where applicable.
 */
async function runForUser(userId) {
    let sent = 0;

    const abandoned = await getAbandonedCartCandidates(userId);
    for (const { conversation, toolId, userId: uid } of abandoned) {
        try {
            await whatsappManager.sendMessage(
                toolId,
                conversation.contact_jid,
                DEFAULT_ABANDONED_CART_MESSAGE
            );
            await logProactiveSend(conversation.id, uid, 'abandoned_cart');
            sent++;
        } catch (e) {
            console.warn(`[NextBestAction] abandoned_cart send failed conv=${conversation.id}:`, e?.message);
        }
    }

    const cold = await getColdRelanceCandidates(userId);
    for (const { conversation, toolId, userId: uid } of cold) {
        try {
            await whatsappManager.sendMessage(
                toolId,
                conversation.contact_jid,
                DEFAULT_COLD_RELANCE_MESSAGE
            );
            await logProactiveSend(conversation.id, uid, 'cold_relance');
            sent++;
        } catch (e) {
            console.warn(`[NextBestAction] cold_relance send failed conv=${conversation.id}:`, e?.message);
        }
    }

    return sent;
}

/**
 * Run next-best-action job for all users with the module.
 */
export async function runNextBestActionJob() {
    const userIds = await getUsersWithNextBestAction();
    let totalSent = 0;
    for (const uid of userIds) {
        const sent = await runForUser(uid);
        totalSent += sent;
    }
    if (userIds.length > 0) {
        console.log(`[NextBestAction] Ran for ${userIds.length} user(s), proactive sent: ${totalSent}`);
    }
    return { usersProcessed: userIds.length, sent: totalSent };
}
