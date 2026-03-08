/**
 * Routes Outlook OAuth2 : connexion / déconnexion d'un outil Outlook
 * Supporte les credentials globaux (variables d'environnement) ET
 * les credentials par-outil (stockés dans la config de l'outil en base).
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/init.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const STATE_EXPIRY = '10m';

const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';
const AUTHORIZE_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
const SCOPES = ['User.Read', 'Mail.Read', 'Mail.Send', 'offline_access'].join(' ');
const GRAPH_ME = 'https://graph.microsoft.com/v1.0/me';

function getRedirectUri() {
    const base = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
    return `${base}/api/outlook/callback`;
}

/**
 * Récupère les credentials Outlook pour un outil donné.
 * Priorité : config de l'outil (saisi par l'utilisateur) > variables d'environnement globales
 */
async function getCredentialsForTool(toolId) {
    const tool = await db.get('SELECT config FROM tools WHERE id = ?', toolId);
    const config = tool?.config ? (typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config) : {};
    
    const clientId = config.clientId || process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.OUTLOOK_CLIENT_SECRET;
    
    return { clientId, clientSecret, redirectUri: getRedirectUri() };
}

function buildAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: SCOPES,
        response_mode: 'query',
        state: state,
        prompt: 'consent'
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCode(code, clientId, clientSecret, redirectUri) {
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    });
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Token exchange failed: ${res.status} ${err}`);
    }
    const data = await res.json();

    let email = null;
    try {
        const meRes = await fetch(GRAPH_ME, {
            headers: { Authorization: `Bearer ${data.access_token}` }
        });
        if (meRes.ok) {
            const me = await meRes.json();
            email = me.mail || me.userPrincipalName || null;
        }
    } catch (e) {
        console.warn('[Outlook] Could not fetch user email:', e.message);
    }

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        email
    };
}

/**
 * POST /outlook/connect-url
 * Body: { toolId }
 * Retourne l'URL Microsoft pour lancer la connexion OAuth.
 */
router.post('/connect-url', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.body || {};
        if (!toolId) {
            return res.status(400).json({ error: 'toolId requis' });
        }
        const tool = await db.get('SELECT id, type, user_id, config FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'outlook') {
            return res.status(404).json({ error: 'Outil Outlook non trouvé' });
        }

        const { clientId, redirectUri } = await getCredentialsForTool(toolId);
        if (!clientId) {
            return res.status(503).json({
                error: 'Outlook non configuré. Renseignez votre Client ID et Client Secret dans la configuration de l\'outil.'
            });
        }

        const state = jwt.sign(
            { toolId, userId: req.user.id },
            JWT_SECRET,
            { expiresIn: STATE_EXPIRY }
        );
        const url = buildAuthUrl(clientId, redirectUri, state);
        res.json({ url });
    } catch (error) {
        console.error('Outlook connect-url error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /outlook/callback
 * Appelé par Microsoft après consentement.
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

        const { clientId, clientSecret, redirectUri } = await getCredentialsForTool(toolId);
        if (!clientId || !clientSecret) {
            return redirectError('Credentials Outlook manquants');
        }

        const tokens = await exchangeCode(code, clientId, clientSecret, redirectUri);

        // Preserve existing config (clientId, clientSecret) and add new oauth tokens
        const existingTool = await db.get('SELECT config FROM tools WHERE id = ?', toolId);
        const existingConfig = existingTool?.config
            ? (typeof existingTool.config === 'string' ? JSON.parse(existingTool.config) : existingTool.config)
            : {};

        const newConfig = {
            ...existingConfig,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
            email: tokens.email || null
        };
        const meta = { email: tokens.email || null };

        await db.run(`
            UPDATE tools SET status = 'connected', config = ?, meta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, JSON.stringify(newConfig), JSON.stringify(meta), toolId);

        redirectSuccess();
    } catch (error) {
        console.error('Outlook callback error:', error);
        redirectError(error.message || 'Connexion Outlook échouée');
    }
});

/**
 * POST /outlook/disconnect/:toolId
 */
router.post('/disconnect/:toolId', authenticateToken, async (req, res) => {
    try {
        const { toolId } = req.params;
        const tool = await db.get('SELECT id, type, user_id, config FROM tools WHERE id = ? AND user_id = ?', toolId, req.user.id);
        if (!tool || tool.type !== 'outlook') {
            return res.status(404).json({ error: 'Outil Outlook non trouvé' });
        }
        // Keep clientId and clientSecret but remove oauth tokens
        const existingConfig = tool.config
            ? (typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config)
            : {};
        const cleanConfig = {
            clientId: existingConfig.clientId || null,
            clientSecret: existingConfig.clientSecret || null
        };
        await db.run(`
            UPDATE tools SET status = 'disconnected', config = ?, meta = '{}', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `, JSON.stringify(cleanConfig), toolId);
        res.json({ message: 'Outlook déconnecté' });
    } catch (error) {
        console.error('Outlook disconnect error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
