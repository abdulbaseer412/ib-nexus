"use client";

/**
 * ResetPasswordForm — handles the password reset flow after the user
 * clicks the link in their email.
 *
 * Supabase redirects to /auth/reset-password?code=... after the user
 * clicks the reset link. The auth/callback route exchanges the code for
 * a session, then redirects here. At this point the user is authenticated
 * with a temporary session scoped to password reset.
 *
 * We call supabase.auth.updateUser({ password }) to set the new password.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";
import { validatePassword, validatePasswordMatch } from "@/lib/validation";
import { getAuthErrorDetails } from "@/lib/auth-errors";
import PasswordInput from "@/components/auth/PasswordInput";
import FormMessage from "@/components/auth/FormMessage";
import { buttonClassName } from "@/components/auth/auth-styles";
import Link from "next/link";

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageState, setMessageState] = useState(null);
  const [success, setSuccess] = useState(false);

  const submittingRef = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    submittingRef.current = true;

    setMessageState(null);

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setMessageState({ type: "error", title: "Weak password", message: passwordResult.error });
      submittingRef.current = false;
      return;
    }

    const matchResult = validatePasswordMatch(password, confirm);
    if (!matchResult.valid) {
      setMessageState({ type: "error", title: "Passwords don't match", message: matchResult.error });
      submittingRef.current = false;
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      const details = getAuthErrorDetails(updateError);
      setMessageState({
        type: details.type || "error",
        title: details.title,
        message: details.message,
      });
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-success-soft flex items-center justify-center text-2xl text-success">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary">
            Password updated
          </h1>
          <p className="text-sm text-secondary">
            Your password has been changed. Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">
          Set new password
        </h1>
        <p className="text-sm text-secondary mt-1">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="new-password" className="sr-only">New password</label>
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            placeholder="New password"
            required
            disabled={loading}
            showStrength
            value={password}
            onChange={(e) => { setPassword(e.target.value); setMessageState(null); }}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
          <PasswordInput
            id="confirm-password"
            name="confirm_password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            required
            disabled={loading}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setMessageState(null); }}
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
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>

      {messageState && (
        <FormMessage
          type={messageState.type}
          title={messageState.title}
          message={messageState.message}
        />
      )}

      <p className="text-center text-sm text-secondary">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
