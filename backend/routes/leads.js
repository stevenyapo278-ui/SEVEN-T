import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { leadAnalyzer } from '../services/leadAnalyzer.js';

const router = express.Router();

// Get all leads for user (excluding suggested and rejected)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const leads = await db.all(`
            SELECT l.*, a.name as agent_name 
            FROM leads l
            LEFT JOIN agents a ON l.agent_id = a.id
            WHERE l.user_id = ? AND l.is_suggested = 0 AND l.status != 'rejected'
            ORDER BY l.is_favorite DESC, l.created_at DESC
        `, req.user.id);

        res.json({ leads });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des leads' });
    }
});

// Get suggested leads (AI-detected, pending validation)
router.get('/suggested', authenticateToken, async (req, res) => {
    try {
        const leads = await leadAnalyzer.getSuggestedLeads(req.user.id);
        res.json({ leads });
    } catch (error) {
        console.error('Get suggested leads error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Validate a suggested lead
router.post('/:id/validate', authenticateToken, async (req, res) => {
    try {
        const result = await leadAnalyzer.validateLead(req.params.id, req.user.id);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json(result);
    } catch (error) {
        console.error('Validate lead error:', error);
        res.status(500).json({ error: 'Erreur lors de la validation' });
    }
});

// Reject a suggested lead
router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
        const result = await leadAnalyzer.rejectLead(req.params.id, req.user.id);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        res.json(result);
    } catch (error) {
        console.error('Reject lead error:', error);
        res.status(500).json({ error: 'Erreur lors du rejet' });
    }
});

// Get leads by status
router.get('/status/:status', authenticateToken, async (req, res) => {
    try {
        const leads = await db.all(`
            SELECT * FROM leads 
            WHERE user_id = ? AND status = ?
            ORDER BY created_at DESC
        `, req.user.id, req.params.status);

        res.json({ leads });
    } catch (error) {
        console.error('Get leads by status error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Get single lead
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const lead = await db.get(`
            SELECT * FROM leads 
            WHERE id = ? AND user_id = ?
        `, req.params.id, req.user.id);

        if (!lead) {
            return res.status(404).json({ error: 'Lead non trouvé' });
        }

        res.json({ lead });
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create lead
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, company, source, status, tags, notes, is_favorite, conversation_id } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Le nom est requis' });
        }

        const trimmedPhone = phone && typeof phone === 'string' ? phone.trim() : phone;
        const trimmedEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : email;

        // Empêcher les doublons : même user + même téléphone ou email
        if (trimmedPhone) {
            const existingByPhone = await db.get(`
                SELECT id, name FROM leads 
                WHERE user_id = ? AND phone = ?
            `, req.user.id, trimmedPhone);
            if (existingByPhone) {
                return res.status(400).json({
                    error: 'Un lead avec ce numéro existe déjà',
                    lead_id: existingByPhone.id,
                    lead_name: existingByPhone.name
                });
            }
        }

        if (trimmedEmail) {
            const existingByEmail = await db.get(`
                SELECT id, name FROM leads 
                WHERE user_id = ? AND LOWER(email) = ?
            `, req.user.id, trimmedEmail);
            if (existingByEmail) {
                return res.status(400).json({
                    error: 'Un lead avec cet email existe déjà',
                    lead_id: existingByEmail.id,
                    lead_name: existingByEmail.name
                });
            }
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO leads (id, user_id, name, phone, email, company, source, status, tags, notes, is_favorite, conversation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            id, 
            req.user.id, 
            name, 
            trimmedPhone || null, 
            trimmedEmail || null, 
            company || null, 
            source || 'whatsapp', 
            status || 'new', 
            tags || null, 
            notes || null, 
            is_favorite ? 1 : 0, 
            conversation_id || null
        );

        const lead = await db.get('SELECT * FROM leads WHERE id = ?', id);
        res.status(201).json({ lead });
    } catch (error) {
        console.error('Create lead error:', error);
        // Gérer proprement une éventuelle violation d'unicité côté base
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Un lead avec ce numéro ou cet email existe déjà' });
        }
        res.status(500).json({ error: 'Erreur lors de la création du lead' });
    }
});

// Update lead
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, company, source, status, tags, notes, is_favorite } = req.body;

        const lead = await db.get('SELECT id FROM leads WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead non trouvé' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (company !== undefined) { updates.push('company = ?'); values.push(company); }
        if (source !== undefined) { updates.push('source = ?'); values.push(source); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }
        if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
        if (is_favorite !== undefined) { updates.push('is_favorite = ?'); values.push(is_favorite ? 1 : 0); }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(req.params.id);
            
            await db.run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, ...values);
        }

        const updated = await db.get('SELECT * FROM leads WHERE id = ?', req.params.id);
        res.json({ lead: updated });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete lead
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const lead = await db.get('SELECT id FROM leads WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead non trouvé' });
        }

        await db.run('DELETE FROM leads WHERE id = ?', req.params.id);
        res.json({ message: 'Lead supprimé' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Get lead stats
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
                SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified_count,
                SUM(CASE WHEN status = 'negotiation' THEN 1 ELSE 0 END) as negotiation_count,
                SUM(CASE WHEN status = 'customer' THEN 1 ELSE 0 END) as customer_count,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count
            FROM leads 
            WHERE user_id = ?
        `, req.user.id);

        res.json({ stats });
    } catch (error) {
        console.error('Get lead stats error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

export default router;
