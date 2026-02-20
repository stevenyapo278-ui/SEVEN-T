/**
 * Réindexe toute la base de connaissances dans le store vectoriel (embeddings).
 * Utile après la mise en place du RAG pour les entrées créées avant.
 *
 * Prérequis : GEMINI_API_KEY dans .env
 *
 * À lancer depuis la racine du projet :
 *   node backend/scripts/backfillKnowledgeEmbeddings.js
 */
import 'dotenv/config';
import db, { initDatabase } from '../database/init.js';
import { indexAgentKnowledge, indexGlobalKnowledge } from '../services/knowledgeRetrieval.js';

await initDatabase();

let agentDone = 0;
let agentFail = 0;
let globalDone = 0;
let globalFail = 0;

const agentRows = db.prepare('SELECT id, agent_id, title, content FROM knowledge_base').all();
for (const row of agentRows) {
    try {
        await indexAgentKnowledge(row.agent_id, row.id, row.title, row.content || '');
        agentDone++;
        if (agentDone % 10 === 0) console.log(`  Agent knowledge: ${agentDone}/${agentRows.length}`);
    } catch (err) {
        agentFail++;
        console.warn(`  Skip agent knowledge ${row.id}:`, err?.message);
    }
}

const globalRows = db.prepare('SELECT id, title, content FROM global_knowledge').all();
for (const row of globalRows) {
    try {
        await indexGlobalKnowledge(row.id, row.title, row.content || '');
        globalDone++;
        if (globalDone % 10 === 0) console.log(`  Global knowledge: ${globalDone}/${globalRows.length}`);
    } catch (err) {
        globalFail++;
        console.warn(`  Skip global knowledge ${row.id}:`, err?.message);
    }
}

console.log('Backfill done.');
console.log(`  Agent: ${agentDone} ok, ${agentFail} failed (total ${agentRows.length})`);
console.log(`  Global: ${globalDone} ok, ${globalFail} failed (total ${globalRows.length})`);
