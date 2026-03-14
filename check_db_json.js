
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkDb() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Checking global_knowledge...');
        const res = await pool.query('SELECT * FROM global_knowledge');
        console.log(`Found ${res.rows.length} items.`);
        for (const row of res.rows) {
            try {
                JSON.parse(row.metadata || '{}');
            } catch (e) {
                console.error(`Invalid JSON in item ${row.id}:`, row.metadata);
            }
        }

        console.log('\nChecking knowledge_base...');
        const res2 = await pool.query('SELECT * FROM knowledge_base');
        console.log(`Found ${res2.rows.length} items.`);
        for (const row of res2.rows) {
            try {
                JSON.parse(row.metadata || '{}');
            } catch (e) {
                console.error(`Invalid JSON in item ${row.id}:`, row.metadata);
            }
        }
    } catch (err) {
        console.error('Database error:', err.message);
    } finally {
        await pool.end();
    }
}

checkDb();
