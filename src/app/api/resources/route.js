// src/app/api/resources/route.js

/**
 * Resources list (GET) and create (POST) endpoints.
 */

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let programme = searchParams.get("programme");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");
  const resourceType = searchParams.get("resource_type");
  const topic = searchParams.get("topic");
  const year = searchParams.get("year");
  const search = searchParams.get("search");
  const source = searchParams.get("source");       // platform | user | saved
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "24", 10);

  const supabase = await createServerClient();

  if (!programme || programme === "auto") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("programme, ib_program")
      .eq("id", user.id)
      .single();
    if (profile?.programme) {
      programme = profile.programme.toLowerCase();
    } else if (profile?.ib_program) {
      programme = profile.ib_program.toLowerCase().includes("myp") ? "myp" : "dp";
    }
  }

  let query = supabase
    .from("ib_resources")
    .select("*", { count: "exact" });

  // Source filtering
  if (source === "user") {
    query = query.eq("user_id", user.id).eq("source", "user");
  } else if (source === "platform") {
    query = query.eq("source", "platform");
  } else {
    // Default: show platform + own resources
    query = query.or(`source.eq.platform,user_id.eq."${user.id}"`);
  }

  // Metadata filters
  if (programme && programme !== "all") {
    const progLower = programme.toLowerCase();
    if (progLower.includes("myp")) {
      query = query.or("programme.ilike.%myp%,programme.ilike.%myp 5%");
    } else if (progLower.includes("dp")) {
      query = query.or("programme.ilike.%dp%,programme.ilike.%dp 2%");
    } else {
      query = query.ilike("programme", programme);
    }
  }
  if (subject) query = query.eq("subject", subject);
  if (level) query = query.eq("level", level);
  if (resourceType) {
    if (resourceType.includes(",")) {
      query = query.in("resource_type", resourceType.split(","));
    } else {
      query = query.eq("resource_type", resourceType);
    }
  }
  if (topic) query = query.ilike("topic", `%${topic}%`);
  if (year) query = query.eq("year", parseInt(year, 10));

  // Text search across title, subject, topic, description, tags
  if (search) {
    const q = `%${search}%`;
    query = query.or(`title.ilike.${q},subject.ilike.${q},topic.ilike.${q},description.ilike.${q}`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Resources query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ resources: data ?? [], total: count ?? 0 });
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const payload = await request.json();

  if (!payload.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!payload.file_url) {
    return NextResponse.json({ error: "File URL is required" }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Check admin status for platform uploads
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const isAdminUpload = payload.source === "platform";
  if (isAdminUpload && !isAdmin) {
    return NextResponse.json({ error: "Only admins can create platform resources" }, { status: 403 });
  }

  const resource = {
    user_id: isAdminUpload ? null : user.id,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    file_url: payload.file_url,
    file_name: payload.file_name || "unknown",
    file_size: payload.file_size || null,
    file_type: payload.file_type || null,
    resource_type: payload.resource_type || "other",
    programme: payload.programme || "dp",
    subject: payload.subject || null,
    level: payload.level || null,
    topic: payload.topic?.trim() || null,
    year: payload.year ? parseInt(payload.year, 10) : null,
    exam_session: payload.exam_session || null,
    paper_number: payload.paper_number || null,
    tags: payload.tags || [],
    source: isAdminUpload ? "platform" : "user",
    visibility: isAdminUpload ? "public" : "private",
    related_resource_id: payload.related_resource_id || null,
  };

  // Admin inserts bypass RLS (user_id is null for platform resources)
  const client = isAdminUpload ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("ib_resources")
    .insert(resource)
    .select()
    .single();

  if (error) {
    console.error("Resource insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Asynchronously index for Knowledge Lens (non-blocking)
  try {
    const { indexDocument } = await import("@/lib/ai/knowledge-lens");
    // For now we index the metadata since we do not have an active PDF extraction microservice
    const indexContent = `${data.title}\n\n${data.description || ""}\n\nKeywords: ${(data.tags || []).join(", ")}\nTopic: ${data.topic || ""}`;
    
    indexDocument({
      sourceType: "resource",
      sourceId: data.id,
      title: data.title,
      content: indexContent,
      userId: isAdminUpload ? null : user.id, // null makes it global
      metadata: {
        subject: data.subject,
        level: data.level,
        programme: data.programme,
        url: data.file_url
      }
    }).catch(err => console.warn("[KnowledgeLens] Async indexing error for resource:", err));
  } catch (err) {
    console.warn("Failed to schedule document indexing:", err);
  }

  return NextResponse.json(data, { status: 201 });
}
