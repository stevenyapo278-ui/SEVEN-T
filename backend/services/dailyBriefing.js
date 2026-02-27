/**
 * Daily briefing: send a daily summary (yesterday's stats) by email or WhatsApp.
 * Module: daily_briefing (activatable per plan).
 */
import db from '../database/init.js';
import emailService from './email.js';
import { whatsappManager } from './whatsapp.js';

/**
 * Get stats for a user for a given date (conversations, messages, orders, revenue, leads, needs_human).
 * @param {string} userId
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getStatsForDate(userId, dateStr) {
    const start = `${dateStr}T00:00:00.000Z`;
    const end = `${dateStr}T23:59:59.999Z`;

    const agentsRow = await db.get(
        'SELECT COUNT(*) as count FROM agents WHERE user_id = ?',
        userId
    );
    const agentIdsRows = await db.all(
        'SELECT id FROM agents WHERE user_id = ?',
        userId
    );
    const agentIds = (agentIdsRows || []).map((r) => r.id);
    if (agentIds.length === 0) {
        return {
            conversationsActive: 0,
            newMessages: 0,
            ordersCount: 0,
            ordersAmount: 0,
            leadsCount: 0,
            needsHumanCount: 0
        };
    }

    const placeholders = agentIds.map(() => '?').join(',');
    const convActive = await db.get(
        `SELECT COUNT(DISTINCT c.id) as count FROM conversations c
         WHERE c.agent_id IN (${placeholders})
         AND (c.last_message_at >= ?::timestamp AND c.last_message_at <= ?::timestamp)
         AND c.contact_jid NOT LIKE '%@g.us' AND c.contact_jid NOT LIKE '%broadcast%'`,
        ...agentIds,
        start,
        end
    );
    const newMessages = await db.get(
        `SELECT COUNT(*) as count FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.agent_id IN (${placeholders})
         AND (m.created_at >= ?::timestamp AND m.created_at <= ?::timestamp)`,
        ...agentIds,
        start,
        end
    );
    const orders = await db.get(
        `SELECT COUNT(*) as count, COALESCE(SUM(o.total_amount), 0) as sum
         FROM orders o
         WHERE o.user_id = ? AND (o.created_at >= ?::timestamp AND o.created_at <= ?::timestamp)`,
        userId,
        start,
        end
    );
    const leads = await db.get(
        `SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND (created_at >= ?::timestamp AND created_at <= ?::timestamp)`,
        userId,
        start,
        end
    );
    const needsHuman = await db.get(
        `SELECT COUNT(DISTINCT c.id) as count FROM conversations c
         WHERE c.agent_id IN (${placeholders})
         AND c.needs_human = 1
         AND (c.last_message_at >= ?::timestamp AND c.last_message_at <= ?::timestamp)`,
        ...agentIds,
        start,
        end
    );

    return {
        conversationsActive: Number(convActive?.count ?? 0),
        newMessages: Number(newMessages?.count ?? 0),
        ordersCount: Number(orders?.count ?? 0),
        ordersAmount: Number(orders?.sum ?? 0),
        leadsCount: Number(leads?.count ?? 0),
        needsHumanCount: Number(needsHuman?.count ?? 0)
    };
}

/**
 * Build a short summary text from stats.
 * @param {Object} stats - from getStatsForDate
 * @param {string} dateLabel - e.g. "Hier"
 * @returns {string}
 */
export function buildSummaryText(stats, dateLabel = 'Hier') {
    const parts = [
        `${dateLabel} : ${stats.conversationsActive} conversation(s) active(s), ${stats.newMessages} nouveau(x) message(s).`
    ];
    if (stats.ordersCount > 0) {
        parts.push(` ${stats.ordersCount} commande(s) (${stats.ordersAmount} FCFA).`);
    } else {
        parts.push(' 0 commande.');
    }
    if (stats.leadsCount > 0) {
        parts.push(` ${stats.leadsCount} lead(s).`);
    }
    if (stats.needsHumanCount > 0) {
        parts.push(` ${stats.needsHumanCount} à surveiller (besoin humain).`);
    }
    return parts.join('');
}

/**
 * Send daily briefing for one user (email or WhatsApp according to settings).
 * Updates last_sent_at on success.
 * @param {string} userId
 * @returns {Promise<{ sent: boolean, channel?: string, error?: string }>}
 */
export async function sendBriefingForUser(userId) {
    const row = await db.get(
        'SELECT * FROM daily_briefing_settings WHERE user_id = ? AND enabled = 1',
        userId
    );
    if (!row) {
        return { sent: false };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const stats = await getStatsForDate(userId, dateStr);
    const dateLabel = 'Hier';
    const summary = buildSummaryText(stats, dateLabel);

    if (row.channel === 'email') {
        const email = row.email || (await db.get('SELECT email FROM users WHERE id = ?', userId))?.email;
        if (!email) {
            return { sent: false, error: 'Aucune adresse email configurée' };
        }
        try {
            await emailService.sendEmail({
                to: email,
                subject: `[Résumé quotidien] ${dateStr}`,
                html: `
                    <h1>Résumé quotidien</h1>
                    <p>${summary.replace(/\n/g, '<br>')}</p>
                    <p>— SEVEN T</p>
                `,
                text: summary
            });
            await db.run(
                'UPDATE daily_briefing_settings SET last_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                userId
            );
            return { sent: true, channel: 'email' };
        } catch (e) {
            return { sent: false, error: e?.message || 'Email failed' };
        }
    }

    if (row.channel === 'whatsapp' && row.whatsapp_contact_jid) {
        const agentWithTool = await db.get(
            `SELECT a.id, a.tool_id FROM agents a
             INNER JOIN tools t ON t.id = a.tool_id AND t.type = 'whatsapp'
             WHERE a.user_id = ?
             LIMIT 1`,
            userId
        );
        if (!agentWithTool?.tool_id || !whatsappManager.isConnected(agentWithTool.tool_id)) {
            return { sent: false, error: 'WhatsApp non connecté pour cet utilisateur' };
        }
        try {
            await whatsappManager.sendMessage(
                agentWithTool.tool_id,
                row.whatsapp_contact_jid,
                `📊 Résumé quotidien\n\n${summary}`
            );
            await db.run(
                'UPDATE daily_briefing_settings SET last_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                userId
            );
            return { sent: true, channel: 'whatsapp' };
        } catch (e) {
            return { sent: false, error: e?.message || 'WhatsApp send failed' };
        }
    }

    return { sent: false, error: 'Canal ou contact non configuré' };
}

/**
 * Run daily briefing for all users who have enabled it and whose preferred_hour matches current hour.
 * Only sends once per day (last_sent_at today = skip).
 */
export async function runDailyBriefingJob() {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartStr = todayStart.toISOString();

    const rows = await db.all(
        `SELECT user_id FROM daily_briefing_settings
         WHERE enabled = 1 AND preferred_hour = ?
         AND (last_sent_at IS NULL OR last_sent_at < ?::timestamp)`,
        currentHour,
        todayStartStr
    );

    let sent = 0;
    for (const r of rows || []) {
        const result = await sendBriefingForUser(r.user_id);
        if (result.sent) sent++;
        else if (result.error) {
            console.warn(`[DailyBriefing] user ${r.user_id}: ${result.error}`);
        }
    }
    if (rows?.length > 0) {
        console.log(`[DailyBriefing] Ran for ${rows.length} user(s), sent: ${sent}`);
    }
    return { processed: rows?.length ?? 0, sent };
}
