const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking DB via Supabase service role...");
  
  // Test query on ai_training_entries
  const { data, error } = await supabase.from("ai_training_entries").select("*").limit(1);
  if (error) {
    console.log("ai_training_entries select error:", error.message);
  } else {
    console.log("ai_training_entries sample:", data);
  }

  // Execute sql via rpc exec_sql if available
  const sql = `
    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS ai_instruction TEXT;
    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL;
    ALTER TABLE public.ai_master_rules ADD COLUMN IF NOT EXISTS training_entry_id UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL;
  `;

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("exec_sql", { sql });
  if (rpcErr) {
    console.log("exec_sql rpc error or not defined:", rpcErr.message);
  } else {
    console.log("exec_sql succeeded:", rpcRes);
  }
}

run().catch(console.error);
