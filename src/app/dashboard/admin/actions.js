"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { getMergedModelRegistry } from "@/lib/ai/models";
import { logAdminActivity } from "@/lib/audit-logger";

// ─── ADMIN OVERVIEW STATS ───────────────────────────────────────────────────

export async function fetchAdminOverviewStats() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const [
      uRes,
      sRes,
      rRes,
      dRes,
      qRes,
      pRes,
      gRes,
      repRes,
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("id, preferences, is_restricted"),
      admin.from("community_rooms").select("*", { count: "exact", head: true }),
      admin.from("community_posts").select("*", { count: "exact", head: true }).eq("post_type", "discussion"),
      admin.from("community_posts").select("*", { count: "exact", head: true }).eq("post_type", "question"),
      admin.from("community_posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("study_groups").select("*", { count: "exact", head: true }),
      admin.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const totalUsers = uRes?.count || 0;
    const suspendedUsers = (sRes?.data || []).filter(
      (p) => p?.preferences?.is_suspended === true || p?.is_restricted === true
    ).length;
    const activeRooms = rRes?.count || 0;
    const discussionsCount = dRes?.count || 0;
    const questionsCount = qRes?.count || 0;
    const pendingApprovalPosts = pRes?.count || 0;
    const studyGroupsCount = gRes?.count || 0;
    const pendingReports = repRes?.count || 0;

    const activeUsers = Math.max(0, totalUsers - suspendedUsers);

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        discussionsCount,
        questionsCount,
        pendingApprovalTotal: pendingApprovalPosts,
        studyGroupsCount,
        pendingReports,
        totalRooms: activeRooms,
      },
    };
  } catch (error) {
    console.error("[actions] fetchAdminOverviewStats error:", error?.message || error);
    return {
      success: false,
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        discussionsCount: 0,
        questionsCount: 0,
        pendingApprovalTotal: 0,
        studyGroupsCount: 0,
        pendingReports: 0,
        totalRooms: 0,
      },
    };
  }
}

// ─── USER MANAGEMENT ACTIONS ────────────────────────────────────────────────

function checkIsUserBanned(authUser, profile) {
  if (profile?.preferences?.is_suspended === false) {
    if (authUser?.banned_until) {
      const banTime = new Date(authUser.banned_until).getTime();
      if (!isNaN(banTime) && banTime > Date.now()) return true;
    }
    return false;
  }
  if (profile?.preferences?.is_suspended === true) return true;
  if (authUser?.user_metadata?.is_suspended === true) return true;
  if (!authUser || !authUser.banned_until) return false;
  const banTime = new Date(authUser.banned_until).getTime();
  return !isNaN(banTime) && banTime > Date.now();
}

export async function fetchAdminUsers(params = {}) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    let query = admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`full_name.ilike.${term},display_name.ilike.${term},email.ilike.${term}`);
    }

    if (params.programFilter && params.programFilter !== "all") {
      query = query.ilike("ib_program", `%${params.programFilter}%`);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    let authUsersMap = {};
    try {
      const { data: authData } = await admin.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach((u) => {
          authUsersMap[u.id] = u;
        });
      }
    } catch (e) {
      console.warn("[actions] listUsers warning:", e.message);
    }

    let enrichedUsers = (profiles || []).map((p) => {
      const authUser = authUsersMap[p.id] || {};
      const meta = authUser.user_metadata || {};
      const isSuspended = checkIsUserBanned(authUser, p);
      return {
        id: p.id,
        email: p.email || authUser.email || "No email",
        full_name: p.full_name || meta.full_name || meta.name || "Unnamed User",
        display_name: p.display_name || meta.display_name || p.full_name || (p.email ? p.email.split("@")[0] : "User"),
        avatar_url: p.avatar_url || meta.avatar_url || meta.picture || null,
        ib_program: p.ib_program || meta.ib_program || null,
        exam_session: p.exam_session || meta.exam_session || null,
        is_admin: Boolean(p.is_admin || meta.is_admin),
        is_suspended: isSuspended,
        is_restricted: Boolean(p.is_restricted),
        onboarding_completed: Boolean(p.onboarding_completed),
        created_at: p.created_at || authUser.created_at || new Date().toISOString(),
        last_sign_in_at: authUser.last_sign_in_at || null,
      };
    });

    const profileUserIds = new Set((profiles || []).map((p) => p.id));
    if (authUsersMap) {
      Object.values(authUsersMap).forEach((u) => {
        if (!profileUserIds.has(u.id)) {
          const meta = u.user_metadata || {};
          const email = u.email || "No email";
          const fullName = meta.full_name || meta.name || email.split("@")[0];
          enrichedUsers.push({
            id: u.id,
            email,
            full_name: fullName,
            display_name: meta.display_name || fullName,
            avatar_url: meta.avatar_url || meta.picture || null,
            ib_program: meta.ib_program || null,
            exam_session: meta.exam_session || null,
            is_admin: Boolean(meta.is_admin),
            is_suspended: checkIsUserBanned(u, null),
            is_restricted: false,
            onboarding_completed: false,
            created_at: u.created_at || new Date().toISOString(),
            last_sign_in_at: u.last_sign_in_at || null,
          });
        }
      });
    }

    if (params.statusFilter && params.statusFilter !== "all") {
      if (params.statusFilter === "suspended") {
        enrichedUsers = enrichedUsers.filter((u) => u.is_suspended);
      } else if (params.statusFilter === "active") {
        enrichedUsers = enrichedUsers.filter((u) => !u.is_suspended);
      } else if (params.statusFilter === "restricted") {
        enrichedUsers = enrichedUsers.filter((u) => u.is_restricted);
      } else if (params.statusFilter === "admin") {
        enrichedUsers = enrichedUsers.filter((u) => u.is_admin);
      }
    }

    return { success: true, users: enrichedUsers };
  } catch (error) {
    console.error("[actions] fetchAdminUsers error:", error);
    return { success: false, error: error.message, users: [] };
  }
}

const getSuperAdminEmail = () => {
  const envVal = process.env.SUPER_ADMIN_EMAIL;
  return envVal ? envVal.trim().toLowerCase() : null;
};

const isEmailSuperAdmin = (email) => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const superEnv = getSuperAdminEmail();
  return Boolean(
    superEnv && (normalized === superEnv || superEnv.split(",").map(e => e.trim().toLowerCase()).includes(normalized))
  );
};

async function enforceAdminHierarchy(adminClient, actorUser, targetUserId, actionType = "manage") {
  const { data: targetProfile } = await adminClient.from("profiles").select("email, is_admin").eq("id", targetUserId).maybeSingle();
  let targetEmail = targetProfile?.email;

  if (!targetEmail) {
    const { data: authData } = await adminClient.auth.admin.getUserById(targetUserId);
    targetEmail = authData?.user?.email;
  }

  const actorEmail = actorUser.email?.trim().toLowerCase();
  const targetEmailLower = targetEmail?.trim().toLowerCase();
  
  const isActorSuper = isEmailSuperAdmin(actorEmail);
  const isTargetSuper = isEmailSuperAdmin(targetEmailLower);
  const isTargetAdmin = targetProfile?.is_admin === true;

  // Super Admins can NEVER be restricted, suspended, or deleted under any circumstances (not even by themselves)
  if (isTargetSuper && (actionType === "restrict" || actionType === "delete")) {
    return { 
      allowed: false, 
      error: "Action Prohibited: Super Admin accounts cannot be restricted, suspended, or deleted under any circumstances." 
    };
  }

  // Prevent anyone other than the Super Admin from modifying the Super Admin account
  if (isTargetSuper && actorUser.id !== targetUserId) {
    return { allowed: false, error: "Access Denied: Super Admin accounts are strictly protected from modification." };
  }

  // Non-Super Admins cannot manage other Admins
  if (isTargetAdmin && !isActorSuper && actorUser.id !== targetUserId) {
    return { allowed: false, error: "Access Denied: Only Super Admins can manage other Administrators." };
  }

  return { allowed: true };
}

