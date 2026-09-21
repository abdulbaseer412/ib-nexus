const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Adding is_moderator and is_notice to community_messages...");

  // Try calling exec_sql or pgmigrate if available
  const sql = `
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS is_notice boolean DEFAULT false;
  `;

  // Attempt using postgres RPC or direct fetch to sql endpoint
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  }).catch(() => null);

  // Check columns after attempt
  const { data, error } = await supabase.from('community_messages').select('is_moderator, is_notice').limit(1);
  if (error) {
    console.log("Could not add columns directly via REST RPC:", error.message);
    console.log("Please run this SQL in Supabase SQL Editor if needed:\n" + sql);
  } else {
    console.log("SUCCESS! Columns is_moderator and is_notice exist in community_messages!");
  }
}

run();
