/**
 * Migration Script: Assign All Global Knowledge to Existing Agents
 * 
 * This script assigns all existing global knowledge items to all existing agents.
 * Use this if you want to preserve the previous behavior where all agents had access
 * to all global knowledge automatically.
 * 
 * Run with: node backend/scripts/migrateGlobalKnowledge.js
 */

import db from '../database/init.js';

function migrateGlobalKnowledgeAssignments() {
    console.log('===========================================');
    console.log('Global Knowledge Migration Script');
    console.log('===========================================\n');
    
    try {
        // Get all agents
        const agents = db.prepare('SELECT id, user_id FROM agents').all();
        console.log(`Found ${agents.length} agent(s) to migrate\n`);
        
        let totalAssignments = 0;
        
        for (const agent of agents) {
            // Get all global knowledge for this agent's user
            const globalItems = db.prepare('SELECT id FROM global_knowledge WHERE user_id = ?')
                .all(agent.user_id);
            
            if (globalItems.length === 0) {
                console.log(`  ⊘ Agent ${agent.id}: No global knowledge available for user`);
                continue;
            }
            
            // Insert assignments (INSERT OR IGNORE to skip duplicates)
            const insertStmt = db.prepare(`
                INSERT OR IGNORE INTO agent_global_knowledge (agent_id, global_knowledge_id) 
                VALUES (?, ?)
            `);
            
            let assignedCount = 0;
            for (const item of globalItems) {
                const result = insertStmt.run(agent.id, item.id);
                if (result.rowCount > 0) {
                    assignedCount++;
                }
            }
            
            totalAssignments += assignedCount;
            console.log(`  ✓ Agent ${agent.id}: ${assignedCount} assignment(s) created`);
        }
        
        console.log('\n===========================================');
        console.log(`Migration completed successfully`);
        console.log(`Total assignments created: ${totalAssignments}`);
        console.log('===========================================');
        
        return true;
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        return false;
    }
}

// Run migration
const success = migrateGlobalKnowledgeAssignments();
process.exit(success ? 0 : 1);
