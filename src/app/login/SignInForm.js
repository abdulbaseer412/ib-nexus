"use client";

import Link from "next/link";
import { createClient, destroyClient, clearClientSession } from "@/utils/supabase-browser";
import { resolvePostAuthRedirect, resolveSignInError } from "@/app/auth/actions";
import { validateEmail } from "@/lib/validation";
import { getAuthErrorDetails } from "@/lib/auth-errors";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import AuthDivider from "@/components/auth/AuthDivider";
import FormMessage from "@/components/auth/FormMessage";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { OAuthProviderHint } from "@/components/auth/ProviderHint";
import { buttonClassName, inputClassName } from "@/components/auth/auth-styles";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorProviders, setErrorProviders] = useState([]);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  const urlError = searchParams.get("error");
  const [urlErrorConsumed, setUrlErrorConsumed] = useState(false);

  const submittingRef = useRef(false);
  const rateLimitTimerRef = useRef(null);

  // Rate-limit countdown ticker
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      rateLimitTimerRef.current = setInterval(() => {
        setRateLimitCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(rateLimitTimerRef.current);
            submittingRef.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
    };
  }, [rateLimitCountdown]);

  useEffect(() => {
    // Auto-redirect if an active session already exists in browser storage/cookies
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const next = searchParams.get("next");
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
        window.location.href = safeNext || "/dashboard";
      }
    });
  }, [searchParams]);

  function resetError() {
    setError("");
    setErrorTitle("");
    setErrorType(null);
    setErrorProviders([]);
    setUrlErrorConsumed(true);
  }

  function resetAll() {
    setEmail("");
    setPassword("");
    resetError();
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    resetError();

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.error);
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    if (!password) {
      setError("Password is required.");
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Pre-flight gate: if the email has no IB Nexus account, stop immediately.
    const preflightResolved = await resolveSignInError(emailResult.value);

    if (preflightResolved.type === "no_account") {
      setError(preflightResolved.message);
      setErrorTitle(preflightResolved.title);
      setErrorType("no_account");
      setErrorProviders([]);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailResult.value,
      password,
    });

    if (signInError) {
      const details = getAuthErrorDetails(signInError);

      if (details.type === "rate_limit") {
        setError("Too many sign-in attempts. Please wait before trying again.");
        setErrorTitle("Slow down");
        setErrorType("rate_limit");
        setLoading(false);
        setRateLimitCountdown(30);
        return;
      }

      if (details.type === "network") {
        setError(details.message);
        setErrorTitle(details.title);
        setErrorType("network");
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      setError(preflightResolved.message);
      setErrorTitle(preflightResolved.title || details.title);
      setErrorType(preflightResolved.type);
      setErrorProviders(preflightResolved.providers ?? []);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    if (!signInData?.session || !signInData?.user) {
      setError("Sign-in could not be completed. Please try again.");
      setErrorTitle("Sign-in failed");
      setErrorType("error");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    if (signInData.user.email?.toLowerCase() !== emailResult.value.toLowerCase()) {
      await supabase.auth.signOut();
      setError("An unexpected error occurred. Please try again.");
      setErrorTitle("Sign-in failed");
      setErrorType("error");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Success! Clear any leftover error states completely before navigating.
    resetError();

    const next = searchParams.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    const target = safeNext || "/dashboard";

    // Direct location assignment forces cookie transmission to server middleware cleanly without race conditions.
    window.location.href = target;
  }

  // ── OAuth-only account full-page state ──────────────────────────────────────

  if (errorType === "oauth_only") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
          <p className="text-sm text-secondary mt-1">
            Sign in to your IB Nexus account
          </p>
        </div>
        <OAuthProviderHint providers={errorProviders} context="signin" onTryAnother={resetAll} />
        <p className="text-center text-sm text-secondary">
          Want to add a password?{" "}
          <Link href="/settings/security" className="font-medium text-primary hover:underline">
            Sign in first, then visit Settings
          </Link>
        </p>
      </div>
    );
  }

  // ── Normal sign-in form ──────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
        <p className="text-sm text-secondary mt-1">
          Sign in to your IB Nexus account
        </p>
      </div>

      <GoogleButton
        disabled={loading}
        onError={(msg) => setError(msg)}
        flowSource="signin-page"
      />

      <AuthDivider />

      <form onSubmit={handleSignIn} className="space-y-3">
        <div>
          <label htmlFor="signin-email" className="sr-only">Email</label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); resetError(); }}
            placeholder="Email address"
            disabled={loading}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="signin-password" className="sr-only">Password</label>
          <PasswordInput
            id="signin-password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            disabled={loading}
            value={password}
            onChange={(e) => { setPassword(e.target.value); resetError(); }}
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-secondary hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${buttonClassName} flex items-center justify-center gap-2 transition-all duration-200`}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* No Account Found */}
      {errorType === "no_account" && (
        <FormMessage
          type="warning"
          title={errorTitle || "No account found"}
          message={error || "We couldn't find an IB Nexus account associated with this email address."}
          actions={
            <>
              <Link
                href={`/signup?email=${encodeURIComponent(email)}`}
                className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
              >
                Create Account
              </Link>
              <button
                type="button"
                onClick={resetError}
                className="btn btn-ghost px-4 py-2 rounded-xl text-sm font-medium"
              >
                Try Again
              </button>
            </>
          }
        />
      )}

      {/* Incorrect Password */}
      {errorType === "wrong_password" && (
        <FormMessage
          type="warning"
          title={errorTitle || "Incorrect password"}
          message={error || "The password you entered is incorrect."}
          actions={
            <>
              <button
                type="button"
                onClick={resetError}
                className="btn btn-ghost px-4 py-2 rounded-xl text-sm font-medium"
              >
                Try Again
              </button>
              <Link
                href={`/auth/forgot-password?email=${encodeURIComponent(email)}`}
                className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
              >
                Forgot Password
              </Link>
            </>
          }
        />
      )}

      {/* Network */}
      {errorType === "network" && (
        <FormMessage
          type="error"
          title={errorTitle || "Connection problem"}
          message={error || "We couldn't reach the server right now. Please check your internet connection or try again in a moment."}
          action={
            <button
              type="button"
              onClick={handleSignIn}
              className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
            >
              Retry
            </button>
          }
        />
      )}

      {/* Rate Limit */}
      {errorType === "rate_limit" && (
        <div className="space-y-3">
          <FormMessage
            type="warning"
            title={errorTitle || "Slow down"}
            message={
              rateLimitCountdown > 0
                ? `Too many attempts. You can try again in ${rateLimitCountdown} seconds.`
                : "You can try again now."
            }
          />
          <Link
            href="/auth/forgot-password"
            className="btn btn-ghost border border-subtle w-full px-4 py-2.5 rounded-xl text-sm font-medium text-center text-secondary hover:text-primary block"
          >
            Forgot your password?
          </Link>
        </div>
      )}

      {/* Disabled providers */}
      {(errorType === "email_disabled" || errorType === "google_disabled") && (
        <FormMessage type="warning" title={errorTitle} message={error} />
      )}

      {/* Email verification */}
      {errorType === "email_unconfirmed" && (
        <FormMessage
          type="info"
          title={errorTitle || "Email verification required"}
          message={error || "Please check your inbox to confirm your email address before signing in."}
        />
      )}

      {/* Validation / General */}
      {(errorType === "validation" || errorType === "error") && (
        <FormMessage type="error" title={errorTitle} message={error} />
      )}

      {/* URL error (from OAuth callback redirect) */}
      {urlError && !error && !urlErrorConsumed && (() => {
        const decoded = decodeURIComponent(urlError);
        const details = getAuthErrorDetails(decoded);
        if (details.type === "no_account") {
          return (
            <FormMessage
              type="warning"
              title={details.title}
              message={details.message}
              actions={
                <>
                  <Link
                    href="/signup"
                    className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Create Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => setUrlErrorConsumed(true)}
                    className="btn btn-ghost px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Try Again
                  </button>
                </>
              }
            />
          );
        }
        return (
          <FormMessage
            type={details.type === "warning" ? "warning" : "error"}
            title={details.title}
            message={details.message}
          />
        );
      })()}

      <p className="text-center text-sm text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
