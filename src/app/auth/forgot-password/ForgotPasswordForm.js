"use client";

import Link from "next/link";
import { sendPasswordReset } from "@/app/auth/actions";
import { useState } from "react";
import FormMessage from "@/components/auth/FormMessage";
import { OAuthProviderHint } from "@/components/auth/ProviderHint";
import { buttonClassName, inputClassName } from "@/components/auth/auth-styles";

export default function ForgotPasswordForm() {
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    resetMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await sendPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
      setErrorType(result.type ?? "unknown");
      setErrorProviders(result.providers ?? []);
      setLoading(false);
      return;
    }

    if (result?.success) {
      setSuccess(result.success);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center text-2xl">
          ✉️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{success}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full justify-center py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  // OAuth-only account — no password to reset
  if (errorType === "oauth_only") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This account doesn&apos;t have a password to reset.
          </p>
        </div>
        <OAuthProviderHint providers={errorProviders} context="signin" onTryAnother={resetMessages} />
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          After signing in, go to{" "}
          <a href="/settings/security" className="underline">Settings → Security</a>{" "}
          to create a password.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="reset-email" className="sr-only">Email</label>
          <input
            id="reset-email"
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
        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <FormMessage type="error" message={error} />

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-gray-900 dark:text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
