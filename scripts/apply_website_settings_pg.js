const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const ref = refMatch ? refMatch[1] : '';

console.log(`Extracted Supabase ref: ${ref}`);

const poolers = [
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com",
  "aws-0-ap-south-1.pooler.supabase.com"
];

const passwords = ["abdulbaseer412"];
const users = ref ? [`postgres.${ref}`, "postgres"] : ["postgres"];

async function run() {
  const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260906000003_website_settings.sql'), 'utf-8');

  for (const host of poolers) {
    for (const user of users) {
      for (const pass of passwords) {
        for (const port of [6543, 5432]) {
          const client = new Client({
            host,
            port,
            user,
            password: pass,
            database: "postgres",
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 4000
          });

          try {
            await client.connect();
            console.log(`✅ Connected to ${host}:${port} as ${user}`);
            await client.query(sql);
            console.log("✅ website_settings migration executed successfully!");
            await client.end();
            return;
          } catch (err) {
            try { await client.end(); } catch (e) {}
          }
        }
      }
    }
  }

  console.log("Could not direct connect via pg pooler with default password.");
}

run();
