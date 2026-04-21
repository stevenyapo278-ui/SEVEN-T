import db from '../database/init.js';

/**
 * Usage Statistics Service
 * Calculates current usage against plan limits
 */

export async function getUserUsageStats(userId) {
    try {
        // 1. Agents count
        const agents = await db.get('SELECT COUNT(*)::integer as count FROM agents WHERE user_id = ?', userId);
        
        // 2. WhatsApp accounts count
        const whatsapp = await db.get('SELECT COUNT(*)::integer as count FROM agents WHERE user_id = ? AND whatsapp_connected = 1', userId);
        
        // 3. Knowledge items count
        const knowledge = await db.get(`
            SELECT COUNT(*)::integer as count 
            FROM knowledge_base 
            WHERE agent_id IN (SELECT id FROM agents WHERE user_id = ?)
        `, userId);
        
        const globalKnowledge = await db.get('SELECT COUNT(*)::integer as count FROM global_knowledge WHERE user_id = ?', userId);

        // 4. Monthly Messages (from credit_usage)
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const messages = await db.get(`
            SELECT COUNT(*)::integer as count 
            FROM credit_usage 
            WHERE user_id = ? 
              AND (action = 'ai_message' OR action = 'whatsapp_message_sent' OR action LIKE '%message%')
              AND amount > 0
              AND created_at >= ?
        `, userId, thisMonth.toISOString());

        // 5. Templates count
        const templates = await db.get('SELECT COUNT(*)::integer as count FROM message_templates WHERE user_id = ?', userId);

        return {
            agents: agents?.count || 0,
            whatsapp_accounts: whatsapp?.count || 0,
            knowledge_items: (knowledge?.count || 0) + (globalKnowledge?.count || 0),
            messages_this_month: messages?.count || 0,
            templates: templates?.count || 0
        };
    } catch (error) {
        console.error('Error calculating user usage stats:', error);
        return {
            agents: 0,
            whatsapp_accounts: 0,
            knowledge_items: 0,
            messages_this_month: 0,
            templates: 0
        };
    }
}

export default {
    getUserUsageStats
};
