const { Client } = require('pg');

const hosts = ["aws-0-ap-southeast-1.pooler.supabase.com"];
const users = ["postgres.hykcbbaprxajnlmmycrg", "postgres"];
const ports = [6543, 5432];

async function run() {
  for (const u of users) {
    for (const p of ports) {
      console.log(`Trying user ${u} on port ${p}...`);
      const client = new Client({
        host: "aws-0-ap-southeast-1.pooler.supabase.com",
        port: p,
        user: u,
        password: "abdulbaseer412",
        database: "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`✅ SUCCESS CONNECTING user ${u} port ${p}!`);
        const sql = `
          ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
          ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
          ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
        `;
        await client.query(sql);
        console.log("✅ ALTER TABLE COMPLETED SUCCESSFULLY!");
        await client.end();
        return;
      } catch (err) {
        console.log(`❌ Failed user ${u} port ${p}:`, err.message);
        try { await client.end(); } catch(e){}
      }
    }
  }
}

run();
