/**
 * Vide toutes les tables de la base PostgreSQL (données uniquement, schéma conservé).
 * À lancer depuis la racine du projet : node backend/scripts/clear-db.js
 */
import db, { initDatabase } from '../database/init.js';

await initDatabase();

// PostgreSQL: get all table names (public schema, exclude pg_*)
const rows = await db.all(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`);
const tables = rows.map((r) => r.tablename);

if (tables.length === 0) {
  console.log('Aucune table trouvée.');
  process.exit(0);
}

// Single TRUNCATE ... CASCADE for all tables (PostgreSQL handles FK order)
const quoted = tables.map((t) => `"${t}"`).join(', ');
try {
  await db.run(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log('Base vidée. Tables traitées:', tables.length);
} catch (e) {
  console.error('Erreur:', e.message);
  process.exit(1);
}
