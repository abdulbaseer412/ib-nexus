import os

top_half = """"use server";

import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

import { COMMUNITY_CATEGORIES } from "./constants";

/* ── Database bootstrap (run once) ───────────────────────────────────────── */
export async function bootstrapCommunityDB() {
  const admin = createAdminClient();

  // Add is_admin column to profiles
  await admin.rpc("pgmigrate_community", {}).catch(() => null);

  // Try creating tables via raw SQL through the REST SQL endpoint
  // Since Supabase JS doesn't support raw DDL, we create tables via
  // the admin client insert approach — check if tables exist first.
  const { error: checkPosts } = await admin.from("community_posts").select("id").limit(1);

  if (checkPosts && checkPosts.code === "42P01") {
    // Tables don't exist — user needs to run SQL in Supabase dashboard
    return {
      success: false,
      message: "Tables need to be created. Run the SQL in Supabase SQL Editor.",
      sql: getBootstrapSQL(),
    };
  }

  return { success: true, message: "Community tables already exist." };
}

export async function getBootstrapSQL() {
  return `
-- Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Community posts (permanent discussions)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  post_type text DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question')),
  is_answered boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  helpful_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Community replies
CREATE TABLE IF NOT EXISTS community_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  helpful_count integer DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Community reactions (helpful votes)
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- Community bookmarks
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Community reports
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  message_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'harassment', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Live subject rooms
CREATE TABLE IF NOT EXISTS community_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Live room messages
CREATE TABLE IF NOT EXISTS community_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  reply_to uuid REFERENCES community_messages(id) ON DELETE SET NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Room presence tracking
CREATE TABLE IF NOT EXISTS community_presence (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  last_seen timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

-- Study groups
CREATE TABLE IF NOT EXISTS community_study_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  topic text,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_members integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_study_group_members (
  group_id uuid REFERENCES community_study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON community_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_room ON community_presence(room_id);

-- Seed default rooms
INSERT INTO community_rooms (subject, name, slug, description, sort_order) VALUES
  ('Biology', 'Biology General', 'biology-general', 'General Biology discussion', 1),
  ('Biology', 'Biology IA', 'biology-ia', 'Internal Assessment help for Biology', 2),
  ('Biology', 'Biology Exam Prep', 'biology-exam-prep', 'Exam revision and practice', 3),
  ('Chemistry', 'Chemistry General', 'chemistry-general', 'General Chemistry discussion', 4),
  ('Chemistry', 'Chemistry IA', 'chemistry-ia', 'Internal Assessment help for Chemistry', 5),
  ('Physics', 'Physics General', 'physics-general', 'General Physics discussion', 6),
  ('Physics', 'Physics Exam Prep', 'physics-exam-prep', 'Exam revision and practice', 7),
  ('Mathematics', 'Maths General', 'maths-general', 'General Mathematics discussion', 8),
  ('Mathematics', 'Maths HL', 'maths-hl', 'Higher Level Mathematics', 9),
  ('Mathematics', 'Maths Exam Prep', 'maths-exam-prep', 'Exam revision and practice', 10),
  ('Computer Science', 'CS General', 'cs-general', 'General Computer Science discussion', 11),
  ('Computer Science', 'CS IA', 'cs-ia', 'Internal Assessment help for CS', 12),
  ('Economics', 'Economics General', 'economics-general', 'General Economics discussion', 13),
  ('English', 'English General', 'english-general', 'General English discussion', 14),
  ('TOK', 'TOK General', 'tok-general', 'Theory of Knowledge discussion', 15),
  ('Extended Essay', 'EE General', 'ee-general', 'Extended Essay help and advice', 16),
  ('General IB', 'IB General', 'ib-general', 'General IB discussion', 17)
ON CONFLICT (slug) DO NOTHING;

-- Enable Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE community_presence;
  `;
}

/* ── Discussion Actions ──────────────────────────────────────────────────── */

export async function createPostAction({ title, content, category, postType = "discussion" }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (!title?.trim() || !content?.trim() || !category?.trim()) {
    throw new Error("Title, content and category are required.");
  }

  if (!COMMUNITY_CATEGORIES.includes(category)) {
    throw new Error("Invalid category selected.");
  }

  // Get author profile info
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_restricted")
    .eq("id", user.id)
    .single();

  if (profile?.is_restricted) {
    throw new Error("Your account has been restricted from participating in the community.");
  }

  const { data, error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    author_name: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
    author_avatar: profile?.avatar_url || null,
    title: title.trim(),
    content: content.trim(),
    category,
    post_type: postType,
    status: "pending",
  }).select("id").single();

  if (error) {
    console.error("Failed to create post. Message:", error.message, "Details:", error.details, "Hint:", error.hint, "Code:", error.code);
    throw new Error(`Failed to submit discussion: ${error.message}`);
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true, id: data.id };
}

export async function fetchApprovedPosts({ category = null, search = null, filter = "recent", limit = 30 } = {}) {
  const supabase = createAdminClient();

  let query = supabase
    .from("community_posts")
    .select("*")
    .eq("status", "approved");

  // If unanswered filter is selected, ignore category as requested by user
  if (category && category !== "All" && filter !== "unanswered") {
    query = query.eq("category", category);
  }

  if (search?.trim()) {
    const q = search.trim();
    // Search across title, content, author_name, and category
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,author_name.ilike.%${q}%,category.ilike.%${q}%`);
  }

  if (filter === "most-helpful") {
    // Ensure that only genuinely helpful posts appear here (Threshold: 3+ likes OR 5+ replies)
    query = query.or('helpful_count.gte.3,reply_count.gte.5')
                 .order("helpful_count", { ascending: false })
                 .order("reply_count", { ascending: false });
  } else if (filter === "unanswered") {
    query = query.eq("post_type", "question").eq("is_answered", false).order("created_at", { ascending: false });
  } else {
    // Default recent
    // If there is a search query, prioritize most helpful matches first, then recent
    if (search?.trim()) {
      query = query.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }

  return data || [];
}

export async function fetchPostById(postId) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .eq("status", "approved")
    .single();

  if (error) return null;

  // Increment view count
  await supabase
    .from("community_posts")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", postId);

  return data;
}

export async function fetchReplies(postId) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("community_replies")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function createReplyAction({ postId, content }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (!content?.trim()) throw new Error("Reply content is required.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_restricted")
    .eq("id", user.id)
    .single();

  if (profile?.is_restricted) {
    throw new Error("Your account has been restricted from participating in the community.");
  }

  const { error } = await supabase.from("community_replies").insert({
    post_id: postId,
    author_id: user.id,
    author_name: profile?.display_name || user.email?.split("@")[0] || "Anonymous",
    author_avatar: profile?.avatar_url || null,
    content: content.trim(),
  });

  if (error) {
    console.error("Failed to post reply. Message:", error.message, "Details:", error.details, "Code:", error.code);
    throw new Error(`Failed to post reply: ${error.message}`);
  }

  // Update reply count
  const { error: rpcError } = await supabase.rpc("increment_reply_count", { post_uuid: postId });
  
  if (rpcError) {
    // Fallback: manual increment if RPC is missing
    const { data: postData } = await supabase.from("community_posts")
      .select("reply_count")
      .eq("id", postId)
      .single();
      
    if (postData) {
      await supabase.from("community_posts")
        .update({ reply_count: (postData.reply_count || 0) + 1 })
        .eq("id", postId);
    }
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

export async function toggleHelpful({ postId = null, replyId = null }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (postId) {
    const { data: existing } = await supabase
      .from("community_reactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      await supabase.from("community_reactions").delete().eq("id", existing.id);
      await supabase.from("community_posts")
        .update({ helpful_count: Math.max(0, 0) }) // Will be recalculated
        .eq("id", postId);
    } else {
      await supabase.from("community_reactions").insert({ user_id: user.id, post_id: postId });
    }

    // Recalculate
    const { count } = await supabase
      .from("community_reactions")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    await supabase.from("community_posts").update({ helpful_count: count || 0 }).eq("id", postId);
  }

  if (replyId) {
    const { data: existing } = await supabase
      .from("community_reactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("reply_id", replyId)
      .maybeSingle();

    if (existing) {
      await supabase.from("community_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("community_reactions").insert({ user_id: user.id, reply_id: replyId });
    }

    const { count } = await supabase
      .from("community_reactions")
      .select("id", { count: "exact", head: true })
      .eq("reply_id", replyId);
    await supabase.from("community_replies").update({ helpful_count: count || 0 }).eq("id", replyId);
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

export async function toggleBookmark(postId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("community_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase.from("community_bookmarks").delete().eq("id", existing.id);
  } else {
    await supabase.from("community_bookmarks").insert({ user_id: user.id, post_id: postId });
  }

  return { success: true, bookmarked: !existing };
}

export async function reportContent({ postId = null, replyId = null, messageId = null, reason, details = null }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const validReasons = ["spam", "inappropriate", "misleading", "harassment", "other"];
  if (!validReasons.includes(reason)) throw new Error("Invalid report reason.");

  await supabase.from("community_reports").insert({
    reporter_id: user.id,
    post_id: postId,
    reply_id: replyId,
    message_id: messageId,
    reason,
    details,
  });

  return { success: true };
}

export async function fetchUserPosts() {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("community_posts")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function toggleAnswered(postId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  // Only the author can toggle answered status
  const { data: post } = await supabase
    .from("community_posts")
    .select("author_id, is_answered")
    .eq("id", postId)
    .single();

  if (post?.author_id !== user.id) throw new Error("Only the author can mark as answered.");

  await supabase.from("community_posts").update({ is_answered: !post.is_answered }).eq("id", postId);
  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

/* ── Live Room Actions ───────────────────────────────────────────────────── */

export async function fetchRooms() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("community_rooms")
    .select("*")
    .order("sort_order", { ascending: true });
  return data || [];
}

export async function fetchRoomBySlug(slug) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("community_rooms")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function fetchRoomMessages(roomId, limit = 50) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("community_messages")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(limit);
  return data || [];
}

export async function sendMessage({ roomId, content }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (!content?.trim()) throw new Error("Message cannot be empty.");
  if (content.trim().length > 2000) throw new Error("Message too long (max 2000 chars).");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("community_messages").insert({
    room_id: roomId,
    author_id: user.id,
    author_name: profile?.display_name || "Anonymous",
    author_avatar: profile?.avatar_url || null,
    content: content.trim(),
  });

  if (error) throw new Error("Failed to send message.");
  return { success: true };
}

export async function deleteOwnMessage(messageId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  await supabase
    .from("community_messages")
    .update({ is_deleted: true })
    .eq("id", messageId)
    .eq("author_id", user.id);

  return { success: true };
}

export async function updatePresence(roomId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  await supabase.from("community_presence").upsert({
    user_id: user.id,
    room_id: roomId,
    user_name: profile?.display_name || "Anonymous",
    user_avatar: profile?.avatar_url || null,
    last_seen: new Date().toISOString(),
  }, { onConflict: "user_id,room_id" });

  return { success: true };
}

export async function fetchRoomPresence(roomId) {
  const supabase = createAdminClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("community_presence")
    .select("user_id, user_name, user_avatar, last_seen")
    .eq("room_id", roomId)
    .gte("last_seen", fiveMinutesAgo);

  return data || [];
}

export async function fetchActiveStudentsPerSubject() {
  const supabase = createAdminClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: presence } = await supabase
    .from("community_presence")
    .select("room_id, user_id")
    .gte("last_seen", fiveMinutesAgo);

  if (!presence?.length) return {};

  const { data: rooms } = await supabase
    .from("community_rooms")
    .select("id, subject");

  if (!rooms) return {};

  const roomSubject = {};
  rooms.forEach(r => { roomSubject[r.id] = r.subject; });

  const counts = {};
  presence.forEach(p => {
    const subj = roomSubject[p.room_id];
    if (subj) counts[subj] = (counts[subj] || 0) + 1;
  });

  return counts;
}

/* ── Study Group Actions ─────────────────────────────────────────────────── */

export async function fetchStudyGroups() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("community_study_groups")
    .select("*, community_study_group_members(count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

export async function createStudyGroup({ name, subject, topic, description }) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (!name?.trim() || !subject?.trim()) throw new Error("Name and subject are required.");

  const { data, error } = await supabase.from("community_study_groups").insert({
    name: name.trim(),
    subject,
    topic: topic?.trim() || null,
    description: description?.trim() || null,
    creator_id: user.id,
  }).select("id").single();

  if (error) throw new Error("Failed to create study group.");

  // Auto-join the creator
  await supabase.from("community_study_group_members").insert({
    group_id: data.id,
    user_id: user.id,
  });

  revalidatePath("/dashboard/community", "layout");
  return { success: true, id: data.id };
}

export async function joinStudyGroup(groupId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  await supabase.from("community_study_group_members").upsert({
    group_id: groupId,
    user_id: user.id,
  }, { onConflict: "group_id,user_id" });

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

export async function leaveStudyGroup(groupId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  await supabase.from("community_study_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

/* ── Admin Moderation Actions ─────────────────────────────────────────────── */

export async function checkIsAdmin() {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

async function requireAdmin() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required.");
  }
  return await requireAuth();
}

export async function fetchPostsForModeration(status = "pending", category = null) {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase.from("community_posts").select("*").eq("status", status);
  if (category && category !== "All") query = query.eq("category", category);
  query = query.order("created_at", { ascending: false });

  const { data } = await query;
  return data || [];
}

export async function moderatePostAction(postId, action) {
  const adminUser = await requireAdmin();
  const supabase = createAdminClient();

  if (!["approved", "rejected"].includes(action)) {
    throw new Error("Invalid moderation action.");
  }

  const { error } = await supabase
    .from("community_posts")
    .update({
      status: action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", postId);

  if (error) throw new Error("Failed to moderate post.");

  revalidatePath("/dashboard/community", "layout");
  revalidatePath("/dashboard/admin/moderation", "layout");
  return { success: true };
}

export async function deletePostAdmin(postId) {
  await requireAdmin();
  const supabase = createAdminClient();

  await supabase.from("community_posts").delete().eq("id", postId);

  revalidatePath("/dashboard/community", "layout");
  revalidatePath("/dashboard/admin/moderation", "layout");
  return { success: true };
}

export async function fetchReportsForModeration() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("community_reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function resolveReport(reportId, action) {
  await requireAdmin();
  const supabase = createAdminClient();

  await supabase
    .from("community_reports")
    .update({ status: action === "dismiss" ? "dismissed" : "reviewed" })
    .eq("id", reportId);

  return { success: true };
}

export async function fetchModerationCounts() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { count: pending } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: reports } = await supabase
      .from("community_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return { pending: pending || 0, reports: reports || 0 };
  } catch {
    return { pending: 0, reports: 0 };
  }
}

export async function deleteReplyAdmin(replyId, postId) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { error } = await supabase.from("community_replies").delete().eq("id", replyId);
  if (error) throw new Error("Failed to delete reply.");

  if (postId) {
    const { data: postData } = await supabase.from("community_posts").select("reply_count").eq("id", postId).single();
    if (postData && postData.reply_count > 0) {
      await supabase.from("community_posts").update({ reply_count: postData.reply_count - 1 }).eq("id", postId);
    }
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

export async function restrictUserAction(userId) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ is_restricted: true }).eq("id", userId);
  
  if (error) {
    if (error.code === '42703') {
      throw new Error("The 'is_restricted' column does not exist. Please run the SQL alter command.");
    }
    throw new Error("Failed to restrict user.");
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

/* ── User Post & Reply Deletion ─────────────────────────────────────────── */

export async function deleteReplyAction(replyId, postId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: reply } = await supabase
    .from("community_replies")
    .select("author_id")
    .eq("id", replyId)
    .single();

  if (!reply) throw new Error("Reply not found.");
  if (reply.author_id !== user.id) throw new Error("Unauthorized: Not your reply.");

  const { error } = await supabase.from("community_replies").delete().eq("id", replyId);
  if (error) throw new Error("Failed to delete reply.");

  if (postId) {
    const { data: postData } = await supabase.from("community_posts").select("reply_count").eq("id", postId).single();
    if (postData && postData.reply_count > 0) {
      await supabase.from("community_posts").update({ reply_count: postData.reply_count - 1 }).eq("id", postId);
    }
  }

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

export async function deletePostAction(postId) {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("community_posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (!post) throw new Error("Post not found.");
  if (post.author_id !== user.id) throw new Error("Unauthorized: Not your post.");

  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) throw new Error("Failed to delete post.");

  revalidatePath("/dashboard/community", "layout");
  return { success: true };
}

/* ── My Discussions Actions ─────────────────────────────────────────────── */

export async function fetchMyPosts() {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function fetchMyReplies() {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("community_replies")
    .select(`
      *,
      community_posts (
        id,
        title,
        category
      )
    `)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}
"""

with open("c:\\Users\\HP\\Documents\\ib-nexus\\src\\app\\dashboard\\community\\actions.js", "w", encoding="utf-8") as f:
    f.write(top_half)
print("done")
