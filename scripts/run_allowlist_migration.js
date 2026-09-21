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

async function setupAllowlist() {
  console.log('Running website_access_allowlist migration via HTTP RPC...');
  const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260908000000_website_access_allowlist.sql'), 'utf-8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.log('exec_sql RPC info:', error.message);
    } else {
      console.log('Ran migration via exec_sql RPC successfully:', data);
    }
  } catch (err) {
    console.log('exec_sql RPC note:', err.message);
  }
}

setupAllowlist();
