
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkActivity() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT pid, query, state FROM pg_stat_activity WHERE datname = 'seven_t'");
        console.table(res.rows);
    } catch (err) {
        console.error('Database error:', err.message);
    } finally {
        await pool.end();
    }
}

checkActivity();
