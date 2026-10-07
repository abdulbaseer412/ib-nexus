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

  // Fetch publisher profile if user_id exists
  let publisher = null;
  if (data.source === "platform") {
    publisher = {
      name: "IB Nexus Academic Board",
      role: "Official Curriculum Board",
      school_name: "IB Nexus Global",
      is_official: true,
      is_admin: true,
    };
  } else if (data.user_id) {
    const { data: pubProfile } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, display_name, avatar_url, school_name, ib_program, is_admin")
      .eq("id", data.user_id)
      .single();
    if (pubProfile) {
      publisher = {
        id: pubProfile.id,
        name: pubProfile.display_name || pubProfile.full_name || "Community Member",
        avatar_url: pubProfile.avatar_url,
        school_name: pubProfile.school_name,
        program: pubProfile.ib_program,
        role: "Student Contributor",
        is_admin: pubProfile.is_admin === true,
      };
    }
  }

  const enrichedResource = { ...data, publisher };

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
    resource: enrichedResource,
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

  // Non-admin can only update their own resources and cannot modify protected fields (visibility, source, user_id)
  let safeUpdates = { ...updates };
  if (!isAdmin) {
    delete safeUpdates.visibility;
    delete safeUpdates.source;
    delete safeUpdates.user_id;
    delete safeUpdates.created_at;
    delete safeUpdates.downloads_count;
    delete safeUpdates.views_count;
    delete safeUpdates.rating;
  }

  let query = client
    .from("ib_resources")
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If status is updated to approved or rejected, sync admin_requests and notify the user
  if (data?.user_id && (updates.visibility === "approved" || updates.visibility === "rejected")) {
    try {
      const adminClient = createAdminClient();
      const status = updates.visibility === "approved" ? "approved" : "rejected";
      const reason = updates.rejection_reason || updates.admin_response || updates.admin_notes || null;

      // Update admin_requests
      await adminClient
        .from("admin_requests")
        .update({
          status,
          admin_response: reason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("target_id", id);

      // Create user notification
      const notifTitle = status === "approved" 
        ? "Resource Approved" 
        : "Resource Submission Not Approved";
      const notifMsg = reason 
        ? (status === "approved" ? `Your resource "${data.title}" was approved! Note: ${reason}` : `Your resource "${data.title}" was not approved because: ${reason}`)
        : (status === "approved" ? `Your resource "${data.title}" has been reviewed and published to Community Resources!` : `Your resource "${data.title}" was not approved.`);

      await adminClient.from("user_notifications").insert({
        user_id: data.user_id,
        title: notifTitle,
        message: notifMsg,
        type: status === "approved" ? "approved" : "rejected",
        request_type: "document_upload",
        target_url: status === "approved" ? `/dashboard/resources/${data.id}` : "/dashboard/resources",
        is_read: false,
        is_popup_dismissed: false,
      });
    } catch (syncErr) {
      console.warn("Failed to sync admin request or notification for resource:", syncErr?.message);
    }
  }

  // Fetch publisher for updated resource
  let publisher = null;
  if (data.source === "platform") {
    publisher = {
      name: "IB Nexus Academic Board",
      role: "Official Curriculum Board",
      school_name: "IB Nexus Global",
      is_official: true,
      is_admin: true,
    };
  } else if (data.user_id) {
    const { data: pubProfile } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, display_name, avatar_url, school_name, ib_program, is_admin")
      .eq("id", data.user_id)
      .single();
    if (pubProfile) {
      publisher = {
        id: pubProfile.id,
        name: pubProfile.display_name || pubProfile.full_name || "Community Member",
        avatar_url: pubProfile.avatar_url,
        school_name: pubProfile.school_name,
        program: pubProfile.ib_program,
        role: "Student Contributor",
        is_admin: pubProfile.is_admin === true,
      };
    }
  }

  return NextResponse.json({ ...data, publisher });
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
