import { Worker } from 'bullmq';
import { bullmqConnection } from '../utils/redisClient.js';

/**
 * BullMQ Worker for background workflow execution
 */
export const startWorkflowWorker = () => {
    const worker = new Worker(
        'seven-t-workflows',
        async (job) => {
            const { triggerType, triggerData, agentId, userId } = job.data;
            
            console.log(`[WorkflowWorker] Processing job ${job.id}: ${triggerType}`);
            
            try {
                if (triggerType === 'check_abandoned_cart') {
                    const { orderService } = await import('../services/orders.js');
                    await orderService.handleAbandonedCart(triggerData.orderId);
                    return { success: true, processed: 'abandoned_cart' };
                }

                // Lazy import to avoid circular dependencies
                const { workflowExecutor } = await import('../services/workflowExecutor.js');
                
                const results = await workflowExecutor.executeMatchingWorkflows(
                    triggerType,
                    triggerData,
                    agentId,
                    userId
                );
                return results;
            } catch (error) {
                console.error(`[WorkflowWorker] Error in job ${job.id}:`, error.message);
                throw error;
            }
        },
        {
            connection: bullmqConnection,
            concurrency: 5,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 1000 }
        }
    );

    worker.on('completed', (job) => {
        console.log(`[WorkflowWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[WorkflowWorker] Job ${job.id} failed:`, err.message);
    });

    console.log('✅ Workflow Worker started (BullMQ)');
    return worker;
};
