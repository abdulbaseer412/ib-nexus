import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile-service";
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

  const profile = await ensureProfile(user);
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
  const user = await requireAuth();
  const profile = await ensureProfile(user);

  if (!profile || !isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return { user, profile };
}

export function getPostAuthRedirect(profile) {
  if (!profile || !isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  return "/dashboard";
}
