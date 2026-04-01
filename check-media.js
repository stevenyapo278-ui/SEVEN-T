import dotenv from 'dotenv';
dotenv.config();
import { db } from './backend/database/init.js';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function checkMedia() {
  try {
    const products = await db.all('SELECT name, image_url FROM products WHERE image_url IS NOT NULL');
    console.log(`Found ${products.length} products with images in DB.`);
    
    for (const p of products) {
      if (p.image_url.startsWith('/api/products/image/')) {
        const filename = p.image_url.split('/').pop();
        const filepath = join(__dirname, 'uploads', 'products', filename);
        const exists = fs.existsSync(filepath);
        console.log(`- Product "${p.name}": URL="${p.image_url}" | DiskPath="${filepath}" | Exists=${exists}`);
      } else {
        console.log(`- Product "${p.name}": Remote URL="${p.image_url}"`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err.message);
    process.exit(1);
  }
}

checkMedia();
