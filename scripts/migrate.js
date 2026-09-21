const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read .env.local to get variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

const dbUrl = process.env.DATABASE_URL;

async function runMigration() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to the database.");

    const migrationPath = path.join(__dirname, '../scripts/fix_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log("Running migration...");
    await client.query(sql);
    console.log("✅ Migration completed successfully!");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
