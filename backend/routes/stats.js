import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const agentsCountRow = await db.get('SELECT COUNT(*) as count FROM agents WHERE user_id = ?', req.user.id);
        const agentsCount = agentsCountRow?.count ?? 0;

        const activeAgentsRow = await db.get('SELECT COUNT(*) as count FROM agents WHERE user_id = ? AND whatsapp_connected = 1', req.user.id);
        const activeAgents = activeAgentsRow?.count ?? 0;

        const conversationsCountRow = await db.get(`
            SELECT COUNT(*) as count FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id);
        const conversationsCount = conversationsCountRow?.count ?? 0;

        const messagesCountRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id);
        const messagesCount = messagesCountRow?.count ?? 0;

        const todayMessagesRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? 
            AND (m.created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id);
        const todayMessages = todayMessagesRow?.count ?? 0;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekConversationsRow = await db.get(`
            SELECT COUNT(*) as count FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.user.id, weekAgo.toISOString());
        const weekConversations = weekConversationsRow?.count ?? 0;

        const user = await db.get('SELECT credits FROM users WHERE id = ?', req.user.id);

        const productsCountRow = await db.get('SELECT COUNT(*) as count FROM products WHERE user_id = ?', req.user.id);
        const productsCount = productsCountRow?.count ?? 0;

        const knowledgeCountRow = await db.get(`
            SELECT COUNT(*) as count FROM knowledge_base kb
            JOIN agents a ON kb.agent_id = a.id
            WHERE a.user_id = ?
        `, req.user.id);
        const knowledgeCount = knowledgeCountRow?.count ?? 0;

        const globalKnowledgeCountRow = await db.get('SELECT COUNT(*) as count FROM global_knowledge WHERE user_id = ?', req.user.id);
        const globalKnowledgeCount = globalKnowledgeCountRow?.count ?? 0;

        const leadsCountRow = await db.get('SELECT COUNT(*) as count FROM leads WHERE user_id = ?', req.user.id);
        const leadsCount = leadsCountRow?.count ?? 0;

        const pendingOrdersRow = await db.get("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'pending'", req.user.id);
        const pendingOrders = pendingOrdersRow?.count ?? 0;

        res.json({
            stats: {
                agents: {
                    total: Number(agentsCount),
                    active: Number(activeAgents)
                },
                conversations: {
                    total: Number(conversationsCount),
                    this_week: Number(weekConversations)
                },
                messages: {
                    total: Number(messagesCount),
                    today: Number(todayMessages)
                },
                credits: user?.credits ?? 0,
                products: Number(productsCount),
                knowledge_items: Number(knowledgeCount),
                global_knowledge: Number(globalKnowledgeCount),
                leads: Number(leadsCount),
                pending_orders: Number(pendingOrders)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get weekly activity data for charts
router.get('/weekly-activity', authenticateToken, async (req, res) => {
    try {
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        const sixDaysAgoStr = sixDaysAgo.toISOString();

        const messagesPerDay = await db.all(`
            SELECT 
                (m.created_at AT TIME ZONE 'UTC')::date as date,
                COUNT(*) as messages
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
            GROUP BY (m.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, req.user.id, sixDaysAgoStr);

        const conversationsPerDay = await db.all(`
            SELECT 
                (c.created_at AT TIME ZONE 'UTC')::date as date,
                COUNT(*) as conversations
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
            GROUP BY (c.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, req.user.id, sixDaysAgoStr);

        // Create a map of the last 7 days with proper French day names
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            const msgData = messagesPerDay.find(m => m.date && String(m.date).startsWith(dateStr));
            const convData = conversationsPerDay.find(c => c.date && String(c.date).startsWith(dateStr));
            
            data.push({
                name: dayName,
                date: dateStr,
                messages: Number(msgData?.messages || 0),
                conversations: Number(convData?.conversations || 0)
            });
        }

        res.json({ data });
    } catch (error) {
        console.error('Get weekly activity error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get agent stats
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
    try {
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', req.params.agentId, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const totalConversationsRow = await db.get(`
            SELECT COUNT(*) as count FROM conversations 
            WHERE agent_id = ?
            AND contact_jid NOT LIKE '%@g.us'
            AND contact_jid NOT LIKE '%broadcast%'
            AND (contact_jid LIKE '%@s.whatsapp.net' OR contact_jid LIKE '%@lid')
        `, req.params.agentId);
        const totalConversations = totalConversationsRow?.count ?? 0;

        const activeConversationsRow = await db.get("SELECT COUNT(*) as count FROM conversations WHERE agent_id = ? AND status = 'active'", req.params.agentId);
        const activeConversations = activeConversationsRow?.count ?? 0;

        const totalMessagesRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.agent_id = ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.params.agentId);
        const totalMessages = totalMessagesRow?.count ?? 0;

        const messagesByRole = await db.all(`
            SELECT role, COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.agent_id = ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
            GROUP BY role
        `, req.params.agentId);
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartStr = todayStart.toISOString();

        const todayMessagesRow = await db.get(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.agent_id = ? AND m.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
        `, req.params.agentId, todayStartStr);
        const todayMessages = todayMessagesRow?.count ?? 0;

        const todayConversationsRow = await db.get(`
            SELECT COUNT(*) as count FROM conversations 
            WHERE agent_id = ? AND last_message_at >= ?
            AND contact_jid NOT LIKE '%@g.us'
            AND contact_jid NOT LIKE '%broadcast%'
            AND (contact_jid LIKE '%@s.whatsapp.net' OR contact_jid LIKE '%@lid')
        `, req.params.agentId, todayStartStr);
        const todayConversations = todayConversationsRow?.count ?? 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const messagesPerDay = await db.all(`
            SELECT (m.created_at AT TIME ZONE 'UTC')::date as date, COUNT(*) as count 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.agent_id = ? AND m.created_at >= ?
            AND c.contact_jid NOT LIKE '%@g.us'
            AND c.contact_jid NOT LIKE '%broadcast%'
            AND (c.contact_jid LIKE '%@s.whatsapp.net' OR c.contact_jid LIKE '%@lid')
            GROUP BY (m.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, req.params.agentId, sevenDaysAgo.toISOString());

        const knowledgeCountRow = await db.get('SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id = ?', req.params.agentId);
        const knowledgeCount = knowledgeCountRow?.count ?? 0;

        res.json({
            agent,
            stats: {
                conversations: {
                    total: Number(totalConversations),
                    active: Number(activeConversations),
                    today: Number(todayConversations)
                },
                messages: {
                    total: Number(totalMessages),
                    today: Number(todayMessages),
                    by_role: messagesByRole,
                    per_day: messagesPerDay
                },
                knowledge_items: Number(knowledgeCount)
            }
        });
    } catch (error) {
        console.error('Get agent stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
