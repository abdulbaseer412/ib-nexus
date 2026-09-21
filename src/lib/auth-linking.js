/**
 * OAuth account-linking helpers.
 * Used by the OAuth callback and Security settings UI.
 */

export const GOOGLE_ALREADY_LINKED_MESSAGE =
  "This Google account is already linked to another IB Nexus account. Please choose a different Google account or sign in directly using that account.";

export const GOOGLE_LINK_SUCCESS_MESSAGE = "Google account connected successfully.";

export const GOOGLE_SIGNIN_CANCELLED_MESSAGE = "Google sign-in was cancelled.";

export const GOOGLE_SIGNIN_FAILED_MESSAGE = "Google sign-in failed. Please try again.";

export const GOOGLE_NO_ACCOUNT_MESSAGE =
  "No account found. We couldn't find an IB Nexus account associated with this Google account. Please create an account first.";

export const GOOGLE_ACCOUNT_EXISTS_MESSAGE =
  "Account already exists. This Google account is already registered with IB Nexus. Please sign in instead.";

/** sessionStorage key used to preserve the initiating session during Connect Google. */
export const OAUTH_LINK_SESSION_KEY = "ib_nexus_oauth_link_session";

/** Returns the Google identity from a Supabase user object, if present. */
export function getGoogleIdentity(user) {
  return user?.identities?.find((identity) => identity.provider === "google") ?? null;
}

/** Detects Supabase errors that indicate an OAuth identity ownership conflict. */
export function isIdentityConflictError(message) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already linked") ||
    normalized.includes("already been linked") ||
    normalized.includes("identity already exists") ||
    normalized.includes("identity is already linked") ||
    normalized.includes("already associated") ||
    normalized.includes("belongs to another user")
  );
}

/** Saves the current Supabase session before an OAuth redirect (client-side only). */
export async function preserveOAuthLinkSession(supabase) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.refresh_token) return;

  sessionStorage.setItem(
    OAUTH_LINK_SESSION_KEY,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
}

/** Restores a session saved before an OAuth redirect. Returns true when successful. */
export async function restoreOAuthLinkSession(supabase) {
  const raw = sessionStorage.getItem(OAUTH_LINK_SESSION_KEY);
  sessionStorage.removeItem(OAUTH_LINK_SESSION_KEY);
  if (!raw) return false;

  try {
    const tokens = JSON.parse(raw);
    const { error } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    return !error;
  } catch {
    return false;
  }
}

export function clearOAuthLinkSession() {
  sessionStorage.removeItem(OAUTH_LINK_SESSION_KEY);
}

/**
 * Server-side validation for Google account linking during an OAuth callback.
 * Returns { allowed: true } or { allowed: false }.
 */
export async function validateGoogleLinkOwnership(supabase, user, expectedUserId) {
  if (!expectedUserId || !user?.id) {
    return { allowed: true };
  }

  if (user.id !== expectedUserId) {
    return { allowed: false };
  }

  const googleIdentity = getGoogleIdentity(user);
  if (!googleIdentity) {
    return { allowed: true };
  }

  const providerId = googleIdentity.id ?? googleIdentity.identity_data?.sub;
  if (!providerId) {
    return { allowed: true };
  }

  const { data: ownerId, error } = await supabase.rpc("get_oauth_identity_owner", {
    provider_input: "google",
    provider_id_input: providerId,
  });

  if (error) {
    return { allowed: false };
  }

  if (ownerId && ownerId !== expectedUserId) {
    return { allowed: false };
  }

  return { allowed: true };
}
