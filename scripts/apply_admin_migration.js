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
  const sql = fs.readFileSync(path.resolve(__dirname, 'sql/single_admin_system.sql'), 'utf-8');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.log('exec_sql info:', error.message);
    } else {
      console.log('Successfully ran migration via exec_sql RPC:', data);
    }
  } catch (err) {
    console.log('exec_sql exception:', err.message);
  }

  // Check profiles table columns
  const { data: profileSample, error: profileErr } = await supabase.from('profiles').select('id, is_admin, is_suspended').limit(1);
  if (profileErr) {
    console.log('Profiles table query note:', profileErr.message);
  } else {
    console.log('Profiles table verified. Sample columns:', Object.keys(profileSample[0] || {}));
  }

  // Check admin_activity_logs table
  const { data: logsSample, error: logsErr } = await supabase.from('admin_activity_logs').select('id').limit(1);
  if (logsErr) {
    console.log('Admin activity logs query note:', logsErr.message);
  } else {
    console.log('admin_activity_logs table verified.');
  }
}

run();
