import { db, initDatabase } from './backend/database/init.js';
import pkg from 'fs';
const { writeFileSync } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        await initDatabase();
        const res = await db.all("SELECT * FROM payment_links LIMIT 1");
        writeFileSync('db_probe.json', JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (e) {
        writeFileSync('db_probe_err.txt', e.stack);
        process.exit(1);
    }
}
check();
