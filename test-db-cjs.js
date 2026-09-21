const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

async function test() {
  const standardUserId = 'c0a80121-1234-1234-1234-1234567890ab';
  
  const { data, error } = await supabase
    .from('ib_resources')
    .select('id, title, source, user_id, level, resource_type, subject')
    .or(`source.eq.platform,user_id.eq."${standardUserId}"`);
    
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("DB returned", data.length, "rows.");
    console.log(data);
  }
}

test();
