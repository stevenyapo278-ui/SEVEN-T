const db = require('./backend/database.js');
async function run() {
  const agents = await db.all("SELECT id, name, template FROM agents");
  console.log("Agents:", agents);
  const products = await db.all("SELECT id, name, user_id, is_active FROM products");
  console.log("Products:", products);
  const kb = await db.all("SELECT id, agent_id, title FROM knowledge_base");
  console.log("KB items:", kb.length);
}
run().catch(console.error);
