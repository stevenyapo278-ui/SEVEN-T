import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query('SELECT 1 as connected');
        console.log('Result:', res.rows[0]);
        await pool.end();
        process.exit(0);
    } catch (e) {
        console.error('SIMPLE DB ERROR:', e.message);
        process.exit(1);
    }
}
test();
