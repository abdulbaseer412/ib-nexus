const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createWebAuthnTable() {
  console.log("Setting up admin_device_credentials table...");

  const queries = [
    `
    CREATE TABLE IF NOT EXISTS admin_device_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT NOT NULL,
      transports TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    `,
    `CREATE INDEX IF NOT EXISTS idx_admin_device_user ON admin_device_credentials(user_id);`,
    `
    ALTER TABLE admin_device_credentials ENABLE ROW LEVEL SECURITY;
    `,
    // RLS: User can only read their own credentials. Service role handles insertion during enrollment.
    `
    CREATE POLICY "Users can read own device credentials" 
      ON admin_device_credentials FOR SELECT 
      USING (auth.uid() = user_id);
    `
  ];

  for (const query of queries) {
    const { error } = await supabase.rpc("exec_sql", { query_string: query })
      .catch(() => supabase.from('nonexistent').select().limit(1));
    
    console.log(`Executing: ${query}`);
  }

  console.log("\\nTo actually create these tables, run the following SQL in your Supabase SQL Editor:");
  console.log(queries.join("\\n"));
}

createWebAuthnTable();
