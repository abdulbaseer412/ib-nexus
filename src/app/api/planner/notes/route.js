import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  
  const supabase = await createServerClient();
  let query = supabase
    .from("ib_notes")
    .select("id, title, subject, exam_importance, revision_readiness, is_favorite")
    .eq("user_id", user.id)
    .eq("is_folder", false)
    .order("last_opened_at", { ascending: false });

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) {
      query = query.or(`id.in.(${ids.join(',')}),last_opened_at.not.is.null`);
    }
  }
  
  // Only fetch 50 recent notes + explicitly included ones to keep it lightweight
  query = query.limit(50);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
