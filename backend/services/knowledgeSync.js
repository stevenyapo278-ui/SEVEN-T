import db from '../database/init.js';
import { contentExtractor } from './contentExtractor.js';
import { indexAgentKnowledge, indexGlobalKnowledge } from './knowledgeRetrieval.js';
import { notificationService } from './notifications.js';

class KnowledgeSyncService {
    constructor() {
        this.syncInterval = null;
    }

    /**
     * Start the background sync job
     * @param {number} intervalMs - How often to check for stale items (default 1 hour)
     */
    startSyncJob(intervalMs = 3600000) {
        if (this.syncInterval) return;
        
        console.log(`[KnowledgeSync] Starting background sync job (interval: ${intervalMs / 60000} mins)`);
        this.syncInterval = setInterval(() => this.performSync(), intervalMs);
        
        // Also run once at startup after a small delay
        setTimeout(() => this.performSync(), 10000);
    }

    /**
     * Perform sync for all items across all users
     */
    async performSync() {
        console.log('[KnowledgeSync] Checking for stale knowledge items...');
        try {
            await this.syncAgentKnowledge();
            await this.syncGlobalKnowledge();
        } catch (error) {
            console.error('[KnowledgeSync] Sync process failed:', error.message);
        }
    }

    /**
     * Sync agent-specific knowledge
     */
    async syncAgentKnowledge() {
        const staleItems = await this.findStaleItems('knowledge_base');
        for (const item of staleItems) {
            await this.processItemSync('agent', item);
        }
    }

    /**
     * Sync global knowledge
     */
    async syncGlobalKnowledge() {
        const staleItems = await this.findStaleItems('global_knowledge');
        for (const item of staleItems) {
            await this.processItemSync('global', item);
        }
    }

    /**
     * Find items that need syncing based on frequency and last_synced_at
     */
    async findStaleItems(table) {
        // Note: sync_frequency expected to be 'daily', 'weekly', 'monthly'
        const sql = `
            SELECT * FROM ${table} 
            WHERE sync_frequency != 'none' 
            AND sync_frequency IS NOT NULL
            AND metadata LIKE '%sourceUrl%'
        `;
        const items = await db.all(sql);
        
        return items.filter(item => {
            if (!item.last_synced_at) return true;
            
            const lastSync = new Date(item.last_synced_at);
            const now = new Date();
            const diffDays = (now - lastSync) / (1000 * 60 * 60 * 24);
            
            if (item.sync_frequency === 'daily' && diffDays >= 1) return true;
            if (item.sync_frequency === 'weekly' && diffDays >= 7) return true;
            if (item.sync_frequency === 'monthly' && diffDays >= 30) return true;
            
            return false;
        });
    }

    /**
     * Process a single item sync
     */
    async processItemSync(sourceType, item) {
        let metadata = {};
        try {
            metadata = JSON.parse(item.metadata || '{}');
        } catch (e) {
            return;
        }

        const url = metadata.sourceUrl;
        if (!url) return;

        console.log(`[KnowledgeSync] Syncing ${sourceType} item: ${item.title} (${url})`);

        try {
            const result = await contentExtractor.autoExtract(url);
            
            // Check if content changed (simple string comparison, can be improved with hashes)
            const hasChanged = result.content !== item.content;
            
            const table = sourceType === 'agent' ? 'knowledge_base' : 'global_knowledge';
            const userId = item.user_id || (await this.getUserIdForAgentItem(item.agent_id));

            if (hasChanged) {
                console.log(`[KnowledgeSync] Content changed for ${item.title}. Updating...`);
                
                // Update DB
                await db.run(`
                    UPDATE ${table} 
                    SET content = ?, metadata = ?, last_synced_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, result.content, JSON.stringify({ ...metadata, ...result.metadata }), item.id);

                // Re-index Vector DB
                if (sourceType === 'agent') {
                    await indexAgentKnowledge(item.agent_id, item.id, item.title, result.content);
                } else {
                    await indexGlobalKnowledge(item.id, item.title, result.content);
                }

                // Notify User
                if (userId) {
                    await notificationService.create({
                        userId,
                        type: 'info',
                        title: 'Connaissance actualisée',
                        message: `La source "${item.title}" a été automatiquement mise à jour car son contenu en ligne a changé.`,
                        metadata: { knowledge_id: item.id, type: sourceType }
                    });
                }
            } else {
                // Just update the sync timestamp
                await db.run(`UPDATE ${table} SET last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`, item.id);
            }
            
        } catch (error) {
            console.error(`[KnowledgeSync] Failed to sync ${item.id}:`, error.message);
        }
    }

    async getUserIdForAgentItem(agentId) {
        const agent = await db.get('SELECT user_id FROM agents WHERE id = ?', agentId);
        return agent?.user_id || null;
    }
}

export const knowledgeSyncService = new KnowledgeSyncService();
export default knowledgeSyncService;
