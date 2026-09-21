const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createIndexes() {
  console.log("Setting up performance indexes...");

  const queries = [
    `CREATE INDEX IF NOT EXISTS idx_ib_notes_user_id ON ib_notes(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ib_notes_last_opened ON ib_notes(last_opened_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON ib_flashcards(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON ib_flashcards(deck_id);`,
    `CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON ib_flashcards(next_review_at);`,
    `CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON ib_flashcard_decks(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_id ON planner_tasks(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_planner_sessions_user_id ON planner_sessions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_planner_sessions_start ON planner_sessions(scheduled_start);`,
    `CREATE INDEX IF NOT EXISTS idx_ib_resources_subject ON ib_resources(subject);`
  ];

  let successCount = 0;
  
  for (const query of queries) {
    const { error } = await supabase.rpc("exec_sql", { query_string: query })
      .catch(() => supabase.from('nonexistent').select().limit(1)); // Fallback if rpc is not defined
    
    // Since we don't have direct SQL access through the normal JS client and exec_sql might not be defined, 
    // let's just log what needs to be run.
    console.log(`Executing: ${query}`);
  }

  console.log("\\nTo actually create these indexes, run the following SQL in your Supabase SQL Editor:");
  console.log(queries.join("\\n"));
}

createIndexes();
