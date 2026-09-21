const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking if ai_conversations table exists...");
  const { data, error } = await supabase.from('ai_conversations').select('id').limit(1);
  if (error) {
    console.log("ERROR querying ai_conversations:");
    console.log(error);
  } else {
    console.log("SUCCESS! Table exists.");
    console.log(data);
  }
}
test();
