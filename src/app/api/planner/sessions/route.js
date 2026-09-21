import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // optional: filter by date (YYYY-MM-DD)

  let query = supabase.from("planner_sessions").select("*").eq("user_id", user.id).order("scheduled_start", { ascending: true });

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query.gte("scheduled_start", start.toISOString()).lte("scheduled_start", end.toISOString());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const payload = await request.json();
  if (!payload.scheduled_start || !payload.scheduled_end)
    return NextResponse.json({ error: "Start and end time are required" }, { status: 400 });
  const supabase = await createServerClient();
  const clean = { ...payload, user_id: user.id };
  if (!clean.task_id) delete clean.task_id;
  if (!clean.note_id) delete clean.note_id;
  const { data, error } = await supabase.from("planner_sessions").insert(clean).select().single();
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
  if (!updates.task_id) delete updates.task_id;
  if (!updates.note_id) delete updates.note_id;
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("planner_sessions").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request) {
  // Lightweight status update: complete, miss, reschedule
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await request.json();
  const supabase = await createServerClient();
  const updates = {};
  if (body.status) updates.status = body.status;
  if (body.status === "completed") {
    updates.completed_at = new Date().toISOString();
    if (body.actual_duration) updates.actual_duration = body.actual_duration;
  }
  if (body.scheduled_start) updates.scheduled_start = body.scheduled_start;
  if (body.scheduled_end) updates.scheduled_end = body.scheduled_end;
  const { data, error } = await supabase.from("planner_sessions").update(updates).eq("id", id).eq("user_id", user.id).select().single();
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
  const { error } = await supabase.from("planner_sessions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
