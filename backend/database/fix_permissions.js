import { db, initDatabase } from './init.js';
import fs from 'fs';
import path from 'path';

async function checkAndFix() {
    try {
        if (!process.env.DATABASE_URL) {
            const envPath = path.resolve('../.env');
            if (fs.existsSync(envPath)) {
                const env = fs.readFileSync(envPath, 'utf8');
                env.split('\n').forEach(line => {
                    const [key, ...value] = line.split('=');
                    if (key && value.length > 0) {
                        process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
                    }
                });
            }
        }

        await initDatabase();
        const users = await db.all("SELECT id, email, role, catalog_import_enabled, payment_module_enabled FROM users WHERE role = 'owner'");
        console.log("Current owners:", JSON.stringify(users, null, 2));
        
        const res = await db.run("UPDATE users SET catalog_import_enabled = 1, payment_module_enabled = 1 WHERE role = 'owner' AND (catalog_import_enabled = 0 OR catalog_import_enabled IS NULL)");
        console.log("Update result:", res);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAndFix();
