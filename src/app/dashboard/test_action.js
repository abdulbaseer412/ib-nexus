"use server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function testDb() {
  const { data, error } = await supabase.from('community_study_group_members').select('last_seen').limit(1);
  return { data, error };
}
