import { db, initDatabase } from '../backend/database/init.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        console.log('Initializing database from script...');
        await initDatabase();
        const res = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_links'");
        console.log('--- SCHEMA START ---');
        console.log(JSON.stringify(res, null, 2));
        console.log('--- SCHEMA END ---');
        process.exit(0);
    } catch (e) {
        console.error('SCHEMA CHECK ERROR:', e.stack || e.message);
        process.exit(1);
    }
}
check();
