"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, LockKeyhole, CheckCircle2, Sparkles, Send } from "lucide-react";
import { submitContactForm } from "./actions";
import Link from "next/link";

export default function ContactForm({ userEmail, userName }) {
  const [state, formAction, pending] = useActionState(submitContactForm, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (state?.success) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-[var(--card)] p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[460px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500/25 to-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mb-6 shadow-lg ring-4 ring-emerald-500/20">
          <Sparkles className="absolute -top-1 -right-1 text-emerald-400 animate-pulse" size={18} />
          <CheckCircle2 size={38} className="text-emerald-400 drop-shadow" />
        </div>
        <h2 className="relative text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)] mb-3">
          Message Dispatched Successfully!
        </h2>
        <p className="relative text-sm sm:text-base text-[var(--text-secondary)] mb-8 max-w-md mx-auto leading-relaxed">
          Thank you for reaching out. A confirmation has been logged, and our academic support team will review your inquiry within 24 hours.
        </p>
        <Link 
          href="/" 
          className="relative btn btn-brand inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-bold shadow-lg shadow-brand/20 transition-all hover:scale-105"
        >
          <span>Return to Homepage</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 sm:p-10 shadow-xl overflow-hidden space-y-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
          Send Us a Message
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Fill out the details below. We read and respond to every inquiry personally.
        </p>
      </div>
      
      {state?.error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] space-y-2 block">
          <span>Your Full Name</span>
          <input 
            name="name" 
            required 
            defaultValue={state?.fields?.name || userName}
            className="w-full rounded-xl px-4 py-3 bg-[var(--surface-alt)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all" 
            placeholder="e.g. Alex Henderson"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] space-y-2 block">
          <span>Your Email Address</span>
          <input 
            name="email" 
            required 
            type="email" 
            defaultValue={state?.fields?.email || userEmail}
            readOnly={!!userEmail}
            className={`w-full rounded-xl px-4 py-3 border text-sm transition-all focus:outline-none ${
              userEmail 
                ? 'opacity-80 bg-[var(--surface)] border-[var(--border)] cursor-not-allowed text-[var(--muted)]' 
                : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
            }`} 
            placeholder="you@school.org"
          />
          {userEmail && (
            <span className="text-[10px] text-[var(--muted)] font-normal block pt-0.5">
              Verified from your active session.
            </span>
          )}
        </label>
      </div>
      
      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground)] space-y-2">
        <span>Inquiry Classification</span>
        <select 
          name="category" 
          className="w-full rounded-xl px-4 py-3 bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all cursor-pointer" 
          defaultValue={state?.fields?.category || "support"}
        >
          <option value="support">Academic Study &amp; Platform Support</option>
          <option value="bug">Technical Bug Report / Glitch</option>
          <option value="feedback">Feature Proposal &amp; Study Feedback</option>
          <option value="business">School, Educator &amp; Class Partnership</option>
          <option value="account">Account Access &amp; Password Support</option>
          <option value="privacy">Privacy, Data &amp; Security</option>
          <option value="other">General Inquiries</option>
        </select>
      </label>
      
      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground)] space-y-2">
        <span>Message Details</span>
        <textarea 
          name="message" 
          required 
          className="w-full min-h-36 rounded-xl px-4 py-3 bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all leading-relaxed" 
          placeholder="Please describe your question, bug details, or school inquiries. Include any relevant subject, course level, or browser details if reporting an issue..." 
          defaultValue={state?.fields?.message || ""}
        />
      </label>
      
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          type="submit" 
          disabled={pending}
          className="btn btn-brand inline-flex items-center justify-center gap-2.5 rounded-xl px-7 py-3.5 font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
        >
          {pending ? (
            <span>Sending Message...</span>
          ) : (
            <>
              <span>Transmit Message</span>
              <Send size={15} />
            </>
          )}
        </button>

        <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <LockKeyhole size={13} className="shrink-0 text-emerald-500" />
          <span>Encrypted with TLS &bull; Handled with strict privacy</span>
        </p>
      </div>
    </form>
  );
}
