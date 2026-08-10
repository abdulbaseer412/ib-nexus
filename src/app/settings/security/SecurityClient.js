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
import { useRouter, useSearchParams } from "next/navigation";
import { updatePassword, getUserAuthSettings, updateUserAuthSettings } from "@/app/auth/actions";
import { PROVIDER_LABELS, hasPasswordLogin, isOAuthProvider } from "@/lib/auth-providers";
import PasswordInput from "@/components/auth/PasswordInput";
import FormMessage from "@/components/auth/FormMessage";
import { buttonClassName } from "@/components/auth/auth-styles";
import { debugLog } from "@/utils/debug-log";
import {
  clearOAuthLinkSession,
  preserveOAuthLinkSession,
  restoreOAuthLinkSession,
} from "@/lib/auth-linking";

function safeJson(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return { __unserializable: true };
  }
}



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
    <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PROVIDER_ICONS = {
  google: <GoogleIcon />,
  email: <KeyIcon />,
};

// ─── Provider row ─────────────────────────────────────────────────────────────

function ProviderRow({ provider, status, onConnect, onEnable, onDisable }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  const icon = PROVIDER_ICONS[provider] ?? null;

  let statusText = "Not linked";
  if (status === "linked") statusText = "Linked to your account";
  if (status === "disabled") statusText = "Disabled";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-secondary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-primary">{label}</p>
          <p className="text-xs text-secondary">
            {statusText}
          </p>
        </div>
      </div>
      {status === "linked" && onDisable && (
        <button
          type="button"
          onClick={onDisable}
          className="text-xs font-medium text-danger hover:underline"
        >
          {provider === "email" ? "Disable Email & Password Sign-in" : "Disable Google Sign-in"}
        </button>
      )}
      {status === "disabled" && onEnable && (
        <button
          type="button"
          onClick={onEnable}
          className="text-xs font-medium text-success hover:underline"
        >
          {provider === "email" ? "Enable Email & Password Sign-in" : "Enable Google Sign-in"}
        </button>
      )}
      {status === "not_linked" && onConnect && (
        <button
          type="button"
          onClick={onConnect}
          className="text-xs font-medium text-primary hover:underline"
        >
          Connect
        </button>
      )}
    </div>
  );
}

// ─── Password form ────────────────────────────────────────────────────────────

