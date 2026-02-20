import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Tables report_subscriptions and generated_reports are created in database/init.js

// Report types
const REPORT_TYPES = {
    weekly_summary: { name: 'Résumé hebdomadaire', description: 'Vue d\'ensemble de l\'activité de la semaine' },
    monthly_summary: { name: 'Résumé mensuel', description: 'Vue d\'ensemble de l\'activité du mois' },
    agent_performance: { name: 'Performance agents', description: 'Analyse des performances de vos agents' },
    conversion_report: { name: 'Rapport de conversion', description: 'Analyse du tunnel de conversion' },
    product_report: { name: 'Rapport produits', description: 'Ventes et performances des produits' }
};

// Get report types
router.get('/types', authenticateToken, (req, res) => {
    res.json({ reportTypes: REPORT_TYPES });
});

// Generate a report
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { report_type, period = '7d' } = req.body;

        if (!REPORT_TYPES[report_type]) {
            return res.status(400).json({ error: 'Type de rapport invalide' });
        }

        let daysBack = 7;
        if (period === '30d') daysBack = 30;
        if (period === '90d') daysBack = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const endDate = new Date();

        let reportData = {};

        switch (report_type) {
            case 'weekly_summary':
            case 'monthly_summary':
                reportData = generateSummaryReport(req.user.id, startDate, endDate);
                break;
            case 'agent_performance':
                reportData = generateAgentReport(req.user.id, startDate, endDate);
                break;
            case 'conversion_report':
                reportData = generateConversionReport(req.user.id, startDate, endDate);
                break;
            case 'product_report':
                reportData = generateProductReport(req.user.id, startDate, endDate);
                break;
        }

        // Save generated report
        const id = uuidv4();
        db.prepare(`
            INSERT INTO generated_reports (id, user_id, report_type, title, data, period_start, period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            req.user.id,
            report_type,
            REPORT_TYPES[report_type].name,
            JSON.stringify(reportData),
            startDate.toISOString(),
            endDate.toISOString()
        );

        res.json({
            report: {
                id,
                type: report_type,
                title: REPORT_TYPES[report_type].name,
                period: { start: startDate, end: endDate },
                data: reportData
            }
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get generated reports history
router.get('/history', authenticateToken, (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT id, report_type, title, period_start, period_end, created_at
            FROM generated_reports
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `).all(req.user.id);

        res.json({ reports });
    } catch (error) {
        console.error('Get reports history error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get report subscriptions (MUST be before /:id route)
router.get('/subscriptions', authenticateToken, (req, res) => {
    try {
        const subscriptions = db.prepare('SELECT * FROM report_subscriptions WHERE user_id = ?').all(req.user.id);
        res.json({ subscriptions });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get a specific generated report
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const report = db.prepare('SELECT * FROM generated_reports WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

        if (!report) {
            return res.status(404).json({ error: 'Rapport non trouvé' });
        }

        try {
            report.data = JSON.parse(report.data);
        } catch (e) {
            report.data = {};
        }

        res.json({ report });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create/update report subscription
router.post('/subscriptions', authenticateToken, (req, res) => {
    try {
        const { report_type, frequency = 'weekly', email } = req.body;

        if (!REPORT_TYPES[report_type]) {
            return res.status(400).json({ error: 'Type de rapport invalide' });
        }

        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
        const targetEmail = email || user.email;

        // Calculate next send date
        const nextSend = new Date();
        if (frequency === 'daily') {
            nextSend.setDate(nextSend.getDate() + 1);
            nextSend.setHours(8, 0, 0, 0);
        } else if (frequency === 'weekly') {
            nextSend.setDate(nextSend.getDate() + (7 - nextSend.getDay() + 1) % 7 + 1);
            nextSend.setHours(8, 0, 0, 0);
        } else if (frequency === 'monthly') {
            nextSend.setMonth(nextSend.getMonth() + 1);
            nextSend.setDate(1);
            nextSend.setHours(8, 0, 0, 0);
        }

        // Check if subscription exists
        const existing = db.prepare('SELECT * FROM report_subscriptions WHERE user_id = ? AND report_type = ?')
            .get(req.user.id, report_type);

        if (existing) {
            db.prepare(`
                UPDATE report_subscriptions 
                SET frequency = ?, email = ?, is_active = 1, next_send_at = ?
                WHERE id = ?
            `).run(frequency, targetEmail, nextSend.toISOString(), existing.id);

            const subscription = db.prepare('SELECT * FROM report_subscriptions WHERE id = ?').get(existing.id);
            res.json({ subscription });
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO report_subscriptions (id, user_id, report_type, frequency, email, next_send_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, req.user.id, report_type, frequency, targetEmail, nextSend.toISOString());

            const subscription = db.prepare('SELECT * FROM report_subscriptions WHERE id = ?').get(id);
            res.status(201).json({ subscription });
        }
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Toggle subscription active state
router.post('/subscriptions/:id/toggle', authenticateToken, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM report_subscriptions WHERE id = ? AND user_id = ?')
            .get(req.params.id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Abonnement non trouvé' });
        }

        const newState = existing.is_active ? 0 : 1;
        db.prepare('UPDATE report_subscriptions SET is_active = ? WHERE id = ?').run(newState, req.params.id);

        res.json({ is_active: newState === 1 });
    } catch (error) {
        console.error('Toggle subscription error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete subscription
router.delete('/subscriptions/:id', authenticateToken, (req, res) => {
    try {
        db.prepare('DELETE FROM report_subscriptions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ message: 'Abonnement supprimé' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Helper functions to generate reports
function generateSummaryReport(userId, startDate, endDate) {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    return {
        conversations: {
            total: db.prepare(`
                SELECT COUNT(*) as count FROM conversations c
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? AND c.created_at BETWEEN ? AND ?
            `).get(userId, startStr, endStr).count,
            active: db.prepare(`
                SELECT COUNT(*) as count FROM conversations c
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? AND c.status = 'active' AND c.created_at BETWEEN ? AND ?
            `).get(userId, startStr, endStr).count
        },
        messages: {
            total: db.prepare(`
                SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? AND m.created_at BETWEEN ? AND ?
            `).get(userId, startStr, endStr).count,
            incoming: db.prepare(`
                SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? AND m.role = 'user' AND m.created_at BETWEEN ? AND ?
            `).get(userId, startStr, endStr).count,
            outgoing: db.prepare(`
                SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN agents a ON c.agent_id = a.id
                WHERE a.user_id = ? AND m.role = 'assistant' AND m.created_at BETWEEN ? AND ?
            `).get(userId, startStr, endStr).count
        },
        leads: db.prepare(`SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND created_at BETWEEN ? AND ?`).get(userId, startStr, endStr).count,
        orders: db.prepare(`SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND created_at BETWEEN ? AND ?`).get(userId, startStr, endStr).count,
        revenue: db.prepare(`SELECT SUM(total_amount) as sum FROM orders WHERE user_id = ? AND status = 'completed' AND created_at BETWEEN ? AND ?`).get(userId, startStr, endStr).sum || 0
    };
}

function generateAgentReport(userId, startDate, endDate) {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    const agents = db.prepare(`
        SELECT 
            a.id, a.name, a.is_active, a.whatsapp_connected,
            (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = a.id AND c.created_at BETWEEN ? AND ?) as conversations,
            (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.agent_id = a.id AND m.created_at BETWEEN ? AND ?) as messages
        FROM agents a
        WHERE a.user_id = ?
    `).all(startStr, endStr, startStr, endStr, userId);

    return { agents };
}

function generateConversionReport(userId, startDate, endDate) {
    const startStr = startDate.toISOString();

    return {
        funnel: [
            { stage: 'Conversations', count: db.prepare(`SELECT COUNT(*) as c FROM conversations c JOIN agents a ON c.agent_id = a.id WHERE a.user_id = ? AND c.created_at >= ?`).get(userId, startStr).c },
            { stage: 'Leads', count: db.prepare(`SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND created_at >= ?`).get(userId, startStr).c },
            { stage: 'Commandes', count: db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND created_at >= ?`).get(userId, startStr).c },
            { stage: 'Complétées', count: db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND status = 'completed' AND created_at >= ?`).get(userId, startStr).c }
        ]
    };
}

function generateProductReport(userId, startDate, endDate) {
    const startStr = startDate.toISOString();

    const products = db.prepare(`
        SELECT 
            p.id, p.name, p.price, p.stock,
            COALESCE(SUM(oi.quantity), 0) as sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' AND o.created_at >= ?
        WHERE p.user_id = ?
        GROUP BY p.id
        ORDER BY sold DESC
    `).all(startStr, userId);

    return { products };
}

export default router;
