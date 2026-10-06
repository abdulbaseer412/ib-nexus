const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const dbUrl = process.env.DATABASE_URL;

async function runMigration() {
  if (!dbUrl) {
    console.error("No DATABASE_URL found in .env.local");
    return;
  }
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL database.");

    const sql = `
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
    `;

    console.log("Adding columns is_moderator and is_notice to community_messages...");
    await client.query(sql);
    console.log("✅ Columns added successfully to community_messages table!");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
