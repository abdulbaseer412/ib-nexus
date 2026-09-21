import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPgVector() {
  const { data, error } = await supabase.rpc("execute_sql", { query: "SELECT extname FROM pg_extension WHERE extname = 'vector';" });
  
  // Try querying pg_extension directly if rpc doesn't exist
  if (error) {
     console.log("RPC execute_sql failed. Using REST to query pg_extension if exposed.");
  }
  console.log("Vector extension check:", data || error);

  // Instead of querying pg_extension, let's just try to create a vector table!
  const sql = `
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS _test_vector ( id serial PRIMARY KEY, embedding vector(3) );
    DROP TABLE _test_vector;
  `;
  console.log("To test vector support, we should just run a raw query via postgres driver.");
}

checkPgVector();
