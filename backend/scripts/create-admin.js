import 'dotenv/config';

/**
 * Crée un utilisateur administrateur.
 * Variables d'environnement (ou .env) :
 *   ADMIN_EMAIL   - Email de l'admin (requis)
 *   ADMIN_PASSWORD - Mot de passe (requis)
 *   ADMIN_NAME   - Nom affiché (défaut: "Admin")
 *
 * À lancer depuis la racine du projet :
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node backend/scripts/create-admin.js
 * ou : npm run db:create-admin
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../database/init.js';

await initDatabase();

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = (process.env.ADMIN_NAME || 'Admin').trim();

if (!email || !password) {
  console.error('Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] node backend/scripts/create-admin.js');
  console.error('Ou définir ADMIN_EMAIL et ADMIN_PASSWORD dans un fichier .env');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Le mot de passe doit contenir au moins 6 caractères.');
  process.exit(1);
}

const existing = await db.get('SELECT id, is_admin FROM users WHERE LOWER(email) = ?', email);
    if (existing) {
        // Mise à jour de TOUTES les colonnes de droits, même pour un utilisateur existant
        await db.run(`
            UPDATE users SET 
                is_admin = 1,
                can_manage_users = 1, can_manage_plans = 1, can_view_stats = 1, 
                can_manage_ai = 1, can_manage_tickets = 1,
                analytics_module_enabled = 1, flows_module_enabled = 1, 
                payment_module_enabled = 1, reports_module_enabled = 1, 
                voice_responses_enabled = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, existing.id);
        
        console.log('Droits administrateur et modules mis à jour pour:', email);
        process.exit(0);
    }

const id = uuidv4();
const hashedPassword = await bcrypt.hash(password, 12);

// Récupérer la durée d'essai configurée dans les paramètres de la plateforme
const trialSetting = await db.get("SELECT value FROM platform_settings WHERE key = 'default_trial_days'");
const trialDays = trialSetting && trialSetting.value ? parseInt(trialSetting.value, 10) : 7;

const trialEndDate = new Date();
trialEndDate.setDate(trialEndDate.getDate() + trialDays);

await db.run(`
  INSERT INTO users (
    id, email, password, name, company, plan, 
    subscription_status, subscription_end_date, credits, is_admin,
    can_manage_users, can_manage_plans, can_view_stats, can_manage_ai, can_manage_tickets,
    analytics_module_enabled, flows_module_enabled, payment_module_enabled, reports_module_enabled, 
    voice_responses_enabled
  )
  VALUES (?, ?, ?, ?, '', 'free', 'trialing', ?, 5000, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
`, id, email, hashedPassword, name, trialEndDate.toISOString());

console.log('Admin créé avec succès.');
console.log('  Email:', email);
console.log('  Nom:', name);
