import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const agents = await pool.query("SELECT id, name, template FROM agents");
    console.log("Agents:", agents.rows);
    const products = await pool.query("SELECT id, name, user_id, is_active FROM products");
    console.log("Products:", products.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
