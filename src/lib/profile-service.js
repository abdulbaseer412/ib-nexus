import { createServerClient } from "@/lib/supabase/server";
import { getDisplayName, getAvatarUrl, isOnboardingComplete } from "@/lib/profile";

const isDev = process.env.NODE_ENV === "development";

function logError(context, error) {
  if (!isDev) return;
  console.error(`[${context}]`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
  });
}

function buildProfileSeed(user) {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: metadata.full_name || metadata.name || null,
    display_name:
      metadata.full_name ||
      metadata.name ||
      user.email?.split("@")[0] ||
      null,
    avatar_url: metadata.avatar_url || metadata.picture || null,
    onboarding_completed: false,
  };
}

function buildSyncPatch(user, profile) {
  const metadata = user.user_metadata ?? {};
  const patch = {};

  if (!profile.email && user.email) patch.email = user.email;

  const fullName = metadata.full_name || metadata.name;
  if (!profile.full_name && fullName) patch.full_name = fullName;

  const avatar = metadata.avatar_url || metadata.picture;
  if (!profile.avatar_url && avatar) patch.avatar_url = avatar;

  if (!profile.display_name?.trim()) {
    const displayName = fullName || user.email?.split("@")[0];
    if (displayName) patch.display_name = displayName;
  }

  return patch;
}

/**
 * Ensures every authenticated user has exactly one profile row.
 * Uses upsert so it is safe regardless of whether the trigger already ran.
 */
export async function ensureProfile(user) {
  if (!user) return null;

  const supabase = await createServerClient();

  // Upsert guarantees the row exists even if the DB trigger didn't fire.
  // on_conflict: "id" means: insert if missing, do nothing if present.
  const seed = buildProfileSeed(user);
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(seed, { onConflict: "id", ignoreDuplicates: true });

  if (upsertError) {
    logError("ensureProfile/upsert", upsertError);
  }

  let profile = await fetchProfile(supabase, user.id);

  if (!profile) {
    if (isDev) console.error("[ensureProfile] profile still null after upsert for user:", user.id);
    return null;
  }

  const syncPatch = buildSyncPatch(user, profile);
  if (Object.keys(syncPatch).length > 0) {
    const { data, error: patchError } = await supabase
      .from("profiles")
      .update(syncPatch)
      .eq("id", user.id)
      .select("*")
      .single();

    if (patchError) logError("ensureProfile/syncPatch", patchError);

    profile = data ?? { ...profile, ...syncPatch };
  }

  if (!isOnboardingComplete(profile) && profile.display_name?.trim() && profile.ib_program) {
    const { data, error: healError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id)
      .select("*")
      .single();

    if (healError) logError("ensureProfile/heal", healError);

    profile = data ?? { ...profile, onboarding_completed: true };
  }

  return profile;
}

async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logError("fetchProfile", error);
    return null;
  }

  return data;
}

export { getDisplayName, getAvatarUrl, isOnboardingComplete };
