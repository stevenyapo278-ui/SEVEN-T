import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { whatsappManager } from '../services/whatsapp.js';

const router = Router();

// Get all campaigns for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT c.*, a.name as agent_name,
                   (SELECT COUNT(*) FROM campaign_recipients cr WHERE cr.campaign_id = c.id) as recipients_count
            FROM campaigns c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.user_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }

        query += ' ORDER BY c.created_at DESC';

        const campaigns = await db.all(query, ...params);
        res.json({ campaigns });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get campaign by ID with recipients
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await db.get(`
            SELECT c.*, a.name as agent_name
            FROM campaigns c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND c.user_id = ?
        `, req.params.id, req.user.id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        const recipients = await db.all('SELECT * FROM campaign_recipients WHERE campaign_id = ? ORDER BY status, contact_name', req.params.id);

        res.json({ campaign, recipients });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create campaign
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, message, agent_id, recipients = [], scheduled_at } = req.body;

        if (!name?.trim() || !message?.trim() || !agent_id) {
            return res.status(400).json({ error: 'Nom, message et agent requis' });
        }

        const agent = await db.get('SELECT * FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent non trouvé' });
        }

        const id = uuidv4();
        await db.run(`
            INSERT INTO campaigns (id, user_id, agent_id, name, message, total_recipients, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, id, req.user.id, agent_id, name.trim(), message.trim(), recipients.length, scheduled_at || null, scheduled_at ? 'scheduled' : 'draft');

        for (const recipient of recipients) {
            await db.run('INSERT INTO campaign_recipients (id, campaign_id, contact_number, contact_name) VALUES (?, ?, ?, ?)', uuidv4(), id, recipient.number, recipient.name || null);
        }

        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', id);
        res.status(201).json({ campaign });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update campaign
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, message, scheduled_at, agent_id } = req.body;

        const existing = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        if (existing.status === 'sent' || existing.status === 'sending') {
            return res.status(400).json({ error: 'Impossible de modifier une campagne envoyée' });
        }

        if (agent_id) {
            const agent = await db.get('SELECT id FROM agents WHERE id = ? AND user_id = ?', agent_id, req.user.id);
            if (!agent) {
                return res.status(404).json({ error: 'Agent non trouvé' });
            }
        }

        await db.run(`
            UPDATE campaigns 
            SET name = COALESCE(?, name),
                message = COALESCE(?, message),
                scheduled_at = COALESCE(?, scheduled_at),
                agent_id = COALESCE(?, agent_id),
                status = CASE WHEN ? IS NOT NULL THEN 'scheduled' ELSE status END
            WHERE id = ?
        `, name?.trim(), message?.trim(), scheduled_at, agent_id || null, scheduled_at, req.params.id);

        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', req.params.id);
        res.json({ campaign });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add recipients to campaign
router.post('/:id/recipients', authenticateToken, async (req, res) => {
    try {
        const { recipients = [] } = req.body;

        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return res.status(400).json({ error: 'Impossible de modifier une campagne envoyée' });
        }

        let added = 0;
        for (const recipient of recipients) {
            const result = await db.run('INSERT INTO campaign_recipients (id, campaign_id, contact_number, contact_name) VALUES (?, ?, ?, ?)', uuidv4(), req.params.id, recipient.number, recipient.name || null);
            if (result.rowCount > 0) added++;
        }

        await db.run('UPDATE campaigns SET total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ?) WHERE id = ?', req.params.id, req.params.id);

        res.json({ message: `${added} destinataire(s) ajouté(s)` });
    } catch (error) {
        console.error('Add recipients error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Add recipients from leads (selected lead IDs)
router.post('/:id/recipients/from-leads', authenticateToken, async (req, res) => {
    try {
        const { lead_ids = [] } = req.body;
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }
        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return res.status(400).json({ error: 'Impossible de modifier une campagne envoyée' });
        }
        const ids = Array.isArray(lead_ids) ? lead_ids : [];
        if (ids.length === 0) {
            return res.json({ message: 'Aucun lead sélectionné', added: 0, imported: 0 });
        }
        const placeholders = ids.map(() => '?').join(',');
        const leads = await db.all(
            `SELECT id, name, phone FROM leads WHERE user_id = ? AND id IN (${placeholders}) AND phone IS NOT NULL AND TRIM(phone) != ''`,
            req.user.id,
            ...ids
        );
        const existing = await db.all('SELECT contact_number FROM campaign_recipients WHERE campaign_id = ?', req.params.id);
        const existingNumbers = new Set((existing || []).map(r => String(r.contact_number || '').replace(/\D/g, '')));
        let added = 0;
        for (const lead of leads) {
            const num = String(lead.phone || '').trim();
            if (!num) continue;
            const numNorm = num.replace(/\D/g, '');
            if (existingNumbers.has(numNorm)) continue;
            existingNumbers.add(numNorm);
            await db.run('INSERT INTO campaign_recipients (id, campaign_id, contact_number, contact_name) VALUES (?, ?, ?, ?)', uuidv4(), req.params.id, num, lead.name || num);
            added++;
        }
        await db.run('UPDATE campaigns SET total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ?) WHERE id = ?', req.params.id, req.params.id);
        res.json({ message: `${added} lead(s) ajouté(s)`, added, imported: added });
    } catch (error) {
        console.error('Add recipients from leads error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Remove one recipient from campaign
router.delete('/:id/recipients/:recipientId', authenticateToken, async (req, res) => {
    try {
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }
        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return res.status(400).json({ error: 'Impossible de modifier une campagne envoyée' });
        }
        const recipient = await db.get('SELECT id FROM campaign_recipients WHERE id = ? AND campaign_id = ?', req.params.recipientId, req.params.id);
        if (!recipient) {
            return res.status(404).json({ error: 'Destinataire non trouvé' });
        }
        await db.run('DELETE FROM campaign_recipients WHERE id = ?', req.params.recipientId);
        await db.run('UPDATE campaigns SET total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ?) WHERE id = ?', req.params.id, req.params.id);
        res.json({ message: 'Destinataire retiré' });
    } catch (error) {
        console.error('Delete recipient error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Import recipients from conversations
router.post('/:id/import-conversations', authenticateToken, async (req, res) => {
    try {
        const { agent_id, filters = {} } = req.body;

        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        const campaignAgentId = campaign.agent_id;
        let query = `
            SELECT DISTINCT c.contact_number, c.contact_name, c.push_name
            FROM conversations c
            JOIN agents a ON c.agent_id = a.id
            WHERE a.user_id = ? AND c.contact_number IS NOT NULL AND TRIM(c.contact_number) != ''
        `;
        const params = [req.user.id];
        query += ' AND c.agent_id = ?';
        params.push(campaignAgentId);

        if (filters && filters.minMessages) {
            query += ` AND (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) >= ?`;
            params.push(filters.minMessages);
        }

        const contacts = await db.all(query, ...params);

        const existing = await db.all('SELECT contact_number FROM campaign_recipients WHERE campaign_id = ?', req.params.id);
        const existingNumbers = new Set((existing || []).map(r => String(r.contact_number || '').replace(/\D/g, '')));

        let added = 0;
        for (const contact of contacts) {
            const num = String(contact.contact_number || '').trim();
            if (!num) continue;
            const numNorm = num.replace(/\D/g, '');
            if (existingNumbers.has(numNorm)) continue;
            existingNumbers.add(numNorm);
            const name = contact.contact_name || contact.push_name || contact.contact_number;
            await db.run('INSERT INTO campaign_recipients (id, campaign_id, contact_number, contact_name) VALUES (?, ?, ?, ?)', uuidv4(), req.params.id, num, name);
            added++;
        }

        await db.run('UPDATE campaigns SET total_recipients = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ?) WHERE id = ?', req.params.id, req.params.id);

        res.json({ message: `${added} contact(s) importé(s)`, total: added, imported: added });
    } catch (error) {
        console.error('Import conversations error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Send campaign
router.post('/:id/send', authenticateToken, async (req, res) => {
    try {
        const campaign = await db.get(`
            SELECT c.*, a.whatsapp_connected, a.tool_id
            FROM campaigns c
            JOIN agents a ON c.agent_id = a.id
            WHERE c.id = ? AND c.user_id = ?
        `, req.params.id, req.user.id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        if (!campaign.whatsapp_connected) {
            return res.status(400).json({ error: 'WhatsApp non connecté pour cet agent' });
        }

        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return res.status(400).json({ error: 'Campagne déjà envoyée' });
        }

        const recipients = await db.all("SELECT * FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'", req.params.id);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Aucun destinataire à contacter' });
        }

        await db.run("UPDATE campaigns SET status = 'sending' WHERE id = ?", req.params.id);

        const toolId = campaign.tool_id || campaign.agent_id;
        let sent = 0;
        let failed = 0;

        for (const recipient of recipients) {
            try {
                let messageText = campaign.message;
                if (recipient.contact_name) {
                    messageText = messageText.replace(/\{\{nom\}\}/g, recipient.contact_name).replace(/\{\{name\}\}/g, recipient.contact_name);
                }
                messageText = messageText.replace(/\{\{telephone\}\}/g, recipient.contact_number || '').replace(/\{\{phone\}\}/g, recipient.contact_number || '');
                await whatsappManager.sendMessage(toolId, recipient.contact_number, messageText);
                await db.run("UPDATE campaign_recipients SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?", recipient.id);
                sent++;
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            } catch (error) {
                await db.run("UPDATE campaign_recipients SET status = 'failed', error_message = ? WHERE id = ?", error.message || String(error), recipient.id);
                failed++;
            }
        }

        await db.run(`
            UPDATE campaigns 
            SET status = 'sent', 
                sent_at = CURRENT_TIMESTAMP,
                sent_count = ?,
                failed_count = ?
            WHERE id = ?
        `, sent, failed, req.params.id);

        console.log(`[Campaign] ${campaign.name}: ${sent} sent, ${failed} failed`);
        res.json({ message: `Campagne envoyée : ${sent} message(s)`, sent, failed });
    } catch (error) {
        console.error('Send campaign error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
});

// Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Campagne non trouvée' });
        }

        await db.run('DELETE FROM campaigns WHERE id = ?', req.params.id);
        res.json({ message: 'Campagne supprimée' });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get campaign stats
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const r1 = await db.get('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?', req.user.id);
        const r2 = await db.get("SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = 'sent'", req.user.id);
        const r3 = await db.get("SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = 'scheduled'", req.user.id);
        const r4 = await db.get("SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = 'draft'", req.user.id);
        const r5 = await db.get('SELECT SUM(total_recipients) as sum FROM campaigns WHERE user_id = ?', req.user.id);
        const r6 = await db.get('SELECT SUM(sent_count) as sum FROM campaigns WHERE user_id = ?', req.user.id);
        const totalRecipients = Number(r5?.sum) ?? 0;
        const totalSent = Number(r6?.sum) ?? 0;
        const stats = {
            total: r1?.count ?? 0,
            sent: r2?.count ?? 0,
            scheduled: r3?.count ?? 0,
            draft: r4?.count ?? 0,
            totalRecipients,
            totalSent,
            totalMessages: totalSent
        };

        res.json({ stats });
    } catch (error) {
        console.error('Get campaign stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
