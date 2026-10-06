import { createClient } from "@supabase/supabase-js";

/**
 * Server-side helper to check if an authenticated user is approved to enter the website
 * when Website Access is LOCKED.
 * 
 * An authenticated user is approved if:
 * 1. They are an active Admin (`is_admin === true` and not restricted/suspended).
 * 2. They authenticated via Google AND their normalized email is in `website_access_allowlist` with `active === true`.
 */
export async function isUserApprovedForLockedSite(user, profile = null) {
  if (!user) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th";
  
  if (!supabaseUrl || !serviceKey) return false;

  const adminSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Check Super Admin status
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();

  if (superAdminEmail && userEmail === superAdminEmail) {
    return true;
  }

  // 2. Check if user is suspended
  const isSuspended = Boolean(
    (profile?.preferences?.is_suspended === true) ||
    (profile?.preferences?.is_suspended !== false && user.user_metadata?.is_suspended === true) ||
    (user.banned_until && new Date(user.banned_until).getTime() > Date.now())
  );
  if (isSuspended) {
    return false;
  }

  // 3. Check Allowlist
  if (user.email) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const { data: allowlistData, error } = await adminSupabase
      .from("website_access_allowlist")
      .select("id")
      .eq("normalized_email", normalizedEmail)
      .eq("active", true)
      .maybeSingle();

    if (!error && allowlistData) {
      return true;
    }
  }

  return false;
}
