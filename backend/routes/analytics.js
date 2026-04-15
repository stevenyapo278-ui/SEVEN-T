import { Router } from 'express';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireModule } from '../middleware/requireModule.js';

const router = Router();
router.use(authenticateToken);
router.use(requireModule('analytics'));

// Get comprehensive analytics overview
router.get('/overview', async (req, res) => {
    try {
        const reqUserId = req.user.ownerId;
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

        const r1 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND c.created_at >= ?`, reqUserId, startDateStr);
        const currentConversations = r1?.count ?? 0;

        const r2 = await db.get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND m.created_at >= ?`, reqUserId, startDateStr);
        const currentMessages = r2?.count ?? 0;

        const r3 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND created_at >= ?`, reqUserId, startDateStr);
        const currentLeads = r3?.count ?? 0;

        const r4 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at >= ?`, reqUserId, startDateStr);
        const currentOrders = r4?.count ?? 0;

        const r5 = await db.get(`SELECT SUM(total_amount) as sum FROM orders WHERE user_id = ? AND status = 'completed' AND created_at >= ?`, reqUserId, startDateStr);
        const currentRevenue = r5?.sum ?? 0;

        const r6 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND c.created_at >= ? AND c.created_at < ?`, reqUserId, prevStartDateStr, startDateStr);
        const prevConversations = r6?.count ?? 0;

        const r7 = await db.get(`SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND m.created_at >= ? AND m.created_at < ?`, reqUserId, prevStartDateStr, startDateStr);
        const prevMessages = r7?.count ?? 0;

        const r8 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND created_at >= ? AND created_at < ?`, reqUserId, prevStartDateStr, startDateStr);
        const prevLeads = r8?.count ?? 0;

        const r9 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at >= ? AND created_at < ?`, reqUserId, prevStartDateStr, startDateStr);
        const prevOrders = r9?.count ?? 0;

        // Proactive AI (Relances) stats
        const r10 = await db.get(`SELECT COUNT(*) as count FROM proactive_message_log WHERE user_id = ? AND created_at >= ?`, reqUserId, startDateStr);
        const currentRelancesGenerated = r10?.count ?? 0;

        const r11 = await db.get(`SELECT COUNT(*) as count FROM proactive_message_log WHERE user_id = ? AND status = 'sent' AND created_at >= ?`, reqUserId, startDateStr);
        const currentRelancesSent = r11?.count ?? 0;

        const r12 = await db.get(`SELECT COUNT(*) as count FROM proactive_message_log WHERE user_id = ? AND created_at >= ? AND created_at < ?`, reqUserId, prevStartDateStr, startDateStr);
        const prevRelancesGenerated = r12?.count ?? 0;

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
                },
                relances: {
                    generated: currentRelancesGenerated,
                    sent: currentRelancesSent,
                    adoption_rate: currentRelancesGenerated > 0 ? Math.round((currentRelancesSent / currentRelancesGenerated) * 100) : 0,
                    growth: calcGrowth(currentRelancesGenerated, prevRelancesGenerated)
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
router.get('/messages-timeline', async (req, res) => {
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
            ${req.query.agentId ? 'AND a.id = ?' : ''}
            GROUP BY (m.created_at AT TIME ZONE 'UTC')::date
            ORDER BY date ASC
        `, req.user.ownerId, since.toISOString(), ...(req.query.agentId ? [req.query.agentId] : []));

        res.json({ data });
    } catch (error) {
        console.error('Get messages timeline error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get response time analytics
router.get('/response-time', async (req, res) => {
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
        `, req.user.ownerId, sevenDaysAgo.toISOString());

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

// Helper function to format duration
function formatDuration(minutes) {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
}

// Get product sales timeline
router.get('/agent-performance', async (req, res) => {
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
        `, req.user.ownerId);

        res.json({ agents });
    } catch (error) {
        console.error('Get agent performance error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get peak hours analysis
router.get('/peak-hours', async (req, res) => {
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
        `, req.user.ownerId, thirtyDaysAgo.toISOString());

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
router.get('/conversion-funnel', async (req, res) => {
    try {
        const r1 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ?`, req.user.ownerId);
        const conversations = r1?.count ?? 0;

        const r2 = await db.get(`SELECT COUNT(*) as count FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) >= 3`, req.user.ownerId);
        const activeConversations = r2?.count ?? 0;

        const r3 = await db.get(`SELECT COUNT(*) as count FROM leads WHERE user_id = ?`, req.user.ownerId);
        const leads = r3?.count ?? 0;

        const r4 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ?`, req.user.ownerId);
        const orders = r4?.count ?? 0;

        const r5 = await db.get(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed'`, req.user.ownerId);
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
router.get('/top-products', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let daysBack = 7;
        if (period === '30d') daysBack = 30;
        if (period === '90d') daysBack = 90;

        const since = new Date();
        since.setDate(since.getDate() - daysBack);

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
            WHERE o.user_id = ? AND o.status = 'completed' AND o.created_at >= ?
            GROUP BY p.id, p.name, p.price
            ORDER BY total_sold DESC
            LIMIT 10
        `, req.user.ownerId, since.toISOString());

        res.json({ products });
    } catch (error) {
        console.error('Get top products error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get yearly seasonality for top 5 products (Current Year)
router.get('/products-seasonality', async (req, res) => {
    try {
        const reqUserId = req.user.ownerId;
        const currentYear = new Date().getFullYear();

        // 1. Get top 5 products of all time
        const top5 = await db.all(`
            SELECT p.id, p.name
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ? AND o.status = 'completed'
            GROUP BY p.id, p.name
            ORDER BY SUM(oi.quantity) DESC
            LIMIT 5
        `, reqUserId);

        if (top5.length === 0) return res.json({ data: [], products: [] });

        const productIds = top5.map(p => p.id);
        const placeholders = productIds.map(() => '?').join(',');

        // 2. Get monthly data for these products
        const stats = await db.all(`
            SELECT 
                EXTRACT(MONTH FROM o.created_at)::int as month,
                p.name,
                SUM(oi.quantity)::int as quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ? AND o.status = 'completed'
            AND EXTRACT(YEAR FROM o.created_at) = ?
            AND p.id IN (${placeholders})
            GROUP BY month, p.name
            ORDER BY month ASC
        `, reqUserId, currentYear, ...productIds);

        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        
        // Pivot data for frontend
        const result = monthNames.map((name, i) => {
            const monthIdx = i + 1;
            const entry = { month: name };
            top5.forEach(p => {
                const stat = stats.find(s => s.month === monthIdx && s.name === p.name);
                entry[p.name] = stat?.quantity || 0;
            });
            return entry;
        });

        res.json({ data: result, products: top5.map(p => p.name) });
    } catch (error) {
        console.error('Get products seasonality error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get activity heatmap (Day of week vs Hour)
router.get('/weekly-heatmap', async (req, res) => {
    try {
        const reqUserId = req.user.ownerId;
        const since = new Date();
        since.setDate(since.getDate() - 30); // Last 30 days for heatmap

        const stats = await db.all(`
            SELECT 
                EXTRACT(DOW FROM m.created_at)::int as dow,
                EXTRACT(HOUR FROM m.created_at)::int as hour,
                COUNT(*)::int as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND m.role = 'user' AND m.created_at >= ?
            GROUP BY dow, hour
            ORDER BY dow, hour
        `, reqUserId, since.toISOString());

        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const heatmap = [];

        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                const found = stats.find(s => s.dow === d && s.hour === h);
                heatmap.push({
                    day: days[d],
                    hour: h,
                    count: found?.count || 0
                });
            }
        }

        res.json({ data: heatmap });
    } catch (error) {
        console.error('Get heatmap error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get product sales timeline
router.get('/products-timeline', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let daysBack = 7;
        if (period === '30d') daysBack = 30;
        if (period === '90d') daysBack = 90;

        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        // First find top 5 products in this period
        const top5 = await db.all(`
            SELECT p.id, p.name
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ? AND o.status = 'completed' AND o.created_at >= ?
            GROUP BY p.id, p.name
            ORDER BY SUM(oi.quantity) DESC
            LIMIT 5
        `, req.user.ownerId, since.toISOString());

        if (top5.length === 0) return res.json({ data: [], products: [] });

        const productIds = top5.map(p => p.id);
        const placeholders = productIds.map(() => '?').join(',');

        // Then get daily sales for these products
        const stats = await db.all(`
            SELECT 
                (o.created_at AT TIME ZONE 'UTC')::date as date,
                p.name,
                SUM(oi.quantity)::int as quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ? AND o.status = 'completed' AND o.created_at >= ?
            AND p.id IN (${placeholders})
            GROUP BY date, p.name
            ORDER BY date ASC
        `, req.user.ownerId, since.toISOString(), ...productIds);

        // Reformat for chart (one entry per date with product names as keys)
        const timelineObj = {};
        stats.forEach(row => {
            let dateStr;
            if (row.date instanceof Date) {
                dateStr = row.date.toISOString().split('T')[0];
            } else {
                // If it's already a string "YYYY-MM-DD", take it as is
                dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : String(row.date);
            }
            
            if (!timelineObj[dateStr]) timelineObj[dateStr] = { date: dateStr };
            timelineObj[dateStr][row.name] = row.quantity;
        });

        res.json({ 
            data: Object.values(timelineObj),
            products: top5.map(p => p.name)
        });
    } catch (error) {
        console.error('Get products timeline error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /relance-roi
router.get('/relance-roi', async (req, res) => {
    try {
        const reqUserId = req.user.ownerId;
        const { period = '30d' } = req.query;
        let daysBack = 30;
        if (period === '7d') daysBack = 7;
        if (period === '90d') daysBack = 90;

        const since = new Date();
        since.setDate(since.getDate() - daysBack);

        // Calculate ROI: Orders created within 24h after a relance was sent
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT o.id)::int as attributed_orders,
                COALESCE(SUM(o.total_amount), 0)::numeric as attributed_revenue
            FROM orders o
            JOIN proactive_message_log p ON o.conversation_id = p.conversation_id
            WHERE p.user_id = ? 
              AND p.status = 'sent'
              AND o.status = 'completed'
              AND o.created_at > p.sent_at 
              AND o.created_at <= (p.sent_at + interval '24 hours')
              AND p.created_at >= ?
        `, reqUserId, since.toISOString());

        // Also get total relances stats for this period for comparison
        const performance = await db.all(`
            SELECT 
                (created_at AT TIME ZONE 'UTC')::date as date,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int as sent,
                COUNT(*)::int as generated
            FROM proactive_message_log
            WHERE user_id = ? AND created_at >= ?
            GROUP BY date
            ORDER BY date ASC
        `, reqUserId, since.toISOString());

        res.json({
            attributed_orders: stats.attributed_orders,
            attributed_revenue: stats.attributed_revenue,
            daily_performance: performance
        });
    } catch (error) {
        console.error('Get relance ROI error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /sentiment-stats
router.get('/sentiment-stats', async (req, res) => {
    try {
        const stats = await db.all(`
            SELECT 
                COALESCE(sentiment, 'neutral') as sentiment,
                COUNT(*) as count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            GROUP BY sentiment
        `, req.user.ownerId);

        res.json({ stats });
    } catch (error) {
        console.error('Get sentiment stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /conversion-stats
router.get('/conversion-stats', async (req, res) => {
    try {
        // Distribution of conversion scores in buckets of 10
        const stats = await db.all(`
            SELECT 
                (FLOOR(COALESCE(conversion_score, 0) / 10) * 10)::int as bucket,
                COUNT(*) as count
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ?
            GROUP BY bucket
            ORDER BY bucket ASC
        `, req.user.ownerId);

        res.json({ stats });
    } catch (error) {
        console.error('Get conversion stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
