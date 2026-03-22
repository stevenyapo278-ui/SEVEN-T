/**
 * Authentication Middleware for SEVEN T
 *
 * Supports dual token transport:
 *   1. httpOnly cookie `access_token` (preferred — browser)
 *   2. Authorization: Bearer <token> header (API clients / mobile)
 *
 * Admin check always verified against DB (not just JWT payload)
 * to prevent privilege escalation via tampered tokens.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/init.js';
import { getUserPermissions } from '../services/rbac.js';

const isProduction = process.env.NODE_ENV === 'production';

// ── Secret validation ────────────────────────────────────────
if (isProduction && !process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production mode');
    process.exit(1);
}

const WEAK_SECRETS = ['wazzap-clone-secret-key-2024', 'change-me', 'secret', 'jwt-secret', ''];
if (process.env.JWT_SECRET && WEAK_SECRETS.includes(process.env.JWT_SECRET) && isProduction) {
    console.error('❌ JWT_SECRET is set to an insecure placeholder. Set a strong random secret before going to production.');
    process.exit(1);
}
if (process.env.JWT_SECRET && WEAK_SECRETS.includes(process.env.JWT_SECRET) && !isProduction) {
    console.warn('⚠️  JWT_SECRET is using a weak placeholder. Change it before production!');
}

const devSecret = crypto.randomBytes(64).toString('hex');
export const JWT_SECRET = process.env.JWT_SECRET || devSecret;

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  Using auto-generated JWT_SECRET. Set JWT_SECRET in .env for persistent sessions.');
}

// ── Token extraction ─────────────────────────────────────────
function extractToken(req) {
    // 1. httpOnly cookie (primary — browser clients)
    if (req.cookies?.access_token) {
        return req.cookies.access_token;
    }
    // 2. Authorization header (API clients, mobile apps)
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

// ── Middleware: authenticate any user ────────────────────────
export function authenticateToken(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Important: Use ownerId for all resource filtering (agents, products, etc.)
        decoded.ownerId = decoded.parent_user_id || decoded.id;
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ error: 'Token invalide' });
    }
}

// ── Middleware: authenticate + verify admin in DB ────────────
export async function authenticateAdmin(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const flags = await getAdminFlags(decoded.id);
        if (!flags) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        const isPartialAdmin = flags.can_manage_users || flags.can_manage_plans || flags.can_view_stats || flags.can_manage_ai || flags.can_manage_tickets;
        if (!flags.is_admin && !isPartialAdmin) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ error: 'Token invalide' });
    }
}

export async function requireAdmin(req, res, next) {
    const flags = await getAdminFlags(req.user?.id);
    if (!flags) {
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const isPartialAdmin = flags.can_manage_users || flags.can_manage_plans || flags.can_view_stats || flags.can_manage_ai || flags.can_manage_tickets;
    if (!flags.is_admin && !isPartialAdmin) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
}

async function getAdminFlags(userId) {
    if (!userId) return null;
    let user;
    try {
        user = await db.get(
            `SELECT * FROM users WHERE id = ?`,
            userId
        );
    } catch (e) {
        console.error('getAdminFlags error:', e.message);
        return null; // treat as not found to be safe
    }
    
    if (!user) return null;
    
    return {
        is_admin: Boolean(user.is_admin),
        can_manage_users: Boolean(user.can_manage_users),
        can_manage_plans: Boolean(user.can_manage_plans),
        can_view_stats: Boolean(user.can_view_stats),
        can_manage_ai: Boolean(user.can_manage_ai),
        can_manage_tickets: Boolean(user.can_manage_tickets)
    };
}

/**
 * Require a full admin (is_admin=1). Safer for destructive/global actions.
 */
export async function requireFullAdmin(req, res, next) {
    const flags = await getAdminFlags(req.user?.id);
    if (!flags) return res.status(401).json({ error: 'Utilisateur non trouvé' });
    if (!flags.is_admin) return res.status(403).json({ error: 'Accès réservé aux administrateurs (niveau complet)' });
    return next();
}

