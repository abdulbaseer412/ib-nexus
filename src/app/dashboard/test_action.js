"use server";
import { createClient } from '@supabase/supabase-js';

export async function testDb() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th"
  );
  const { data, error } = await supabase.from('community_study_group_members').select('last_seen').limit(1);
  return { data, error };
}
