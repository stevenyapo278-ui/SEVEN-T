/**
 * Redis client singleton for SEVEN T
 * Used for: Baileys sessions, BullMQ queues, plan cache, rate limiting
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

export const redisOptions = {
    maxRetriesPerRequest: null, // BullMQ requirement
    retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 300, 5000);
    }
};

/**
 * Returns connection options for BullMQ
 */
export const bullmqConnection = (() => {
    try {
        const url = new URL(redisUrl);
        return {
            ...redisOptions,
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
        };
    } catch (e) {
        // Fallback if URL is invalid (e.g. just "localhost")
        return {
            ...redisOptions,
            host: '127.0.0.1',
            port: 6379,
        };
    }
})();

export function createRedisClient() {
    if (client && client.status === 'ready') return client;

    client = new Redis(redisUrl, redisOptions);

    client.on('connect', () => console.log('[Redis] Connected'));
    client.on('ready', () => console.log('[Redis] Ready'));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.on('close', () => console.warn('[Redis] Connection closed'));
    client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

    return client;
}

/**
 * Check if Redis is available (non-blocking)
 */
export async function pingRedis() {
    try {
        const redis = createRedisClient();
        const result = await redis.ping();
        return result === 'PONG';
    } catch {
        return false;
    }
}