/**
 * Require specific admin permissions.
 * Full admins (is_admin=1) always pass.
 *
 * Usage: requirePermission('users.read') or requirePermission('platform.stats.read', 'audit.read')
 * Backwards-compatible: also accepts legacy flags (can_manage_users, can_manage_plans, can_view_stats, can_manage_ai).
 */
export function requirePermission(...permissions) {
    return async (req, res, next) => {
        const flags = await getAdminFlags(req.user?.id);
        if (!flags) return res.status(401).json({ error: 'Utilisateur non trouvé' });

        // Must be at least "any admin"
        const isAnyAdmin = flags.is_admin || flags.can_manage_users || flags.can_manage_plans || flags.can_view_stats || flags.can_manage_ai || flags.can_manage_tickets;
        
        if (!isAnyAdmin) {
            console.log(`[auth/requirePermission] Blocked 403: User ${req.user?.id} is not an admin and has no specific flags set.`);
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }

        // Map: which RBAC keys does each legacy flag grant? (Simplified)
        const legacyPerms = new Set();
        if (flags.is_admin) {
             legacyPerms.add('*'); // full admin always pass
        } else {
            if (flags.can_manage_users) ['users.read', 'users.write', 'users.credentials.reset', 'users.credits.write', 'users.delete'].forEach(p => legacyPerms.add(p));
            if (flags.can_manage_plans) ['billing.plans.read', 'billing.plans.write', 'billing.coupons.read', 'billing.coupons.write', 'billing.subscriptions.write'].forEach(p => legacyPerms.add(p));
            if (flags.can_manage_ai) ['ai.models.read', 'ai.models.write', 'ai.keys.read', 'ai.keys.write', 'ai.settings.write', 'ai.reindex.run'].forEach(p => legacyPerms.add(p));
            if (flags.can_view_stats) ['platform.stats.read', 'audit.read', 'security.anomalies.read', 'platform.activity.read'].forEach(p => legacyPerms.add(p));
            if (flags.can_manage_tickets) ['support.tickets.read', 'support.tickets.reply', 'support.tickets.status', 'support.tickets.assign'].forEach(p => legacyPerms.add(p));
        }

        // Also get actual RBAC permissions from DB via rbac service
        const rbacPerms = await getUserPermissions(req.user?.id);
        const userPermsSet = new Set(rbacPerms || []);

        // Check each required permission
        const ok = permissions.every((p) => {
            if (!p) return true;
            if (legacyPerms.has('*')) return true;
            if (legacyPerms.has(p)) return true;
            if (userPermsSet.has(p)) return true;
            // Also accept direct flag check (legacy compatibility)
            if (flags[p] === true || flags[p] === 1) return true;
            return false;
        });

        if (!ok) {
            console.log(`[auth/requirePermission] 403 Forbidden: User=${req.user?.id} MissingPerms=${permissions.filter(p => !legacyPerms.has(p) && !userPermsSet.has(p))} CurrentFlags=${JSON.stringify(flags)}`);
            return res.status(403).json({ error: 'Droits insuffisants' });
        }
        
        return next();
    };
}

/**
 * Require partner (influencer) role.
 */
export async function requirePartner(req, res, next) {
    const userRole = await db.get(`
        SELECT r.key 
        FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = ? AND r.key = 'influencer'
    `, req.user?.id);

    if (!userRole && !req.user?.is_admin) {
        return res.status(403).json({ error: 'Accès réservé aux partenaires' });
    }
    next();
}

// ── Token generation (backwards-compatible) ─────────────────
export function generateToken(user) {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            is_admin: user.is_admin || 0,
            parent_user_id: user.parent_user_id || null,
            role: user.role || 'owner'
        },
        JWT_SECRET,
        { expiresIn }
    );
}

export default { authenticateToken, authenticateAdmin, requireAdmin, requireFullAdmin, requirePermission, requirePartner, generateToken, JWT_SECRET };
