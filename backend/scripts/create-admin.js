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
  if (existing.is_admin === 1) {
    console.log('Un admin avec cet email existe déjà.');
    process.exit(0);
  }
  await db.run('UPDATE users SET is_admin = 1 WHERE id = ?', existing.id);
  console.log('Utilisateur existant promu admin:', email);
  process.exit(0);
}

const id = uuidv4();
const hashedPassword = await bcrypt.hash(password, 12);
await db.run(`
  INSERT INTO users (id, email, password, name, company, plan, credits, is_admin)
  VALUES (?, ?, ?, ?, '', 'free', 100, 1)
`, id, email, hashedPassword, name);

console.log('Admin créé avec succès.');
console.log('  Email:', email);
console.log('  Nom:', name);
