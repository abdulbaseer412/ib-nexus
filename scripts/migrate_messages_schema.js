const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log("Running migration for community_messages moderator identity columns...");

  // Try adding columns using RPC or pgmigrate if present, or query check
  const { error: checkErr } = await supabase.from('community_messages').select('is_moderator, is_notice').limit(1);

  if (checkErr) {
    console.log("Columns need to be added or queried:", checkErr.message);
  } else {
    console.log("is_moderator and is_notice columns already exist in community_messages!");
  }
}

runMigration();
