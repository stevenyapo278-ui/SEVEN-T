import { db, initDatabase } from './backend/database/init.js';
import pkg from 'fs';
const { writeFileSync } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    let out = { step: 'started' };
    try {
        await initDatabase();
        out.step = 'db_connected';
        const res = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_links'");
        out.step = 'query_done';
        out.results = res;
        writeFileSync('/tmp/schema_dump.json', JSON.stringify(out, null, 2));
        process.exit(0);
    } catch (e) {
        out.step = 'error';
        out.error = e.message;
        out.stack = e.stack;
        writeFileSync('/tmp/schema_dump.json', JSON.stringify(out, null, 2));
        process.exit(1);
    }
}
check();
