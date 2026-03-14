/**
 * JWT Token Management for SEVEN T
 *
 * Implements:
 *   - Short-lived access tokens (15 min)
 *   - Long-lived refresh tokens (30 days) stored in DB with rotation
 *   - httpOnly cookie transport
 *   - Token revocation via DB flag
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/init.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        console.warn('[Auth] JWT_SECRET is weak — use a strong secret in production');
    }
    return secret || 'dev-jwt-secret-change-in-production';
}

/**
 * Generate a short-lived access token (JWT, 15 min)
 */
export function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            is_admin: user.is_admin || 0,
        },
        getJwtSecret(),
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

/**
 * Generate a refresh token, store its hash in DB, return the plaintext token
 */
export async function generateRefreshToken(userId) {
    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await db.run(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
         VALUES (gen_random_uuid(), ?, ?, ?)`,
        userId,
        tokenHash,
        expiresAt.toISOString()
    );

    return token; // plaintext — stored only in cookie
}

/**
 * Validate a refresh token, rotate it (revoke old, issue new).
 * Returns { user, accessToken, refreshToken } or null.
 *
 * Implements "refresh token rotation" — if a revoked token is reused,
 * it indicates token theft → revoke ALL tokens for the user.
 */
export async function rotateRefreshToken(oldToken) {
    if (!oldToken) return null;

    const oldHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const record = await db.get(
        `SELECT * FROM refresh_tokens WHERE token_hash = ?`,
        oldHash
    );

    if (!record) return null;

    // Token reuse detection (theft indicator)
    if (record.revoked) {
        console.warn(`[Auth] Refresh token reuse detected for user ${record.user_id} — revoking all sessions`);
        await db.run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', record.user_id);
        return null;
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
        await db.run('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', record.id);
        return null;
    }

    // Revoke the old token
    await db.run('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', record.id);

    // Load user
    const user = await db.get(
        'SELECT id, email, name, plan, credits, is_admin, is_active FROM users WHERE id = ?',
        record.user_id
    );
    if (!user || user.is_active === 0) return null;

    // Issue new tokens
    const newRefreshToken = await generateRefreshToken(user.id);
    const newAccessToken = generateAccessToken(user);

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke all refresh tokens for a user (logout all sessions)
 */
export async function revokeAllUserTokens(userId) {
    await db.run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', userId);
}

/**
 * Set auth cookies (httpOnly, Secure in production)
 */
export function setAuthCookies(res, accessToken, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_TTL_MS, // 30 days
        path: '/api/auth/refresh',    // Cookie sent ONLY to this endpoint
    });
}

/**
 * Clear auth cookies on logout
 */
export function clearAuthCookies(res) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
}

/**
 * Backwards-compatible: generate a token the old way (used by legacy endpoints)
 * @deprecated — use generateAccessToken + generateRefreshToken instead
 */
export function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, is_admin: user.is_admin || 0 },
        getJwtSecret(),
        { expiresIn: '7d' }
    );
}

/**
 * Clean up expired refresh tokens (call from a daily cron job)
 */
export async function purgeExpiredTokens() {
    const result = await db.run(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < CURRENT_TIMESTAMP OR revoked = 1`
    );
    console.log(`[Auth] Purged expired/revoked refresh tokens`);
    return result.rowCount || 0;
}
