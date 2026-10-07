"use server";
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/session';

export async function testDb() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('community_study_group_members').select('last_seen').limit(1);
  return { data, error };
}
