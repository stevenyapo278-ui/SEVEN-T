import 'dotenv/config';
import { db, initDatabase } from './init.js';

async function fixCredits() {
    console.log('[Fix] Rounding all user credits to integers...');
    try {
        await initDatabase();
        await db.run('UPDATE users SET credits = ROUND(credits)');
        console.log('[Fix] Done.');
    } catch (err) {
        console.error('[Fix] Error:', err);
    } finally {
        process.exit(0);
    }
}

fixCredits();
