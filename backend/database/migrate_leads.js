import 'dotenv/config';
import { db, initDatabase } from './init.js';
import { defaultPlans } from '../config/defaultPlans.js';

async function migrate() {
    try {
        console.log('Starting migration for leads_management...');
        console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
        if (process.env.DATABASE_URL) {
            console.log('DATABASE_URL includes:', process.env.DATABASE_URL.split('@')[1] || 'URL format unexpected');
        }
        
        await initDatabase();
        console.log('Database initialized successfully for migration.');

        // 1. Add column to users table
        console.log('Adding leads_management_enabled column to users table...');
        try {
            await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS leads_management_enabled INTEGER DEFAULT 0');
            console.log('Column added or already exists.');
        } catch (e) {
            console.error('Error adding column:', e.message);
        }

        // 2. Update existing plans in subscription_plans table
        console.log('Updating features for existing plans...');
        const plans = await db.all('SELECT * FROM subscription_plans');
        for (const plan of plans) {
            try {
                const features = JSON.parse(plan.features || '{}');
                const planFromDefault = defaultPlans.find(p => p.name === plan.name);
                
                if (planFromDefault) {
                    const defaultFeatures = JSON.parse(planFromDefault.features);
                    features.leads_management = defaultFeatures.leads_management;
                    
                    await db.run(
                        'UPDATE subscription_plans SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        JSON.stringify(features),
                        plan.id
                    );
                    console.log(`Updated features for plan: ${plan.name} -> leads_management: ${features.leads_management}`);
                }
            } catch (e) {
                console.error(`Error updating plan ${plan.name}:`, e.message);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
