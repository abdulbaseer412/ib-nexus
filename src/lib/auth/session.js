import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";

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

  const profile = await getProfile(user.id);
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

  if (profile?.is_suspended === true || profile?.is_restricted === true) {
    redirect("/login?error=account_suspended");
  }

  if (!profile || !isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getAuthSession();

  if (!user) {
    redirect("/login");
  }

  if (profile?.is_suspended === true || profile?.is_restricted === true) {
    redirect("/login?error=account_suspended");
  }

  if (profile?.is_admin !== true) {
    redirect("/dashboard");
  }

  return { user, profile };
}

export async function isCurrentUserAdmin() {
  const { profile } = await getAuthSession();
  return profile?.is_admin === true && profile?.is_suspended !== true && profile?.is_restricted !== true;
}

export function getPostAuthRedirect(profile) {
  if (profile?.is_suspended === true || profile?.is_restricted === true) {
    return "/login?error=account_suspended";
  }

  if (!profile || !isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  return "/dashboard";
}
