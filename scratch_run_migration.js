const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: 'postgresql://postgres:abdulbaseer412@db.zdzeajqqxecyvvfrizmp.supabase.co:5432/postgres' });

const migrationPath = 'supabase/migrations/20260909000000_nexus_ai_core_and_lens.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

client.connect().then(() => {
  console.log('Connected to DB. Running migration...');
  return client.query(sql);
}).then(() => {
  console.log('Migration ran successfully!');
  client.end();
}).catch(err => {
  console.error('Migration failed:', err);
  client.end();
});
