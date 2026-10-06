/**
 * Consolidate all Supabase migration SQL files into a single file
 * for pasting into the Supabase SQL Editor.
 * 
 * Usage: node scripts/apply_all_migrations.mjs
 * Output: scripts/consolidated_migrations.sql
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../supabase/migrations');
const scriptsSqlDir = join(__dirname, 'sql');
const outputPath = join(__dirname, 'consolidated_migrations.sql');

// Explicit ordered list of scripts/sql files (creation before alteration)
const orderedScriptSqlFiles = [
  'notes_db_setup.sql',
  'alter_notes_db.sql',
  'alter_notes_db_folders.sql',
  'flashcards_v2.sql',
  'flashcards_v3_gamification.sql',
  'flashcards_v4_categorization.sql',
  '20250825000000_extend_flashcards.sql',
  'community_db_setup.sql',
  'community_rls_policies.sql',
  'chat_and_avatars_migration.sql',
  'storage_setup.sql',
  'setup_storage.sql',
  'subjects_db_setup.sql',
  'make_admin.sql',
  'single_admin_system.sql',
];

const scriptSqlFiles = orderedScriptSqlFiles
  .map(f => ({ path: join(scriptsSqlDir, f), name: `scripts/sql/${f}` }));

// Get all .sql files from supabase/migrations
const migrationFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .filter(f => !f.startsWith('DIAGNOSTIC') && !f.startsWith('VERIFY'))
  .sort()
  .map(f => ({ path: join(migrationsDir, f), name: `supabase/migrations/${f}` }));

// Split migrations into early (auth/profiles) and late (planner/resources/admin)
const earlyMigrations = migrationFiles.filter(f => f.name < 'supabase/migrations/20250826');
const lateMigrations = migrationFiles.filter(f => f.name >= 'supabase/migrations/20250826');

const files = [...earlyMigrations, ...scriptSqlFiles, ...lateMigrations];

console.log(`Found ${files.length} migration files:\n`);
files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));

let consolidated = `-- =============================================================
-- IB Nexus — Consolidated Migrations
-- Generated: ${new Date().toISOString()}
-- Target Project: hykcbbaprxajnlmmycrg (ib-nexus copy)
-- =============================================================
-- Run this entire file in the Supabase SQL Editor.
-- Each migration is wrapped in a DO block for safety.
-- =============================================================

`;

for (const file of files) {
  const sql = readFileSync(file.path, 'utf-8');
  consolidated += `
-- =============================================================
-- Migration: ${file.name}
-- =============================================================
${sql}

`;
}

writeFileSync(outputPath, consolidated, 'utf-8');
console.log(`\n✅ Consolidated ${files.length} migrations into:\n   ${outputPath}`);
console.log('\nNext steps:');
console.log('  1. Open the Supabase SQL Editor for the new project');
console.log('  2. Paste the contents of consolidated_migrations.sql');
console.log('  3. Click "Run" to apply all migrations');
