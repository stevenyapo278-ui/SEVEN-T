/**
 * Outlook / Microsoft OAuth2 service
 * Connecte un outil Outlook via Microsoft Identity (Mail.Read, Mail.Send, User.Read)
 */

import db from '../database/init.js';

const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';
const AUTHORIZE_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
const SCOPES = ['User.Read', 'Mail.Read', 'Mail.Send', 'offline_access'].join(' ');
const GRAPH_ME = 'https://graph.microsoft.com/v1.0/me';

function getRedirectUri() {
    const base = (process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/api/outlook/callback`;
}

function getConfig() {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    return { clientId, clientSecret, redirectUri: getRedirectUri() };
}

/**
 * Génère l'URL d'autorisation Microsoft pour un outil
 */
export function getAuthUrl(state) {
    const { clientId, redirectUri } = getConfig();
    if (!clientId) return null;
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

/**
 * Échange le code d'autorisation contre des tokens et récupère l'email utilisateur
 */
export async function exchangeCodeForTokens(code) {
    const { clientId, clientSecret, redirectUri } = getConfig();
    if (!clientId || !clientSecret) {
        throw new Error('Outlook non configuré (OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET)');
    }
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
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Récupérer l'email via Microsoft Graph
    let email = null;
    try {
        const meRes = await fetch(GRAPH_ME, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (meRes.ok) {
            const me = await meRes.json();
            email = me.mail || me.userPrincipalName || null;
        }
    } catch (e) {
        console.warn('[Outlook] Could not fetch user email:', e.message);
    }

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        email
    };
}

/**
 * Rafraîchit l'access token à partir du refresh token
 */
export async function refreshAccessToken(refreshToken) {
    const { clientId, clientSecret, redirectUri } = getConfig();
    if (!clientId || !clientSecret) throw new Error('Outlook non configuré');
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: redirectUri
    });
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Refresh failed: ${res.status} ${err}`);
    }
    const data = await res.json();
    const expiresIn = data.expires_in || 3600;
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: Date.now() + expiresIn * 1000
    };
}

/**
 * Récupère un access token valide pour un outil (en rafraîchissant si nécessaire)
 */
export async function getValidAccessToken(toolId) {
    const tool = db.prepare('SELECT config FROM tools WHERE id = ? AND type = ?').get(toolId, 'outlook');
    if (!tool?.config) return null;
    let config;
    try {
        config = typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config;
    } catch {
        return null;
    }
    const { access_token, refresh_token, expires_at } = config;
    if (!refresh_token) return access_token || null;
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 min avant expiration
    if (access_token && expires_at && expires_at > now + bufferMs) {
        return access_token;
    }
    try {
        const refreshed = await refreshAccessToken(refresh_token);
        const newConfig = { ...config, ...refreshed };
        db.prepare('UPDATE tools SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(newConfig), toolId);
        return refreshed.access_token;
    } catch (e) {
        console.error('[Outlook] Token refresh failed for tool', toolId, e.message);
        return null;
    }
}

/**
 * Vérifie si Outlook est configuré (client_id + client_secret)
 */
export function isOutlookConfigured() {
    const { clientId, clientSecret } = getConfig();
    return !!(clientId && clientSecret);
}
