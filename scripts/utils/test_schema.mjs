import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('community_study_groups')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    // If it's an empty table, we still want to see the column names if possible.
    // We can do an OPTIONS request or just try inserting a bad row to see the error,
    // or just fetch 0 rows to get the data structure.
  } else {
    console.log("Data:", data);
  }
}
main();
