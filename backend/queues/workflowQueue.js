/**
 * BullMQ Workflow Queue for SEVEN T
 *
 * Replaces the synchronous workflowExecutor.executeMatchingWorkflows() calls
 * with a persistent, retry-able, async job queue backed by Redis.
 *
 * Benefits:
 *   - Server restart does NOT lose pending workflows
 *   - `wait` actions don't block the Node.js event loop
 *   - Automatic retry with exponential backoff on failures
 *   - Concurrency control (N workers in parallel)
 */

import { Queue } from 'bullmq';
import { bullmqConnection } from '../utils/redisClient.js';

// ──────────────────────────────────────────────────────────────
// QUEUE DEFINITION
// ──────────────────────────────────────────────────────────────
export const workflowQueue = new Queue('seven-t-workflows', {
    connection: bullmqConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: { count: 1000, age: 7 * 24 * 3600 }, // keep 1000 or 7 days
        removeOnFail: { count: 500, age: 30 * 24 * 3600 },
    },
});

// ──────────────────────────────────────────────────────────────
// HELPER: Enqueue a workflow trigger
// ──────────────────────────────────────────────────────────────

/**
 * Enqueue a workflow execution immediately
 * @param {string} triggerType
 * @param {object} triggerData
 * @param {string|null} agentId
 * @param {string|null} userId
 */
export async function enqueueWorkflow(triggerType, triggerData, agentId, userId) {
    try {
        const job = await workflowQueue.add(
            'execute',
            { triggerType, triggerData, agentId, userId },
            {
                // Deduplication key: prevent duplicate executions for same event
                jobId: `${triggerType}:${agentId || 'all'}:${triggerData.conversationId || Date.now()}`,
            }
        );
        return job;
    } catch (err) {
        console.error('[WorkflowQueue] Failed to enqueue workflow:', err.message);
    }
}

/**
 * Enqueue a workflow with a delay (replaces the blocking `wait` action)
 * @param {string} triggerType
 * @param {object} triggerData
 * @param {string|null} agentId
 * @param {string|null} userId
 * @param {number} delayMs - delay before execution in milliseconds
 */
export async function enqueueDelayedWorkflow(triggerType, triggerData, agentId, userId, delayMs) {
    try {
        return await workflowQueue.add(
            'execute',
            { triggerType, triggerData, agentId, userId },
            { delay: delayMs }
        );
    } catch (err) {
        console.error('[WorkflowQueue] Failed to enqueue delayed workflow:', err.message);
    }
}

/**
 * Schedule a repeating job (for cron-like schedulers: daily briefing, campaign scheduler, etc.)
 * @param {string} name - job name
 * @param {object} data - job data
 * @param {number} everyMs - repeat every N milliseconds
 */
export async function scheduleRepeatingJob(name, data, everyMs) {
    try {
        await workflowQueue.add(name, data, {
            repeat: { every: everyMs },
            jobId: `repeat:${name}`,
        });
        console.log(`[WorkflowQueue] Scheduled repeating job: ${name} every ${everyMs / 1000}s`);
    } catch (err) {
        console.error(`[WorkflowQueue] Failed to schedule ${name}:`, err.message);
    }
}

/**
 * Worker logic has been moved to backend/workers/workflowWorker.js
 * to avoid circular dependencies and centralize processing.
 */