/**
 * Suspend user from entering the website/workspace.
 * User data (notes, flashcards, chats, planner items) is 100% saved safely.
 */
export async function suspendUserAction(userId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    if (userId === adminUser.id) {
      return { success: false, error: "Action Prohibited: You cannot suspend your own account." };
    }

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId, "restrict");
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    // 1. Fetch current profile preferences
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email, display_name, preferences")
      .eq("id", userId)
      .maybeSingle();

    const existingPrefs = (targetProfile?.preferences && typeof targetProfile.preferences === "object")
      ? targetProfile.preferences
      : {};

    const updatedPrefs = {
      ...existingPrefs,
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_by: adminUser.email || adminUser.id,
    };

    // 2. Update profiles table
    const { error: profileErr } = await admin
      .from("profiles")
      .update({ preferences: updatedPrefs, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) console.warn("[actions] suspend profile update warning:", profileErr.message);

    // 3. Update Supabase Auth user (ban duration + user metadata)
    try {
      const { data: authData } = await admin.auth.admin.getUserById(userId);
      const userMeta = authData?.user?.user_metadata || {};
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years ban duration
        user_metadata: { ...userMeta, is_suspended: true },
      });
    } catch (authErr) {
      console.warn("[actions] suspend auth ban warning:", authErr.message);
    }

    const targetEmail = targetProfile?.email || targetProfile?.display_name || userId;

    // 4. Log admin activity
    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "SUSPEND_USER_ACCOUNT",
      targetType: "user",
      targetId: userId,
      details: `Suspended account access for user "${targetEmail}". Website access is locked. All study notes, AI chats, flashcards, and planner data remain safely preserved.`,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `User "${targetEmail}" has been suspended. Their data is preserved safely and website access is locked.`,
    };
  } catch (error) {
    console.error("[actions] suspendUserAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsuspend user and restore full website access.
 * All existing user data is immediately available to them again.
 */
export async function unsuspendUserAction(userId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId);
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    // 1. Fetch current profile preferences
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email, display_name, preferences")
      .eq("id", userId)
      .maybeSingle();

    const existingPrefs = (targetProfile?.preferences && typeof targetProfile.preferences === "object")
      ? targetProfile.preferences
      : {};

    const updatedPrefs = {
      ...existingPrefs,
      is_suspended: false,
      unsuspended_at: new Date().toISOString(),
      unsuspended_by: adminUser.email || adminUser.id,
    };
    delete updatedPrefs.suspended_at;
    delete updatedPrefs.suspended_by;

    // 2. Update profiles table
    const { error: profileErr } = await admin
      .from("profiles")
      .update({ preferences: updatedPrefs, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) console.warn("[actions] unsuspend profile update warning:", profileErr.message);

    // 3. Remove ban from Supabase Auth user
    try {
      const { data: authData } = await admin.auth.admin.getUserById(userId);
      const userMeta = authData?.user?.user_metadata || {};
      const updatedMeta = { ...userMeta, is_suspended: false };

      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
        user_metadata: updatedMeta,
      });
    } catch (authErr) {
      console.warn("[actions] unsuspend auth unban warning:", authErr.message);
    }

    const targetEmail = targetProfile?.email || targetProfile?.display_name || userId;

    // 4. Log admin activity
    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "UNSUSPEND_USER_ACCOUNT",
      targetType: "user",
      targetId: userId,
      details: `Restored website access for user "${targetEmail}". Full workspace access restored.`,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `User "${targetEmail}" unsuspended. Full website access has been restored.`,
    };
  } catch (error) {
    console.error("[actions] unsuspendUserAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Restrict commenting and live chat only (user can still enter and browse platform).
 */
export async function restrictUserCommunicationAction(userId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    if (userId === adminUser.id) {
      return { success: false, error: "Action Prohibited: You cannot restrict your own account." };
    }

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId, "restrict");
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ is_restricted: true, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) console.warn("[actions] restrict communication profile update warning:", profileErr.message);

    const { data: targetProfile } = await admin.from("profiles").select("email, display_name").eq("id", userId).maybeSingle();
    const targetEmail = targetProfile?.email || targetProfile?.display_name || userId;

    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "RESTRICT_USER_COMMUNICATION",
      targetType: "user",
      targetId: userId,
      details: `Muted commenting and discussion posting for user "${targetEmail}". Platform browsing remains open.`,
    });

    revalidatePath("/dashboard/admin");
    return { success: true, message: `Comments and chat muted for "${targetEmail}".` };
  } catch (error) {
    console.error("[actions] restrictUserCommunicationAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore commenting and live chat.
 */
export async function restoreUserCommunicationAction(userId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId);
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ is_restricted: false, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) console.warn("[actions] restore communication profile update warning:", profileErr.message);

    const { data: targetProfile } = await admin.from("profiles").select("email, display_name").eq("id", userId).maybeSingle();
    const targetEmail = targetProfile?.email || targetProfile?.display_name || userId;

    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "RESTORE_USER_COMMUNICATION",
      targetType: "user",
      targetId: userId,
      details: `Restored commenting and discussion permissions for user "${targetEmail}".`,
    });

    revalidatePath("/dashboard/admin");
    return { success: true, message: `Comments unmuted for "${targetEmail}".` };
  } catch (error) {
    console.error("[actions] restoreUserCommunicationAction error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Backward compatibility alias: unsuspends and un-restricts user.
 */
export async function restoreUserAction(userId) {
  const unsuspendRes = await unsuspendUserAction(userId);
  await restoreUserCommunicationAction(userId);
  return unsuspendRes;
}

/**
 * Permanently delete user account and wipe ALL user data.
 * If the user logs in or registers again, they start fresh with a clean account.
 */
export async function deleteUserAccountAction(userId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    if (userId === adminUser.id) {
      return { success: false, error: "Action Prohibited: You cannot delete your own admin account." };
    }

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId, "delete");
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", userId)
      .maybeSingle();

    let targetEmail = targetProfile?.email || targetProfile?.display_name;
    if (!targetEmail) {
      try {
        const { data: authData } = await admin.auth.admin.getUserById(userId);
        targetEmail = authData?.user?.email;
      } catch (e) {}
    }
    targetEmail = targetEmail || userId;

    // Completely wipe all user records across all database tables
    const userTables = [
      { name: "notes", col: "user_id" },
      { name: "ai_conversations", col: "user_id" },
      { name: "ai_feedback", col: "user_id" },
      { name: "community_posts", col: "author_id" },
      { name: "community_replies", col: "author_id" },
      { name: "community_reactions", col: "user_id" },
      { name: "reports", col: "reporter_id" },
      { name: "study_group_members", col: "user_id" },
      { name: "study_groups", col: "creator_id" },
      { name: "flashcard_sets", col: "user_id" },
      { name: "planner_items", col: "user_id" },
      { name: "profiles", col: "id" },
    ];

    for (const t of userTables) {
      try {
        await admin.from(t.name).delete().eq(t.col, userId);
      } catch (e) {
        console.warn(`[deleteUser] Warning deleting from ${t.name}:`, e.message);
      }
    }

    // Permanently delete user from Supabase Auth so they can restart with a clean slate
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn("[deleteUser] Warning deleting auth user:", authErr.message);
    }

    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "DELETE_USER_ACCOUNT",
      targetType: "user",
      targetId: userId,
      details: `Permanently deleted user account "${targetEmail}". All user notes, chats, flashcards, and login credentials have been completely wiped.`,
    });

    revalidatePath("/dashboard/admin");
    return {
      success: true,
      message: `User "${targetEmail}" permanently deleted. All associated data was wiped, and if they sign up again they will start fresh.`,
    };
  } catch (error) {
    console.error("[actions] deleteUserAccountAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfileByAdminAction({
  userId,
  displayName,
  fullName,
  ibProgram,
  examSession,
  isAdmin,
}) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const hierarchyCheck = await enforceAdminHierarchy(admin, adminUser, userId);
    if (!hierarchyCheck.allowed) {
      return { success: false, error: hierarchyCheck.error };
    }

    // Additional check: Cannot modify own admin status or demote Super Admin
    const { data: targetProfile } = await admin.from("profiles").select("email, is_admin").eq("id", userId).maybeSingle();
    if (isEmailSuperAdmin(targetProfile?.email) && isAdmin === false) {
      return { success: false, error: "Action Prohibited: Administrative privileges cannot be revoked from the Super Admin account." };
    }

    if (userId === adminUser.id && isAdmin !== undefined) {
      if (targetProfile && targetProfile.is_admin !== Boolean(isAdmin)) {
         return { success: false, error: "Access Denied: You cannot modify your own administrative privileges." };
      }
    }

    const normalizedProgram = ibProgram
      ? (ibProgram.toLowerCase().includes("myp") ? "myp" : ibProgram.toLowerCase().includes("dp") ? "dp" : ibProgram.toLowerCase().trim())
      : null;

    const updateData = {
      display_name: displayName?.trim(),
      full_name: fullName?.trim(),
      ib_program: normalizedProgram,
      exam_session: examSession?.trim() || null,
      is_admin: Boolean(isAdmin),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("profiles")
      .upsert({ id: userId, ...updateData }, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    try {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          display_name: displayName,
          full_name: fullName,
          ib_program: ibProgram,
          exam_session: examSession,
          is_admin: Boolean(isAdmin),
        },
      });
    } catch (e) {}

    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "UPDATE_USER_PROFILE",
      targetType: "user",
      targetId: userId,
      details: `Updated profile & permissions for user "${displayName || userId}". Program: ${ibProgram || 'None'}, Session: ${examSession || 'None'}, Admin: ${isAdmin ? 'Yes' : 'No'}.`,
    });

    revalidatePath("/dashboard/admin");
    return { success: true, message: "User profile updated successfully.", profile: data };
  } catch (error) {
    console.error("[actions] updateUserProfileByAdminAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserDetailStats(userId) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const [
      { data: profile },
      { count: notesCount },
      { count: convsCount },
      { count: postsCount },
      { count: feedbackCount },
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      admin.from("notes").select("*", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("ai_conversations").select("*", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("community_posts").select("*", { count: "exact", head: true }).eq("author_id", userId),
      admin.from("ai_feedback").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    let authUser = null;
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      authUser = data?.user || null;
    } catch (e) {}

    return {
      success: true,
      stats: {
        profile: profile || {},
        authUser: authUser || {},
        notesCount: notesCount || 0,
        conversationsCount: convsCount || 0,
        communityPostsCount: postsCount || 0,
        aiFeedbackCount: feedbackCount || 0,
      },
    };
  } catch (error) {
    console.error("[actions] fetchUserDetailStats error:", error);
    return { success: false, error: error.message, stats: null };
  }
}

// ─── COMMUNITY & ROOMS ACTIONS ──────────────────────────────────────────────

export async function fetchAdminCommunityItems() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const [
      { data: posts },
      { data: studyGroups },
      { data: reports },
    ] = await Promise.all([
      // Approved posts are permanently excluded from the moderation queue
      admin.from("community_posts").select("*").or("status.neq.approved,status.is.null").order("created_at", { ascending: false }).limit(50),
      admin.from("community_study_groups").select("*").or("status.neq.approved,status.is.null").order("created_at", { ascending: false }).limit(50),
      admin.from("community_reports").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    return {
      success: true,
      items: [
        ...(posts || []).map(p => ({ ...p, contentType: p.post_type || "discussion" })),
        ...(studyGroups || []).map(g => ({ ...g, contentType: "study_group" })),
        ...(reports || []).map(r => ({ ...r, contentType: "report" })),
      ],
    };
  } catch (error) {
    console.error("[actions] fetchAdminCommunityItems error:", error);
    return { success: false, items: [] };
  }
}

export async function updateCommunityContentAction(id, payload) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("community_posts")
      .update({ title: payload.title, category: payload.category, content: payload.content })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: "UPDATE_COMMUNITY_CONTENT",
      targetType: "community_post",
      targetId: id,
      details: `Edited community content "${payload.title || id}".`,
    });

    revalidatePath("/dashboard/community", "layout");
    revalidatePath(`/dashboard/community/${id}`);
    revalidatePath("/dashboard/admin", "layout");
    return { success: true, item: data };
  } catch (error) {
    console.error("[actions] updateCommunityContentAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function approvePostAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: post } = await admin.from("community_posts").select("title").eq("id", id).maybeSingle();
    const { error } = await admin.from("community_posts").update({ 
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id || null
    }).eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "APPROVE_POST",
      targetType: "community_post",
      targetId: id,
      details: `Approved community post "${post?.title || id}".`,
    });

    revalidatePath("/dashboard/community", "layout");
    revalidatePath(`/dashboard/community/${id}`);
    revalidatePath("/dashboard/admin", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function rejectPostAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: post } = await admin.from("community_posts").select("title").eq("id", id).maybeSingle();
    const { error } = await admin.from("community_posts").update({ 
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id || null
    }).eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "REJECT_POST",
      targetType: "community_post",
      targetId: id,
      details: `Rejected community post "${post?.title || id}".`,
    });

    revalidatePath("/dashboard/community", "layout");
    revalidatePath("/dashboard/admin", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updatePostStatusAction(id, status) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: post } = await admin.from("community_posts").select("title").eq("id", id).maybeSingle();
    const { error } = await admin.from("community_posts").update({ 
      status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser?.id || null
    }).eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: `POST_SET_${(status || "UNKNOWN").toUpperCase()}`,
      targetType: "community_post",
      targetId: id,
      details: `Updated community post "${post?.title || id}" status to ${status}.`,
    });

    revalidatePath("/dashboard/community", "layout");
    revalidatePath(`/dashboard/community/${id}`);
    revalidatePath("/dashboard/admin", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchPostDetailsAndRepliesAction(postId) {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const [postRes, repliesRes] = await Promise.all([
      admin.from("community_posts").select("*").eq("id", postId).single(),
      admin.from("community_replies").select("*").eq("post_id", postId).order("created_at", { ascending: true })
    ]);
    return {
      success: true,
      post: postRes.data || null,
      replies: repliesRes.data || []
    };
  } catch (error) {
    console.error("[actions] fetchPostDetailsAndRepliesAction error:", error);
    return { success: false, error: error.message, post: null, replies: [] };
  }
}

