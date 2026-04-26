/**
 * Next-best-action: proactive messages (abandoned cart, cold relance).
 * Module: next_best_action (activatable per plan).
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { hasModule, hasModuleForUser } from '../config/plans.js';
import { whatsappManager } from './whatsapp.js';
import { aiService } from './ai.js';

const ABANDONED_CART_HOURS = 24;
const ABANDONED_CART_COOLDOWN_HOURS = 48;
const COLD_RELANCE_DAYS = 7;
const COLD_RELANCE_COOLDOWN_DAYS = 14;

/**
 * Get user IDs that should have the proactive engine running.
 * Module 3 (next_best_action) is the engine of Module 16 (proactive_advisor).
 */
async function getUsersWithEngine() {
    const users = await db.all(`
        SELECT id, plan, next_best_action_enabled
        FROM users 
        WHERE (next_best_action_enabled = 1 OR next_best_action_enabled IS NULL)
        AND is_active = 1
    `);
    const out = [];
    for (const u of users || []) {
        const hasM3 = await hasModuleForUser(u, 'next_best_action');
        if (hasM3) {
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
async function logProactiveSend(conversationId, userId, agentId, type, messageText, reason, isPending = false) {
    const id = uuidv4();
    if (isPending) {
        await db.run(
            'INSERT INTO proactive_message_log (id, conversation_id, user_id, agent_id, type, status, message_content, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            id, conversationId, userId, agentId, type, 'pending', messageText, reason
        );
    } else {
        await db.run(
            'INSERT INTO proactive_message_log (id, conversation_id, user_id, agent_id, type, status, message_content, reason, sent_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            id, conversationId, userId, agentId, type, 'sent', messageText, reason
        );
    }
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
    
    // Check validation config
    const userRow = await db.get('SELECT plan, next_best_action_enabled, proactive_requires_validation FROM users WHERE id = ?', userId);
    if (!userRow) return 0;

    const hasModule3 = await hasModuleForUser(userRow, 'next_best_action');
    if (!hasModule3) {
        console.log(`[NextBestAction] User ${userId} has engine running but Module 3 (Next Best Action) is disabled. Skipping features.`);
        return 0;
    }

    const requiresValidation = userRow.proactive_requires_validation === 1;

    const abandoned = await getAbandonedCartCandidates(userId);
    for (const { conversation, agent, toolId, userId: uid } of abandoned) {
        try {
            // Fetch history for AI analysis
            const history = await db.all(
                'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10',
                conversation.id
            );
            history.reverse();

            const aiRelance = await aiService.generateProactiveMessage(agent, history, uid);

            if (aiRelance.should_skip) {
                console.log(`[NextBestAction] Skipping abandoned_cart for conv=${conversation.id} (AI decision)`);
                continue;
            }

            const messageToSend = aiRelance.message || DEFAULT_ABANDONED_CART_MESSAGE;
            const type = aiRelance.type || 'abandoned_cart';
            const reason = aiRelance.reason || 'Panier abandonné (>24h)';

            if (requiresValidation) {
                console.log(`[NextBestAction] ${type} généré pour conv=${conversation.id} (En attente)`);
                await logProactiveSend(conversation.id, uid, agent.agent_id, type, messageToSend, reason, true);
            } else {
                await whatsappManager.sendMessage(
                    toolId,
                    conversation.contact_jid,
                    messageToSend
                );
                await logProactiveSend(conversation.id, uid, agent.agent_id, type, messageToSend, reason, false);
            }
            sent++;
        } catch (e) {
            console.warn(`[NextBestAction] abandoned_cart send failed conv=${conversation.id}:`, e?.message);
        }
    }

    const cold = await getColdRelanceCandidates(userId);
    for (const { conversation, agent, toolId, userId: uid } of cold) {
        try {
            // Cold relance is usually less about the specific last message but we still check
            const history = await db.all(
                'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 5',
                conversation.id
            );
            history.reverse();

            const aiRelance = await aiService.generateProactiveMessage(agent, history, uid);
            
            if (aiRelance.should_skip) {
                console.log(`[NextBestAction] Skipping cold_relance for conv=${conversation.id} (AI decision)`);
                continue;
            }

            const messageToSend = aiRelance.message || DEFAULT_COLD_RELANCE_MESSAGE;
            const type = aiRelance.type || 'cold_relance';
            const reason = aiRelance.reason || 'Client inactif (>7j)';

            if (requiresValidation) {
                console.log(`[NextBestAction] ${type} généré pour conv=${conversation.id} (En attente)`);
                await logProactiveSend(conversation.id, uid, agent.agent_id, type, messageToSend, reason, true);
            } else {
                await whatsappManager.sendMessage(
                    toolId,
                    conversation.contact_jid,
                    messageToSend
                );
                await logProactiveSend(conversation.id, uid, agent.agent_id, type, messageToSend, reason, false);
            }
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
    const userIds = await getUsersWithEngine();
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
