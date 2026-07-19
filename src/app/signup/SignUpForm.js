"use client";

import Link from "next/link";
import { signUpWithEmail } from "@/app/auth/actions";
import { useState } from "react";
import AuthDivider from "@/components/auth/AuthDivider";
import FormMessage from "@/components/auth/FormMessage";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  OAuthProviderHint,
  ExistingPasswordAccountHint,
} from "@/components/auth/ProviderHint";
import { buttonClassName, inputClassName } from "@/components/auth/auth-styles";
import { hasPasswordLogin } from "@/lib/auth-providers";

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorProviders, setErrorProviders] = useState([]);
  const [success, setSuccess] = useState("");

  function resetMessages() {
    setError("");
    setErrorType(null);
    setErrorProviders([]);
    setSuccess("");
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (loading) return;

    resetMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUpWithEmail(formData);

    if (result?.error) {
      if (result.type === "duplicate") {
        setErrorType("duplicate");
        setErrorProviders(result.providers ?? []);
        setLoading(false);
        return;
      }
      setError(result.error);
      setErrorType(result.type);
      setLoading(false);
      return;
    }

    if (result?.success) {
      setSuccess(result.success);
      setLoading(false);
    }
  }

  // ── Provider-specific duplicate states ──────────────────────────────────────

  if (errorType === "duplicate") {
    if (hasPasswordLogin(errorProviders)) {
      return (
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create your account
            </h1>
          </div>
          <ExistingPasswordAccountHint onTryAnother={resetMessages} />
        </div>
      );
    }

    // OAuth account (Google, Apple, GitHub, Microsoft, etc.) — dynamic, no hardcoding
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h1>
        </div>
        <OAuthProviderHint providers={errorProviders} context="signup" onTryAnother={resetMessages} />
      </div>
    );
  }

  // ── Normal sign-up form ──────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create your account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Join IB Nexus and start your IB journey
        </p>
      </div>

      <GoogleButton disabled={loading} onError={(msg) => setError(msg)} />

      <AuthDivider />

      <form onSubmit={handleSignUp} className="space-y-3">
        <div>
          <label htmlFor="signup-name" className="sr-only">Full name</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={50}
            placeholder="Full name"
            disabled={loading}
            onChange={resetMessages}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="sr-only">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            disabled={loading}
            onChange={resetMessages}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="sr-only">Password</label>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            placeholder="Password"
            required
            disabled={loading}
            showStrength
            onChange={resetMessages}
          />
        </div>

        <div>
          <label htmlFor="signup-confirm" className="sr-only">Confirm password</label>
          <PasswordInput
            id="signup-confirm"
            name="confirm_password"
            autoComplete="new-password"
            placeholder="Confirm password"
            required
            disabled={loading}
            onChange={resetMessages}
          />
        </div>

        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <FormMessage type="error" message={error} />
      <FormMessage type="success" message={success} />

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-gray-900 dark:text-white hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
