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

        // Always verify admin status in DB (not just in JWT payload)
        const user = await db.get('SELECT is_admin FROM users WHERE id = ?', decoded.id);
        if (!user || !user.is_admin) {
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

// ── Middleware: require admin (use after authenticateToken) ──
export async function requireAdmin(req, res, next) {
    // Always verify in DB — do not trust JWT payload alone
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', req.user?.id);
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
}

// ── Token generation (backwards-compatible) ─────────────────
export function generateToken(user) {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(
        { id: user.id, email: user.email, is_admin: user.is_admin || 0 },
        JWT_SECRET,
        { expiresIn }
    );
}

export default { authenticateToken, authenticateAdmin, requireAdmin, generateToken, JWT_SECRET };
