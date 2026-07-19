/**
 * Pure profile helpers — safe to import anywhere (client or server).
 */

export function isOnboardingComplete(profile) {
  if (!profile) return false;
  if (profile.onboarding_completed === true) return true;

  return Boolean(
    profile.display_name?.trim() && profile.ib_program
  );
}

export function getDisplayName(user, profile) {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  if (profile?.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (user?.user_metadata?.full_name?.trim()) {
    return user.user_metadata.full_name.trim();
  }

  if (user?.user_metadata?.name?.trim()) {
    return user.user_metadata.name.trim();
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "User";
}

export function getAvatarUrl(user, profile) {
  if (profile?.avatar_url?.trim()) {
    return profile.avatar_url.trim();
  }

  const metadata = user?.user_metadata;
  return metadata?.avatar_url || metadata?.picture || null;
}

export function getProgramLabel(ibProgram) {
  if (ibProgram === "myp") return "MYP";
  if (ibProgram === "dp") return "DP";
  return null;
}

export function getOnboardingDefaults(user, profile) {
  return {
    displayName:
      profile?.display_name?.trim() ||
      profile?.full_name?.trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.user_metadata?.name?.trim() ||
      user?.email?.split("@")[0] ||
      "",
    ibProgram: profile?.ib_program || "",
    hasDisplayName: Boolean(profile?.display_name?.trim()),
    hasIbProgram: Boolean(profile?.ib_program),
  };
}
