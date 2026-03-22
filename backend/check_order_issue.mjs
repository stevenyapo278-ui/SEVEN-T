import { db, initDatabase } from './database/init.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
  await initDatabase();
  const conversationId = '302bb175-a24a-4a1b-a92f-9d5c98e55e92';
  try {
    const orders = await db.all("SELECT id, status, total_amount, created_at FROM orders WHERE conversation_id = ?", conversationId);
    console.log("Orders for conversation:", orders);
    
    if (orders.length === 0) {
        console.log("NO ORDERS FOUND. Checking recent messages...");
        const msgs = await db.all("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10", conversationId);
        console.log("Last messages:", msgs);
        
        // Find userId from conversation
        const conv = await db.get("SELECT agent_id FROM conversations WHERE id = ?", conversationId);
        if (conv) {
            const agent = await db.get("SELECT user_id FROM agents WHERE id = ?", conv.agent_id);
            if (agent) {
                console.log("Checking products for user:", agent.user_id);
                const prods = await db.all("SELECT id, name, price FROM products WHERE user_id = ? AND is_active = 1", agent.user_id);
                console.log("Active products:", prods);
            }
        }
    }
  } catch (err) {
    console.error(err);
  } finally {
      process.exit();
  }
}
run();
