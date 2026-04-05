import { db, initDatabase } from './backend/database/init.js';
import dotenv from 'dotenv';
dotenv.config();

const baseUrl = () => (process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

async function run() {
    try {
        console.log('Initializing database...');
        await initDatabase();
        
        // Use the first user found or a specific admin if known
        const user = await db.get('SELECT id FROM users LIMIT 1');
        if (!user) {
            console.error('No users found in database');
            process.exit(1);
        }
        const userId = user.id;
        console.log('Testing with userId:', userId);

        console.log('Executing query: SELECT * FROM payment_links WHERE user_id = ? ORDER BY created_at DESC');
        const payments = await db.all(`
            SELECT * FROM payment_links 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, userId);
        
        console.log('Found', payments.length, 'payments');

        if (payments.length > 0) {
            console.log('Sample payment row:', JSON.stringify(payments[0], null, 2));
            console.log('Type of id:', typeof payments[0].id);
        }

        const enhanced = payments.map(p => {
            try {
                return {
                    ...p,
                    short_id: p.id.split('-')[0].toUpperCase(),
                    payment_url: p.payment_url_external || `${baseUrl()}/pay/${p.id.split('-')[0].toUpperCase()}`
                };
            } catch (err) {
                console.error('MAP ERROR for payment:', p.id, err.message);
                throw err;
            }
        });

        console.log('Successfully enhanced', enhanced.length, 'payments');
        process.exit(0);
    } catch (e) {
        console.error('DIAGNOSTIC CRITICAL ERROR:', e);
        process.exit(1);
    }
}

run();