function PasswordForm({ hasExistingPassword, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("error");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setErrorType("error");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await updatePassword(formData);

      setLoading(false);

      if (result?.error) {
        setError(result.error);
        if (result.type === "warning") setErrorType("warning");
        return;
      }

      if (result?.success) {
        setSuccess(result.success);
        setOpen(false);
        onSuccess?.();
      }
    } catch (err) {
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
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
    <div className="border-t border-divider pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {actionLabel}
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              {formTitle}
            </p>
            <p className="text-xs text-secondary mt-0.5">
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
                className="flex-1 py-2.5 rounded-xl border border-subtle text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          <FormMessage type={errorType} message={error} />
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [confirmUnlink, setConfirmUnlink] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");
  const [unlinkSuccess, setUnlinkSuccess] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const fetchAuthSettings = async () => {
    debugLog("security.fetchAuthSettings.start");
    const result = await getUserAuthSettings();
    debugLog("security.fetchAuthSettings.result", safeJson(result));
    if (result?.data) {
      setAuthSettings(result.data);
    }
  };



  useEffect(() => {
    const run = async () => {
      const urlError = searchParams.get("error");
      const urlSuccess = searchParams.get("success");
      const shouldRestoreSession = searchParams.get("restore_link_session") === "1";

      if (shouldRestoreSession) {
        debugLog("security.restoreLinkSession.start");
        const restored = await restoreOAuthLinkSession(supabase);
        debugLog("security.restoreLinkSession.result", { restored });
        router.refresh();
      } else if (urlSuccess || urlError) {
        clearOAuthLinkSession();
      }

      if (urlError) {
        setLinkError(decodeURIComponent(urlError));
      }
      if (urlSuccess) {
        setLinkSuccess(decodeURIComponent(urlSuccess));
      }

      if (urlError || urlSuccess || shouldRestoreSession) {
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        url.searchParams.delete("success");
        url.searchParams.delete("restore_link_session");
        window.history.replaceState(null, "", url.toString());
      }

      await fetchAuthSettings();

      if (window.location.pathname === "/settings/security") {
        await (async () => {
          debugLog("security.refreshProviders.onMount");
          const { data, error } = await supabase.rpc("get_account_providers", {
            email_input: userEmail,
          });
          if (!error && Array.isArray(data)) {
            setProviders(data);
          }
        })();
        router.refresh();
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const isGoogleLinked = providers.includes("google") && (authSettings ? authSettings.google_enabled : true);
  const isEmailLinked = providers.includes("email") && (authSettings ? authSettings.email_password_enabled : true);

  const hasGoogleIdentity = providers.includes("google");
  const isGoogleEnabled = authSettings ? authSettings.google_enabled : true;
  const googleStatus = hasGoogleIdentity
    ? isGoogleEnabled
      ? "linked"
      : "disabled"
    : "not_linked";

  const hasEmailPassword = providers.includes("email");
  const isEmailEnabled = authSettings ? authSettings.email_password_enabled : true;
  const emailStatus = hasEmailPassword
    ? isEmailEnabled
      ? "linked"
      : "disabled"
    : "not_linked";

  const activeLinkedProviders = [];
  if (googleStatus === "linked") activeLinkedProviders.push("google");
  if (emailStatus === "linked") activeLinkedProviders.push("email");

  const hasPassword = hasEmailPassword;
  const totalLinked = activeLinkedProviders.length;

  const refreshProviders = async () => {
    debugLog("security.refreshProviders.start", { userEmail });
    const { data, error } = await supabase.rpc("get_account_providers", {
      email_input: userEmail,
    });
    debugLog("security.refreshProviders.result", { error: error ? String(error) : null, data: safeJson(data) });
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
    debugLog("security.connect.clicked", {
      provider,
      userEmail,
      currentAuthSettings: safeJson(authSettings),
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLinkError("Your session expired. Please sign in again and retry.");
      return;
    }

    setLinkError("");
    setLinkSuccess("");
    await preserveOAuthLinkSession(supabase);

    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    callbackUrl.searchParams.set("next", "/settings/security");
    callbackUrl.searchParams.set("reconnect", provider);
    callbackUrl.searchParams.set("provider", provider);
    callbackUrl.searchParams.set("expected_user_id", user.id);

    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl.toString() },
    });
  };

  const handleEnable = async (provider) => {
    debugLog("security.enable.clicked", {
      provider,
      hasGoogleIdentity: providers.includes("google"),
      currentAuthSettings: safeJson(authSettings),
    });

    setLinkError("");
    setLinkSuccess("");
    setUnlinkError("");
    setUnlinkSuccess("");

    if (provider === "google") {
      if (providers.includes("google")) {
        const nextEmailEnabled = authSettings?.email_password_enabled ?? true;
        const result = await updateUserAuthSettings(true, nextEmailEnabled);
        if (result?.error) {
          setUnlinkError(result.error);
          return;
        }
        if (result?.data) {
          setAuthSettings(result.data);
          setUnlinkSuccess("Google sign-in has been enabled.");
        }
      } else {
        await handleConnect("google");
      }
    } else if (provider === "email") {
      const nextGoogleEnabled = authSettings?.google_enabled ?? true;
      const result = await updateUserAuthSettings(nextGoogleEnabled, true);
      if (result?.error) {
        setUnlinkError(result.error);
        return;
      }
      if (result?.data) {
        setAuthSettings(result.data);
        setUnlinkSuccess("Email & password sign-in has been enabled.");
      }
    }
  };

  const handleInitiateUnlink = (provider) => {
    debugLog("security.disable.clicked", {
      provider,
      totalLinked,
      authSettings: safeJson(authSettings),
      providers,
    });
    setUnlinkError("");
    setUnlinkSuccess("");
    if (totalLinked <= 1) {
      setUnlinkError(
        "Security protection active: You must keep at least one secure sign-in method enabled to prevent account lockout."
      );
      debugLog("security.disable.blocked_lockout_protection");
      return;
    }
    setConfirmUnlink(provider);
  };

  const handleUnlink = async () => {
    if (!confirmUnlink || unlinkLoading) {
      debugLog("security.disable.handleUnlink.ignored", { confirmUnlink, unlinkLoading });
      return;
    }
    debugLog("security.disable.handleUnlink.start", {
      confirmUnlink,
      authSettings: safeJson(authSettings),
    });
    setUnlinkLoading(true);
    setUnlinkError("");
    setUnlinkSuccess("");


    const nextGoogleEnabled = confirmUnlink === "google" ? false : authSettings?.google_enabled ?? true;
    const nextEmailEnabled = confirmUnlink === "email" ? false : authSettings?.email_password_enabled ?? true;

    debugLog("security.disable.updateUserAuthSettings.before", {
      nextGoogleEnabled,
      nextEmailEnabled,
      confirmUnlink,
    });

    const result = await updateUserAuthSettings(nextGoogleEnabled, nextEmailEnabled);

    debugLog("security.disable.updateUserAuthSettings.after", safeJson(result));


    setUnlinkLoading(false);

    if (result?.error) {
      debugLog("security.disable.updateUserAuthSettings.error", { error: result.error });
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
      {/* OAuth link feedback */}
      <FormMessage type="error" message={linkError} />
      <FormMessage type="success" message={linkSuccess} />

      {/* Error and Success Messages */}
      <FormMessage type="error" message={unlinkError} />
      <FormMessage type="success" message={unlinkSuccess} />

      {/* Sign-in methods card */}
      <div className="rounded-2xl border border-subtle bg-card-secondary px-6 py-2 divide-y divide-divider">
        <div className="py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Sign-in methods
          </p>
          <p className="text-xs text-secondary mt-0.5">
            {userEmail}
          </p>
        </div>

        {displayProviders.map((provider) => {
          const status = provider === "google" ? googleStatus : emailStatus;
          return (
            <ProviderRow
              key={provider}
              provider={provider}
              status={status}
              onConnect={isOAuthProvider(provider) ? () => handleConnect(provider) : null}
              onEnable={() => handleEnable(provider)}
              onDisable={
                status === "linked" ? () => handleInitiateUnlink(provider) : null
              }
            />
          );
        })}
      </div>

      {/* Password management */}
      <div className="rounded-2xl border border-subtle bg-card-secondary p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            Password
          </p>
          <p className="text-xs text-secondary mt-0.5">
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
        <div className="rounded-2xl border border-info-strong bg-info-soft p-4">
          <p className="text-xs text-info-strong leading-relaxed">
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
          <div className="w-full max-w-md rounded-2xl border border-subtle bg-elevated p-6 space-y-4 shadow-float">
            <h3 className="text-lg font-bold text-primary">
              {confirmUnlink === "email"
                ? "Disable Email & Password Sign-in?"
                : "Disable Google Sign-in?"}
            </h3>
            <p className="text-sm text-secondary leading-relaxed">
              {confirmUnlink === "email"
                ? "You will no longer be able to sign in using your email address and password. Your account will remain active."
                : "You will no longer be able to sign in using Google. Your account will remain active."}
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                You can still sign in using:
              </p>
              <div className="flex flex-col gap-1.5">
                {activeLinkedProviders
                  .filter((p) => p !== confirmUnlink)
                  .map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-2 text-sm text-secondary"
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
                className="btn btn-danger flex-1 py-2.5 rounded-xl text-sm font-medium"
              >
                {unlinkLoading
                  ? "Disabling…"
                  : "Disable Access"}
              </button>
              <button
                type="button"
                disabled={unlinkLoading}
                onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2.5 rounded-xl border border-subtle text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
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
