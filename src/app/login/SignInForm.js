"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase-browser";
import { resolvePostAuthRedirect, resolveSignInError } from "@/app/auth/actions";
import { validateEmail } from "@/lib/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
    if (loading) return;
    resetError();

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.error);
      setErrorType("validation");
      return;
    }

    if (!password) {
      setError("Password is required.");
      setErrorType("validation");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailResult.value,
      password,
    });

    if (signInError) {
      const resolved = await resolveSignInError(emailResult.value);
      setError(resolved.message);
      setErrorType(resolved.type);
      setErrorProviders(resolved.providers ?? []);
      setLoading(false);
      return;
    }

    await redirectAfterAuth();
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
