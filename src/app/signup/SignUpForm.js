"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUpWithEmail } from "@/app/auth/actions";
import { getAuthErrorDetails } from "@/lib/auth-errors";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase-browser";
import AuthDivider from "@/components/auth/AuthDivider";
import FormMessage from "@/components/auth/FormMessage";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  OAuthProviderHint,
  ExistingPasswordAccountHint,
} from "@/components/auth/ProviderHint";
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from "@/lib/validation";
import { buttonClassName, inputClassName } from "@/components/auth/auth-styles";
import { hasPasswordLogin } from "@/lib/auth-providers";

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email");
  const googleExists = searchParams.get("google_exists") === "1";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [errorProviders, setErrorProviders] = useState([]);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0);

  const formRef = useRef(null);
  const rateLimitTimerRef = useRef(null);

  const [submitState, setSubmitState] = useState("idle"); // "idle" | "loading" | "success"
  const submittingRef = useRef(false);

  // Helper: get remaining cooldown seconds from localStorage
  function getHiddenCooldownRemaining() {
    try {
      const ts = localStorage.getItem("ib_signup_cooldown_until");
      if (!ts) return 0;
      const remaining = Math.ceil((parseInt(ts, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch { return 0; }
  }

  // Helper: set a hidden cooldown in localStorage
  function setHiddenCooldown(seconds) {
    try {
      localStorage.setItem("ib_signup_cooldown_until", String(Date.now() + seconds * 1000));
    } catch { /* ignore */ }
  }

  // Countdown ticker for visible rate-limit display
  useEffect(() => {
    if (rateLimitRemaining > 0) {
      rateLimitTimerRef.current = setInterval(() => {
        setRateLimitRemaining((prev) => {
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
  }, [rateLimitRemaining]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = "/dashboard";
      }
    });
  }, []);

  function resetMessages() {
    setError("");
    setErrorTitle("");
    setErrorType(null);
    setErrorProviders([]);
  }

  async function handleSignUp(e) {
    if (e && e.preventDefault) e.preventDefault();

    // Single request lock
    if (submittingRef.current || loading || submitState === "loading" || submitState === "success") {
      return;
    }

    // Check hidden cooldown — only show remaining time if user tries again too quickly
    const hiddenRemaining = getHiddenCooldownRemaining();
    if (hiddenRemaining > 0) {
      setRateLimitRemaining(hiddenRemaining);
      setErrorTitle("Please wait");
      setErrorType("rate_limit");
      return;
    }

    submittingRef.current = true;
    resetMessages();

    // ── Client-side validation ──────────────────────────────────────────────
    const form = e?.currentTarget ?? e?.target?.form ?? formRef.current;
    const formData = new FormData(form);

    const name = formData.get("name")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirm_password")?.toString() ?? "";

    const nameResult = validateName(name);
    if (!nameResult.valid) {
      setError(nameResult.error);
      setErrorTitle("Required field");
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.error);
      setErrorTitle("Invalid email");
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setError(passwordResult.error);
      setErrorTitle("Weak password");
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    const matchResult = validatePasswordMatch(password, confirmPassword);
    if (!matchResult.valid) {
      setError("Please make sure both password fields are identical.");
      setErrorTitle("Passwords don't match");
      setErrorType("validation");
      submittingRef.current = false;
      return;
    }

    // ── All client validation passed — proceed ─────────────────────────────
    setLoading(true);
    setSubmitState("loading");

    try {
      const result = await signUpWithEmail(formData);

      if (result?.error) {
        if (result.type === "duplicate" || result.error === "duplicate") {
          setError("An account with this email address already exists. Please sign in instead.");
          setErrorTitle("Account already exists");
          setErrorType("duplicate");
          setErrorProviders(result.providers ?? []);
          setLoading(false);
          setSubmitState("idle");
          submittingRef.current = false;
          return;
        }

        // Rate limit from Supabase — the account was likely already created
        // in a previous attempt. Redirect to check-email instead of blocking.
        if (result.type === "rate_limit") {
          setHiddenCooldown(30);
          setLoading(false);
          setSubmitState("idle");
          submittingRef.current = false;
          // Redirect to check-email — account likely exists from a prior attempt
          window.location.href = `/check-email?email=${encodeURIComponent(email)}`;
          return;
        }

        setError(result.error);
        setErrorTitle(result.title || "");
        setErrorType(result.type || "error");
        setLoading(false);
        setSubmitState("idle");
        submittingRef.current = false;
        return;
      }

      if (result?.success) {
        // Set hidden cooldown so quick re-signup attempts show remaining time
        setHiddenCooldown(30);

        setSubmitState("success");
        setError("");
        setErrorTitle("");
        setErrorType(null);

        const destination = result.redirect || `/check-email?email=${encodeURIComponent(email)}`;
        window.location.href = destination;
      }
    } catch (err) {
      const details = getAuthErrorDetails(err);

      if (details.type === "rate_limit") {
        // Rate limit on catch — redirect to check-email
        setHiddenCooldown(30);
        setLoading(false);
        setSubmitState("idle");
        submittingRef.current = false;
        window.location.href = `/check-email?email=${encodeURIComponent(email)}`;
        return;
      }

      setError(details.message);
      setErrorTitle(details.title);
      setErrorType("network");
      submittingRef.current = false;

      setLoading(false);
      setSubmitState("idle");
    }
  }

  // ── Google OAuth signup blocked: account already exists ────────────────────

  if (googleExists) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">
            Create your account
          </h1>
        </div>
        <OAuthProviderHint
          providers={["google"]}
          context="signup"
          onTryAnother={() => {
            window.history.replaceState(null, "", "/signup");
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // ── Provider-specific duplicate states ──────────────────────────────────────

  if (errorType === "duplicate") {
    if (hasPasswordLogin(errorProviders)) {
      return (
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">
              Create your account
            </h1>
          </div>
          <ExistingPasswordAccountHint email={email} onTryAnother={resetMessages} />
        </div>
      );
    }

    // OAuth account (Google, Apple, GitHub, Microsoft, etc.) — dynamic, no hardcoding
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">
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
        <h1 className="text-2xl font-bold text-primary">
          Create your account
        </h1>
        <p className="text-sm text-secondary mt-1">
          Join IB Nexus and start your IB journey
        </p>
      </div>

      <GoogleButton disabled={loading} onError={(msg) => setError(msg)} intent="signup" signupEmail={email} />

      <AuthDivider />

      <form ref={formRef} onSubmit={handleSignUp} className="space-y-3">
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
            value={email}
            placeholder="Email address"
            disabled={loading}
            onChange={(e) => {
              setEmail(e.target.value);
              resetMessages();
            }}
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

        <button
          type="submit"
          disabled={loading || submitState === "loading" || submitState === "success"}
          className={`${buttonClassName} flex items-center justify-center gap-2 transition-all duration-200`}
        >
          {submitState === "loading" ? (
            <>
              <svg className="w-4 h-4 animate-spin shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span>Creating account...</span>
            </>
          ) : submitState === "success" ? (
            <span>Account Created ✓</span>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Warning & Error Feedback */}
      {errorType === "duplicate" ? (
        <FormMessage
          type="warning"
          title={errorTitle || "Account already exists"}
          message={error || "An account with this email address already exists. Please sign in instead."}
          actions={
            <Link
              href="/login"
              className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
            >
              Go to Sign In
            </Link>
          }
        />
      ) : errorType === "rate_limit" ? (
        <div className="space-y-3">
          <FormMessage
            type="warning"
            title="Please wait"
            message={
              rateLimitRemaining > 0
                ? `You recently created an account. You can try again in ${rateLimitRemaining} seconds.`
                : "You can try again now."
            }
          />
          <div className="flex gap-2">
            <Link
              href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="btn btn-primary flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center"
            >
              Go to Sign In
            </Link>
            <Link
              href={`/check-email?email=${encodeURIComponent(email)}`}
              className="btn btn-ghost border border-subtle flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center text-secondary hover:text-primary"
            >
              Check your email
            </Link>
          </div>
        </div>
      ) : errorType === "network" ? (
        <FormMessage
          type="error"
          title={errorTitle || "Connection problem"}
          message={error || "We couldn't reach the server right now. Please check your internet connection or try again in a moment."}
          action={
            <button
              type="button"
              onClick={handleSignUp}
              className="btn btn-primary px-4 py-2 rounded-xl text-sm font-medium"
            >
              Retry
            </button>
          }
        />
      ) : (
        <FormMessage type="error" title={errorTitle} message={error} />
      )}

      {urlError && !error && (
        <FormMessage type="error" title="Sign-up interrupted" message={decodeURIComponent(urlError)} />
      )}

      <p className="text-center text-sm text-secondary">
        Already have an account?{" "}
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
