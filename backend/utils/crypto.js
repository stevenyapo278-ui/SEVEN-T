/**
 * Cryptographic utilities for SEVEN T
 * - AES-256-GCM encryption for sensitive data (payment credentials, etc.)
 * - SHA-256 hashing for tokens (reset tokens, etc.)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getDerivedKey() {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('[Security] ENCRYPTION_KEY must be at least 32 characters in production');
        }
        console.warn('[Security] ENCRYPTION_KEY is weak — use a strong key in production');
    }
    return crypto.scryptSync(secret || 'dev-key-change-in-production', 'seven-t-salt-v1', KEY_LENGTH);
}

/**
 * Encrypt a plaintext string with AES-256-GCM
 * @param {string} plaintext
 * @returns {string} base64 encoded: iv + tag + ciphertext
 */
export function encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined) return null;
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(String(plaintext), 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64 encoded ciphertext
 * @param {string} ciphertext
 * @returns {string|null} plaintext or null on failure
 */
export function decrypt(ciphertext) {
    if (!ciphertext) return null;
    try {
        const key = getDerivedKey();
        const buf = Buffer.from(ciphertext, 'base64');
        const iv = buf.subarray(0, IV_LENGTH);
        const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
        console.error('[Crypto] Decryption failed:', err.message);
        return null;
    }
}

/**
 * Hash a token with SHA-256 (one-way, for storage)
 * @param {string} token — plaintext token
 * @returns {string} hex hash
 */
export function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}
