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
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeAllUserTokens, setAuthCookies, clearAuthCookies } from '../utils/tokens.js';
import { hashToken } from '../utils/crypto.js';
import { validate, registerSchema, loginSchema } from '../middleware/security.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.js';
import { notificationService } from '../services/notifications.js';
import { debugIngest } from '../utils/debugIngest.js';
import { whatsappManager } from '../services/whatsapp.js';
import { activityLogger } from '../services/activityLogger.js';
import { getUserPermissions } from '../services/rbac.js';
import { createRedisClient } from '../utils/redisClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = join(__dirname, '..', '..', 'sessions');
const redis = createRedisClient();

const router = Router();

/**
 * Utility to check if a user has completed the onboarding process.
 * We consider onboarding complete if they have provided their phone, industry, job title, etc.
 */
function isOnboardingComplete(user) {
    return !!(user.notification_number && user.industry && user.job_title && user.company_size && user.primary_goal);
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// GET /api/auth/google — redirect to Google OAuth consent screen
router.get('/google', async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!clientId || !baseUrl) {
        return res.status(503).json({ error: 'Connexion Google non configurée (GOOGLE_CLIENT_ID, BASE_URL)' });
    }
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const state = crypto.randomBytes(24).toString('hex');
    await redis.setex(`oauth_state:${state}`, 600, Date.now().toString());
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
    const storedAtStr = state ? await redis.get(`oauth_state:${state}`) : null;
    if (state) await redis.del(`oauth_state:${state}`);
    const storedAt = storedAtStr ? parseInt(storedAtStr, 10) : null;
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
            await activityLogger.log({
                userId: user.id,
                action: 'login_google',
                entityType: 'user',
                entityId: user.id,
                req
            });
        } else {
            user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
            if (user) {
                await db.run('UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', googleId, user.id);
                user = await db.get('SELECT * FROM users WHERE id = ?', user.id);
                
                await activityLogger.log({
                    userId: user.id,
                    action: 'link_google',
                    entityType: 'user',
                    entityId: user.id,
                    details: { email: user.email },
                    req
                });
            } else {
                const userId = uuidv4();
                const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
                const trialSetting = await db.get("SELECT value FROM platform_settings WHERE key = 'default_trial_days'");
                const trialDays = trialSetting && trialSetting.value ? parseInt(trialSetting.value, 10) : 7;
                
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + trialDays);
                
                await db.run(`
                    INSERT INTO users (id, email, password, name, company, google_id, plan, subscription_status, subscription_end_date, credits)
                    VALUES (?, ?, ?, ?, ?, ?, 'free', 'trialing', ?, 500)
                `, userId, email.toLowerCase().trim(), placeholderPassword, (name || email).trim(), null, googleId, trialEndDate.toISOString());
                
                user = await db.get('SELECT * FROM users WHERE id = ?', userId);
                
                await activityLogger.log({
                    userId: user.id,
                    action: 'register_google',
                    entityType: 'user',
                    entityId: user.id,
                    details: { email: user.email },
                    req
                });

                sendWelcomeEmail(user).catch(err => console.error('Welcome email error:', err));
                notificationService.notifyWelcome(userId);
            }
        }

        if (user.is_active === 0) {
            return redirectError('account_disabled');
        }

        // SECURITY: Do not put JWT in URL — use ephemeral code instead
        const ephCode = crypto.randomBytes(16).toString('hex');
        await redis.setex(`eph_code:${ephCode}`, 30, user.id); // 30s TTL
        res.redirect(302, `${callbackUrl}?code=${ephCode}`);
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
        const { email, password, name, company, phone, industry, job_title, company_size, primary_goal } = req.body;

        // Check if user exists (case-insensitive)
        const existingUser = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hash password with higher cost factor
        const hashedPassword = await bcrypt.hash(password, 12);

        const trialSetting = await db.get("SELECT value FROM platform_settings WHERE key = 'default_trial_days'");
        const trialDays = trialSetting && trialSetting.value ? parseInt(trialSetting.value, 10) : 7;
        
        // Create user with configured trial days
        const userId = uuidv4();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        await db.run(`
            INSERT INTO users (id, email, password, name, company, notification_number, plan, subscription_status, subscription_end_date, credits, industry, job_title, company_size, primary_goal)
            VALUES (?, ?, ?, ?, ?, ?, 'free', 'trialing', ?, 500, ?, ?, ?, ?)
        `, userId, email.toLowerCase().trim(), hashedPassword, name.trim(), company?.trim() || null, phone.trim(), trialEndDate.toISOString(), industry || null, job_title || null, company_size || null, primary_goal || null);

        // Get created user and attach plan_features (plan effectif si le plan en base est désactivé ou expiré)
        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, role, parent_user_id, created_at, subscription_end_date, industry, job_title, company_size, primary_goal FROM users WHERE id = ?', userId);
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        sendWelcomeEmail(user).catch(err => console.error('Welcome email error:', err));
        notificationService.notifyWelcome(userId);
        
        await activityLogger.log({
            userId: user.id,
            action: 'register',
            entityType: 'user',
            entityId: user.id,
            req
        });

        res.status(201).json({
            message: 'Compte créé avec succès',
            user: { ...user, plan: effectivePlan, plan_features }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// In-memory brute-force protection (configurable via platform_settings)
const bruteForceState = new Map(); // ip -> { attempts: number[], blockedUntil: number }

async function getBruteForceConfig() {
    const enabledRow = await db.get("SELECT value FROM platform_settings WHERE key = 'security_bruteforce_enabled'");
    const thresholdRow = await db.get("SELECT value FROM platform_settings WHERE key = 'security_bruteforce_threshold'");
    const windowRow = await db.get("SELECT value FROM platform_settings WHERE key = 'security_bruteforce_window_minutes'");
    const blockRow = await db.get("SELECT value FROM platform_settings WHERE key = 'security_bruteforce_block_minutes'");
    return {
        enabled: enabledRow?.value === '1',
        threshold: parseInt(thresholdRow?.value || '5', 10),
        windowMinutes: parseInt(windowRow?.value || '10', 10),
        blockMinutes: parseInt(blockRow?.value || '30', 10),
    };
}

async function isIpBlocked(ip) {
    if (!ip) return false;
    const cfg = await getBruteForceConfig();
    if (!cfg.enabled) return false;
    const now = Date.now();
    const entry = bruteForceState.get(ip);
    return Boolean(entry && entry.blockedUntil && entry.blockedUntil > now);
}

async function registerFailedAttempt(ip) {
    if (!ip) return;
    const cfg = await getBruteForceConfig();
    if (!cfg.enabled) return;
    const now = Date.now();
    const windowMs = cfg.windowMinutes * 60 * 1000;
    const blockMs = cfg.blockMinutes * 60 * 1000;
    const entry = bruteForceState.get(ip) || { attempts: [], blockedUntil: 0 };
    const attempts = entry.attempts.filter(ts => now - ts <= windowMs);
    attempts.push(now);
    let blockedUntil = entry.blockedUntil;
    if (attempts.length >= cfg.threshold) {
        blockedUntil = now + blockMs;
    }
    bruteForceState.set(ip, { attempts, blockedUntil });
}

// Login with validation
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().replace('::ffff:', '');

        if (await isIpBlocked(ip)) {
            return res.status(429).json({
                error: 'Trop de tentatives de connexion depuis votre adresse IP. Réessayez plus tard.',
            });
        }

        // Find user (case-insensitive)
        const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
        if (!user) {
            await activityLogger.log({
                userId: 'anonymous',
                action: 'login_failed',
                details: { email, reason: 'user_not_found' },
                req
            });
            await registerFailedAttempt(ip);
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
            await activityLogger.log({
                userId: user.id,
                action: 'login_failed',
                entityType: 'user',
                entityId: user.id,
                details: { email: user.email, reason: 'invalid_password' },
                req
            });
            await registerFailedAttempt(ip);
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Generate tokens and set cookies
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        // Remove password from response and attach plan_features (plan effectif si désactivé ou expiré)
        const { password: _, ...userWithoutPassword } = user;
        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const planConfig = await getPlan(effectivePlan);
        const plan_features = planConfig?.features || {};

        await activityLogger.log({
            userId: user.id,
            action: 'login',
            entityType: 'user',
            entityId: user.id,
            req
        });

        const permissions2 = await getUserPermissions(user.id);
        const userRoles = await db.all(`SELECT r.key FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`, user.id);
        let roleKeys = userRoles.map(r => r.key);

        const influencerOnly = roleKeys.includes('influencer') && !user.is_admin && roleKeys.length === 1;

        res.json({
            message: 'Connexion réussie',
            user: { ...userWithoutPassword, plan: effectivePlan, plan_features, permissions: permissions2, roles: roleKeys, influencer_only: influencerOnly }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        // Session probe endpoint: return 200 with user=null when unauthenticated
        const token =
            req.cookies?.access_token ||
            (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.json({ user: null });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            // Invalid/expired token → treat as logged out (avoid 401 spam on page load)
            return res.json({ user: null });
        }

        req.user = decoded;
        let user;
        try {
            user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);

        } catch (e) {
             throw new Error(`DB SELECT users failed: ${e.message}`);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        let effectivePlan, planConfig, plan_features, permissions, userRoles, roleKeys;
        try {
            effectivePlan = await getEffectivePlanName(user.plan, user);
            
            // Managers inherit the owner's plan benefits
            if (user.parent_user_id) {
                const owner = await db.get('SELECT plan, subscription_end_date FROM users WHERE id = ?', user.parent_user_id);
                if (owner) {
                    effectivePlan = await getEffectivePlanName(owner.plan, owner);
                }
            }

            planConfig = await getPlan(effectivePlan);
            plan_features = planConfig?.features || {};
            permissions = await getUserPermissions(user.id);
            userRoles = await db.all(`SELECT r.key FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`, user.id);
            roleKeys = userRoles.map(r => r.key);
        } catch (e) {
            throw new Error(`Post-login data gathering failed: ${e.message}`);
        }

        const influencerOnly = roleKeys.includes('influencer') && !user.is_admin && roleKeys.length === 1;
        res.json({ 
            user: { 
                ...user, 
                plan: effectivePlan, 
                plan_features, 
                permissions, 
                roles: roleKeys, 
                influencer_only: influencerOnly, 
                is_google_user: !!user.google_id,
                onboarding_completed: isOnboardingComplete(user)
            } 
        });
    } catch (error) {
        console.error('Get user error:', error);
        try {
            const fs = await import('fs');
            fs.appendFileSync('/tmp/auth_error.log', `[${new Date().toISOString()}] Get user error: ${error.message}\n${error.stack}\n\n`);
        } catch (e) {
            // ignore logging error
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/me', authenticateToken, async (req, res) => {
    try {
        const existing = await db.get('SELECT name, company, currency, media_model, notification_number, analytics_module_enabled, flows_module_enabled, voice_responses_enabled, proactive_requires_validation, next_best_action_enabled, proactive_advisor_enabled FROM users WHERE id = ?', req.user.id);
        const { name, company, currency, media_model, notification_number, analytics_module_enabled, flows_module_enabled, reports_module_enabled, voice_responses_enabled, proactive_requires_validation, next_best_action_enabled, proactive_advisor_enabled } = req.body;


        // Build dynamic update query
        const updates = [];
        const values = [];

        // Check plan features to prevent unauthorized module enablement
        const currentUserData = await db.get('SELECT plan, subscription_status, subscription_end_date FROM users WHERE id = ?', req.user.id);
        const effectivePlanNameForCheck = await getEffectivePlanName(currentUserData.plan, currentUserData);
        const userPlanConfig = await getPlan(effectivePlanNameForCheck);
        const userPlanFeatures = userPlanConfig?.features || {};

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
        if (notification_number !== undefined) {
            updates.push('notification_number = ?');
            values.push(notification_number === '' ? null : notification_number);
        }

        // Only allow enabling if it's in the plan features. Disabling is always allowed.
        if (analytics_module_enabled !== undefined) {
            let valueToSet = analytics_module_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.analytics) {
                // Ignore request to enable if not in plan
                valueToSet = 0; 
            }
            updates.push('analytics_module_enabled = ?');
            values.push(valueToSet);
        }
        if (flows_module_enabled !== undefined) {
            let valueToSet = flows_module_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.flows) {
                // Ignore request to enable if not in plan
                valueToSet = 0;
            }
            updates.push('flows_module_enabled = ?');
            values.push(valueToSet);
        }
        if (reports_module_enabled !== undefined) {
            let valueToSet = reports_module_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.reports) {
                // Ignore request to enable if not in plan
                valueToSet = 0;
            }
            updates.push('reports_module_enabled = ?');
            values.push(valueToSet);
        }
        if (voice_responses_enabled !== undefined) {
            let valueToSet = voice_responses_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.voice_responses) {
                // Ignore request to enable if not in plan
                valueToSet = 0;
            }
            updates.push('voice_responses_enabled = ?');
            values.push(valueToSet);
        }
        if (next_best_action_enabled !== undefined) {
            let valueToSet = next_best_action_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.next_best_action) {
                valueToSet = 0;
            }
            updates.push('next_best_action_enabled = ?');
            values.push(valueToSet);
        }
        if (proactive_advisor_enabled !== undefined) {
            let valueToSet = proactive_advisor_enabled ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.proactive_advisor) {
                valueToSet = 0;
            }
            updates.push('proactive_advisor_enabled = ?');
            values.push(valueToSet);
        }
        
        if (proactive_requires_validation !== undefined) {
            let valueToSet = proactive_requires_validation ? 1 : 0;
            if (valueToSet === 1 && !userPlanFeatures.proactive_advisor) {
                valueToSet = 0;
            }
            updates.push('proactive_requires_validation = ?');
            values.push(valueToSet);
        }


        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(req.user.id);
            
            await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);
        }

        const user = await db.get('SELECT id, email, name, company, plan, credits, is_admin, role, parent_user_id, can_manage_users, can_manage_plans, can_view_stats, can_manage_ai, can_manage_tickets, currency, media_model, subscription_status, subscription_end_date, created_at, payment_module_enabled, analytics_module_enabled, reports_module_enabled, voice_responses_enabled, availability_hours_enabled, next_best_action_enabled, conversion_score_enabled, daily_briefing_enabled, sentiment_routing_enabled, catalog_import_enabled, human_handoff_alerts_enabled, proactive_requires_validation, notification_number FROM users WHERE id = ?', req.user.id);
        
        // Calculate changes
        const changes = {};
        const fieldsToTrack = ['name', 'company', 'currency', 'media_model', 'notification_number', 'analytics_module_enabled', 'flows_module_enabled', 'next_best_action_enabled', 'proactive_advisor_enabled'];
        fieldsToTrack.forEach(field => {
            if (req.body[field] !== undefined && String(existing[field]) !== String(req.body[field])) {
                changes[field] = { old: existing[field], new: req.body[field] };
            }
        });


        if (Object.keys(changes).length > 0) {
            await activityLogger.log({
                userId: req.user.id,
                action: 'update_profile',
                entityType: 'user',
                entityId: req.user.id,
                details: { changes },
                req
            });
        }

        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const updatedPlanConfig = await getPlan(effectivePlan);
        const updatedPlanFeatures = updatedPlanConfig?.features || {};
        const permissions = await getUserPermissions(user.id);
        res.json({ 
            user: { 
                ...user, 
                plan: effectivePlan, 
                plan_features: updatedPlanFeatures, 
                permissions,
                is_google_user: !!user.google_id,
                onboarding_completed: isOnboardingComplete(user)
            } 
        });
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

        await activityLogger.log({
            userId: userId,
            action: 'delete_account',
            details: { reason: 'user_deleted_self' },
            req
        });

        res.json({ message: 'Compte et données supprimés définitivement' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
    }
});

