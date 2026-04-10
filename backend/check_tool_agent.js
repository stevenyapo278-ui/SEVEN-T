
import db from './database/init.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        console.log("--- Agents ---");
        const agents = await db.all('SELECT id, name, tool_id, whatsapp_number FROM agents');
        console.table(agents);

        console.log("\n--- Tools ---");
        const tools = await db.all('SELECT id, type, label, status FROM tools');
        console.table(tools);

        console.log("\n--- Recent Conversations ---");
        const convs = await db.all('SELECT id, agent_id, contact_jid, contact_name, contact_number FROM conversations ORDER BY created_at DESC LIMIT 5');
        console.table(convs);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
