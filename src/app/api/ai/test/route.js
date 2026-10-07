import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_feedback")
      .select("*, ai_messages(id, role, content, model_id, model_display_name, created_at, conversation_id)")
      .limit(1);
    return NextResponse.json({ data, error });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
