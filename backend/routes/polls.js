import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappManager } from '../services/whatsapp.js';

const router = Router();
router.use(authenticateToken);

// List all polls for user
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT p.*, a.name as agent_name
            FROM polls p
            JOIN agents a ON p.agent_id = a.id
            WHERE p.user_id = ?
        `;
        const params = [req.user.id];
        if (status) { query += ' AND p.status = ?'; params.push(status); }
        query += ' ORDER BY p.created_at DESC';
        const polls = await db.all(query, ...params);
        const parsed = polls.map(p => ({
            ...p,
            options: safeJson(p.options, []),
            results: safeJson(p.results, []),
            target_jids: safeJson(p.target_jids, [])
        }));
        res.json({ polls: parsed });
    } catch (e) {
        console.error('Get polls error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single poll
router.get('/:id', async (req, res) => {
    try {
        const poll = await db.get('SELECT p.*, a.name as agent_name FROM polls p JOIN agents a ON p.agent_id = a.id WHERE p.id = ? AND p.user_id = ?', req.params.id, req.user.id);
        if (!poll) return res.status(404).json({ error: 'Sondage non trouvé' });
        const votes = await db.all('SELECT * FROM poll_votes WHERE poll_id = ? ORDER BY voted_at DESC', req.params.id);
        res.json({
            poll: parsePoll(poll),
            votes: votes.map(v => ({ ...v, selected_options: safeJson(v.selected_options, []) }))
        });
    } catch (e) {
        console.error('Get poll error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create poll (draft)
router.post('/', async (req, res) => {
    try {
        const { agent_id, title, question, options = [], allow_multiple = false } = req.body;
        if (!agent_id || !title?.trim() || !question?.trim() || options.length < 2) {
            return res.status(400).json({ error: 'Agent, titre, question et au moins 2 options requis' });
        }
        if (options.length > 12) {
            return res.status(400).json({ error: 'Maximum 12 options' });
        }
        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.id);
        if (!agent) return res.status(404).json({ error: 'Agent non trouvé' });

        const id = uuidv4();
        await db.run(`
            INSERT INTO polls (id, user_id, agent_id, title, question, options, allow_multiple, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
        `, id, req.user.id, agent_id, title.trim(), question.trim(), JSON.stringify(options), allow_multiple ? 1 : 0);
        const poll = await db.get('SELECT p.*, a.name as agent_name FROM polls p JOIN agents a ON p.agent_id = a.id WHERE p.id = ?', id);
        res.status(201).json({ poll: parsePoll(poll) });
    } catch (e) {
        console.error('Create poll error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update poll (only draft)
router.put('/:id', async (req, res) => {
    try {
        const poll = await db.get('SELECT * FROM polls WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!poll) return res.status(404).json({ error: 'Sondage non trouvé' });
        if (poll.status !== 'draft') return res.status(400).json({ error: 'Seuls les brouillons peuvent être modifiés' });

        const { title, question, options, allow_multiple, target_jids } = req.body;
        await db.run(`
            UPDATE polls SET
                title = COALESCE(?, title),
                question = COALESCE(?, question),
                options = COALESCE(?, options),
                allow_multiple = COALESCE(?, allow_multiple),
                target_jids = ?
            WHERE id = ?
        `,
            title?.trim() || null,
            question?.trim() || null,
            options ? JSON.stringify(options) : null,
            allow_multiple !== undefined ? (allow_multiple ? 1 : 0) : null,
            target_jids ? JSON.stringify(target_jids) : null,
            req.params.id
        );
        const updated = await db.get('SELECT p.*, a.name as agent_name FROM polls p JOIN agents a ON p.agent_id = a.id WHERE p.id = ?', req.params.id);
        res.json({ poll: parsePoll(updated) });
    } catch (e) {
        console.error('Update poll error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send poll to a specific JID
router.post('/:id/send', async (req, res) => {
    try {
        const { jid } = req.body; // phone number like 2250000000000
        if (!jid) return res.status(400).json({ error: 'JID/numéro requis' });

        const poll = await db.get('SELECT * FROM polls WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!poll) return res.status(404).json({ error: 'Sondage non trouvé' });
        if (poll.status === 'closed') return res.status(400).json({ error: 'Sondage fermé' });

        const options = safeJson(poll.options, []);
        if (options.length < 2) return res.status(400).json({ error: 'Pas assez d\'options' });

        // Find connected tool for this agent
        const tool = await db.get('SELECT t.* FROM tools t JOIN agents a ON a.tool_id = t.id WHERE a.id = ? AND t.status = ?', poll.agent_id, 'connected');
        if (!tool) return res.status(400).json({ error: 'Aucun agent WhatsApp connecté pour ce sondage' });

        const result = await whatsappManager.sendPoll(tool.id, jid, poll.question, options, !!poll.allow_multiple);
        if (!result?.key?.id) return res.status(500).json({ error: 'Échec envoi du sondage' });

        await db.run(`
            UPDATE polls SET status = 'active', wa_message_id = ?, wa_message_key = ?, sent_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, result.key.id, JSON.stringify(result.key), req.params.id);

        res.json({ message: 'Sondage envoyé', messageId: result.key.id });
    } catch (e) {
        console.error('Send poll error:', e);
        res.status(500).json({ error: e.message || 'Erreur serveur' });
    }
});

// Close poll
router.post('/:id/close', async (req, res) => {
    try {
        const poll = await db.get('SELECT * FROM polls WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!poll) return res.status(404).json({ error: 'Sondage non trouvé' });
        await db.run("UPDATE polls SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
        res.json({ message: 'Sondage fermé' });
    } catch (e) {
        console.error('Close poll error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete poll
router.delete('/:id', async (req, res) => {
    try {
        const poll = await db.get('SELECT * FROM polls WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!poll) return res.status(404).json({ error: 'Sondage non trouvé' });
        await db.run('DELETE FROM polls WHERE id = ?', req.params.id);
        res.json({ message: 'Sondage supprimé' });
    } catch (e) {
        console.error('Delete poll error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Stats overview
router.get('/stats/overview', async (req, res) => {
    try {
        const r1 = await db.get('SELECT COUNT(*) as count FROM polls WHERE user_id = ?', req.user.id);
        const r2 = await db.get("SELECT COUNT(*) as count FROM polls WHERE user_id = ? AND status = 'active'", req.user.id);
        const r3 = await db.get("SELECT COUNT(*) as count FROM polls WHERE user_id = ? AND status = 'closed'", req.user.id);
        const r4 = await db.get('SELECT SUM(total_votes) as sum FROM polls WHERE user_id = ?', req.user.id);
        res.json({ stats: { total: r1?.count ?? 0, active: r2?.count ?? 0, closed: r3?.count ?? 0, totalVotes: r4?.sum ?? 0 } });
    } catch (e) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

function safeJson(val, fallback) {
    if (!val) return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
}

function parsePoll(p) {
    return {
        ...p,
        options: safeJson(p.options, []),
        results: safeJson(p.results, []),
        target_jids: safeJson(p.target_jids, []),
        wa_message_key: safeJson(p.wa_message_key, null)
    };
}

export default router;
