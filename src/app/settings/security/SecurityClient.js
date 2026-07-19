"use client";

/**
 * SecurityClient — the interactive security settings panel.
 *
 * Shows linked sign-in methods and allows:
 *   - Adding a password to an OAuth-only account
 *   - Changing an existing password
 *
 * Architecture note:
 *   Supabase handles provider linking automatically when
 *   "Link new OAuth accounts to existing email accounts" is enabled.
 *   Adding a password uses supabase.auth.updateUser({ password }),
 *   which adds an "email" identity to the existing user without
 *   creating a new account.
 */

import { createClient } from "@/utils/supabase-browser";
import { useState, useEffect } from "react";
import { updatePassword, getUserAuthSettings, updateUserAuthSettings } from "@/app/auth/actions";
import { PROVIDER_LABELS, hasPasswordLogin, isOAuthProvider } from "@/lib/auth-providers";
import PasswordInput from "@/components/auth/PasswordInput";
import FormMessage from "@/components/auth/FormMessage";
import { buttonClassName } from "@/components/auth/auth-styles";

// ─── Provider icons ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PROVIDER_ICONS = {
  google: <GoogleIcon />,
  email: <KeyIcon />,
};

// ─── Provider row ─────────────────────────────────────────────────────────────

function ProviderRow({ provider, linked, onConnect, onDisconnect }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const icon = PROVIDER_ICONS[provider] ?? null;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {linked ? "Linked to your account" : "Not linked"}
          </p>
        </div>
      </div>
      {linked ? (
        onDisconnect ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            {provider === "email" ? "Disable Email & Password Sign-in" : "Disable Google Sign-in"}
          </button>
        ) : (
          <CheckIcon />
        )
      ) : (
        onConnect && (
          <button
            type="button"
            onClick={onConnect}
            className="text-xs font-medium text-gray-900 dark:text-white hover:underline"
          >
            Connect
          </button>
        )
      )}
    </div>
  );
}

// ─── Password form ────────────────────────────────────────────────────────────

function PasswordForm({ hasExistingPassword, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updatePassword(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.success) {
      setSuccess(result.success);
      setOpen(false);
      onSuccess?.();
    }
  }

  const actionLabel = hasExistingPassword ? "Change password" : "Add a password";
  const formTitle = hasExistingPassword
    ? "Change your password"
    : "Create a password";
  const formDescription = hasExistingPassword
    ? "Update the password you use to sign in."
    : "Add email & password as another way to sign in. Your Google login will still work.";

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
        >
          {actionLabel}
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formDescription}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="sec-password" className="sr-only">New password</label>
              <PasswordInput
                id="sec-password"
                name="password"
                autoComplete="new-password"
                placeholder="New password"
                required
                disabled={loading}
                showStrength
              />
            </div>
            <div>
              <label htmlFor="sec-confirm" className="sr-only">Confirm password</label>
              <PasswordInput
                id="sec-confirm"
                name="confirm_password"
                autoComplete="new-password"
                placeholder="Confirm password"
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className={buttonClassName}>
                {loading ? "Saving…" : hasExistingPassword ? "Update Password" : "Create Password"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          <FormMessage type="error" message={error} />
        </div>
      )}

      <FormMessage type="success" message={success} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

