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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";
import { validatePassword, validatePasswordMatch } from "@/lib/validation";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setError("");

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setError(passwordResult.error);
      return;
    }

    const matchResult = validatePasswordMatch(password, confirm);
    if (!matchResult.valid) {
      setError(matchResult.error);
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes("same password")) {
        setError("New password must be different from your previous password.");
      } else if (msg.includes("expired") || msg.includes("invalid")) {
        setError(
          "This reset link has expired or already been used. Please request a new one."
        );
      } else {
        setError("Could not update your password. Please try again.");
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center text-2xl">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Password updated
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your password has been changed. Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Set new password
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          />
        </div>

        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>

      <FormMessage type="error" message={error} />

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Remember your password?{" "}
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
