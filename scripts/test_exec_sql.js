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
  const sql = `
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
  `;

  console.log("Testing rpc exec_sql...");
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log("exec_sql sql_query:", d1, e1);

  const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: sql });
  console.log("exec_sql query:", d2, e2);

  const { data, error } = await supabase.from('community_messages').select('is_moderator, is_notice, is_pinned').limit(1);
  console.log("Select result:", data, error);
}

run();
