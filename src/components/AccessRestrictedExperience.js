"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, LogOut, Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase-browser";

export default function AccessRestrictedExperience({ user, profile }) {
  const [loading, setLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const displayName = profile?.display_name || profile?.full_name || user?.email?.split("@")[0] || "User";
  const email = profile?.email || user?.email || "";

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 sm:p-9 rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-slate-900/95 to-slate-950 shadow-[0_0_70px_rgba(244,63,94,0.18)] text-center space-y-6 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden my-auto">
        
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

        {/* IB Nexus Emblem */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-md shadow-rose-600/30">
            <span className="font-black text-white text-xs">N</span>
          </div>
          <span className="font-extrabold text-xs tracking-wider text-slate-300 uppercase">IB Nexus Security Gateway</span>
        </div>

        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-bold uppercase tracking-wider text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          Account Suspended by Administration
        </div>

        {/* Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <div className="absolute inset-0 rounded-2xl bg-rose-500/20 blur-xl animate-pulse pointer-events-none" />
          <ShieldAlert className="w-10 h-10 text-rose-400 relative z-10" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Account Access Suspended
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {email || displayName !== "User" ? (
              <>
                Account: <strong className="text-rose-200 font-semibold">{displayName}</strong> {email && `(${email})`}
              </>
            ) : (
              "Your account access has been temporarily suspended by an administrator."
            )}
          </p>
        </div>

        {/* Safe Data Preservation Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-300 text-xs sm:text-sm leading-relaxed text-left space-y-3.5 shadow-inner">
          <p className="text-slate-200 font-medium">
            Your IB Nexus account access has been temporarily suspended by an administrator.
          </p>
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-200/95 leading-normal">
            <span className="text-lg leading-none shrink-0">🛡️</span>
            <div>
              <strong className="block text-rose-300 font-semibold mb-0.5">Your Data is 100% Safe & Preserved</strong>
              All your notes, AI tutor conversations, planner schedules, flashcards, and profile information remain securely saved in our database and will be immediately restored when your access is resumed by administration.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setRechecking(true);
              window.location.reload();
            }}
            disabled={rechecking || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${rechecking ? "animate-spin text-rose-400" : ""}`} />
            <span>{rechecking ? "Re-verifying Status..." : "Check / Re-verify Access"}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            <span>{user?.id && user.id !== "suspended_user" ? "Sign Out & Switch Account" : "Return to Sign In"}</span>
          </button>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Believe this is a mistake? Contact Support</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
