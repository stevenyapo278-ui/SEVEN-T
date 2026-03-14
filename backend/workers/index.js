import 'dotenv/config';
import { startWorkflowWorker } from './workflowWorker.js';
import db, { initDatabase } from '../database/init.js';

async function main() {
    try {
        console.log('[Worker] Initializing database connection...');
        await initDatabase();
        
        console.log('[Worker] Starting workflow worker...');
        startWorkflowWorker();
        
        console.log('[Worker] Worker process is running and waiting for jobs.');
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('[Worker] SIGTERM received. Shutting down...');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('[Worker] Fatal error during startup:', error);
        process.exit(1);
    }
}

main();
