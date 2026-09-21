"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase-browser";
import { resendVerificationEmail } from "@/app/auth/actions";
import FormMessage from "@/components/auth/FormMessage";
import { Mail, CheckCircle2, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";

export default function CheckEmailClient() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email] = useState(emailParam);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [messageState, setMessageState] = useState(null);

  const timerRef = useRef(null);

  // 1. Cooldown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  // 2. Session listener & auto-verification polling
  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email_confirmed_at) {
        window.location.href = "/dashboard";
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at || event === "SIGNED_IN") {
        window.location.href = "/dashboard";
      }
    });

    const interval = setInterval(checkSession, 4000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  async function handleResend() {
    if (cooldown > 0 || resending || !email) return;

    setResending(true);
    setMessageState(null);

    try {
      const result = await resendVerificationEmail(email);

      if (result?.error) {
        if (result.type === "rate_limit") {
          setMessageState({
            type: "warning",
            title: "Rate limit reached",
            message: "You're trying a little too quickly. Please wait a few moments before trying again.",
          });
        } else {
          setMessageState({
            type: "error",
            title: result.title || "Resend failed",
            message: result.error,
          });
        }
      } else if (result?.success) {
        setMessageState({
          type: "success",
          title: "Verification email sent",
          message: "A new verification link has been sent to your email address.",
        });
        setCooldown(60);
      }
    } catch {
      setMessageState({
        type: "error",
        title: "Connection issue",
        message: "Could not send verification email right now. Please try again in a moment.",
      });
    } finally {
      setResending(false);
    }
  }

  const isGmail = email.toLowerCase().includes("gmail");
  const isOutlook = email.toLowerCase().includes("outlook") || email.toLowerCase().includes("hotmail") || email.toLowerCase().includes("live");

  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12 flex items-center justify-center">
      <div className="card animate-in mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10 space-y-6 text-center shadow-float">
        {/* Large Success Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-accent-soft flex items-center justify-center text-accent-bright border border-accent-soft shadow-lifted">
            <Mail size={38} className="animate-bounce-subtle" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success flex items-center justify-center text-white text-xs font-bold border-2 border-background shadow-sm">
            <CheckCircle2 size={16} />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            Verify your email
          </h1>
          <p className="text-sm text-secondary leading-relaxed max-w-sm">
            We&apos;ve sent a verification link to:
          </p>
          {email && (
            <div className="inline-block rounded-xl bg-surface-alt px-3.5 py-1.5 font-semibold text-sm text-accent-bright border border-subtle break-all">
              {email}
            </div>
          )}
          <p className="text-xs text-muted pt-1 leading-relaxed">
            Click the link in the email to activate your account. The email may take 1–2 minutes to arrive.
            <br />
            <span className="font-medium">Don&apos;t see it? Check your spam or junk folder.</span>
          </p>
        </div>

        {/* Mail Provider Actions */}
        <div className="w-full space-y-2.5 pt-2">
          {isGmail ? (
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-brand w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition hover:scale-[1.01]"
            >
              Open Gmail <ExternalLink size={16} />
            </a>
          ) : isOutlook ? (
            <a
              href="https://outlook.live.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-brand w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition hover:scale-[1.01]"
            >
              Open Outlook <ExternalLink size={16} />
            </a>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold"
              >
                Open Gmail <ExternalLink size={14} />
              </a>
              <a
                href="https://outlook.live.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost border border-subtle flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-secondary hover:text-primary"
              >
                Open Outlook <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Resend Verification Email Button */}
          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-subtle py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={resending ? "animate-spin" : ""} />
            {resending
              ? "Resending email..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend verification email"}
          </button>
        </div>

        {/* Status Messages */}
        {messageState && (
          <FormMessage
            type={messageState.type}
            title={messageState.title}
            message={messageState.message}
          />
        )}

        {/* Footer Navigation Buttons */}
        <div className="border-t border-divider w-full pt-4 flex items-center justify-between text-xs text-secondary">
          <Link
            href="/login"
            className="flex items-center gap-1 font-medium text-secondary hover:text-primary transition"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
          <Link
            href="/signup"
            className="font-medium text-accent-bright hover:underline"
          >
            Change email
          </Link>
        </div>
      </div>
    </main>
  );
}