export async function approveStudyGroupAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: group } = await admin.from("study_groups").select("name").eq("id", id).maybeSingle();
    const { error } = await admin.from("study_groups").update({ status: "active" }).eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "APPROVE_STUDY_GROUP",
      targetType: "study_group",
      targetId: id,
      details: `Approved study group "${group?.name || id}" to active status.`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function rejectStudyGroupAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: group } = await admin.from("study_groups").select("name").eq("id", id).maybeSingle();
    const { error } = await admin.from("study_groups").update({ status: "rejected" }).eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "REJECT_STUDY_GROUP",
      targetType: "study_group",
      targetId: id,
      details: `Rejected study group "${group?.name || id}".`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function dismissReportAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("reports").delete().eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "DISMISS_REPORT",
      targetType: "report",
      targetId: id,
      details: `Dismissed content moderation report (${id}).`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteDiscussionAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: post } = await admin.from("community_posts").select("title").eq("id", id).maybeSingle();
    try {
      await admin.from("community_replies").delete().eq("post_id", id);
    } catch (_) {}
    const { error } = await admin.from("community_posts").delete().eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "DELETE_POST",
      targetType: "community_post",
      targetId: id,
      details: `Deleted community discussion/post "${post?.title || id}".`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteReplyAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("community_replies").delete().eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "DELETE_REPLY",
      targetType: "community_reply",
      targetId: id,
      details: `Deleted discussion reply (${id}).`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchAdminRooms() {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: rooms, error } = await admin.from("community_rooms").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const mappedRooms = (rooms || []).map(r => ({
      ...r,
      is_active: r.is_active !== undefined ? r.is_active : !r.description?.startsWith("[PAUSED]"),
      description: r.description?.replace(/^\[PAUSED\]\s*/, "") || "",
    }));
    return { success: true, rooms: mappedRooms };
  } catch (error) {
    console.error("[actions] fetchAdminRooms error:", error?.message || error);
    return { success: false, rooms: [] };
  }
}

