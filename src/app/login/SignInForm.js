"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase-browser";
import { resolvePostAuthRedirect, resolveSignInError } from "@/app/auth/actions";
import { validateEmail } from "@/lib/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { debugLog } from "@/utils/debug-log";

function safeJson(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return { __unserializable: true };
  }
}


import AuthDivider from "@/components/auth/AuthDivider";
import FormMessage from "@/components/auth/FormMessage";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import { OAuthProviderHint } from "@/components/auth/ProviderHint";
import { buttonClassName, inputClassName } from "@/components/auth/auth-styles";

export default function SignInForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorProviders, setErrorProviders] = useState([]);

  const urlError = searchParams.get("error");

  function resetError() {
    setError("");
    setErrorType(null);
    setErrorProviders([]);
  }

  function resetAll() {
    setEmail("");
    setPassword("");
    resetError();
  }

  async function redirectAfterAuth() {
    const destination = await resolvePostAuthRedirect();
    const next = searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.refresh();
    router.push(safeNext || destination);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (loading) {
      debugLog("signin.handleSignIn.ignored_loading", {});
      return;
    }
    resetError();

    debugLog("signin.handleSignIn.start", { emailPresent: !!email, next: searchParams.get("next") });


    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      debugLog("signin.handleSignIn.validation.email_invalid", { error: emailResult.error });
      setError(emailResult.error);
      setErrorType("validation");
      return;
    }


    if (!password) {
      debugLog("signin.handleSignIn.validation.password_missing");
      setError("Password is required.");
      setErrorType("validation");
      return;
    }


    setLoading(true);
    debugLog("signin.handleSignIn.loading_true");


    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailResult.value,
      password,
    });

    debugLog("signin.handleSignIn.supabase_response", {
      signInError: signInError ? safeJson(signInError) : null,
    });


    if (signInError) {
      debugLog("signin.handleSignIn.signInError.branch", {});
      const resolved = await resolveSignInError(emailResult.value);
      debugLog("signin.handleSignIn.resolved", safeJson(resolved));
      setError(resolved.message);
      setErrorType(resolved.type);
      setErrorProviders(resolved.providers ?? []);
      setLoading(false);
      debugLog("signin.handleSignIn.loading_false.after_error");
      return;
    }


    debugLog("signin.handleSignIn.success_branch.redirect");
    try {
      await redirectAfterAuth();
    } catch (err) {
      debugLog("signin.handleSignIn.redirect_after_auth.exception", safeJson(err));
      setError("Sign-in failed. Please try again.");
      setErrorType("validation");
    } finally {
      setLoading(false);
      debugLog("signin.handleSignIn.loading_false.finally");
    }
  }


  // ── Provider-specific full-page states ──────────────────────────────────────

  if (errorType === "oauth_only") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in to your IB Nexus account
          </p>
        </div>
        <OAuthProviderHint providers={errorProviders} context="signin" onTryAnother={resetAll} />
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Want to add a password?{" "}
          <Link href="/settings/security" className="font-medium text-gray-900 dark:text-white hover:underline">
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sign in to your IB Nexus account
        </p>
      </div>

      <GoogleButton disabled={loading} onError={(msg) => setError(msg)} />

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
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {errorType === "no_account" && (
        <FormMessage
          type="error"
          message="No account found with this email."
          action={
            <Link
              href="/signup"
              className="inline-flex px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Create Account
            </Link>
          }
        />
      )}

      {errorType === "wrong_password" && (
        <FormMessage
          type="error"
          message={error}
          action={
            <Link
              href="/auth/forgot-password"
              className="inline-flex px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              Reset Password
            </Link>
          }
        />
      )}

      {errorType === "validation" && <FormMessage type="error" message={error} />}

      {urlError && <FormMessage type="error" message={decodeURIComponent(urlError)} />}

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-gray-900 dark:text-white hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
