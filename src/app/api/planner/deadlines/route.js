import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("planner_deadlines").select("*").eq("user_id", user.id).order("due_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const payload = await request.json();
  if (!payload.title?.trim() || !payload.due_at)
    return NextResponse.json({ error: "Title and due date are required" }, { status: 400 });
  const supabase = await createServerClient();
  const clean = { ...payload, user_id: user.id };
  if (!clean.goal_id) delete clean.goal_id;
  if (!clean.task_id) delete clean.task_id;
  const { data, error } = await supabase.from("planner_deadlines").insert(clean).select().single();
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
  if (!updates.task_id) delete updates.task_id;
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("planner_deadlines").update(updates).eq("id", id).eq("user_id", user.id).select().single();
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
  const { error } = await supabase.from("planner_deadlines").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