export async function createLiveRoomAction(payload) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    let baseSlug = (payload.slug || payload.name || "room")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "room";

    let finalSlug = baseSlug;
    const { data: existing } = await admin.from("community_rooms").select("id").eq("slug", finalSlug).maybeSingle();
    if (existing) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const cleanPayload = {
      name: payload.name?.trim(),
      subject: payload.subject?.trim(),
      description: payload.description?.trim() || "",
      slug: finalSlug,
    };
    const { data, error } = await admin.from("community_rooms").insert(cleanPayload).select().single();
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "CREATE_LIVE_ROOM",
      targetType: "community_room",
      targetId: data?.id,
      details: `Created new live room "${cleanPayload.name}" for subject "${cleanPayload.subject}" (slug: ${finalSlug}).`,
    });

    try {
      revalidatePath("/dashboard/admin");
      revalidatePath("/dashboard/community");
    } catch (_) {}

    return { success: true, room: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateLiveRoomAction(id, payload) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const cleanPayload = {
      name: payload.name?.trim(),
      subject: payload.subject?.trim(),
      description: payload.description?.trim() || "",
    };
    if (payload.name) {
      cleanPayload.slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    const { data, error } = await admin.from("community_rooms").update(cleanPayload).eq("id", id).select().single();
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "UPDATE_LIVE_ROOM",
      targetType: "community_room",
      targetId: id,
      details: `Updated live room "${cleanPayload.name || id}" details.`,
    });

    try {
      revalidatePath("/dashboard/admin");
      revalidatePath("/dashboard/community");
    } catch (_) {}

    return { success: true, room: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteLiveRoomAction(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();
    const { data: existing } = await admin.from("community_rooms").select("name, subject").eq("id", id).maybeSingle();

    const { error } = await admin.from("community_rooms").delete().eq("id", id);
    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "DELETE_LIVE_ROOM",
      targetType: "community_room",
      targetId: id,
      details: `Deleted live room "${existing?.name || id}" (subject: ${existing?.subject || "N/A"}).`,
    });

    try {
      revalidatePath("/dashboard/admin");
      revalidatePath("/dashboard/community");
    } catch (_) {}

    return { success: true, message: "Live room deleted." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchRoomMessagesForModeration(roomId) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    // 1. Fetch live messages from community_messages
    const { data: rawMessages, error } = await admin
      .from("community_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) {
      console.error("[actions] fetchRoomMessagesForModeration error:", error.message);
      return { success: false, messages: [], participants: [], totalMessagesCount: 0 };
    }

    const msgList = rawMessages || [];

    // 2. Identify moderators from profiles
    const authorIds = Array.from(new Set(msgList.map(m => m.author_id || m.user_id).filter(Boolean)));
    let adminSet = new Set();
    if (authorIds.length > 0) {
      const { data: admins } = await admin
        .from("profiles")
        .select("id")
        .in("id", authorIds)
        .eq("is_admin", true);
      if (admins) {
        admins.forEach(a => adminSet.add(a.id));
      }
    }

    // 3. Format message objects for AdminClient
    const formattedMessages = msgList.map(m => {
      const isNotice = m.is_notice === true || (typeof m.content === "string" && m.content.startsWith("🛡️ [OFFICIAL_ROOM_GUIDANCE]:"));
      const displayContent = isNotice && typeof m.content === "string"
        ? m.content.replace(/^🛡️ \[OFFICIAL_ROOM_GUIDANCE\]:\s*/, "")
        : m.content;
      const isMod = m.is_moderator === true || adminSet.has(m.author_id || m.user_id) || isNotice;

      return {
        ...m,
        id: m.id,
        room_id: m.room_id,
        author_id: m.author_id || m.user_id,
        author_name: m.author_name || "Community Member",
        author_avatar: m.author_avatar,
        content: displayContent,
        raw_content: m.content,
        is_moderator: isMod,
        is_notice: isNotice,
        is_pinned: isNotice,
        is_deleted: Boolean(m.is_deleted),
        created_at: m.created_at,
      };
    });

    // 4. Fetch participants from community_presence
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: rawPresence } = await admin
      .from("community_presence")
      .select("user_id, user_name, user_avatar, last_seen")
      .eq("room_id", roomId)
      .gte("last_seen", fiveMinutesAgo);

    const participants = (rawPresence || []).map(p => ({
      user_id: p.user_id,
      user_name: p.user_name || "Student",
      user_avatar: p.user_avatar,
      last_seen: p.last_seen,
      is_moderator: adminSet.has(p.user_id),
    }));

    return {
      success: true,
      messages: formattedMessages,
      participants,
      totalMessagesCount: formattedMessages.length,
    };
  } catch (error) {
    console.error("[actions] fetchRoomMessagesForModeration catch:", error.message);
    return { success: false, messages: [], participants: [], totalMessagesCount: 0 };
  }
}

