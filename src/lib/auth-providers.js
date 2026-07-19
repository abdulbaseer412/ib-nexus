/**
 * Auth provider detection utilities.
 *
 * All provider-awareness logic lives here so UI components and server
 * actions never duplicate this reasoning.
 *
 * Provider values match Supabase's auth.identities.provider column:
 *   "google" | "email" | "github" | "apple" | etc.
 */

/**
 * @typedef {"google"|"email"|"github"|"apple"|"microsoft"|"facebook"|"phone"} Provider
 */

/**
 * Per-provider config — label, brand color, and SVG path data.
 * paths: string[] where each element is one complete SVG <path d="..."> value.
 * To add a new provider: add one entry here. No UI changes needed.
 */
export const PROVIDER_CONFIG = {
  google: {
    label: "Google",
    color: "#4285F4",
    paths: [
      "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
      "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
      "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
      "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
    ],
  },
  github: {
    label: "GitHub",
    color: "#24292e",
    paths: [
      "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
    ],
  },
  apple: {
    label: "Apple",
    color: "#000000",
    paths: [
      "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z",
      "M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z",
    ],
  },
  microsoft: {
    label: "Microsoft",
    color: "#00a4ef",
    paths: [
      "M11.4 24H0V12.6h11.4V24z",
      "M24 24H12.6V12.6H24V24z",
      "M11.4 11.4H0V0h11.4v11.4z",
      "M24 11.4H12.6V0H24v11.4z",
    ],
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    paths: [
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    ],
  },
  email: {
    label: "Email & Password",
    color: "#6b7280",
    paths: [
      "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    ],
  },
  phone: {
    label: "Phone",
    color: "#6b7280",
    paths: [
      "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
    ],
  },
};

/** Human-readable labels for each provider (kept for backward compat). */
export const PROVIDER_LABELS = Object.fromEntries(
  Object.entries(PROVIDER_CONFIG).map(([k, v]) => [k, v.label])
);

/**
 * Returns config for a provider.
 * Falls back gracefully for unknown providers — capitalises the name,
 * no icon. This means future providers work without any code change.
 */
export function getProviderConfig(provider) {
  if (!provider) return { label: "Unknown", color: "#6b7280", paths: [] };
  return (
    PROVIDER_CONFIG[provider] ?? {
      label: provider.charAt(0).toUpperCase() + provider.slice(1),
      color: "#6b7280",
      paths: [],
    }
  );
}

/**
 * Returns the first non-email provider from a providers array.
 * Does NOT filter by a hardcoded allowlist — any provider Supabase returns
 * is treated as a valid OAuth provider as long as it isn't "email" or "phone".
 */
export function getPrimaryProvider(providers) {
  return providers.find((p) => p !== "email" && p !== "phone") ?? null;
}

/** OAuth providers (no password involved). */
const OAUTH_PROVIDERS = new Set(["google", "github", "apple", "microsoft", "facebook"]);

export function isOAuthProvider(provider) {
  return OAUTH_PROVIDERS.has(provider);
}

/**
 * Given a providers array, returns whether the account has a password login.
 * Supabase uses "email" as the provider name for email+password accounts.
 */
export function hasPasswordLogin(providers) {
  return providers.includes("email");
}

export function hasGoogleLogin(providers) {
  return providers.includes("google");
}

export function isGoogleOnly(providers) {
  return providers.length > 0 && providers.every((p) => p === "google");
}

export function isOAuthOnly(providers) {
  return providers.length > 0 && providers.every((p) => isOAuthProvider(p));
}

export function hasMultipleProviders(providers) {
  return providers.length > 1;
}

/**
 * Returns the primary OAuth provider for an OAuth-only account,
 * or null if the account has a password login.
 */
export function getPrimaryOAuthProvider(providers) {
  if (hasPasswordLogin(providers)) return null;
  return providers.find((p) => isOAuthProvider(p)) ?? null;
}

/**
 * Returns a human-readable list of providers for display.
 * e.g. ["google", "email"] → "Google and Email & Password"
 */
export function formatProviders(providers) {
  const labels = providers.map((p) => PROVIDER_LABELS[p] ?? p);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
