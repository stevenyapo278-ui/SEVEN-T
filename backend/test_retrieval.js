import 'dotenv/config';
import { initDatabase, db } from './database/init.js';
import { retrieveRelevantChunks } from './services/knowledgeRetrieval.js';

async function main() {
    try {
        await initDatabase();
        console.log("DB initialized.");
        
        const chunksCountRes = await db.all("SELECT count(*) as c FROM knowledge_chunks");
        console.log("Total chunks in db:", chunksCountRes[0].c);

        if (chunksCountRes[0].c > 0) {
            const sampleAgentRes = await db.get("SELECT agent_id FROM knowledge_chunks WHERE agent_id IS NOT NULL LIMIT 1");
            const agentId = sampleAgentRes ? sampleAgentRes.agent_id : '1';
            console.log("Using agent_id for test:", agentId);

            const chunks = await retrieveRelevantChunks(agentId, 'montre');
            console.log('Relevant chunks count:', chunks.length);
            if (chunks.length > 0) {
                console.log('Top chunk:', chunks[0]);
            }
        } else {
             console.log("No chunks in db to test.");
        }
    } catch(e) {
        console.error('ERROR:', e);
    } finally {
        process.exit();
    }
}

main();
