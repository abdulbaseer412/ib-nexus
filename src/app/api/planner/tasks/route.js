import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("planner_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const payload = await request.json();
  if (!payload.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  const supabase = await createServerClient();
  const clean = { ...payload, user_id: user.id };
  if (!clean.goal_id) delete clean.goal_id;
  if (!clean.deadline_id) delete clean.deadline_id;
  if (!clean.note_id) delete clean.note_id;
  if (!clean.resource_id) delete clean.resource_id;
  const { data, error } = await supabase.from("planner_tasks").insert(clean).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const updates = await request.json();
  if (!updates.goal_id) delete updates.goal_id;
  if (!updates.deadline_id) delete updates.deadline_id;
  if (!updates.note_id) delete updates.note_id;
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("planner_tasks").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createServerClient();
  const { error } = await supabase.from("planner_tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
