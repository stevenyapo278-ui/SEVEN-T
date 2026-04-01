import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_statuses'
    `);
    console.log('Columns in whatsapp_statuses:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkColumns();
