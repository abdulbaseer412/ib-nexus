const { Client } = require('pg');

const poolers = [
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-us-east-2.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-us-west-2.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-west-2.pooler.supabase.com",
  "aws-0-eu-west-3.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-ap-southeast-2.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com",
  "aws-0-ap-south-1.pooler.supabase.com",
  "aws-0-ca-central-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com"
];

async function test(host, port, user) {
  const client = new Client({
    host,
    port,
    user,
    password: "abdulbaseer412",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`🎉 SUCCESS! Connected to ${host}:${port} as ${user}!`);
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
    if (!err.message.includes("ENOTFOUND")) {
      console.log(`Host ${host}:${port} user ${user} -> ${err.message}`);
    }
    try { await client.end(); } catch(e){}
    return false;
  }
}

async function main() {
  for (const host of poolers) {
    for (const user of ["postgres.hykcbbaprxajnlmmycrg", "postgres"]) {
      for (const port of [5432, 6543]) {
        const ok = await test(host, port, user);
        if (ok) return;
      }
    }
  }
}

main();
