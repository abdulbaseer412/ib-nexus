"use client";

import OAuthButton from "./OAuthButton";
import { PROVIDER_LABELS, getProviderConfig, getPrimaryProvider } from "@/lib/auth-providers";

function TryAnotherButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center text-sm text-muted hover:text-primary transition-colors"
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
      <div className="rounded-2xl border border-warning-strong bg-warning-soft p-5 space-y-3">
        <p className="text-sm font-semibold text-primary">
          Different sign-in method required
        </p>
        <p className="text-sm text-secondary leading-relaxed">
          This account was created using a different sign-in method. Check the
          email you used to sign up for a clue, or contact support.
        </p>
        {onTryAnother && <TryAnotherButton onClick={onTryAnother} />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-info-strong bg-info-soft p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-card border border-info-strong flex items-center justify-center">
          <ProviderIcon provider={primary} />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-primary">
            {isSignup ? "You already have an account" : "This account uses a social sign-in method"}
          </p>
          <p className="text-sm text-secondary leading-relaxed">
            {isSignup
              ? "This email is linked to an existing account created with another sign-in method. Please continue with your linked account to sign in."
              : "This account was created using another sign-in method. Please continue with your linked account to sign in."}
          </p>
        </div>
      </div>

      <OAuthButton
        provider={primary}
        intent="signin"
        flowSource="linked-account"
        label="Continue with your linked account"
      />

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

export function ExistingPasswordAccountHint({ email = "", onTryAnother }) {
  const loginUrl = email ? `/login?email=${encodeURIComponent(email)}` : "/login";

  return (
    <div className="animate-auth-appear rounded-2xl border border-warning-strong bg-warning-soft p-5 space-y-4 text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-warning-soft flex items-center justify-center text-warning">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-semibold text-primary">
          Account already exists
        </h3>
        <p className="text-xs sm:text-sm text-secondary leading-relaxed">
          An IB Nexus account already exists with this email. Please sign in instead, or use another email address.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <a
          href={loginUrl}
          className="btn btn-primary flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium"
        >
          Sign In
        </a>
        {onTryAnother && (
          <button
            type="button"
            onClick={onTryAnother}
            className="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-subtle text-primary text-sm font-medium hover:bg-hover transition-colors"
          >
            Use another email
          </button>
        )}
      </div>
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
    <p className="text-xs text-center text-muted">
      This account is linked to {list}.
    </p>
  );
}
