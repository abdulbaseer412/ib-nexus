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
  const countOnly = searchParams.get("count_only");
  const pendingCountOnly = searchParams.get("pending_count");
  let programme = searchParams.get("programme");
  const subject = searchParams.get("subject");
  const level = searchParams.get("level");
  const resourceType = searchParams.get("resource_type");
  const topic = searchParams.get("topic");
  const year = searchParams.get("year");
  const search = searchParams.get("search");
  const source = searchParams.get("source");       // platform | user | community | saved
  const visibilityParam = searchParams.get("visibility"); // pending_approval | approved | private | public
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "24", 10);

  const supabase = await createServerClient();

  // Check if current user is an admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("is_admin, programme, ib_program")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.is_admin === true;

  // Quick endpoint for admin pending queue counter badge
  if (pendingCountOnly === "true") {
    if (!isAdmin) {
      return NextResponse.json({ pending_count: 0 });
    }
    const { count: pendingCount, error: countErr } = await createAdminClient()
      .from("ib_resources")
      .select("*", { count: "exact", head: true })
      .eq("visibility", "pending_approval");
    return NextResponse.json({ pending_count: pendingCount || 0 });
  }

  if (!programme || programme === "auto") {
    if (currentProfile?.programme) {
      programme = currentProfile.programme.toLowerCase();
    } else if (currentProfile?.ib_program) {
      programme = currentProfile.ib_program.toLowerCase().includes("myp") ? "myp" : "dp";
    }
  }

  // Use admin client if user is admin and viewing pending moderation queue
  const isReviewQueue = visibilityParam === "pending_approval" && isAdmin;
  const client = isReviewQueue ? createAdminClient() : supabase;

  let query = client
    .from("ib_resources")
    .select("*", { count: "exact" });

  // Source & Visibility filtering
  const scope = searchParams.get("scope");

  if (isReviewQueue) {
    // Admin Moderation Hub: pending community submissions
    query = query.eq("visibility", "pending_approval");
  } else if (source === "platform" || source === "nexus" || source === "nexus_library") {
    query = query.eq("source", "platform");
  } else if (source === "community" || source === "community_resources") {
    // Public Community Resources: only show approved (or public) community items
    query = query.eq("source", "user").in("visibility", ["approved", "public"]);
  } else if (source === "user" || source === "my_library") {
    if (scope === "all") {
      query = query.eq("source", "user");
    } else {
      // User's personal library: show all of their items (private, pending, approved, rejected)
      query = query.eq("user_id", user.id);
    }
  } else if (source === "all") {
    // Public directory: platform resources + approved community resources
    query = query.or("source.eq.platform,and(source.eq.user,visibility.in.(approved,public))");
  } else {
    // Default fallback: platform + approved community
    query = query.or("source.eq.platform,and(source.eq.user,visibility.in.(approved,public))");
  }

  // Specific visibility filter if requested and allowed
  if (visibilityParam && !isReviewQueue) {
    query = query.eq("visibility", visibilityParam);
  }

  // Metadata filters (skip when reviewing general queue unless explicitly passed)
  if (programme && programme !== "all") {
    const progLower = programme.toLowerCase();
    if (progLower.includes("myp")) {
      query = query.or("programme.ilike.%myp%,programme.ilike.%myp 5%,programme.eq.both,programme.eq.all,programme.is.null");
    } else if (progLower.includes("dp")) {
      query = query.or("programme.ilike.%dp%,programme.ilike.%dp 2%,programme.eq.both,programme.eq.all,programme.is.null");
    } else {
      query = query.or(`programme.ilike.${programme},programme.eq.both,programme.eq.all,programme.is.null`);
    }
  }
  if (subject) {
    if (subject === "general" || subject === "General") {
      query = query.is("subject", null);
    } else {
      query = query.eq("subject", subject);
    }
  }
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

  // Batch-fetch publisher profiles for all unique user_ids
  const userIds = Array.from(new Set((data || []).map(r => r.user_id).filter(Boolean)));
  const profilesMap = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, display_name, avatar_url, school_name, ib_program, is_admin")
      .in("id", userIds);

    if (!profErr && profiles) {
      for (const p of profiles) {
        profilesMap[p.id] = {
          id: p.id,
          name: p.display_name || p.full_name || "Community Member",
          avatar_url: p.avatar_url,
          school_name: p.school_name,
          program: p.ib_program,
          role: "Student Contributor",
          is_admin: p.is_admin === true,
        };
      }
    }
  }

  // Enrich resources with formatted publisher and submission info
  const enrichedResources = (data || []).map(r => {
    let publisher = null;
    if (r.source === "platform") {
      publisher = {
        id: "platform",
        name: "IB Nexus Academic Board",
        role: "Official Curriculum Board",
        school_name: "IB Nexus Global",
        is_official: true,
        is_admin: true,
      };
    } else if (r.user_id && profilesMap[r.user_id]) {
      publisher = profilesMap[r.user_id];
    } else if (r.user_id) {
      publisher = {
        id: r.user_id,
        name: "Community Member",
        role: "Student Contributor",
        school_name: null,
        is_official: false,
        is_admin: false,
      };
    }
    return {
      ...r,
      publisher,
    };
  });

  return NextResponse.json({ resources: enrichedResources, total: count ?? 0 });
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

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name, full_name")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  // Determine destination and source/visibility
  // destination: 'nexus' | 'community' | 'my_library'
  const destination = payload.destination || (payload.source === "platform" ? "nexus" : "my_library");

  let source = "user";
  let visibility = "private";

  if (destination === "nexus" || payload.source === "platform") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can upload to IB Nexus Library" }, { status: 403 });
    }
    source = "platform";
    visibility = "public";
  } else if (destination === "community") {
    source = "user";
    // All community uploads require review by default unless admin explicitly publishes directly
    visibility = (isAdmin && payload.publish_immediately === true) ? "approved" : "pending_approval";
  } else {
    // My Library (personal)
    source = "user";
    visibility = "private";
  }

  // If visibility is explicitly provided and valid
  if (payload.visibility && (payload.visibility === "pending_approval" || payload.visibility === "private" || (isAdmin && payload.visibility === "approved"))) {
    visibility = payload.visibility;
  }

  const resource = {
    user_id: source === "platform" ? null : user.id,
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
    source,
    visibility,
    related_resource_id: payload.related_resource_id || null,
  };

  // Admin inserts bypass RLS
  const client = (source === "platform" || isAdmin) ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("ib_resources")
    .insert(resource)
    .select()
    .single();

  if (error) {
    console.error("Resource insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create admin request record and user notification if pending approval
  if (visibility === "pending_approval") {
    try {
      const adminClient = createAdminClient();
      const { data: adminReq, error: reqErr } = await adminClient.from("admin_requests").insert({
        user_id: user.id,
        user_email: user.email,
        user_name: profile?.display_name || profile?.full_name || user.email?.split("@")[0] || "Student",
        request_type: "document_upload",
        title: data.title,
        details: data.description || `Resource submitted to Community Library: ${data.subject || "General"} (${(data.programme || "dp").toUpperCase()})`,
        metadata: {
          resource_id: data.id,
          file_name: data.file_name,
          file_url: data.file_url,
          file_size: data.file_size,
          resource_type: data.resource_type,
          programme: data.programme,
          subject: data.subject,
          level: data.level,
          topic: data.topic,
          tags: data.tags,
        },
        target_id: String(data.id),
        target_table: "ib_resources",
        status: "pending",
      }).select().single();

      if (reqErr) {
        console.warn("Failed to create admin_requests row for resource:", reqErr?.message);
      }

      // Also create confirmation notification for the submitter
      await adminClient.from("user_notifications").insert({
        user_id: user.id,
        request_id: adminReq?.id || null,
        title: "Document Submitted for Review",
        message: `Your document "${data.title}" was submitted to Community Resources and is pending administrator review.`,
        type: "info",
        request_type: "document_upload",
        target_url: "/dashboard/resources",
        is_read: false,
        is_popup_dismissed: false,
      });
    } catch (reqErr) {
      console.warn("Failed to create admin_requests row for resource:", reqErr?.message);
    }
  }

  // Attach publisher profile
  const enriched = {
    ...data,
    publisher: source === "platform" ? {
      name: "IB Nexus Academic Board",
      role: "Official Curriculum Board",
      school_name: "IB Nexus Global",
      is_official: true,
      is_admin: true,
    } : {
      id: user.id,
      name: profile?.display_name || profile?.full_name || "Community Member",
      avatar_url: profile?.avatar_url,
      school_name: profile?.school_name,
      role: "Student Contributor",
      is_admin: isAdmin,
    }
  };

  // Asynchronously index for Knowledge Lens (non-blocking)
  try {
    const { indexDocument } = await import("@/lib/ai/knowledge-lens");
    const indexContent = `${data.title}\n\n${data.description || ""}\n\nKeywords: ${(data.tags || []).join(", ")}\nTopic: ${data.topic || ""}`;
    
    indexDocument({
      sourceType: "resource",
      sourceId: data.id,
      title: data.title,
      content: indexContent,
      userId: source === "platform" ? null : user.id,
      metadata: {
        subject: data.subject,
        level: data.level,
        programme: data.programme,
        url: data.file_url,
        visibility: data.visibility,
      }
    }).catch(err => console.warn("[KnowledgeLens] Async indexing error for resource:", err));
  } catch (err) {
    console.warn("Failed to schedule document indexing:", err);
  }

  return NextResponse.json(enriched, { status: 201 });
}