export async function sendModeratorChatMessageAction({ roomId, content, isNotice }) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    if (!content?.trim()) {
      return { success: false, error: "Message content cannot be empty." };
    }

    // Get admin profile for author name & avatar
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, email, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle();

    const authorName = profile?.display_name || adminUser.email?.split("@")[0] || "Admin Moderator";
    const authorAvatar = profile?.avatar_url || null;
    const isOfficialNotice = Boolean(isNotice);
    const formattedContent = isOfficialNotice
      ? `🛡️ [OFFICIAL_ROOM_GUIDANCE]: ${content.trim()}`
      : content.trim();

    // Base payload guaranteed by community_messages schema
    const basePayload = {
      room_id: roomId,
      author_id: adminUser.id,
      author_name: authorName,
      author_avatar: authorAvatar,
      content: formattedContent,
      created_at: new Date().toISOString(),
    };

    let inserted = null;
    const fullPayload = {
      ...basePayload,
      is_moderator: true,
      is_notice: isOfficialNotice,
      is_pinned: isOfficialNotice,
    };

    const { data: fullData, error: fullError } = await admin
      .from("community_messages")
      .insert(fullPayload)
      .select()
      .single();

    if (fullError) {
      // Fallback: standard column set in case is_moderator column hasn't migrated
      const { data: baseData, error: baseError } = await admin
        .from("community_messages")
        .insert(basePayload)
        .select()
        .single();

      if (baseError) {
        throw new Error(baseError.message);
      }
      inserted = baseData;
    } else {
      inserted = fullData;
    }

    // Log admin audit activity
    await logAdminActivity({
      actorId: adminUser.id,
      actorEmail: adminUser.email || "admin@ibnexus.com",
      action: isOfficialNotice ? "POST_ROOM_NOTICE" : "POST_ROOM_MESSAGE",
      targetType: "community_room",
      targetId: roomId,
      details: isOfficialNotice
        ? `Posted Official Room Guidance Notice: "${content.trim()}"`
        : `Posted Moderator Chat Message: "${content.trim()}"`,
    });

    try {
      revalidatePath("/dashboard/admin");
      revalidatePath(`/dashboard/community/rooms/${roomId}`);
    } catch (_) {}

    return {
      success: true,
      message: {
        ...inserted,
        id: inserted?.id,
        room_id: roomId,
        author_name: authorName,
        content: content.trim(),
        raw_content: formattedContent,
        is_moderator: true,
        is_notice: isOfficialNotice,
        created_at: inserted?.created_at || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[actions] sendModeratorChatMessageAction error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function updateRoomStatusAction(roomId, isActive) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: roomInfo } = await admin
      .from("community_rooms")
      .select("id, name, description")
      .eq("id", roomId)
      .maybeSingle();

    const { error } = await admin
      .from("community_rooms")
      .update({ is_active: Boolean(isActive) })
      .eq("id", roomId);

    if (error) {
      // is_active column might not exist: persist status safely in description
      let currentDesc = roomInfo?.description || "";
      let baseDesc = currentDesc.replace(/^\[PAUSED\]\s*/, "");
      let updatedDesc = isActive ? baseDesc : `[PAUSED] ${baseDesc}`.trim();
      await admin.from("community_rooms").update({ description: updatedDesc }).eq("id", roomId);
    }

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "UPDATE_ROOM_STATUS",
      targetType: "community_room",
      targetId: roomId,
      details: `Updated live room "${roomInfo?.name || roomId}" status to ${isActive ? "Active / Enabled" : "Paused / Disabled"}.`,
    });

    try {
      revalidatePath("/dashboard/admin");
      revalidatePath("/dashboard/community");
    } catch (_) {}

    return { success: true, message: `Room status updated to ${isActive ? "Active" : "Paused"}.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteChatMessageAction(msgId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: msg } = await admin
      .from("community_messages")
      .select("id, room_id, author_name, content")
      .eq("id", msgId)
      .maybeSingle();

    const { error } = await admin
      .from("community_messages")
      .delete()
      .eq("id", msgId);

    if (error) throw error;

    await logAdminActivity({
      actorId: adminUser?.id,
      actorEmail: adminUser?.email || "admin@ibnexus.com",
      action: "DELETE_ROOM_MESSAGE",
      targetType: "community_message",
      targetId: msgId,
      details: `Deleted live chat message from ${msg?.author_name || "user"}: "${msg?.content?.substring(0, 100) || msgId}"`,
    });

    try {
      revalidatePath("/dashboard/admin");
      if (msg?.room_id) revalidatePath(`/dashboard/community/rooms/${msg.room_id}`);
    } catch (_) {}

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── ACTIVITY AUDIT LOGS ────────────────────────────────────────────────────

export async function fetchAdminActivityLogs(params = {}) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    let query = admin.from("admin_activity_logs").select("*").order("created_at", { ascending: false });
    if (params.search) {
      query = query.or(`details.ilike.%${params.search}%,actor_email.ilike.%${params.search}%`);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data: logs, error } = await query;
    if (error) {
      // If admin_activity_logs does not exist, seamlessly fallback to existing audit_logs table
      if (error.code === "PGRST205" || error.code === "42P01") {
        let auditQuery = admin.from("audit_logs").select("*").order("created_at", { ascending: false });
        if (params.search) {
          auditQuery = auditQuery.or(`action.ilike.%${params.search}%`);
        }
        if (params.limit) {
          auditQuery = auditQuery.limit(params.limit);
        }
        const { data: auditData, error: auditErr } = await auditQuery;
        if (!auditErr && auditData) {
          const mapped = auditData.map((r) => ({
            id: r.id,
            action: r.action,
            actor_email: r.metadata?.email || r.metadata?.actor_email || "System",
            details: r.metadata?.details || (r.metadata?.email ? `${r.action} (${r.metadata.email})` : r.action),
            target_type: "user",
            target_id: r.target_user_id,
            created_at: r.created_at,
          }));
          return { success: true, logs: mapped };
        }
        return { success: true, logs: [] };
      }
      throw error;
    }
    return { success: true, logs: logs || [] };
  } catch (error) {
    console.error("[actions] fetchAdminActivityLogs error:", error?.message || error);
    return { success: false, logs: [] };
  }
}

export async function deleteSingleAuditLogAction(logId) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_activity_logs").delete().eq("id", logId);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        const { error: aErr } = await admin.from("audit_logs").delete().eq("id", logId);
        if (aErr) throw aErr;
        return { success: true, message: "Audit log entry deleted." };
      }
      throw error;
    }
    return { success: true, message: "Audit log entry deleted." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function clearAllAuditLogsAction() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_activity_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        const { error: aErr } = await admin.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (aErr) throw aErr;
        return { success: true, message: "All audit logs cleared." };
      }
      throw error;
    }
    return { success: true, message: "All audit logs cleared." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── AI MODEL CONFIGURATIONS ────────────────────────────────────────────────

export async function fetchAdminModelConfigsAction() {
  try {
    const models = await getMergedModelRegistry();
    return { success: true, models };
  } catch (error) {
    console.error("[actions] fetchAdminModelConfigsAction error:", error);
    return { success: false, error: error.message, models: [] };
  }
}

export async function setAdminDefaultModelAction(modelId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const models = await getMergedModelRegistry();
    const target = models.find((m) => m.model_id === modelId || m.id === modelId);

    if (!target) {
      return { success: false, error: `Model "${modelId}" not found in model registry.` };
    }

    if (target.is_paused || target.isPaused) {
      return { success: false, error: "Cannot set a paused model as default." };
    }

    if (target.is_hidden || target.isHidden) {
      return { success: false, error: "Cannot set a hidden model as default." };
    }

    await admin.from("ai_model_configs").update({ is_default: false }).neq("model_id", "none");

    const { error: upsertErr } = await admin.from("ai_model_configs").upsert({
      model_id: modelId,
      display_name: target.display_name || target.displayName,
      description: target.description,
      provider: target.provider,
      is_default: true,
      is_paused: false,
      is_hidden: false,
      enabled: true,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) throw upsertErr;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "SET_DEFAULT_AI_MODEL",
        target_type: "ai_model",
        target_id: modelId,
        details: `Set "${target.display_name || modelId}" (${modelId}) as the default Nexus AI model.`,
      });
    } catch (logErr) {}

    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return { success: true, message: `Set ${target.display_name || modelId} as default model.`, models: updatedModels };
  } catch (error) {
    console.error("[actions] setAdminDefaultModelAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleModelPauseAction(modelId, isPaused) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const models = await getMergedModelRegistry();
    const target = models.find((m) => m.model_id === modelId || m.id === modelId);

    if (!target) {
      return { success: false, error: `Model "${modelId}" not found.` };
    }

    let isDefaultNow = target.is_default || target.isDefault;

    if (isPaused && isDefaultNow) {
      isDefaultNow = false;
      const nextDefaultCandidate = models.find(
        (m) => (m.model_id !== modelId && m.id !== modelId) && !m.is_paused && !m.is_hidden && m.enabled
      );
      if (nextDefaultCandidate) {
        await admin.from("ai_model_configs").upsert({
          model_id: nextDefaultCandidate.model_id || nextDefaultCandidate.id,
          is_default: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { error: upsertErr } = await admin.from("ai_model_configs").upsert({
      model_id: modelId,
      display_name: target.display_name || target.displayName,
      description: target.description,
      provider: target.provider,
      is_paused: isPaused,
      is_default: isDefaultNow,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) throw upsertErr;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: isPaused ? "PAUSE_AI_MODEL" : "RESUME_AI_MODEL",
        target_type: "ai_model",
        target_id: modelId,
        details: `${isPaused ? "Paused" : "Resumed"} AI model "${target.display_name || modelId}" (${modelId}).`,
      });
    } catch (logErr) {}

    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return {
      success: true,
      message: `Model "${target.display_name || modelId}" ${isPaused ? "paused" : "resumed"} successfully.`,
      models: updatedModels,
    };
  } catch (error) {
    console.error("[actions] toggleModelPauseAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleModelHideAction(modelId, isHidden) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const models = await getMergedModelRegistry();
    const target = models.find((m) => m.model_id === modelId || m.id === modelId);

    if (!target) {
      return { success: false, error: `Model "${modelId}" not found.` };
    }

    let isDefaultNow = target.is_default || target.isDefault;

    if (isHidden && isDefaultNow) {
      isDefaultNow = false;
      const nextDefaultCandidate = models.find(
        (m) => (m.model_id !== modelId && m.id !== modelId) && !m.is_paused && !m.is_hidden && m.enabled
      );
      if (nextDefaultCandidate) {
        await admin.from("ai_model_configs").upsert({
          model_id: nextDefaultCandidate.model_id || nextDefaultCandidate.id,
          is_default: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { error: upsertErr } = await admin.from("ai_model_configs").upsert({
      model_id: modelId,
      display_name: target.display_name || target.displayName,
      description: target.description,
      provider: target.provider,
      is_hidden: isHidden,
      is_default: isDefaultNow,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) throw upsertErr;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: isHidden ? "HIDE_AI_MODEL" : "SHOW_AI_MODEL",
        target_type: "ai_model",
        target_id: modelId,
        details: `${isHidden ? "Hid" : "Showed"} AI model "${target.display_name || modelId}" (${modelId}).`,
      });
    } catch (logErr) {}

    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return {
      success: true,
      message: `Model "${target.display_name || modelId}" ${isHidden ? "hidden" : "visible"} successfully.`,
      models: updatedModels,
    };
  } catch (error) {
    console.error("[actions] toggleModelHideAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleModelEnableAction(modelId, enabled) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.from("ai_model_configs").upsert({
      model_id: modelId,
      enabled,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return { success: true, message: `Model state updated.`, models: updatedModels };
  } catch (error) {
    console.error("[actions] toggleModelEnableAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateModelMetadataAction({
  modelId,
  displayName,
  description,
  allowedRoles,
  maxTokens,
  temperature,
  fallbackModelId,
}) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.from("ai_model_configs").upsert({
      model_id: modelId,
      display_name: displayName?.trim(),
      description: description?.trim(),
      allowed_roles: allowedRoles || "all",
      max_tokens: Number(maxTokens) || 4096,
      temperature: Number(temperature) || 0.7,
      fallback_model_id: fallbackModelId || "gemini-3.6-flash",
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "UPDATE_AI_MODEL_METADATA",
        target_type: "ai_model",
        target_id: modelId,
        details: `Updated metadata for model "${displayName || modelId}" (${modelId}).`,
      });
    } catch (logErr) {}

    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return { success: true, message: "Model configuration updated successfully.", models: updatedModels };
  } catch (error) {
    console.error("[actions] updateModelMetadataAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAdminModelAction(modelId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const models = await getMergedModelRegistry();
    const target = models.find((m) => m.model_id === modelId || m.id === modelId);

    if (!target) {
      return { success: false, error: `Model "${modelId}" not found in registry.` };
    }

    if (target.is_default || target.isDefault) {
      const nextDefaultCandidate = models.find(
        (m) => (m.model_id !== modelId && m.id !== modelId) && !m.is_paused && !m.is_hidden && m.enabled
      );
      if (nextDefaultCandidate) {
        await admin.from("ai_model_configs").upsert({
          model_id: nextDefaultCandidate.model_id || nextDefaultCandidate.id,
          is_default: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { error: delErr } = await admin
      .from("ai_model_configs")
      .upsert({
        model_id: modelId,
        is_deleted: true,
        is_default: false,
        enabled: false,
        updated_at: new Date().toISOString(),
      });

    if (delErr) {
      await admin.from("ai_model_configs").delete().eq("model_id", modelId);
    }

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "DELETE_AI_MODEL",
        target_type: "ai_model",
        target_id: modelId,
        details: `Permanently removed AI model "${target.display_name || modelId}" (${modelId}) from model registry. Historical records preserved.`,
      });
    } catch (logErr) {}

    revalidatePath("/dashboard/admin");
    const updatedModels = await getMergedModelRegistry();
    return {
      success: true,
      message: `Model "${target.display_name || modelId}" permanently deleted from model registry.`,
      models: updatedModels,
    };
  } catch (error) {
    console.error("[actions] deleteAdminModelAction error:", error);
    return { success: false, error: error.message };
  }
}

// ─── ALLOWLIST & WEBSITE LOCK ACTIONS ───────────────────────────────────────

export async function fetchWebsiteLockSettingsAction() {
  try {
    const { fetchDirectLockStatus } = await import("@/lib/website-lock");
    const settings = await fetchDirectLockStatus();
    return { success: true, settings };
  } catch (error) {
    return { success: false, settings: { is_locked: false, lock_message: "" } };
  }
}

export async function updateWebsiteLockStatusAction({ is_locked, lock_message }) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("website_settings")
      .upsert({ id: "global", is_locked, lock_message, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: is_locked ? "LOCK_WEBSITE" : "UNLOCK_WEBSITE",
        target_type: "website_lock",
        target_id: "1",
        details: is_locked ? `Locked website access. Lock notice: "${lock_message || 'Under maintenance'}"` : "Unlocked website access for all users.",
      });
    } catch (lErr) {}

    // Broadcast instant realtime lock update to all active browser clients
    try {
      const channel = admin.channel("website-lock-sync");
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "LOCK_UPDATED",
            payload: { is_locked, lock_message, timestamp: Date.now() },
          }).finally(() => {
            admin.removeChannel(channel);
          });
        }
      });
    } catch (bErr) {}

    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    return {
      success: true,
      settings: data,
      message: is_locked ? "Website has been LOCKED successfully." : "Website has been UNLOCKED successfully.",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getWebsiteAccessAllowlist() {
  try {
    const admin = createAdminClient();
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAIL || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Automatically ensure the Super Admin from .env.local is saved in the allowlist
    for (const email of superAdminEmails) {
      const { data: existing } = await admin
        .from("website_access_allowlist")
        .select("id")
        .eq("normalized_email", email)
        .maybeSingle();

      if (!existing) {
        await admin.from("website_access_allowlist").insert({
          email: email,
          normalized_email: email,
          provider: "google",
          active: true,
        });
      }
    }

    const { data, error } = await admin
      .from("website_access_allowlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, allowlist: data || [] };
  } catch (error) {
    return { success: false, allowlist: [] };
  }
}

export async function addGoogleAccountToAllowlist(email) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await admin
      .from("website_access_allowlist")
      .insert({
        email: email.trim(),
        normalized_email: normalizedEmail,
        provider: "google",
        active: true,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "ADD_ALLOWLIST_EMAIL",
        target_type: "allowlist",
        target_id: data.id,
        details: `Added Google account "${email.trim()}" to website access allowlist.`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: `Added "${email.trim()}" to allowlist.`, item: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function removeGoogleAccountFromAllowlist(id) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: item } = await admin.from("website_access_allowlist").select("email").eq("id", id).single();
    if (isEmailSuperAdmin(item?.email)) {
      return { success: false, error: "Action Prohibited: The Super Admin email is protected and cannot be removed from the access allowlist." };
    }
    const { error } = await admin.from("website_access_allowlist").delete().eq("id", id);

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "REMOVE_ALLOWLIST_EMAIL",
        target_type: "allowlist",
        target_id: id,
        details: `Removed "${item?.email || id}" from website access allowlist.`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: `Removed email from allowlist.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchContactMessagesAction() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("ib_contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, messages: data || [] };
  } catch (error) {
    console.error("[fetchContactMessagesAction] Error:", error.message);
    return { success: false, error: error.message, messages: [] };
  }
}

