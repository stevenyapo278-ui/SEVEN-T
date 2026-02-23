import express from 'express';
import { randomUUID } from 'crypto';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/expenses/stats – must be before /:id
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
        const monthsBack = parseInt(req.query.monthsBack, 10) || 6;

        const totalMonthRow = await db.get(
            `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND EXTRACT(YEAR FROM expense_date) = ? AND EXTRACT(MONTH FROM expense_date) = ?`,
            userId,
            year,
            month
        );
        const totalMonth = Number(totalMonthRow?.total ?? 0);

        const byCategoryRows = await db.all(
            `SELECT category AS name, SUM(amount) AS value FROM expenses WHERE user_id = ? AND EXTRACT(YEAR FROM expense_date) = ? AND EXTRACT(MONTH FROM expense_date) = ? GROUP BY category ORDER BY value DESC`,
            userId,
            year,
            month
        );
        const byCategory = byCategoryRows.map((r) => ({ name: r.name, value: Number(r.value) }));

        const byMonthRows = await db.all(
            `SELECT EXTRACT(YEAR FROM expense_date)::int AS year, EXTRACT(MONTH FROM expense_date)::int AS month, SUM(amount) AS total
             FROM expenses WHERE user_id = ?
             AND expense_date >= (CURRENT_DATE - ((?::text || ' months')::interval))::date
             GROUP BY EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date)
             ORDER BY year, month`,
            userId,
            Math.max(1, monthsBack)
        );
        const monthNames = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const byMonth = byMonthRows.map((r) => ({
            month: `${monthNames[r.month]} ${r.year}`,
            year: r.year,
            monthNum: r.month,
            total: Number(r.total)
        }));

        res.json({ totalMonth, byCategory, byMonth });
    } catch (error) {
        console.error('Get expenses stats error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// GET /api/expenses – list by month/year
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

        const expenses = await db.all(
            `SELECT id, expense_date, category, amount, currency, note, created_at FROM expenses
             WHERE user_id = ? AND EXTRACT(YEAR FROM expense_date) = ? AND EXTRACT(MONTH FROM expense_date) = ?
             ORDER BY expense_date DESC, created_at DESC`,
            userId,
            year,
            month
        );
        res.json({ expenses });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// POST /api/expenses – create
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { expense_date, category, amount, currency, note } = req.body;

        if (!expense_date || !category || amount == null || amount === '') {
            return res.status(400).json({ error: 'Date, catégorie et montant requis' });
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        const id = randomUUID();
        await db.run(
            `INSERT INTO expenses (id, user_id, expense_date, category, amount, currency, note) VALUES (?, ?, ?::date, ?, ?, ?, ?)`,
            id,
            userId,
            expense_date,
            String(category).trim(),
            numAmount,
            currency || 'XOF',
            note ? String(note).trim() : null
        );
        const row = await db.get('SELECT id, expense_date, category, amount, currency, note, created_at FROM expenses WHERE id = ?', id);
        res.status(201).json({ expense: row });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// PATCH /api/expenses/:id – update (same user)
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { expense_date, category, amount, currency, note } = req.body;

        const existing = await db.get('SELECT id FROM expenses WHERE id = ? AND user_id = ?', id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'Dépense non trouvée' });
        }

        const updates = [];
        const values = [];
        if (expense_date != null) {
            updates.push('expense_date = ?::date');
            values.push(expense_date);
        }
        if (category != null) {
            updates.push('category = ?');
            values.push(String(category).trim());
        }
        if (amount != null) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                return res.status(400).json({ error: 'Montant invalide' });
            }
            updates.push('amount = ?');
            values.push(numAmount);
        }
        if (currency != null) {
            updates.push('currency = ?');
            values.push(currency);
        }
        if (note !== undefined) {
            updates.push('note = ?');
            values.push(note ? String(note).trim() : null);
        }
        if (updates.length === 0) {
            const row = await db.get('SELECT id, expense_date, category, amount, currency, note, created_at FROM expenses WHERE id = ?', id);
            return res.json({ expense: row });
        }
        values.push(id);
        await db.run(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, ...values);
        const row = await db.get('SELECT id, expense_date, category, amount, currency, note, created_at FROM expenses WHERE id = ?', id);
        res.json({ expense: row });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// DELETE /api/expenses/:id – delete (same user)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await db.run('DELETE FROM expenses WHERE id = ? AND user_id = ?', id, userId);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Dépense non trouvée' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

export default router;
