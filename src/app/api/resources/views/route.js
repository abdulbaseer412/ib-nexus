// src/app/api/resources/views/route.js

/**
 * Resource view tracking endpoints — recently viewed.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const supabase = await createServerClient();

  // Get last 10 unique resources viewed
  const { data, error } = await supabase
    .from("ib_resource_views")
    .select("resource_id, viewed_at, ib_resources(*)")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by resource_id, keep most recent
  const seen = new Set();
  const unique = [];
  for (const v of (data || [])) {
    if (!seen.has(v.resource_id) && v.ib_resources) {
      seen.add(v.resource_id);
      unique.push({ ...v.ib_resources, viewed_at: v.viewed_at });
      if (unique.length >= 8) break;
    }
  }

  return NextResponse.json(unique);
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { resource_id } = await request.json();
  if (!resource_id) return NextResponse.json({ error: "resource_id required" }, { status: 400 });

  const supabase = await createServerClient();

  // Insert a view record
  await supabase
    .from("ib_resource_views")
    .insert({ user_id: user.id, resource_id, viewed_at: new Date().toISOString() });

  // Clean up old views (keep last 50 per user)
  const { data: allViews } = await supabase
    .from("ib_resource_views")
    .select("id")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false });

  if (allViews && allViews.length > 50) {
    const toDelete = allViews.slice(50).map(v => v.id);
    await supabase.from("ib_resource_views").delete().in("id", toDelete);
  }

  return NextResponse.json({ success: true });
}
