import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('community_rooms').delete().eq('id', '11111111-1111-1111-1111-111111111111');
    return NextResponse.json({ data, error });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
