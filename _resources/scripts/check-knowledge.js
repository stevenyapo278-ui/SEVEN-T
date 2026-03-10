/**
 * Check knowledge base for return policy
 */
import db from './backend/database/init.js';

const userId = 'fbe48bc1-08ea-4801-aa11-6dc9d1a45f9d';
const agentId = '955adf7d-1dc2-43c8-bf3b-b507afe298e9';

console.log('=== Checking Knowledge Base ===\n');

// Check global knowledge with "retour" keyword
console.log('1. Global Knowledge (with "retour"):');
const globalKnowledge = db.prepare(`
    SELECT id, title, substr(content, 1, 150) as preview 
    FROM global_knowledge 
    WHERE user_id = ? 
    AND (LOWER(title) LIKE '%retour%' OR LOWER(content) LIKE '%retour%')
`).all(userId);

if (globalKnowledge.length > 0) {
    globalKnowledge.forEach(k => {
        console.log(`  - [${k.id}] ${k.title}`);
        console.log(`    Preview: ${k.preview}...\n`);
    });
} else {
    console.log('  ❌ No global knowledge found with "retour"\n');
}

// Check agent-specific knowledge
console.log('2. Agent-Specific Knowledge:');
const agentKnowledge = db.prepare(`
    SELECT id, title, substr(content, 1, 150) as preview 
    FROM knowledge_base 
    WHERE agent_id = ?
`).all(agentId);

if (agentKnowledge.length > 0) {
    agentKnowledge.forEach(k => {
        console.log(`  - [${k.id}] ${k.title}`);
        console.log(`    Preview: ${k.preview}...\n`);
    });
} else {
    console.log('  ❌ No agent-specific knowledge found\n');
}

// Check assigned global knowledge to agent
console.log('3. Global Knowledge Assigned to Agent:');
const assignedGlobal = db.prepare(`
    SELECT gk.id, gk.title, substr(gk.content, 1, 150) as preview
    FROM global_knowledge gk
    INNER JOIN agent_global_knowledge agk ON gk.id = agk.global_knowledge_id
    WHERE agk.agent_id = ?
`).all(agentId);

if (assignedGlobal.length > 0) {
    assignedGlobal.forEach(k => {
        console.log(`  ✅ [${k.id}] ${k.title}`);
        console.log(`    Preview: ${k.preview}...\n`);
    });
} else {
    console.log('  ❌ No global knowledge assigned to this agent\n');
}

console.log('4. Total items available to agent:', (agentKnowledge.length + assignedGlobal.length));
