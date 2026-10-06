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

async function setupWebsiteSettings() {
  console.log('Setting up website_settings database infrastructure...');
  const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260906000003_website_settings.sql'), 'utf-8');

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

  // Verify website_settings table accessibility
  const { data: selectData, error: selectErr } = await supabase.from('website_settings').select('*').eq('id', 'global').maybeSingle();

  if (selectErr && selectErr.code === '42P01') { // relation does not exist
    console.log('Table website_settings does not exist yet. Attempting direct fallback creation...');
  } else if (selectData) {
    console.log('✓ website_settings table exists and is readable:', selectData);
  } else if (!selectData) {
    console.log('No global row found. Inserting default global settings row...');
    const { data: insertData, error: insertErr } = await supabase.from('website_settings').upsert({
      id: 'global',
      is_locked: false,
      lock_message: null,
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    }).select();

    if (insertErr) {
      console.error('Error inserting default website_settings row:', insertErr.message);
    } else {
      console.log('✓ Default website_settings row initialized:', insertData);
    }
  }
}

setupWebsiteSettings();
