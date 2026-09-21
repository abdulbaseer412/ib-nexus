const { Client } = require('pg');

const hosts = [
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com",
  "aws-0-me-central-1.pooler.supabase.com"
];

const pass = "abdulbaseer412";
const user = "postgres.hykcbbaprxajnlmmycrg";

async function testHost(host) {
  console.log("Trying host:", host);
  const client = new Client({
    host: host,
    port: 6543,
    user: user,
    password: pass,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000
  });

  try {
    await client.connect();
    console.log("✅ SUCCESS CONNECTING TO:", host);
    const sql = `
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
    `;
    await client.query(sql);
    console.log("✅ ALTER TABLE COMPLETED SUCCESSFULLY!");
    await client.end();
    return true;
  } catch (err) {
    console.log("❌ Failed for host:", host, err.message);
    try { await client.end(); } catch(e){}
    return false;
  }
}

async function run() {
  for (const host of hosts) {
    const ok = await testHost(host);
    if (ok) break;
  }
}

run();
