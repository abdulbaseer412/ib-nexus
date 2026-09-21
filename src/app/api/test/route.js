import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('community_rooms').delete().eq('id', '11111111-1111-1111-1111-111111111111');
  return NextResponse.json({ data, error });
}