// Forgot password - Generate token and send email
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }

        const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
        
        // Even if user doesn't exist, we return success to prevent email enumeration
        if (user && user.is_active !== 0) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedResetToken = hashToken(resetToken); // Store hash, send plaintext
            const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

            await db.run(
                'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                hashedResetToken,  // Only the hash is stored in DB
                tokenExpires,
                user.id
            );

            await sendPasswordResetEmail(user, resetToken); // Plaintext sent by email

            await activityLogger.log({
                userId: user.id,
                action: 'forgot_password_request',
                entityType: 'user',
                entityId: user.id,
                details: { email: user.email },
                req
            });
        }

        res.json({ message: 'Si un compte correspond à cet email, vous recevrez un lien de réinitialisation.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
    }
});

// Reset password - Verify token and update password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token et mot de passe requis' });
        }

        const hashedToken = hashToken(token); // Hash the received token before lookup
        const user = await db.get(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP',
            hashedToken
        );

        if (!user) {
            return res.status(400).json({ error: 'Lien de réinitialisation invalide ou expiré' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.run(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            hashedPassword,
            user.id
        );

        await activityLogger.log({
            userId: user.id,
            action: 'reset_password_success',
            entityType: 'user',
            entityId: user.id,
            details: { email: user.email },
            req
        });

        res.json({ message: 'Votre mot de passe a été réinitialisé avec succès.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }
});

// Set password for Google users or change password
router.post('/set-password', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.user.id);

        await activityLogger.log({
            userId: req.user.id,
            action: 'set_password_success',
            entityType: 'user',
            entityId: req.user.id,
            req
        });

        res.json({ message: 'Mot de passe défini avec succès' });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({ error: 'Erreur lors de la définition du mot de passe' });
    }
});

