"use client";

import OAuthButton from "./OAuthButton";
import { PROVIDER_LABELS, getProviderConfig, getPrimaryProvider } from "@/lib/auth-providers";

function TryAnotherButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      Use a different email
    </button>
  );
}

function ProviderIcon({ provider, size = "w-4 h-4" }) {
  const { paths } = getProviderConfig(provider);
  if (!paths?.length) return null;
  return (
    <svg className={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} fill="currentColor" d={d} />
      ))}
    </svg>
  );
}

// ─── Core dynamic hint ────────────────────────────────────────────────────────

/**
 * Shown when an account exists but the user is trying the wrong sign-in method.
 *
 * Reads the exact provider from the `providers` array returned by the
 * get_account_providers RPC. No hardcoding — works for any provider
 * Supabase returns: google, github, apple, microsoft, facebook, discord, etc.
 *
 * context="signup" → "You already have an account"
 * context="signin" → "This account uses <Provider>"
 */
export function OAuthProviderHint({ providers = [], context = "signin", onTryAnother }) {
  // Pick the first non-email/non-phone provider.
  // Does NOT filter by a hardcoded allowlist — any provider Supabase returns works.
  const primary = getPrimaryProvider(providers);
  const config = getProviderConfig(primary ?? "");
  const providerName = primary ? config.label : null;

  const isSignup = context === "signup";

  // If we genuinely have no provider info, show a safe non-generic fallback
  // that tells the user to check their email rather than guessing.
  if (!providerName) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Different sign-in method required
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          This account was created using a different sign-in method. Check the
          email you used to sign up for a clue, or contact support.
        </p>
        {onTryAnother && <TryAnotherButton onClick={onTryAnother} />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
          <ProviderIcon provider={primary} />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isSignup ? "You already have an account" : "This account uses a social sign-in method"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {isSignup
              ? "This email is linked to an existing account created with another sign-in method. Please continue with your linked account to sign in."
              : "This account was created using another sign-in method. Please continue with your linked account to sign in."}
          </p>
        </div>
      </div>

      <OAuthButton provider={primary} label="Continue with your linked account" />

      {onTryAnother && <TryAnotherButton onClick={onTryAnother} />}
    </div>
  );
}

// ─── Legacy aliases ───────────────────────────────────────────────────────────

/** @deprecated Use OAuthProviderHint instead. */
export function GoogleOnlyHint({ context = "signin", onTryAnother }) {
  return <OAuthProviderHint providers={["google"]} context={context} onTryAnother={onTryAnother} />;
}

/** @deprecated Use OAuthProviderHint instead. */
export function OAuthOnlyHint({ providers = [], onTryAnother }) {
  return <OAuthProviderHint providers={providers} context="signin" onTryAnother={onTryAnother} />;
}

// ─── Existing password account ────────────────────────────────────────────────

export function ExistingPasswordAccountHint({ onTryAnother }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 p-5 space-y-4 text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-lg">
        👋
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Welcome back</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          An account with this email already exists. Sign in to continue.
        </p>
      </div>
      <a
        href="/login"
        className="flex w-full items-center justify-center py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sign In
      </a>
      {onTryAnother && <TryAnotherButton onClick={onTryAnother} />}
    </div>
  );
}

// ─── Linked account (multiple providers) ─────────────────────────────────────

export function LinkedAccountHint({ providers = [] }) {
  if (providers.length < 2) return null;
  const labels = providers.map((p) => PROVIDER_LABELS[p] ?? p);
  const list =
    labels.length === 2
      ? labels.join(" and ")
      : `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  return (
    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
      This account is linked to {list}.
    </p>
  );
}
