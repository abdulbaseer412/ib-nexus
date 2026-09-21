const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const adminId = '5240e88c-a207-4d04-aea8-c867f2eba0d7';
  
  // Update the 3 specific formula sheets that the admin uploaded
  const { data, error } = await supabase
    .from('ib_resources')
    .update({ source: 'platform', user_id: null, visibility: 'public' })
    .eq('user_id', adminId)
    .eq('resource_type', 'formula_sheet')
    .select('title, source');
    
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Successfully fixed rows:", data);
  }
}

fix();
