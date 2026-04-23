import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function repair() {
    try {
        console.log('--- Repairing Module Flags (ESM) ---');
        
        const result = await pool.query(`
            UPDATE users 
            SET 
                proactive_advisor_enabled = NULL,
                polls_module_enabled = NULL
            WHERE 
                (proactive_advisor_enabled = 0 OR polls_module_enabled = 0)
                AND (is_admin = 1 OR role = 'owner');
        `);
        
        console.log(`Updated ${result.rowCount} users.`);
        
        const result2 = await pool.query(`
            UPDATE users SET campaigns_module_enabled = 1 WHERE campaigns_module_enabled IS NULL;
        `);
        console.log(`Enabled campaigns for ${result2.rowCount} users.`);

    } catch (err) {
        console.error('Repair error:', err);
    } finally {
        await pool.end();
    }
}

repair();
