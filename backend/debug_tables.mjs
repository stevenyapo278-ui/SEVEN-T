import db from './database/init.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
  try {
    const tables = ['users', 'agents', 'products', 'conversations', 'messages', 'orders', 'knowledge_base'];
    for (const table of tables) {
        try {
            const count = await db.get(`SELECT count(*) as cnt FROM ${table}`);
            console.log(`Table ${table}: ${count.cnt} rows`);
        } catch (e) {
            console.log(`Table ${table} check failed: ${e.message}`);
        }
    }
    
    console.log("\nSample products:");
    const prod = await db.all("SELECT id, name FROM products LIMIT 5");
    console.log(prod);

  } catch (err) {
    console.error(err);
  } finally {
      process.exit();
  }
}
run();