// ── OAuth code exchange (replaces JWT-in-URL) ────────────────
router.post('/exchange-code', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code manquant' });

        const userId = await redis.get(`eph_code:${code}`);
        if (!userId) {
            return res.status(400).json({ error: 'Code invalide ou expiré' });
        }
        await redis.del(`eph_code:${code}`); // Single-use

        const user = await db.get(
            'SELECT id, email, name, company, plan, credits, is_admin, role, parent_user_id, subscription_status, subscription_end_date FROM users WHERE id = ? AND is_active = 1',
            userId
        );
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        const effectivePlan = await getEffectivePlanName(user.plan, user);
        const planConfig = await getPlan(effectivePlan);
        res.json({ 
            user: { 
                ...user, 
                plan: effectivePlan, 
                plan_features: planConfig?.features || {},
                onboarding_completed: isOnboardingComplete(user)
            } 
        });
    } catch (err) {
        console.error('Exchange code error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── Refresh access token ────────────────────────────────────
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token manquant' });

        const result = await rotateRefreshToken(refreshToken);
        if (!result) {
            clearAuthCookies(res);
            return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
        }

        setAuthCookies(res, result.accessToken, result.refreshToken);

        const effectivePlan = await getEffectivePlanName(result.user.plan, result.user);
        const planConfig = await getPlan(effectivePlan);
        res.json({ user: { ...result.user, plan: effectivePlan, plan_features: planConfig?.features || {} } });
    } catch (err) {
        console.error('Refresh token error:', err);
        clearAuthCookies(res);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── Logout (revokes all sessions) ──────────────────────────
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await revokeAllUserTokens(req.user.id);
        clearAuthCookies(res);
        res.json({ message: 'Déconnecté avec succès' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

export default router;
