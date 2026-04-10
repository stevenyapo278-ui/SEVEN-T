
import { initDatabase, db } from './database/init.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await initDatabase();
        
        console.log("\n[AGENTS]");
        const agents = await db.all('SELECT id, name, tool_id, whatsapp_number, whatsapp_connected FROM agents');
        console.table(agents);

        console.log("\n[TOOLS]");
        const tools = await db.all('SELECT id, user_id, type, label, status FROM tools WHERE type = \'whatsapp\'');
        console.table(tools);

        console.log("\n[LAST CONVERSATIONS]");
        const convs = await db.all('SELECT id, agent_id, contact_name, contact_number, contact_jid FROM conversations ORDER BY created_at DESC LIMIT 5');
        console.table(convs);

    } catch (err) {
        console.error("Database query failed:", err.message);
    } finally {
        process.exit(0);
    }
}

run();
