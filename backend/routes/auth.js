import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../database/init.js';
import { getPlan, getEffectivePlanName } from '../config/plans.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/security.js';
import { sendWelcomeEmail } from '../services/email.js';
import { notificationService } from '../services/notifications.js';
import { debugIngest } from '../utils/debugIngest.js';
import { whatsappManager } from '../services/whatsapp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = join(__dirname, '..', '..', 'sessions');

const router = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const oauthStateStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [s, createdAt] of oauthStateStore.entries()) {
        if (now - createdAt > OAUTH_STATE_TTL_MS) oauthStateStore.delete(s);
    }
}, 60000);

// GET /api/auth/google — redirect to Google OAuth consent screen
router.get('/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!clientId || !baseUrl) {
        return res.status(503).json({ error: 'Connexion Google non configurée (GOOGLE_CLIENT_ID, BASE_URL)' });
    }
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const state = crypto.randomBytes(24).toString('hex');
    oauthStateStore.set(state, Date.now());
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'email profile',
        state
    });
    res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// GET /api/auth/google/callback — exchange code, find or create user, redirect with token
router.get('/google/callback', async (req, res) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const loginUrl = `${frontendUrl}/login`;
    const callbackUrl = `${frontendUrl}/auth/callback`;

    const redirectError = (error) => {
        res.redirect(302, `${loginUrl}?error=${encodeURIComponent(error)}`);
    };

    const { code, state } = req.query;
    const storedAt = state ? oauthStateStore.get(state) : null;
    if (state) oauthStateStore.delete(state);
    if (!state || !storedAt) {
        return redirectError('oauth_invalid_state');
    }
    if (Date.now() - storedAt > OAUTH_STATE_TTL_MS) {
        return redirectError('oauth_invalid_state');
    }
    if (!code || typeof code !== 'string') {
        return redirectError('oauth_missing_code');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!clientId || !clientSecret || !baseUrl) {
        return redirectError('oauth_not_configured');
    }
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    let step = 'none';
    try {
        // #region agent log
        step = 'token_fetch_start';
        debugIngest({
            location: 'auth.js:google/callback',
            message: 'Before token exchange fetch',
            data: { step, urlHost: new URL(GOOGLE_TOKEN_URL).hostname },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'post-fix',
            hypothesisId: 'H1'
        });
        // #endregion
        const tokenController = new AbortController();
        const tokenTimeout = setTimeout(() => tokenController.abort(), 25000);
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }),
            signal: tokenController.signal
        });
        clearTimeout(tokenTimeout);
        // #region agent log
        step = 'token_fetch_done';
        debugIngest({
            location: 'auth.js:google/callback',
            message: 'After token exchange fetch',
            data: { step, status: tokenRes.status },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'H2'
        });
        // #endregion
        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error('[Auth] Google token exchange failed:', tokenRes.status, errText);
            return redirectError('oauth_failed');
        }
        const tokens = await tokenRes.json();
        const accessToken = tokens.access_token;
        if (!accessToken) {
            return redirectError('oauth_failed');
        }

        // #region agent log
        step = 'userinfo_fetch_start';
        debugIngest({
            location: 'auth.js:google/callback',
            message: 'Before userinfo fetch',
            data: { step, urlHost: new URL(GOOGLE_USERINFO_URL).hostname },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'post-fix',
            hypothesisId: 'H3'
        });
        // #endregion
        const userinfoController = new AbortController();
        const userinfoTimeout = setTimeout(() => userinfoController.abort(), 25000);
        const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: userinfoController.signal
        });
        clearTimeout(userinfoTimeout);
        if (!userInfoRes.ok) {
            console.error('[Auth] Google userinfo failed:', userInfoRes.status);
            return redirectError('oauth_failed');
        }
        const profile = await userInfoRes.json();
        const { sub: googleId, email, name } = profile;
        if (!email) {
            return redirectError('email_missing');
        }

        let user = await db.get('SELECT * FROM users WHERE google_id = ?', googleId);
        if (user) {
            // Existing Google-linked user
        } else {
            user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
            if (user) {
                await db.run('UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', googleId, user.id);
                user = await db.get('SELECT * FROM users WHERE id = ?', user.id);
            } else {
                const userId = uuidv4();
                const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
                await db.run(`
                    INSERT INTO users (id, email, password, name, company, google_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, userId, email.toLowerCase().trim(), placeholderPassword, (name || email).trim(), null, googleId);
                user = await db.get('SELECT * FROM users WHERE id = ?', userId);
                sendWelcomeEmail(user).catch(err => console.error('Welcome email error:', err));
                notificationService.notifyWelcome(userId);
            }
        }

        if (user.is_active === 0) {
            return redirectError('account_disabled');
        }

        const token = generateToken(user);
        res.redirect(302, `${callbackUrl}?token=${encodeURIComponent(token)}`);
    } catch (err) {
        // #region agent log
        const causeCode = err.cause && typeof err.cause === 'object' && err.cause.code;
        debugIngest({
            location: 'auth.js:google/callback',
            message: 'Google callback catch',
            data: {
                step,
                failedAt: step,
                errMessage: err.message,
                causeCode: causeCode || (err.cause && String(err.cause))
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'post-fix',
            hypothesisId: 'H4'
        });
        // #endregion
        console.error('[Auth] Google callback error:', err);
        redirectError('oauth_failed');
    }
});

// Register with validation
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { email, password, name, company } = req.body;

        // Check if user exists (case-insensitive)
        const existingUser = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hash password with higher cost factor
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userId = uuidv4();
        await db.run(`
            INSERT INTO users (id, email, password, name, company)
            VALUES (?, ?, ?, ?, ?)
        `, userId, email.toLowerCase().trim(), hashedPassword, name.trim(), company?.trim() || null);

        // Get created user and attach plan_features (plan effectif si le plan en base est désactivé)
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, created_at FROM users WHERE id = ?', userId);
        const effectivePlan = await getEffectivePlanName(user.plan);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        const token = generateToken(user);
        sendWelcomeEmail(user).catch(err => console.error('Welcome email error:', err));
        notificationService.notifyWelcome(userId);
        res.status(201).json({
            message: 'Compte créé avec succès',
            user: { ...user, plan: effectivePlan, plan_features },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Login with validation
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user (case-insensitive)
        const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (!user) {
            // Use same error message to prevent email enumeration
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Check if user is active
        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Compte désactivé. Contactez le support.' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Generate token
        const token = generateToken(user);

        // Remove password from response and attach plan_features (plan effectif si désactivé)
        const { password: _, ...userWithoutPassword } = user;
        const effectivePlan = await getEffectivePlanName(user.plan);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        res.json({
            message: 'Connexion réussie',
            user: { ...userWithoutPassword, plan: effectivePlan, plan_features },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, media_model, subscription_status, stripe_customer_id, created_at, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const effectivePlan = await getEffectivePlanName(user.plan);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        res.json({ user: { ...user, plan: effectivePlan, plan_features } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update user
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const { name, company, currency, media_model } = req.body;

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (company !== undefined) {
            updates.push('company = ?');
            values.push(company);
        }
        if (currency !== undefined) {
            updates.push('currency = ?');
            values.push(currency);
        }
        if (media_model !== undefined) {
            updates.push('media_model = ?');
            values.push(media_model === '' ? null : media_model);
        }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(req.user.id);
            
            await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);
        }

        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, currency, media_model, subscription_status, stripe_customer_id, created_at, payment_module_enabled FROM users WHERE id = ?', req.user.id);
        const effectivePlan = await getEffectivePlanName(user.plan);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        res.json({ user: { ...user, plan: effectivePlan, plan_features } });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Supprimer son compte (droit à l'effacement RGPD Art. 17)
router.delete('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agents = await db.all('SELECT id, whatsapp_connected FROM agents WHERE user_id = ?', userId);

        for (const agent of agents) {
            try {
                if (whatsappManager.isConnected(agent.id)) {
                    await whatsappManager.disconnect(agent.id, false);
                }
                const sessionPath = join(sessionsDir, agent.id);
                if (existsSync(sessionPath)) {
                    rmSync(sessionPath, { recursive: true, force: true });
                }
            } catch (err) {
                console.error(`Cleanup agent ${agent.id} on account delete:`, err);
            }
        }

        await db.run('DELETE FROM users WHERE id = ?', userId);

        res.json({ message: 'Compte et données supprimés définitivement' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
    }
});

export default router;
