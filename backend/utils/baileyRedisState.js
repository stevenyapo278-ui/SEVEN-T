/**
 * Baileys Redis Session Adapter for SEVEN T
 *
 * Replaces useMultiFileAuthState (disk-based) with a Redis-backed state.
 * Benefits:
 *   - Survives server restarts
 *   - Works across multiple container instances
 *   - Sessions auto-expire after 90 days of inactivity
 */

import { proto, initAuthCreds, BufferJSON } from 'baileys';

/**
 * Create a Baileys auth state backed by Redis.
 * Drop-in replacement for useMultiFileAuthState.
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} toolId - unique tool/agent identifier
 * @returns {{ state, saveCreds }}
 */
export async function useBaileyRedisState(redis, toolId) {
    const SESSION_TTL_SECONDS = 90 * 24 * 3600; // 90 days
    const keyPrefix = `baileys:${toolId}`;

    const readData = async (key) => {
        try {
            const raw = await redis.get(`${keyPrefix}:${key}`);
            if (!raw) return null;
            return JSON.parse(raw, BufferJSON ? BufferJSON.reviver : undefined);
        } catch {
            return null;
        }
    };

    const writeData = async (key, data) => {
        try {
            if (data == null) {
                await redis.del(`${keyPrefix}:${key}`);
            } else {
                await redis.set(
                    `${keyPrefix}:${key}`,
                    JSON.stringify(data, BufferJSON ? BufferJSON.replacer : undefined),
                    'EX',
                    SESSION_TTL_SECONDS
                );
            }
        } catch (err) {
            console.error(`[BaileyRedis] Write error for key ${key}:`, err.message);
        }
    };

    // Load credentials or initialize new ones
    const creds = (await readData('creds')) || initAuthCreds();

    const state = {
        creds,
        keys: {
            get: async (type, ids) => {
                const data = {};
                await Promise.all(
                    ids.map(async (id) => {
                        const val = await readData(`keys:${type}:${id}`);
                        if (val) {
                            data[id] =
                                type === 'app-state-sync-key'
                                    ? proto.Message.AppStateSyncKeyData.fromObject(val)
                                    : val;
                        }
                    })
                );
                return data;
            },
            set: async (data) => {
                const writes = [];
                for (const [type, typeData] of Object.entries(data)) {
                    for (const [id, val] of Object.entries(typeData || {})) {
                        writes.push(writeData(`keys:${type}:${id}`, val ?? null));
                    }
                }
                await Promise.all(writes);
            },
        },
    };

    const saveCreds = async () => {
        await writeData('creds', state.creds);
    };

    return { state, saveCreds };
}

/**
 * Clear all session data for a tool from Redis.
 * Call this when a user disconnects or deletes a tool.
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} toolId
 */
export async function clearBaileySession(redis, toolId) {
    try {
        const keys = await redis.keys(`baileys:${toolId}:*`);
        if (keys.length > 0) {
            console.log(`[BaileyRedis] Found ${keys.length} keys to clear for tool ${toolId}: ${keys.slice(0, 3).join(', ')}...`);
            await redis.del(...keys);
            console.log(`[BaileyRedis] Cleared ${keys.length} session keys for tool ${toolId}`);
        } else {
            console.log(`[BaileyRedis] No session keys found to clear for tool ${toolId}`);
        }
    } catch (err) {
        console.error(`[BaileyRedis] Error clearing session for ${toolId}:`, err.message);
    }
}

/**
 * Check if a session exists in Redis for a given toolId.
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} toolId
 * @returns {boolean}
 */
export async function sessionExistsInRedis(redis, toolId) {
    try {
        const count = await redis.exists(`baileys:${toolId}:creds`);
        return count > 0;
    } catch {
        return false;
    }
}
