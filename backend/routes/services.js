import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, serviceCreateSchema, serviceUpdateSchema } from '../middleware/security.js';

const router = express.Router();

// Get all services for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const services = await db.all(`
            SELECT * FROM services
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, req.user.ownerId);

        res.json({ services });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des services' });
    }
});

// Get single service
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const service = await db.get(`
            SELECT * FROM services
            WHERE id = ? AND user_id = ?
        `, req.params.id, req.user.ownerId);

        if (!service) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }

        res.json({ service });
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// Create service
router.post('/', authenticateToken, validate(serviceCreateSchema), async (req, res) => {
    try {
        const { name, price, duration, category, description, image_url } = req.body;

        const id = uuidv4();
        await db.run(`
            INSERT INTO services (id, user_id, name, price, duration, category, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, 
            id, 
            req.user.ownerId, 
            name, 
            price || 0, 
            duration || 30, 
            category || null, 
            description || null, 
            image_url || null
        );

        const service = await db.get('SELECT * FROM services WHERE id = ?', id);
        res.status(201).json({ service });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Erreur lors de la création du service' });
    }
});

// Update service
router.put('/:id', authenticateToken, validate(serviceUpdateSchema), async (req, res) => {
    try {
        const { name, price, duration, category, description, image_url, is_active } = req.body;

        const service = await db.get('SELECT * FROM services WHERE id = ? AND user_id = ?', req.params.id, req.user.ownerId);
        if (!service) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }

        await db.run(`
            UPDATE services SET
                name = COALESCE(?, name),
                price = COALESCE(?, price),
                duration = COALESCE(?, duration),
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, 
            name, 
            price, 
            duration, 
            category, 
            description, 
            image_url, 
            is_active, 
            req.params.id
        );

        const updated = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
        res.json({ service: updated });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Delete service
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const service = await db.get('SELECT id FROM services WHERE id = ? AND user_id = ?', req.params.id, req.user.ownerId);
        if (!service) {
            return res.status(404).json({ error: 'Service non trouvé' });
        }

        await db.run('DELETE FROM services WHERE id = ?', req.params.id);
        res.json({ message: 'Service supprimé' });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

export default router;
