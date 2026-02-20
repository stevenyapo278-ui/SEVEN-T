/**
 * Routes Outlook OAuth2 : connexion / déconnexion d'un outil Outlook
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import * as outlookService from '../services/outlook.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const STATE_EXPIRY = '10m';

/**
 * POST /outlook/connect-url
 * Body: { toolId }
 * Retourne l'URL Microsoft pour lancer la connexion (le front redirige l'utilisateur vers cette URL).
 */
router.post('/connect-url', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.body || {};
        if (!toolId) {
            return res.status(400).json({ error: 'toolId requis' });
        }
        const tool = await db.get('SELECT id, type, user_id FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'outlook') {
            return res.status(404).json({ error: 'Outil Outlook non trouvé' });
        }
        if (!outlookService.isOutlookConfigured()) {
            return res.status(503).json({ error: 'Outlook n’est pas configuré (OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET)' });
        }
        const state = jwt.sign(
            { toolId, userId: req.user.id },
            JWT_SECRET,
            { expiresIn: STATE_EXPIRY }
        );
        const url = outlookService.getAuthUrl(state);
        if (!url) {
            return res.status(503).json({ error: 'Impossible de générer l’URL de connexion Outlook' });
        }
        res.json({ url });
    } catch (error) {
        console.error('Outlook connect-url error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /outlook/callback
 * Appelé par Microsoft après consentement. Échange le code contre les tokens et enregistre dans l'outil.
 */
router.get('/callback', async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const toolsPath = `${frontendUrl}/dashboard/tools`;
    const redirectError = (message) => {
        res.redirect(302, `${toolsPath}?outlook_error=${encodeURIComponent(message)}`);
    };
    const redirectSuccess = () => {
        res.redirect(302, `${toolsPath}?outlook=connected`);
    };

    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return redirectError('Paramètres de retour Microsoft manquants');
        }
        let payload;
        try {
            payload = jwt.verify(state, JWT_SECRET);
        } catch {
            return redirectError('Lien de connexion expiré ou invalide');
        }
        const { toolId, userId } = payload;
        const tool = await db.get('SELECT id, type, user_id FROM tools WHERE id = ? AND user_id = ?', toolId, userId);
        if (!tool || tool.type !== 'outlook') {
            return redirectError('Outil non trouvé');
        }
        const tokens = await outlookService.exchangeCodeForTokens(code);
        const config = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
            email: tokens.email || null
        };
        const meta = { email: tokens.email || null };
        await db.run(`
            UPDATE tools SET status = 'connected', config = ?, meta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, JSON.stringify(config), JSON.stringify(meta), toolId);

        redirectSuccess();
    } catch (error) {
        console.error('Outlook callback error:', error);
        redirectError(error.message || 'Connexion Outlook échouée');
    }
});

/**
 * POST /outlook/disconnect/:toolId
 * Déconnecte l'outil Outlook (efface les tokens).
 */
router.post('/disconnect/:toolId', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.params;
        const tool = await db.get('SELECT id, type, user_id FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'outlook') {
            return res.status(404).json({ error: 'Outil Outlook non trouvé' });
        }
        await db.run(`
            UPDATE tools SET status = 'disconnected', config = '{}', meta = '{}', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, toolId);
        res.json({ message: 'Outlook déconnecté' });
    } catch (error) {
        console.error('Outlook disconnect error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
