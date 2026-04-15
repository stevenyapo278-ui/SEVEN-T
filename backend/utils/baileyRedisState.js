/**
 * Baileys Redis Session Adapter for SEVEN T
 *
 * Replaces useMultiFileAuthState (disk-based) with a Redis-backed state.
 * Benefits:
 *   - Survives server restarts
 *   - Works across multiple container instances
 *   - Sessions auto-expire after 90 days of inactivity
 */

import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

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
            let raw;
            if (key.startsWith('keys:')) {
                const parts = key.split(':'); // keys:type:id
                const type = parts[1];
                const id = parts[2];
                raw = await redis.hget(`${keyPrefix}:keys:${type}`, id);
                
                // MIGRATION FALLBACK: Try old string key if not in hash
                if (!raw) {
                    raw = await redis.get(`${keyPrefix}:${key}`);
                    if (raw) {
                        console.log(`[BaileyRedis] Migrating key to hash: ${key}`);
                        await redis.hset(`${keyPrefix}:keys:${type}`, id, raw);
                        await redis.del(`${keyPrefix}:${key}`);
                    }
                }
            } else {
                raw = await redis.get(`${keyPrefix}:${key}`);
            }
            if (!raw) return null;
            return JSON.parse(raw, BufferJSON ? BufferJSON.reviver : undefined);
        } catch {
            return null;
        }
    };

    const writeData = async (key, data) => {
        try {
            if (key.startsWith('keys:')) {
                const parts = key.split(':');
                const type = parts[1];
                const id = parts[2];
                const hashKey = `${keyPrefix}:keys:${type}`;
                
                if (data == null) {
                    await redis.hdel(hashKey, id);
                } else {
                    const val = JSON.stringify(data, BufferJSON ? BufferJSON.replacer : undefined);
                    await redis.hset(hashKey, id, val);
                    await redis.expire(hashKey, SESSION_TTL_SECONDS);
                }
            } else {
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
                const hashKey = `${keyPrefix}:keys:${type}`;
                
                // Optimized batch read using HMGET
                if (ids.length > 0) {
                    const vals = await redis.hmget(hashKey, ...ids);
                    ids.forEach((id, index) => {
                        const raw = vals[index];
                        if (raw) {
                            const val = JSON.parse(raw, BufferJSON ? BufferJSON.reviver : undefined);
                            data[id] = type === 'app-state-sync-key'
                                ? proto.Message.AppStateSyncKeyData.fromObject(val)
                                : val;
                        }
                    });
                }
                return data;
            },
            set: async (data) => {
                for (const [type, typeData] of Object.entries(data)) {
                    const hashKey = `${keyPrefix}:keys:${type}`;
                    const entries = {};
                    const deletions = [];

                    for (const [id, val] of Object.entries(typeData || {})) {
                        if (val == null) {
                            deletions.push(id);
                        } else {
                            entries[id] = JSON.stringify(val, BufferJSON ? BufferJSON.replacer : undefined);
                        }
                    }

                    const writes = [];
                    if (Object.keys(entries).length > 0) {
                        writes.push(redis.hset(hashKey, entries));
                        writes.push(redis.expire(hashKey, SESSION_TTL_SECONDS));
                    }
                    if (deletions.length > 0) {
                        writes.push(redis.hdel(hashKey, ...deletions));
                    }
                    await Promise.all(writes);
                }
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
