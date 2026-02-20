import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Export user data (JSON)
router.get('/me/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db.get(`
            SELECT id, email, name, company, plan, credits, is_admin, is_active,
                   created_at, updated_at, currency, media_model, subscription_status,
                   subscription_end_date, stripe_customer_id, stripe_subscription_id, google_id
            FROM users
            WHERE id = ?
        `, userId);

        const agents = await db.all('SELECT * FROM agents WHERE user_id = ?', userId);
        const agentIds = agents.map(agent => agent.id);

        const conversations = await db.all(`
            SELECT c.*
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
        `, userId);
        const conversationIds = conversations.map(conv => conv.id);

        let messages = [];
        if (conversationIds.length > 0) {
            const placeholders = conversationIds.map(() => '?').join(',');
            messages = await db.all(`
                SELECT *
                FROM messages
                WHERE conversation_id IN (${placeholders})
                ORDER BY created_at ASC
            `, ...conversationIds);
        }

        let knowledgeBase = [];
        if (agentIds.length > 0) {
            const placeholders = agentIds.map(() => '?').join(',');
            knowledgeBase = await db.all(`
                SELECT *
                FROM knowledge_base
                WHERE agent_id IN (${placeholders})
            `, ...agentIds);
        }

        const globalKnowledge = await db.all('SELECT * FROM global_knowledge WHERE user_id = ?', userId);

        let agentGlobalKnowledge = [];
        if (agentIds.length > 0) {
            const placeholders = agentIds.map(() => '?').join(',');
            agentGlobalKnowledge = await db.all(`
                SELECT *
                FROM agent_global_knowledge
                WHERE agent_id IN (${placeholders})
            `, ...agentIds);
        }

        const products = await db.all('SELECT * FROM products WHERE user_id = ?', userId);
        const orders = await db.all('SELECT * FROM orders WHERE user_id = ?', userId);
        const orderIds = orders.map(order => order.id);

        let orderItems = [];
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            orderItems = await db.all(`
                SELECT *
                FROM order_items
                WHERE order_id IN (${placeholders})
            `, ...orderIds);
        }

        const leads = await db.all('SELECT * FROM leads WHERE user_id = ?', userId);

        const exportPayload = {
            exported_at: new Date().toISOString(),
            version: 1,
            user,
            agents,
            conversations,
            messages,
            products,
            orders,
            order_items: orderItems,
            leads,
            knowledge_base: knowledgeBase,
            global_knowledge: globalKnowledge,
            agent_global_knowledge: agentGlobalKnowledge
        };

        const filename = `seven-t-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(exportPayload));
    } catch (error) {
        console.error('Export user data error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
