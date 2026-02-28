import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/init.js';

// Generate a random secret for development, require explicit secret in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production mode');
    process.exit(1);
}

// Reject known weak/placeholder secrets in production
const WEAK_SECRETS = ['wazzap-clone-secret-key-2024', 'change-me', 'secret', 'jwt-secret', ''];
if (process.env.JWT_SECRET && WEAK_SECRETS.includes(process.env.JWT_SECRET) && isProduction) {
    console.error('❌ JWT_SECRET is set to an insecure placeholder value. Please set a strong random secret in .env before going to production.');
    process.exit(1);
}
if (process.env.JWT_SECRET && WEAK_SECRETS.includes(process.env.JWT_SECRET) && !isProduction) {
    console.warn('⚠️  JWT_SECRET is using a weak placeholder. This is fine for development but MUST be changed before production!');
}

// In development, generate a consistent secret per process (warning will be shown)
const devSecret = crypto.randomBytes(64).toString('hex');
export const JWT_SECRET = process.env.JWT_SECRET || devSecret;

if (!process.env.JWT_SECRET) {
    console.warn('⚠️  Using auto-generated JWT_SECRET. Set JWT_SECRET in .env for persistent sessions.');
}

// Session / JWT expiration (configurable via env, e.g. '7d', '24h', '1h')
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requis' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
    }
}

export async function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requis' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user is admin
        const user = await db.get('SELECT is_admin FROM users WHERE id = ?', decoded.id);
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
    }
}

export function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, is_admin: user.is_admin || 0 },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Middleware to require admin role (use AFTER authenticateToken)
 */
export async function requireAdmin(req, res, next) {
    // Check if user is admin from the token or from the database
    if (req.user?.is_admin) {
        return next();
    }
    
    // Double-check in database
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', req.user?.id);
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    
    next();
}

export default { authenticateToken, authenticateAdmin, requireAdmin, generateToken, JWT_SECRET };
