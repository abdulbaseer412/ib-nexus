import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userId = 'c0a80121-1234-1234-1234-1234567890ab';
  
  // Test without quotes
  const q1 = await supabase.from('ib_resources').select('id').or(`source.eq.platform,user_id.eq.${userId}`).limit(1);
  console.log("Without quotes error:", q1.error?.message);

  // Test with quotes
  const q2 = await supabase.from('ib_resources').select('id').or(`source.eq.platform,user_id.eq."${userId}"`).limit(1);
  console.log("With quotes error:", q2.error?.message);
}

test();
