"use server";

/**
 * Server actions for the Resources system.
 */

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getResources(filters = {}) {
  const user = await getAuthUser();
  if (!user) return { resources: [], total: 0 };

  const supabase = await createServerClient();

  let userProg = filters.programme;
  if (!userProg || userProg === "auto") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("programme, ib_program")
      .eq("id", user.id)
      .single();
    if (profile?.programme) {
      userProg = profile.programme.toLowerCase();
    } else if (profile?.ib_program) {
      userProg = profile.ib_program.toLowerCase().includes("myp") ? "myp" : "dp";
    }
  }

  let query = supabase
    .from("ib_resources")
    .select("*", { count: "exact" });

  // Source filtering
  if (filters.source === "user") {
    query = query.eq("user_id", user.id).eq("source", "user");
  } else if (filters.source === "saved") {
    // Get saved resource IDs first
    const { data: saves } = await supabase
      .from("ib_resource_saves")
      .select("resource_id")
      .eq("user_id", user.id);
    const ids = (saves || []).map(s => s.resource_id);
    if (ids.length === 0) return { resources: [], total: 0 };
    query = query.in("id", ids);
  } else if (filters.source === "platform") {
    query = query.eq("source", "platform");
  } else {
    // Default: platform + own
    query = query.or(`source.eq.platform,user_id.eq.${user.id}`);
  }

  if (userProg && userProg !== "all") {
    const progLower = userProg.toLowerCase();
    if (progLower.includes("myp")) {
      query = query.or("programme.ilike.%myp%,programme.ilike.%myp 5%");
    } else if (progLower.includes("dp")) {
      query = query.or("programme.ilike.%dp%,programme.ilike.%dp 2%");
    } else {
      query = query.ilike("programme", userProg);
    }
  }

  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.resource_type) query = query.eq("resource_type", filters.resource_type);
  if (filters.year) query = query.eq("year", parseInt(filters.year, 10));

  if (filters.search) {
    const q = `%${filters.search}%`;
    query = query.or(`title.ilike.${q},subject.ilike.${q},topic.ilike.${q},description.ilike.${q}`);
  }

  const offset = filters.offset || 0;
  const limit = filters.limit || 24;

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("getResources error:", error);
    return { resources: [], total: 0 };
  }

  return { resources: data ?? [], total: count ?? 0 };
}

export async function getSavedResourceIds() {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("ib_resource_saves")
    .select("resource_id")
    .eq("user_id", user.id);
  return (data || []).map(s => s.resource_id);
}

export async function getRecentlyViewed() {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("ib_resource_views")
    .select("resource_id, viewed_at, ib_resources(*)")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(20);

  const seen = new Set();
  const unique = [];
  for (const v of (data || [])) {
    if (!seen.has(v.resource_id) && v.ib_resources) {
      seen.add(v.resource_id);
      unique.push({ ...v.ib_resources, viewed_at: v.viewed_at });
      if (unique.length >= 6) break;
    }
  }
  return unique;
}

export async function getRecommendedResources(userSubjects = []) {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createServerClient();

  if (!userSubjects.length) {
    // Try to get from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("subjects")
      .eq("id", user.id)
      .single();
    userSubjects = profile?.subjects || [];
  }

  if (!userSubjects.length) return [];

  const { data } = await supabase
    .from("ib_resources")
    .select("*")
    .eq("source", "platform")
    .in("subject", userSubjects.slice(0, 6))
    .order("created_at", { ascending: false })
    .limit(6);

  return data || [];
}

export async function deleteResource(id) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthenticated");

  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const client = isAdmin ? createAdminClient() : supabase;

  let query = client.from("ib_resources").delete().eq("id", id);
  if (!isAdmin) query = query.eq("user_id", user.id);

  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/resources");
  return { success: true };
}

export async function linkResources(id1, id2) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthenticated");

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Admin only");

  const admin = createAdminClient();

  // Bi-directional link
  await admin.from("ib_resources").update({ related_resource_id: id2 }).eq("id", id1);
  await admin.from("ib_resources").update({ related_resource_id: id1 }).eq("id", id2);

  revalidatePath("/dashboard/resources");
  return { success: true };
}
