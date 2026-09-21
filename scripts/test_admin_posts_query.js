const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function run() {
  console.log("Testing community_posts query with join...");
  const { data: posts1, error: err1 } = await supabase.from("community_posts").select("*, community_replies(*)");
  console.log("Query 1 result (with replies join):", { count: posts1?.length, error: err1 });

  const { data: posts2, error: err2 } = await supabase.from("community_posts").select("*");
  console.log("Query 2 result (without join):", { count: posts2?.length, error: err2, sample: posts2 });
}

run();
