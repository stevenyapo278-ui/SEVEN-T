import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/init.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { google } from 'googleapis';

const router = Router();
const STATE_EXPIRY = '10m';

function getRedirectUri() {
    const base = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${base}/api/google-calendar/callback`;
}

/**
 * Récupère les credentials Google Calendar pour un outil donné.
 * Priorité : config de l'outil > variables d'environnement globales
 */
async function getCredentialsForTool(toolId) {
    const tool = await db.get('SELECT config FROM tools WHERE id = ?', toolId);
    const config = tool?.config ? (typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config) : {};
    
    const clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    
    return { clientId, clientSecret, redirectUri: getRedirectUri() };
}

/**
 * POST /google-calendar/connect-url
 * Retourne l'URL Google pour lancer la connexion OAuth.
 */
router.post('/connect-url', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.body || {};
        if (!toolId) {
            return res.status(400).json({ error: 'toolId requis' });
        }
        const tool = await db.get('SELECT id, type, user_id, config FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'google_calendar') {
            return res.status(404).json({ error: 'Outil Google Calendar non trouvé' });
        }

        const { clientId, clientSecret, redirectUri } = await getCredentialsForTool(toolId);
        if (!clientId || !clientSecret) {
            return res.status(503).json({
                error: 'Google Client ID et Secret non configurés. Renseignez-les dans la configuration de l\'outil.'
            });
        }

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const state = jwt.sign({ toolId, userId: req.user.id }, JWT_SECRET, { expiresIn: STATE_EXPIRY });
        
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'],
            state: state,
            prompt: 'consent' // Force offline access refresh token
        });

        res.json({ url });
    } catch (error) {
        console.error('Google Calendar connect-url error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /google-calendar/callback
 * Appelé par Google après consentement.
 */
router.get('/callback', async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const toolsPath = `${frontendUrl}/dashboard/tools`;
    const redirectError = (message) => {
        res.redirect(302, `${toolsPath}?google_error=${encodeURIComponent(message)}`);
    };
    const redirectSuccess = () => {
        res.redirect(302, `${toolsPath}?google=connected`);
    };

    try {
        const { code, state, error } = req.query;
        if (error) {
            return redirectError(error);
        }
        if (!code || !state) {
            return redirectError('Paramètres de retour Google manquants');
        }
        
        let payload;
        try {
            payload = jwt.verify(state, JWT_SECRET);
        } catch {
            return redirectError('Lien de connexion expiré ou invalide');
        }
        
        const { toolId, userId } = payload;
        const tool = await db.get('SELECT id, type, user_id FROM tools WHERE id = ? AND user_id = ?', toolId, userId);
        if (!tool || tool.type !== 'google_calendar') {
            return redirectError('Outil non trouvé');
        }

        const { clientId, clientSecret, redirectUri } = await getCredentialsForTool(toolId);
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        // Preserve existing config
        const existingTool = await db.get('SELECT config FROM tools WHERE id = ?', toolId);
        const existingConfig = existingTool?.config ? (typeof existingTool.config === 'string' ? JSON.parse(existingTool.config) : existingTool.config) : {};

        const newConfig = {
            ...existingConfig,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            email: email
        };

        const meta = { email: email };

        await db.run(`
            UPDATE tools SET status = 'connected', config = ?, meta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, JSON.stringify(newConfig), JSON.stringify(meta), toolId);

        redirectSuccess();
    } catch (e) {
        console.error('Google Calendar callback error:', e);
        redirectError(e.message || 'Connexion Google Calendar échouée');
    }
});

/**
 * POST /google-calendar/disconnect/:toolId
 */
router.post('/disconnect/:toolId', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.params;
        const tool = await db.get('SELECT id, type, user_id, config FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'google_calendar') {
            return res.status(404).json({ error: 'Outil non trouvé' });
        }
        const existingConfig = tool.config ? (typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config) : {};
        const cleanConfig = {
            clientId: existingConfig.clientId || null,
            clientSecret: existingConfig.clientSecret || null
        };
        await db.run(`
            UPDATE tools SET status = 'disconnected', config = ?, meta = '{}', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, JSON.stringify(cleanConfig), toolId);
        res.json({ message: 'Google Calendar déconnecté' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
