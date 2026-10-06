import { createClient } from "@supabase/supabase-js";
import { IS_APPLICATION_LOCKED } from "@/lib/constants";

export const ACCESS_STATES = {
  ALLOWED: "ALLOWED",
  RESTRICTED: "RESTRICTED",
  CHECK_FAILED: "CHECK_FAILED",
};

/**
 * One Authoritative Server-Side Access Check Function for IB Nexus.
 *
 * Evaluates website access state for an authenticated user:
 * 1. Checks if profile.is_restricted === true -> RESTRICTED
 * 2. Checks if profile.is_admin === true -> ALLOWED (Admins bypass site locks)
 * 3. Checks website lock status in DB (or IS_APPLICATION_LOCKED constant):
 *    - If site is NOT locked -> ALLOWED
 *    - If site IS locked:
 *        Check Google Allowlist for user.email -> if active -> ALLOWED
 *        Otherwise -> RESTRICTED
 *
 * Returns { state: 'ALLOWED' | 'RESTRICTED' | 'CHECK_FAILED', lockMessage: string | null, reason: string | null }
 */
export async function getWebsiteAccessState(user, profile = null) {
  if (!user) {
    return { state: ACCESS_STATES.RESTRICTED, lockMessage: null, reason: "Unauthenticated" };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th";

    if (!supabaseUrl || !serviceKey) {
      return { state: ACCESS_STATES.CHECK_FAILED, error: "Missing Supabase credentials" };
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    });

    // 1. Fetch user profile if not passed
    let userProfile = profile;
    if (!userProfile && user.id) {
      const { data: fetchedProfile, error: profileErr } = await adminSupabase
        .from("profiles")
        .select("is_admin, is_restricted, preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileErr && fetchedProfile) {
        userProfile = fetchedProfile;
      }
    }

    // Super Admin skeleton bypass check (Super Admin can NEVER be restricted, suspended, or locked out)
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAIL || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const userEmail = user.email?.trim().toLowerCase();
    const isSuperAdmin = Boolean(userEmail && superAdminEmails.includes(userEmail));

    if (isSuperAdmin) {
      return { state: ACCESS_STATES.ALLOWED, lockMessage: null, reason: "super_admin" };
    }

    // 2. User Suspension Check — Suspended users see the beautiful AccessRestrictedExperience
    const isSuspended = Boolean(
      (userProfile?.preferences?.is_suspended === true) ||
      (userProfile?.preferences?.is_suspended !== false && user.user_metadata?.is_suspended === true) ||
      (user.banned_until && new Date(user.banned_until).getTime() > Date.now())
    );

    if (isSuspended) {
      return {
        state: ACCESS_STATES.RESTRICTED,
        reason: "user_suspended",
        lockMessage: "Your account access has been temporarily suspended by an administrator. All your notes, planner items, and study materials remain securely preserved.",
      };
    }

    // Note: profile.is_restricted is a communication restriction (commenting, discussions, chat)
    // and does NOT lock the user out from using the website.

    // 4. Website Lock check
    const { data: lockData, error: lockErr } = await adminSupabase
      .from("website_settings")
      .select("is_locked, lock_message")
      .eq("id", "global")
      .maybeSingle();

    const isLocked = IS_APPLICATION_LOCKED || Boolean(lockData?.is_locked);
    const customLockMessage = lockData?.lock_message || null;

    if (!isLocked) {
      return { state: ACCESS_STATES.ALLOWED, lockMessage: null, reason: "site_unlocked" };
    }

    // Site IS locked — Check Allowlist (Google / verified emails)
    if (userEmail) {
      const { data: allowlistData, error: allowErr } = await adminSupabase
        .from("website_access_allowlist")
        .select("id")
        .eq("normalized_email", userEmail)
        .eq("active", true)
        .maybeSingle();

      if (!allowErr && allowlistData) {
        return { state: ACCESS_STATES.ALLOWED, lockMessage: null, reason: "allowlist" };
      }
    }

    return {
      state: ACCESS_STATES.RESTRICTED,
      lockMessage: customLockMessage || "Workspace access is currently locked by administration.",
      reason: "site_locked",
    };
  } catch (err) {
    console.error("[getWebsiteAccessState] Access check failure:", err?.message);
    return {
      state: ACCESS_STATES.CHECK_FAILED,
      lockMessage: null,
      error: err?.message || "Failed to verify website access state.",
    };
  }
}

export async function isUserApprovedForLockedSite(user, profile = null) {
  const result = await getWebsiteAccessState(user, profile);
  return result.state === ACCESS_STATES.ALLOWED;
}