export async function updateContactMessageStatusAction({ messageId, status, adminNotes }) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const updatePayload = {
      status
    };
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    const { data, error } = await admin
      .from("ib_contact_messages")
      .update(updatePayload)
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "UPDATE_CONTACT_MESSAGE_STATUS",
        target_type: "contact_message",
        target_id: messageId,
        details: `Updated contact request status to "${status}" for message from "${data?.email || messageId}".`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: "Contact request updated successfully.", item: data };
  } catch (error) {
    console.error("[updateContactMessageStatusAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteContactMessageAction(messageId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("ib_contact_messages")
      .delete()
      .eq("id", messageId);

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "DELETE_CONTACT_MESSAGE",
        target_type: "contact_message",
        target_id: messageId,
        details: `Deleted contact submission "${messageId}".`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: "Contact request deleted." };
  } catch (error) {
    console.error("[deleteContactMessageAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteMultipleContactMessagesAction(messageIds) {
  try {
    if (!messageIds || !messageIds.length) {
      return { success: false, error: "No message IDs provided." };
    }
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("ib_contact_messages")
      .delete()
      .in("id", messageIds);

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "BULK_DELETE_CONTACT_MESSAGES",
        target_type: "contact_messages",
        target_id: "multiple",
        details: `Deleted ${messageIds.length} contact submissions.`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: `Successfully deleted ${messageIds.length} messages.` };
  } catch (error) {
    console.error("[deleteMultipleContactMessagesAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function clearAllContactMessagesAction() {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("ib_contact_messages")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw error;

    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "CLEAR_ALL_CONTACT_MESSAGES",
        target_type: "contact_messages",
        target_id: "all",
        details: `Cleared all contact inbox messages and feedback.`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    return { success: true, message: "All contact messages cleared successfully." };
  } catch (error) {
    console.error("[clearAllContactMessagesAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function addKnowledgeItemAction() { return { success: true }; }
export async function editKnowledgeItemAction() { return { success: true }; }

/* ── CENTRAL ADMIN REQUEST SYSTEM ────────────────────────────────────────── */

export async function fetchAdminRequestsAction({ status = "all", type = "all", limit = 50 } = {}) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    let query = admin
      .from("admin_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (type && type !== "all") {
      query = query.eq("request_type", type);
    }

    const { data, error } = await query.limit(limit);
    if (error) throw error;

    return { success: true, requests: data || [] };
  } catch (error) {
    console.error("[fetchAdminRequestsAction] Error:", error.message);
    return { success: false, requests: [], error: error.message };
  }
}

export async function resolveAdminRequestAction({
  requestId,
  action, // 'approved' | 'rejected' | 'resolved'
  adminResponse = "",
  editData = null,
}) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    // 1. Fetch current request
    const { data: request, error: reqErr } = await admin
      .from("admin_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      throw new Error(reqErr?.message || "Request not found");
    }

    const newStatus = action === "approved" ? "approved" : action === "rejected" ? "rejected" : "resolved";

    // 2. Update target entity based on request_type
    let targetUrl = "/dashboard";
    const reqType = request.request_type;

    if (reqType === "document_upload" && request.target_id) {
      const resourceUpdates = {
        visibility: newStatus === "approved" ? "approved" : "rejected",
        updated_at: new Date().toISOString(),
      };
      if (editData?.title) resourceUpdates.title = editData.title.trim();
      if (editData?.description) resourceUpdates.description = editData.description.trim();
      if (editData?.subject) resourceUpdates.subject = editData.subject;
      if (editData?.level) resourceUpdates.level = editData.level;
      if (editData?.topic) resourceUpdates.topic = editData.topic.trim();
      if (editData?.programme) resourceUpdates.programme = editData.programme;

      await admin.from("ib_resources").update(resourceUpdates).eq("id", request.target_id);
      targetUrl = newStatus === "approved" ? `/dashboard/resources/${request.target_id}` : "/dashboard/resources";
    } else if ((reqType === "discussion_approval" || reqType === "question_approval") && request.target_id) {
      const postUpdates = {
        status: newStatus === "approved" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      };
      if (editData?.title) postUpdates.title = editData.title.trim();
      if (editData?.content) postUpdates.content = editData.content.trim();
      if (editData?.category) postUpdates.category = editData.category;

      await admin.from("community_posts").update(postUpdates).eq("id", request.target_id);
      targetUrl = newStatus === "approved" ? `/dashboard/community/${request.target_id}` : "/dashboard/community";
    } else if (reqType === "study_group" && request.target_id) {
      await admin
        .from("community_study_groups")
        .update({ is_active: newStatus === "approved" })
        .eq("id", request.target_id);
      targetUrl = "/dashboard/community";
    } else if (reqType === "user_report" && request.target_id) {
      await admin
        .from("community_reports")
        .update({ status: newStatus === "approved" || newStatus === "resolved" ? "reviewed" : "dismissed" })
        .eq("id", request.target_id);
      targetUrl = "/dashboard/community";
    } else if (reqType === "contact_inbox" && request.target_id) {
      await admin
        .from("ib_contact_messages")
        .update({ status: "resolved", admin_notes: adminResponse || "Resolved by admin" })
        .eq("id", request.target_id);
      targetUrl = "/settings/help";
    }

    // 3. Update admin_requests row
    const { data: updatedRequest, error: updateErr } = await admin
      .from("admin_requests")
      .update({
        status: newStatus,
        admin_response: adminResponse?.trim() || null,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Create user notification if target user is known
    let targetUserId = request.user_id;
    if (!targetUserId && request.user_email) {
      try {
        const { data: matchedProfile } = await admin
          .from("profiles")
          .select("id")
          .ilike("email", request.user_email)
          .maybeSingle();
        if (matchedProfile?.id) {
          targetUserId = matchedProfile.id;
        }
      } catch (profErr) {}
    }

    if (targetUserId) {
      const typeLabelMap = {
        document_upload: "Document Upload",
        discussion_approval: "Community Discussion",
        question_approval: "Community Question",
        study_group: "Study Group Request",
        room_request: "Room Request",
        user_report: "Bug Report",
        technical_bug: "Bug Report",
        feature_request: "Feature Suggestion",
        contact_inbox: "Support Inquiry",
        past_paper_request: "Study Material Request",
      };
      const readableType = typeLabelMap[reqType] || "Request";

      const notifTitle = newStatus === "approved" 
        ? `${readableType} Approved` 
        : newStatus === "rejected" 
        ? `${readableType} Not Approved` 
        : `${readableType} Resolved`;

      let notifMsg = adminResponse?.trim();
      if (!notifMsg) {
        if (newStatus === "approved") {
          notifMsg = `Your ${readableType.toLowerCase()} "${request.title}" has been approved!`;
        } else if (newStatus === "rejected") {
          notifMsg = `Your ${readableType.toLowerCase()} "${request.title}" was not approved.`;
        } else {
          notifMsg = `Your ${readableType.toLowerCase()} "${request.title}" has been marked as resolved.`;
        }
      }

      await admin.from("user_notifications").insert({
        user_id: targetUserId,
        request_id: request.id,
        title: notifTitle,
        message: notifMsg,
        type: newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "info",
        request_type: reqType,
        target_url: targetUrl,
        is_read: false,
        is_popup_dismissed: false,
      });
    }

    // 5. Audit log
    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: `RESOLVE_REQUEST_${newStatus.toUpperCase()}`,
        target_type: reqType,
        target_id: String(requestId),
        details: `Admin resolved request "${request.title}" as ${newStatus.toUpperCase()}. Response: ${adminResponse || "None"}`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/community");
    revalidatePath("/dashboard/resources");
    revalidatePath("/help");

    return { success: true, request: updatedRequest };
  } catch (error) {
    console.error("[resolveAdminRequestAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function replyToUserRequestAction({
  requestId,
  replyMessage,
  newStatus = "resolved",
}) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const trimmedReply = (replyMessage || "").trim();
    if (!trimmedReply) {
      return { success: false, error: "Please enter a reply message for the student." };
    }

    // 1. Fetch current request
    const { data: request, error: reqErr } = await admin
      .from("admin_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !request) {
      throw new Error(reqErr?.message || "Request not found.");
    }

    // 2. Update request in admin_requests
    const { data: updatedRequest, error: updateErr } = await admin
      .from("admin_requests")
      .update({
        status: newStatus,
        admin_response: trimmedReply,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2b. Synchronize target entity visibility if approving/rejecting
    if (request.request_type === "document_upload" && request.target_id) {
      if (newStatus === "approved" || newStatus === "rejected") {
        await admin
          .from("ib_resources")
          .update({
            visibility: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.target_id);
      }
    } else if ((request.request_type === "discussion_approval" || request.request_type === "question_approval") && request.target_id) {
      if (newStatus === "approved" || newStatus === "rejected") {
        await admin
          .from("community_posts")
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id,
          })
          .eq("id", request.target_id);
      }
    }

    // 3. Resolve user ID for notification dispatch
    let targetUserId = request.user_id;
    if (!targetUserId && request.user_email) {
      try {
        const { data: matchedProfile } = await admin
          .from("profiles")
          .select("id")
          .ilike("email", request.user_email)
          .maybeSingle();
        if (matchedProfile?.id) {
          targetUserId = matchedProfile.id;
        }
      } catch (profErr) {}
    }

    // 4. Send notification into user_notifications
    if (targetUserId) {
      const typeLabelMap = {
        feature_request: "Feature Suggestion",
        technical_bug: "Bug Report",
        user_report: "Bug Report",
        contact_inbox: "Support Inquiry",
        document_upload: "Document Upload",
        discussion_approval: "Community Discussion",
        question_approval: "Community Question",
        study_group: "Study Group Request",
        past_paper_request: "Study Material Request",
      };
      const readableType = typeLabelMap[request.request_type] || "Request";

      const notifTitle = newStatus === "resolved"
        ? `Response to your ${readableType}: Resolved`
        : newStatus === "in_progress"
        ? `Update on your ${readableType}: In Progress`
        : newStatus === "approved"
        ? `Great news: Your ${readableType} was Approved`
        : newStatus === "rejected"
        ? `Decision on your ${readableType}`
        : `Admin Response: ${request.title}`;

      const notifType = newStatus === "approved"
        ? "approved"
        : newStatus === "rejected"
        ? "rejected"
        : "info";

      let targetUrl = "/help";
      if (request.request_type === "document_upload" && request.target_id) {
        targetUrl = `/dashboard/resources/${request.target_id}`;
      } else if (request.request_type?.includes("discussion") && request.target_id) {
        targetUrl = `/dashboard/community/${request.target_id}`;
      }

      await admin.from("user_notifications").insert({
        user_id: targetUserId,
        request_id: request.id,
        title: notifTitle,
        message: trimmedReply,
        type: notifType,
        request_type: request.request_type,
        target_url: targetUrl,
        is_read: false,
        is_popup_dismissed: false,
      });
    }

    // 5. Activity log
    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: `ADMIN_REPLY_REQUEST`,
        target_type: request.request_type,
        target_id: String(requestId),
        details: `Admin replied to request "${request.title}" (${newStatus}): "${trimmedReply.slice(0, 100)}"`,
      });
    } catch (lErr) {}

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/resources");
    revalidatePath("/dashboard/community");
    revalidatePath("/help");

    return { success: true, request: updatedRequest };
  } catch (error) {
    console.error("[replyToUserRequestAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteAdminRequestAction({ requestId }) {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("admin_requests")
      .delete()
      .eq("id", requestId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error) {
    console.error("[deleteAdminRequestAction] Error:", error.message);
    return { success: false, error: error.message };
  }
}

/* ── USER NOTIFICATIONS & REQUEST HISTORY ────────────────────────────────── */

export async function fetchUserNotificationsAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, notifications: [] };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { success: true, notifications: data || [] };
  } catch (error) {
    console.error("[fetchUserNotificationsAction] Error:", error.message);
    return { success: false, notifications: [], error: error.message };
  }
}

