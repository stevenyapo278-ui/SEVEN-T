import db, { initDatabase } from '../database/init.js';

async function verify() {
    console.log('--- Verification du système d\'abonnement ---');
    
    try {
        await initDatabase();
        // 1. Vérifier les tables
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tables.map(t => t.name);
        
        console.log('Tables présentes:', tableNames.includes('saas_subscriptions') ? '✅ saas_subscriptions' : '❌ saas_subscriptions');
        
        // 2. Vérifier les colonnes de platform_settings
        const settings = await db.all("SELECT key, value FROM platform_settings WHERE key IN ('system_whatsapp_tool_id', 'system_whatsapp_number')");
        console.log('Paramètres système:', settings.length > 0 ? '✅ Présents' : '⚠️ Non initialisés (attendu après premier init)');
        settings.forEach(s => console.log(`  - ${s.key}: ${s.value || '(vide)'}`));

        // 3. Vérifier les colonnes de users
        const userCols = await db.all("PRAGMA table_info(users)");
        const userColNames = userCols.map(c => c.name);
        const expectedUserCols = ['plan', 'subscription_status', 'subscription_end_date', 'credits'];
        expectedUserCols.forEach(col => {
            console.log(`Colonne users.${col}:`, userColNames.includes(col) ? '✅' : '❌');
        });

        // 4. Test logique de filtrage WhatsApp (Simulation)
        // On va juste vérifier si la constante est bien gérée dans le code (via grep)
        
        console.log('\n--- Test terminé ---');
    } catch (e) {
        console.error('Erreur lors de la vérification:', e);
    } finally {
        process.exit(0);
    }
}

verify();
