const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SUPABASE_KEY = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim() || envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function alterProfiles() {
  console.log("Altering profiles table...");

  const query = `
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS admin_device_verification_enabled BOOLEAN DEFAULT true;
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { query_string: query });
    if (error) throw error;
    console.log("Success");
  } catch (err) {
    console.error("RPC failed, but column might exist or exec_sql isn't supported:", err);
  }
}

alterProfiles();
