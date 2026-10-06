const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.hykcbbaprxajnlmmycrg",
    password: "abdulbaseer412",
    database: "postgres",
    ssl: {
      servername: "db.hykcbbaprxajnlmmycrg.supabase.co",
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("✅ SUCCESS CONNECTING WITH SNI!");
    const sql = `
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
      ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
    `;
    await client.query(sql);
    console.log("✅ ALTER TABLE COMPLETED SUCCESSFULLY!");
    await client.end();
  } catch (err) {
    console.log("❌ Failed SNI test:", err.message);
    try { await client.end(); } catch(e){}
  }
}

run();
