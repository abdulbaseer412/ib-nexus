// src/app/api/planner/preferences/route.js

/**
 * API routes for Planner Preferences (read / update).
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error && error.message !== "Row not found") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || {});
}

export async function PUT(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const updates = await request.json();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_preferences")
    .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
