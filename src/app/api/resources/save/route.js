// src/app/api/resources/save/route.js

/**
 * Resource save/unsave (bookmark) endpoints.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ib_resource_saves")
    .select("resource_id")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(s => s.resource_id));
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { resource_id, action } = await request.json();
  if (!resource_id) return NextResponse.json({ error: "resource_id required" }, { status: 400 });

  const supabase = await createServerClient();

  if (action === "unsave") {
    const { error } = await supabase
      .from("ib_resource_saves")
      .delete()
      .eq("user_id", user.id)
      .eq("resource_id", resource_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ saved: false });
  }

  // Save
  const { error } = await supabase
    .from("ib_resource_saves")
    .upsert({ user_id: user.id, resource_id }, { onConflict: "user_id,resource_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}