export async function dismissUserNotificationAction(notificationId) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const admin = createAdminClient();
    await admin
      .from("user_notifications")
      .update({ is_popup_dismissed: true, is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserNotificationAction(notificationId) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const admin = createAdminClient();
    await admin
      .from("user_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const admin = createAdminClient();
    await admin
      .from("user_notifications")
      .update({ is_read: true, is_popup_dismissed: true })
      .eq("user_id", user.id);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchUserRequestsAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, requests: [] };

    const admin = createAdminClient();
    let query = admin
      .from("admin_requests")
      .select("*");

    if (user.email) {
      query = query.or(`user_id.eq.${user.id},user_email.ilike.${user.email}`);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { success: true, requests: data || [] };
  } catch (error) {
    console.error("[fetchUserRequestsAction] Error:", error.message);
    return { success: false, requests: [], error: error.message };
  }
}

export async function submitUserSupportRequestAction({ type = "contact_inbox", title, details, metadata = {} }) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not authenticated, check if email was supplied via metadata/contact form
    const fallbackEmail = metadata?.email ? String(metadata.email).trim() : null;
    const fallbackName = metadata?.name ? String(metadata.name).trim() : null;

    if (!user && !fallbackEmail) {
      return { success: false, error: "Please sign in or provide your email so we can send updates to your account." };
    }

    const userId = user?.id || null;
    const userEmail = user?.email || fallbackEmail;
    const userName = user?.user_metadata?.full_name || fallbackName || (userEmail ? userEmail.split("@")[0] : "Student");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_requests")
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        request_type: type,
        title: title || "Support Request",
        details: details || "",
        metadata: {
          ...metadata,
          source: "help_center",
        },
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send confirmation notification if user is logged in
    if (userId) {
      try {
        const readableType = type === "feature_request" ? "feature suggestion" : type === "technical_bug" || type === "user_report" ? "bug report" : "inquiry";
        await admin.from("user_notifications").insert({
          user_id: userId,
          request_id: data.id,
          title: "Request Received",
          message: `Your ${readableType} "${title}" was received and queued for review.`,
          type: "info",
          request_type: type,
          is_read: false,
          is_popup_dismissed: false,
        });
      } catch (notifErr) {
        console.warn("Failed to create confirmation notification:", notifErr?.message);
      }
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/admin");
    revalidatePath("/help");
    return { success: true, request: data };
  } catch (error) {
    console.error("[submitUserSupportRequestAction] Error:", error);
    return { success: false, error: error.message || "Failed to submit request." };
  }
}


