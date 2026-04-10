import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireModule } from '../middleware/requireModule.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireModule('deals_management'));

// Get all deals for user
router.get('/', async (req, res) => {
    try {
        const deals = await db.all(`
            SELECT d.*, l.name as lead_name, l.phone as lead_phone
            FROM deals d
            LEFT JOIN leads l ON d.lead_id = l.id
            WHERE d.user_id = ?
            ORDER BY d.created_at DESC
        `, req.user.ownerId);

        res.json({ deals });
    } catch (error) {
        console.error('Get deals error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des deals' });
    }
});

// Get stats / overview
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stage = 'closed_won' THEN amount ELSE 0 END) as won_amount,
                SUM(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') THEN amount ELSE 0 END) as pipeline_amount,
                COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_count,
                COUNT(CASE WHEN stage = 'closed_lost' THEN 1 END) as lost_count,
                COUNT(CASE WHEN stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) as active_count
            FROM deals 
            WHERE user_id = ?
        `, req.user.ownerId);

        res.json({ stats });
    } catch (error) {
        console.error('Get deal stats error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create deal
router.post('/', async (req, res) => {
    try {
        const { 
            name, 
            contact_name, 
            contact_phone, 
            lead_id, 
            amount, 
            currency, 
            stage, 
            probability, 
            expected_close_date, 
            notes 
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Le nom du deal est requis' });
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO deals (
                id, user_id, name, contact_name, contact_phone, lead_id, 
                amount, currency, stage, probability, expected_close_date, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            id, 
            req.user.ownerId, 
            name, 
            contact_name || null,
            contact_phone || null,
            lead_id || null, 
            amount || 0, 
            currency || 'XOF', 
            stage || 'qualification', 
            probability || 0, 
            expected_close_date || null, 
            notes || null
        );

        const deal = await db.get('SELECT * FROM deals WHERE id = ?', id);
        res.status(201).json({ deal });
    } catch (error) {
        console.error('Create deal error:', error);
        res.status(500).json({ error: 'Erreur lors de la création du deal' });
    }
});

// Update deal
router.put('/:id', async (req, res) => {
    try {
        const { 
            name, 
            contact_name, 
            contact_phone, 
            lead_id, 
            amount, 
            currency, 
            stage, 
            probability, 
            expected_close_date, 
            notes 
        } = req.body;

        const deal = await db.get('SELECT id FROM deals WHERE id = ? AND user_id = ?', req.params.id, req.user.ownerId);
        if (!deal) {
            return res.status(404).json({ error: 'Deal non trouvé' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (contact_name !== undefined) { updates.push('contact_name = ?'); values.push(contact_name); }
        if (contact_phone !== undefined) { updates.push('contact_phone = ?'); values.push(contact_phone); }
        if (lead_id !== undefined) { updates.push('lead_id = ?'); values.push(lead_id); }
        if (amount !== undefined) { updates.push('amount = ?'); values.push(amount); }
        if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
        if (stage !== undefined) { updates.push('stage = ?'); values.push(stage); }
        if (probability !== undefined) { updates.push('probability = ?'); values.push(probability); }
        if (expected_close_date !== undefined) { updates.push('expected_close_date = ?'); values.push(expected_close_date); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(req.params.id);
            
            await db.run(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`, ...values);
        }

        const updated = await db.get('SELECT * FROM deals WHERE id = ?', req.params.id);
        res.json({ deal: updated });
    } catch (error) {
        console.error('Update deal error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete deal
router.delete('/:id', async (req, res) => {
    try {
        const deal = await db.get('SELECT id FROM deals WHERE id = ? AND user_id = ?', req.params.id, req.user.ownerId);
        if (!deal) {
            return res.status(404).json({ error: 'Deal non trouvé' });
        }

        await db.run('DELETE FROM deals WHERE id = ?', req.params.id);
        res.json({ message: 'Deal supprimé' });
    } catch (error) {
        console.error('Delete deal error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
