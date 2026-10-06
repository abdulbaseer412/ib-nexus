import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";

export function getSuperAdminEmails() {
  const envVal = process.env.SUPER_ADMIN_EMAIL;
  if (!envVal) return [];
  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return getSuperAdminEmails().includes(email.trim().toLowerCase());
}

export const getAuthUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const getAuthSession = cache(async () => {
  const user = await getAuthUser();

  if (!user) {
    return { user: null, profile: null };
  }

  let profile = await getProfile(user.id);
  if (!profile) {
    const { ensureProfile } = await import("@/lib/profile-service");
    profile = await ensureProfile(user);
  }

  const userEmail = user.email?.trim().toLowerCase();
  const isSuperAdmin = isSuperAdminEmail(userEmail);

  if (isSuperAdmin) {
    if (profile?.is_admin !== true || profile?.is_restricted === true || profile?.is_suspended === true) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin.from("profiles").update({ is_admin: true, is_restricted: false }).eq("id", user.id);
        try {
          await admin.auth.admin.updateUserById(user.id, { 
            ban_duration: "none",
            user_metadata: { is_admin: true, is_restricted: false } 
          });
        } catch (_) {}
        if (profile) {
          profile.is_admin = true;
          profile.is_restricted = false;
          profile.is_suspended = false;
        }
        console.log(`[AUTH] Auto-healed Super Admin status and privileges for ${userEmail}`);
      } catch (err) {
        console.error("[AUTH] Failed to auto-heal Super Admin:", err);
      }
    }
  }

  return { user, profile };
});

export async function requireAuth() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireCompleteProfile() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);

  if (isSuperAdmin) {
    if (profile) {
      profile.is_restricted = false;
      profile.is_suspended = false;
    }
    return { user, profile };
  }

  // Restricted users are authenticated — do NOT redirect to /login!
  // Return user and profile so DashboardLayout handles restriction state cleanly.
  if (profile?.is_suspended === true || profile?.is_restricted === true) {
    return { user, profile };
  }

  if (profile && !isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);

  if (isSuperAdmin) {
    return { user, profile };
  }

  if (profile?.is_suspended === true || profile?.is_restricted === true || profile?.is_admin !== true) {
    redirect("/dashboard");
  }

  return { user, profile };
}

export async function isCurrentUserAdmin() {
  const { user, profile } = await getAuthSession();
  if (isSuperAdminEmail(user?.email)) {
    return true;
  }
  return profile?.is_admin === true && profile?.is_suspended !== true && profile?.is_restricted !== true;
}

export function getPostAuthRedirect(profile) {
  // Always route authenticated users to /dashboard (or onboarding if incomplete).
  // /dashboard evaluates website access state (ALLOWED vs RESTRICTED) cleanly server-side.
  if (profile && !isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  return "/dashboard";
}
