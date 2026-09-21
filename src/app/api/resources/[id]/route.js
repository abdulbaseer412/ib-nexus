// src/app/api/resources/[id]/route.js

/**
 * Single resource CRUD: GET detail, PUT update, DELETE.
 */

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("ib_resources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Fetch related resource (paired paper/markscheme)
  let paired = null;
  if (data.related_resource_id) {
    const { data: r } = await supabase
      .from("ib_resources")
      .select("id, title, resource_type, file_url")
      .eq("id", data.related_resource_id)
      .single();
    paired = r;
  }

  // Also find resources that reference this one
  const { data: reverseLinked } = await supabase
    .from("ib_resources")
    .select("id, title, resource_type, file_url")
    .eq("related_resource_id", id)
    .limit(5);

  // Related resources: same subject + programme, different id
  let related = [];
  if (data.subject) {
    const { data: rel } = await supabase
      .from("ib_resources")
      .select("id, title, resource_type, subject, level, year, exam_session, source, file_url")
      .eq("subject", data.subject)
      .eq("programme", data.programme)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(6);
    related = rel || [];
  }

  return NextResponse.json({
    resource: data,
    paired,
    reverseLinked: reverseLinked || [],
    related,
  });
}

export async function PUT(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const updates = await request.json();
  const supabase = await createServerClient();

  // Check ownership or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  // For admin, use admin client to bypass RLS (platform resources have null user_id)
  const client = isAdmin ? createAdminClient() : supabase;

  let query = client
    .from("ib_resources")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Non-admin can only update their own
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServerClient();

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const client = isAdmin ? createAdminClient() : supabase;

  let query = client.from("ib_resources").delete().eq("id", id);
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up storage file
  // (We would need the file path; for now just delete the DB row)

  return NextResponse.json({ success: true });
}
