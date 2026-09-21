const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkIndexes() {
  const { data, error } = await supabase.rpc("get_indexes")
    .catch(() => supabase.from('pg_indexes').select('*').limit(1).catch(() => ({ error: "cannot query pg_indexes" })));
  
  if (error) {
     console.log("Using direct query approach for pg_indexes:");
     // Let's create an RPC to query pg_indexes if needed, or we can just ask Supabase to do a generic query if we have raw query access, but we don't.
     // Alternatively, we can just look at the schemas.
     console.log("Could not query pg_indexes directly. Error:", error);
     
     // Let's check what tables exist
     console.log("Checking tables...");
     const testTables = ['profiles', 'notes', 'flashcards', 'decks', 'resources', 'study_sessions', 'study_goals'];
     for (const table of testTables) {
         const { data, error } = await supabase.from(table).select('id').limit(1);
         console.log(table, error ? "Error/Missing" : "Exists");
     }
  } else {
    console.log(data);
  }
}

checkIndexes();
