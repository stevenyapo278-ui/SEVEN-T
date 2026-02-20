import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Get comprehensive analytics overview
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '7d' } = req.query;

        let daysBack = 7;
        if (period === '30d') daysBack = 30;
        if (period === '90d') daysBack = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startDateStr = startDate.toISOString();

        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysBack);
        const prevStartDateStr = prevStartDate.toISOString();

        const r1 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND c.created_at >= ?`, userId, startDateStr);
        const currentConversations = r1?.count ?? 0;

        const r2 = await db.get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND m.created_at >= ?`, userId, startDateStr);
        const currentMessages = r2?.count ?? 0;

        const r3 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND created_at >= ?`, userId, startDateStr);
        const currentLeads = r3?.count ?? 0;

        const r4 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at >= ?`, userId, startDateStr);
        const currentOrders = r4?.count ?? 0;

        const r5 = await db.get(`SELECT SUM(total_amount) as sum FROM orders WHERE user_id = ? AND status = 'completed' AND created_at >= ?`, userId, startDateStr);
        const currentRevenue = r5?.sum ?? 0;

        const r6 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND c.created_at >= ? AND c.created_at < ?`, userId, prevStartDateStr, startDateStr);
        const prevConversations = r6?.count ?? 0;

        const r7 = await db.get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND m.created_at >= ? AND m.created_at < ?`, userId, prevStartDateStr, startDateStr);
        const prevMessages = r7?.count ?? 0;

        const r8 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND created_at >= ? AND created_at < ?`, userId, prevStartDateStr, startDateStr);
        const prevLeads = r8?.count ?? 0;

        const r9 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at >= ? AND created_at < ?`, userId, prevStartDateStr, startDateStr);
        const prevOrders = r9?.count ?? 0;

        // Calculate growth percentages
        const calcGrowth = (current, prev) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - prev) / prev) * 100);
        };

        res.json({
            overview: {
                conversations: {
                    value: currentConversations,
                    growth: calcGrowth(currentConversations, prevConversations)
                },
                messages: {
                    value: currentMessages,
                    growth: calcGrowth(currentMessages, prevMessages)
                },
                leads: {
                    value: currentLeads,
                    growth: calcGrowth(currentLeads, prevLeads)
                },
                orders: {
                    value: currentOrders,
                    growth: calcGrowth(currentOrders, prevOrders)
                },
                revenue: {
                    value: currentRevenue,
                    currency: 'XOF'
                }
            },
            period: period
        });
    } catch (error) {
        console.error('Get analytics overview error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get messages over time chart data
router.get('/messages-timeline', authenticateToken, async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let daysBack = 7;
        if (period === '30d') daysBack = 30;
        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        const data = await db.all(`
            SELECT 
                (m.created_at AT TIME ZONE 'UTC')::date as date,
                COUNT(*)::int as total,
                SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END)::int as incoming,
                SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END)::int as outgoing
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.created_at >= ?
            GROUP BY (m.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, req.user.id, since.toISOString());

        res.json({ data });
    } catch (error) {
        console.error('Get messages timeline error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get response time analytics
router.get('/response-time', authenticateToken, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const avgResponseTime = await db.get(`
            SELECT AVG(diff_mins) as avg_minutes FROM (
                SELECT EXTRACT(EPOCH FROM (MIN(m2.created_at) - m1.created_at)) / 60.0 as diff_mins
                FROM messages m1
                JOIN conversations c ON m1.conversation_id = c.id
                JOIN agents a ON c.agent_id = a.id
                LEFT JOIN messages m2 ON m2.conversation_id = m1.conversation_id AND m2.role = 'assistant' AND m2.created_at > m1.created_at
                WHERE a.user_id = ? AND m1.role = 'user' AND m1.created_at >= ?
                GROUP BY m1.id, m1.created_at
                HAVING MIN(m2.created_at) IS NOT NULL
            ) t
        `, req.user.id, sevenDaysAgo.toISOString());

        const avg = Number(avgResponseTime?.avg_minutes) || 0;
        res.json({
            avgResponseTimeMinutes: Math.round(avg),
            avgResponseTimeFormatted: formatDuration(avg)
        });
    } catch (error) {
        console.error('Get response time error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get agent performance comparison
router.get('/agent-performance', authenticateToken, async (req, res) => {
    try {
        const agents = await db.all(`
            SELECT 
                a.id,
                a.name,
                a.is_active,
                a.whatsapp_connected,
                COUNT(DISTINCT c.id)::int as conversations,
                COUNT(m.id)::int as messages,
                (SELECT COUNT(*) FROM messages m2 
                 JOIN conversations c2 ON m2.conversation_id = c2.id 
                 WHERE c2.agent_id = a.id AND m2.role = 'assistant')::int as responses
            FROM agents a
            LEFT JOIN conversations c ON a.id = c.agent_id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE a.user_id = ?
            GROUP BY a.id, a.name, a.is_active, a.whatsapp_connected
            ORDER BY messages DESC
        `, req.user.id);

        res.json({ agents });
    } catch (error) {
        console.error('Get agent performance error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get peak hours analysis
router.get('/peak-hours', authenticateToken, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const hourlyData = await db.all(`
            SELECT 
                EXTRACT(HOUR FROM (m.created_at AT TIME ZONE 'UTC'))::int as hour,
                COUNT(*)::int as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.role = 'user' AND m.created_at >= ?
            GROUP BY EXTRACT(HOUR FROM (m.created_at AT TIME ZONE 'UTC'))
            ORDER BY hour
        `, req.user.id, thirtyDaysAgo.toISOString());

        // Fill in missing hours
        const fullData = [];
        for (let h = 0; h < 24; h++) {
            const existing = hourlyData.find(d => d.hour === h);
            fullData.push({
                hour: h,
                label: `${h.toString().padStart(2, '0')}:00`,
                count: existing?.count || 0
            });
        }

        // Find peak hours
        const sortedByCount = [...fullData].sort((a, b) => b.count - a.count);
        const peakHours = sortedByCount.slice(0, 3).map(h => h.label);

        res.json({ data: fullData, peakHours });
    } catch (error) {
        console.error('Get peak hours error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get conversion funnel
router.get('/conversion-funnel', authenticateToken, async (req, res) => {
    try {
        const r1 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ?`, req.user.id);
        const conversations = r1?.count ?? 0;

        const r2 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) >= 3`, req.user.id);
        const activeConversations = r2?.count ?? 0;

        const r3 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ?`, req.user.id);
        const leads = r3?.count ?? 0;

        const r4 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ?`, req.user.id);
        const orders = r4?.count ?? 0;

        const r5 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed'`, req.user.id);
        const completedOrders = r5?.count ?? 0;

        res.json({
            funnel: [
                { stage: 'Conversations', count: conversations },
                { stage: 'Engagés (3+ msg)', count: activeConversations },
                { stage: 'Leads', count: leads },
                { stage: 'Commandes', count: orders },
                { stage: 'Complétées', count: completedOrders }
            ]
        });
    } catch (error) {
        console.error('Get conversion funnel error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get top products
router.get('/top-products', authenticateToken, async (req, res) => {
    try {
        const products = await db.all(`
            SELECT 
                p.id,
                p.name,
                p.price,
                SUM(oi.quantity)::numeric as total_sold,
                SUM(oi.quantity * oi.unit_price)::numeric as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = ? AND o.status = 'completed'
            GROUP BY p.id, p.name, p.price
            ORDER BY total_sold DESC
            LIMIT 10
        `, req.user.id);

        res.json({ products });
    } catch (error) {
        console.error('Get top products error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Helper function to format duration
function formatDuration(minutes) {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
}

export default router;
