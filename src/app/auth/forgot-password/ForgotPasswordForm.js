"use client";

import Link from "next/link";
import { sendPasswordReset } from "@/app/auth/actions";
import { useState, useRef } from "react";
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

  const submittingRef = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    submittingRef.current = true;

    resetMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await sendPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
      setErrorType(result.type ?? "unknown");
      setErrorProviders(result.providers ?? []);
      setLoading(false);
      submittingRef.current = false;
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
        <div className="w-14 h-14 mx-auto rounded-full bg-success-soft flex items-center justify-center text-2xl">
          ✉️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary">Check your email</h1>
          <p className="text-sm text-secondary leading-relaxed">{success}</p>
        </div>
        <Link
          href="/login"
          className="btn btn-ghost inline-flex w-full justify-center py-2.5 rounded-xl text-sm font-medium"
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
          <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
          <p className="text-sm text-secondary mt-1">
            This account doesn&apos;t have a password to reset.
          </p>
        </div>
        <OAuthProviderHint providers={errorProviders} context="signin" onTryAnother={resetMessages} />
        <p className="text-xs text-center text-secondary">
          After signing in, go to{" "}
          <Link href="/settings/security" className="underline font-medium text-primary hover:underline">
            Settings → Security
          </Link>{" "}
          to create a password.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
        <p className="text-sm text-secondary mt-1">
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
              <span>Sending link...</span>
            </>
          ) : (
            <span>Send Reset Link</span>
          )}
        </button>
      </form>

      <FormMessage type="error" message={error} />

      <p className="text-center text-sm text-secondary">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
