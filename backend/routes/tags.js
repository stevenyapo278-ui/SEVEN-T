import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Available tag colors
const TAG_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

// Get all tags for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tags = await db.all(`
            SELECT t.*, 
                   (SELECT COUNT(*) FROM conversation_tags ct WHERE ct.tag_id = t.id) as usage_count
            FROM tags t
            WHERE t.user_id = ?
            ORDER BY t.name ASC
        `, req.user.id);

        res.json({ tags });
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create tag
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, color = 'gray' } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Nom du tag requis' });
        }

        if (!TAG_COLORS.includes(color)) {
            return res.status(400).json({ error: 'Couleur invalide' });
        }

        const existing = await db.get('SELECT id FROM tags WHERE user_id = ? AND name = ?', req.user.id, name.trim());
        if (existing) {
            return res.status(400).json({ error: 'Ce tag existe déjà' });
        }

        const id = uuidv4();
        await db.run('INSERT INTO tags (id, user_id, name, color) VALUES (?, ?, ?, ?)', id, req.user.id, name.trim(), color);

        const tag = await db.get('SELECT * FROM tags WHERE id = ?', id);
        res.status(201).json({ tag });
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update tag
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, color } = req.body;

        const existing = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Tag non trouvé' });
        }

        if (color && !TAG_COLORS.includes(color)) {
            return res.status(400).json({ error: 'Couleur invalide' });
        }

        await db.run('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?', name?.trim(), color, req.params.id);

        const tag = await db.get('SELECT * FROM tags WHERE id = ?', req.params.id);
        res.json({ tag });
    } catch (error) {
        console.error('Update tag error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete tag
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Tag non trouvé' });
        }

        await db.run('DELETE FROM tags WHERE id = ?', req.params.id);
        res.json({ message: 'Tag supprimé' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add tag to conversation
router.post('/conversation/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { tagId } = req.body;

        const conv = await db.get(`
            SELECT c.* FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.conversationId, req.user.id);

        if (!conv) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const tag = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', tagId, req.user.id);
        if (!tag) {
            return res.status(404).json({ error: 'Tag non trouvé' });
        }

        const existing = await db.get('SELECT * FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?', req.params.conversationId, tagId);
        if (existing) {
            return res.status(400).json({ error: 'Tag déjà ajouté' });
        }

        await db.run('INSERT INTO conversation_tags (conversation_id, tag_id) VALUES (?, ?)', req.params.conversationId, tagId);

        res.json({ message: 'Tag ajouté' });
    } catch (error) {
        console.error('Add tag to conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Remove tag from conversation
router.delete('/conversation/:conversationId/:tagId', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?', req.params.conversationId, req.params.tagId);

        res.json({ message: 'Tag retiré' });
    } catch (error) {
        console.error('Remove tag from conversation error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get tags for a conversation
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
    try {
        const tags = await db.all(`
            SELECT t.* FROM tags t
            JOIN conversation_tags ct ON t.id = ct.tag_id
            WHERE ct.conversation_id = ?
        `, req.params.conversationId);

        res.json({ tags });
    } catch (error) {
        console.error('Get conversation tags error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===================== NOTES =====================

// Get notes for a conversation
router.get('/notes/:conversationId', authenticateToken, async (req, res) => {
    try {
        const notes = await db.all(`
            SELECT n.*, u.name as author_name
            FROM conversation_notes n
            JOIN users u ON n.user_id = u.id
            WHERE n.conversation_id = ?
            ORDER BY n.created_at DESC
        `, req.params.conversationId);

        res.json({ notes });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add note to conversation
router.post('/notes/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Contenu requis' });
        }

        const conv = await db.get(`
            SELECT c.* FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND a.user_id = ?
        `, req.params.conversationId, req.user.id);

        if (!conv) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const id = uuidv4();
        await db.run('INSERT INTO conversation_notes (id, conversation_id, user_id, content) VALUES (?, ?, ?, ?)', id, req.params.conversationId, req.user.id, content.trim());

        const note = await db.get(`
            SELECT n.*, u.name as author_name
            FROM conversation_notes n
            JOIN users u ON n.user_id = u.id
            WHERE n.id = ?
        `, id);

        res.status(201).json({ note });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update note
router.put('/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;

        const existing = await db.get('SELECT * FROM conversation_notes WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Note non trouvée' });
        }

        await db.run('UPDATE conversation_notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', content.trim(), req.params.id);

        const note = await db.get(`
            SELECT n.*, u.name as author_name
            FROM conversation_notes n
            JOIN users u ON n.user_id = u.id
            WHERE n.id = ?
        `, req.params.id);

        res.json({ note });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete note
router.delete('/notes/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM conversation_notes WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Note non trouvée' });
        }

        await db.run('DELETE FROM conversation_notes WHERE id = ?', req.params.id);
        res.json({ message: 'Note supprimée' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
