import db from './database/init.js';
async function run() {
  try {
    const agents = await db.all("SELECT id, name, template FROM agents");
    console.log("Agents:", agents);
    const products = await db.all("SELECT id, name, user_id, is_active FROM products");
    console.log("Products:", products);
  } catch (err) {
    console.error(err);
  }
}
run();