export default function SecurityClient({ userEmail, initialProviders }) {
  const [providers, setProviders] = useState(initialProviders);
  const [authSettings, setAuthSettings] = useState(null);
  const supabase = createClient();

  const [confirmUnlink, setConfirmUnlink] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");
  const [unlinkSuccess, setUnlinkSuccess] = useState("");

  const fetchAuthSettings = async () => {
    const result = await getUserAuthSettings();
    if (result?.data) {
      setAuthSettings(result.data);
    }
  };

  useEffect(() => {
    fetchAuthSettings();
  }, []);

  const isGoogleLinked = providers.includes("google") && (authSettings ? authSettings.google_enabled : true);
  const isEmailLinked = providers.includes("email") && (authSettings ? authSettings.email_password_enabled : true);

  const activeLinkedProviders = [];
  if (isGoogleLinked) activeLinkedProviders.push("google");
  if (isEmailLinked) activeLinkedProviders.push("email");

  const hasPassword = isEmailLinked;
  const totalLinked = activeLinkedProviders.length;

  const refreshProviders = async () => {
    const { data, error } = await supabase.rpc("get_account_providers", {
      email_input: userEmail,
    });
    if (!error && Array.isArray(data)) {
      setProviders(data);
    }
  };

  const handlePasswordSuccess = async () => {
    await refreshProviders();
    // If they added a password, we should also enable email in user_auth_settings
    if (authSettings) {
      const result = await updateUserAuthSettings(authSettings.google_enabled, true);
      if (result?.data) {
        setAuthSettings(result.data);
      }
    }
  };

  const handleConnect = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleInitiateUnlink = (provider) => {
    setUnlinkError("");
    setUnlinkSuccess("");
    if (totalLinked <= 1) {
      setUnlinkError(
        "Security protection active: You must keep at least one secure sign-in method enabled to prevent account lockout."
      );
      return;
    }
    setConfirmUnlink(provider);
  };

  const handleUnlink = async () => {
    if (!confirmUnlink || unlinkLoading) return;
    setUnlinkLoading(true);
    setUnlinkError("");
    setUnlinkSuccess("");

    const nextGoogleEnabled = confirmUnlink === "google" ? false : authSettings?.google_enabled ?? true;
    const nextEmailEnabled = confirmUnlink === "email" ? false : authSettings?.email_password_enabled ?? true;

    const result = await updateUserAuthSettings(nextGoogleEnabled, nextEmailEnabled);

    setUnlinkLoading(false);

    if (result?.error) {
      setUnlinkError(result.error);
      return;
    }

    if (result?.data) {
      setAuthSettings(result.data);
    }

    setUnlinkSuccess(
      confirmUnlink === "email"
        ? "Email & password sign-in has been disabled. Your account remains active."
        : "Google sign-in has been disabled. Your account remains active."
    );

    setConfirmUnlink(null);
  };

  // Dynamically display all linked providers, plus standard "google" and "email"
  const displayProviders = Array.from(new Set([...providers, "google", "email"])).filter(
    (p) => p !== "phone"
  );

  return (
    <div className="space-y-6">
      {/* Error and Success Messages */}
      <FormMessage type="error" message={unlinkError} />
      <FormMessage type="success" message={unlinkSuccess} />

      {/* Sign-in methods card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 px-6 py-2 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Sign-in methods
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {userEmail}
          </p>
        </div>

        {displayProviders.map((provider) => {
          const isLinked = provider === "google" ? isGoogleLinked : isEmailLinked;
          return (
            <ProviderRow
              key={provider}
              provider={provider}
              linked={isLinked}
              onConnect={isOAuthProvider(provider) ? () => handleConnect(provider) : null}
              onDisconnect={
                isLinked ? () => handleInitiateUnlink(provider) : null
              }
            />
          );
        })}
      </div>

      {/* Password management */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Password
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {hasPassword
              ? "You can sign in with your email and password."
              : "You don't have a password yet. Add one to sign in without Google."}
          </p>
        </div>

        <PasswordForm
          hasExistingPassword={hasPassword}
          onSuccess={handlePasswordSuccess}
        />
      </div>

      {/* Account linking explanation */}
      {!hasPassword && providers.includes("google") && (
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <span className="font-semibold">One account, multiple sign-in methods.</span>{" "}
            Adding a password doesn&apos;t create a new account. You&apos;ll be able to sign
            in with either Google or your email and password — both access the same
            profile, dashboard, and data.
          </p>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {confirmUnlink === "email"
                ? "Disable Email & Password Sign-in?"
                : "Disable Google Sign-in?"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {confirmUnlink === "email"
                ? "You will no longer be able to sign in using your email address and password. Your account will remain active."
                : "You will no longer be able to sign in using Google. Your account will remain active."}
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                You can still sign in using:
              </p>
              <div className="flex flex-col gap-1.5">
                {activeLinkedProviders
                  .filter((p) => p !== confirmUnlink)
                  .map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckIcon />
                      <span>{PROVIDER_LABELS[p] ?? p}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={unlinkLoading}
                onClick={handleUnlink}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {unlinkLoading
                  ? "Disabling…"
                  : "Disable Access"}
              </button>
              <button
                type="button"
                disabled={unlinkLoading}
                onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
