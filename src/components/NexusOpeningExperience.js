"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  LogIn,
  LogOut,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  FastForward,
  UserX,
} from "lucide-react";
import { createClient } from "@/utils/supabase-browser";

export default function NexusOpeningExperience({
  lockMessage = "",
  isLocked = true,
  isAuthenticated = false,
  isApproved = false,
  isSuperAdmin = false,
  userEmail = null,
  initialLockError = null,
  initialRejectedEmail = null,
}) {
  const [animationStage, setAnimationStage] = useState(() =>
    initialLockError || initialRejectedEmail ? 3 : 0
  );
  const [replayCount, setReplayCount] = useState(0);
  const timersRef = useRef([]);

  // Login & Restriction states
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [authError, setAuthError] = useState(() => initialLockError || "");
  const [rejectedEmail, setRejectedEmail] = useState(
    () => initialRejectedEmail || (!isApproved ? userEmail : null)
  );
  const [authSuccess, setAuthSuccess] = useState("");
  const [, startTransition] = useTransition();

  const isRestricted =
    Boolean(authError || rejectedEmail || (isAuthenticated && !isApproved)) &&
    !(isAuthenticated && isApproved);

  const startSequence = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];

    // Stage 0: 3D Book Closed
    setAnimationStage(0);

    // Sequence timings
    const t1 = setTimeout(() => setAnimationStage(1), 500); // Stage 1: Book opens & pages unfold
    const t2 = setTimeout(() => setAnimationStage(2), 2400); // Stage 2: Logo & branding reveal
    const t3 = setTimeout(() => setAnimationStage(3), 4600); // Stage 3: Animation settles into Locked Card

    timersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    if (!initialLockError && !initialRejectedEmail) {
      startSequence();
    }
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
    };
  }, [initialLockError, initialRejectedEmail]);

  useEffect(() => {
    if (initialLockError) {
      setAuthError(initialLockError);
      setAnimationStage(3);
    }
  }, [initialLockError]);

  useEffect(() => {
    if (initialRejectedEmail) {
      setRejectedEmail(initialRejectedEmail);
      setAnimationStage(3);
    }
  }, [initialRejectedEmail]);

  const replayAnimation = () => {
    setReplayCount((prev) => prev + 1);
    setAuthSuccess("");
    startSequence();
  };

  const skipToLockedCard = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    setAnimationStage(3);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set("provider", "google");
      callbackUrl.searchParams.set("intent", "signin");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;
    } catch (err) {
      setAuthError(err.message || "Failed to initiate Google sign in");
      setGoogleLoading(false);
    }
  };

  const handleStaffPasswordLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setAuthError("Please provide both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const { resolveSignInError, verifyUserAuthMethod } = await import("@/app/auth/actions");
      const preflight = await resolveSignInError(emailInput.trim());
      if (preflight.type === "disabled_method") {
        setAuthError(preflight.message || "Email & password sign-in has been disabled for this account. Please sign in using Google.");
        setAuthLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        const methodCheck = await verifyUserAuthMethod(data.user.id, "email");
        if (!methodCheck.allowed) {
          await supabase.auth.signOut();
          setAuthError(methodCheck.message || "Email & password sign-in has been disabled for this account. Please sign in using Google.");
          setAuthLoading(false);
          return;
        }

        // Verify clearance against authoritative lock API
        const res = await fetch("/api/auth/lock-status", { cache: "no-store" });
        const check = await res.json();

        if (check.isApproved || check.isSuperAdmin) {
          setAuthSuccess("Clearance verified. Entering IB Nexus Workspace...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 800);
        } else {
          // Account is authenticated, but NOT approved to enter while locked
          await supabase.auth.signOut();
          setRejectedEmail(data.user.email);
          setAuthError(
            `Access Denied: Account (${data.user.email}) is not on the authorized clearance allowlist for this locked workspace.`
          );
          setAuthLoading(false);
          setShowAuthOptions(false);
        }
      }
    } catch (err) {
      setAuthError(err.message || "Invalid login credentials.");
      setAuthLoading(false);
    }
  };

  const handleRecheckClearance = async () => {
    setRechecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/lock-status", { cache: "no-store" });
      const check = await res.json();

      if (!check.isLocked) {
        setAuthSuccess("Maintenance concluded! Loading IB Nexus...");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
        return;
      }

      if (check.isApproved || check.isSuperAdmin) {
        setAuthSuccess("Clearance confirmed! Entering IB Nexus Workspace...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
        return;
      }

      // Still locked and not approved
      setTimeout(() => {
        setRechecking(false);
        setAuthError(
          rejectedEmail || userEmail
            ? `Account (${rejectedEmail || userEmail}) is still pending allowlist authorization.`
            : "Workspace is still locked. Clearance required."
        );
      }, 700);
    } catch {
      setRechecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  };

  const effectiveLockNotice =
    lockMessage && lockMessage.trim().length > 0
      ? lockMessage
      : "We are currently performing scheduled maintenance to upgrade the IB Nexus Academic Workspace. All user accounts, study materials, notes, and academic tools remain completely safe and will be restored immediately upon completion.";

  return (
    <div className="fixed inset-0 z-[9999] bg-[#07070a] text-white overflow-y-auto overflow-x-hidden select-none font-sans nexus-custom-slider scroll-smooth">
      {/* Background Ambient Lighting Mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-60 animate-pulse transition-colors duration-1000 ${
            isRestricted
              ? "bg-gradient-to-tr from-rose-950/40 via-red-900/20 to-indigo-950/20"
              : "bg-gradient-to-tr from-indigo-900/20 via-purple-900/15 to-amber-700/10"
          }`}
        />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-cyan-900/15 rounded-full blur-[120px] opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Fast Forward / Skip Intro button visible during animation stages */}
      {animationStage < 3 && (
        <button
          type="button"
          onClick={skipToLockedCard}
          className="fixed top-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-slate-300 font-mono transition-all backdrop-blur-md cursor-pointer active:scale-95 shadow-lg"
          title="Skip intro to lock screen"
        >
          <span>Skip Intro</span>
          <FastForward size={13} />
        </button>
      )}

      {/* Full-height scrollable inner canvas that ensures header is never cut off */}
      <div className="min-h-full w-full flex flex-col items-center justify-start pt-10 pb-16 sm:py-14 px-4 relative z-10">
        <div className="relative z-10 flex flex-col items-center w-full max-w-xl text-center my-auto">
          <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* STAGE 0 & 1: 3D Book Opening Animation (Plays First on Entry) */}
          {/* ============================================================ */}
          {animationStage < 2 && (
            <motion.div
              key={`book-stage-${replayCount}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center my-8"
            >
              {/* 3D Book Graphic */}
              <div
                className="relative w-44 h-56 mb-8 [perspective:1000px]"
                style={{ perspective: "1000px" }}
              >
                <motion.div
                  className="relative w-full h-full rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center p-4 overflow-hidden [transform-style:preserve-3d]"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{
                    rotateY: animationStage === 1 ? -25 : -6,
                    rotateX: animationStage === 1 ? 10 : 3,
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  {/* Book Cover Inset Line */}
                  <div className="absolute inset-2 border border-amber-500/20 rounded-xl pointer-events-none" />

                  {/* Center Emblem on Cover */}
                  <motion.div
                    animate={{
                      scale: animationStage === 1 ? [1, 1.2, 1] : 1,
                      opacity: animationStage === 1 ? 1 : 0.85,
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-400/40 flex items-center justify-center shadow-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/ib-nexus-icon.png"
                      alt="IB Nexus Emblem"
                      className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                    />
                  </motion.div>

                  {/* Unfolding Pages Effect */}
                  {animationStage === 1 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 0.95, scaleX: 1 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-2 right-2 w-1/2 bg-gradient-to-r from-amber-100/90 to-white rounded-r-lg shadow-2xl origin-left border-l border-amber-900/30 flex flex-col justify-around p-2"
                    >
                      <div className="h-1 w-3/4 bg-amber-900/20 rounded" />
                      <div className="h-1 w-full bg-amber-900/15 rounded" />
                      <div className="h-1 w-5/6 bg-amber-900/15 rounded" />
                      <div className="h-1 w-2/3 bg-amber-900/20 rounded" />
                    </motion.div>
                  )}
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                className="text-xs uppercase tracking-[0.3em] text-amber-300 font-mono"
              >
                {animationStage === 0
                  ? "Opening IB Nexus Workspace..."
                  : "Unfolding Knowledge Engine..."}
              </motion.p>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: Logo & Branding Reveal */}
          {/* ============================================================ */}
          {animationStage === 2 && (
            <motion.div
              key={`logo-stage-${replayCount}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center space-y-6 my-12"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/horizontal-logo-transparent.png"
                  alt="IB Nexus"
                  className="relative h-16 sm:h-20 w-auto object-contain drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]"
                />
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-base sm:text-lg font-light text-slate-300 tracking-wide"
              >
                The Next-Generation IB Academic Workspace
              </motion.p>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 3: Locked / Restriction Interface */}
          {/* ============================================================ */}
          {animationStage === 3 && (
            <motion.div
              key={`locked-stage-${replayCount}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center space-y-6 w-full"
            >
              {/* Brand Header */}
              <div className="flex flex-col items-center space-y-3 shrink-0 pt-1 sm:pt-2">
                <div className="relative group shrink-0">
                  <div
                    className={`absolute -inset-1 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 ${
                      isRestricted
                        ? "bg-gradient-to-r from-rose-500/40 via-amber-500/30 to-rose-600/40"
                        : "bg-gradient-to-r from-amber-500/30 via-indigo-500/30 to-cyan-500/30"
                    }`}
                  />
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/70 border border-white/20 backdrop-blur-2xl flex items-center justify-center p-2.5 sm:p-3 shadow-2xl shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/ib-nexus-icon.png"
                      alt="IB Nexus"
                      className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                    />
                  </div>
                </div>

                <div className="space-y-0.5 text-center shrink-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
                    IB NEXUS
                  </h1>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-[0.2em] uppercase">
                    Academic Workspace
                  </p>
                </div>
              </div>

              {/* CARD CONTAINER */}
              {isAuthenticated && isApproved ? (
                /* ============================================================ */
                /* APPROVED CLEARANCE CARD (Super Admin or Allowlist Member)     */
                /* ============================================================ */
                <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl space-y-5 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      <span>
                        {isSuperAdmin
                          ? "Super Admin Clearance Active"
                          : "Authorized Allowlist Member"}
                      </span>
                    </div>
                    {userEmail && (
                      <span className="text-[11px] font-mono text-emerald-400/90 truncate max-w-[180px]">
                        {userEmail}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">Welcome back</h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      You have verified authorization to access the IB Nexus Academic Workspace during this maintenance session.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <a
                      href="/dashboard"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : isRestricted ? (
                /* ============================================================ */
                /* BEAUTIFUL & STUNNING RESTRICTION PRESENTATION CARD           */
                /* ============================================================ */
                <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-950/85 border border-rose-500/30 backdrop-blur-2xl shadow-[0_0_60px_rgba(244,63,94,0.18)] space-y-6 text-left relative overflow-hidden">
                  {/* Glowing Top Rainbow-Rose Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-indigo-600 shadow-[0_0_15px_rgba(244,63,94,0.5)]" />

                  {/* Header Status & Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-rose-300 bg-rose-500/15 px-3.5 py-1.5 rounded-full border border-rose-500/30 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <ShieldAlert size={13} className="text-rose-400" />
                      <span>Access Clearance Required</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                      Restricted Workspace
                    </span>
                  </div>

                  {/* Main Headline & Subtitle */}
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-rose-100 to-rose-300 bg-clip-text text-transparent">
                      Workspace Access Restricted
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      IB Nexus is currently locked for an exclusive maintenance and deployment cycle. Only authorized administrators and verified allowlist accounts may enter.
                    </p>
                  </div>

                  {/* Attempted Account Chip */}
                  {(rejectedEmail || userEmail) && (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-rose-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-md">
                      <div className="flex items-center gap-2.5 text-xs text-slate-300 truncate max-w-full">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                          <UserX className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <div className="text-left truncate">
                          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                            Attempted Account
                          </div>
                          <div className="font-mono text-xs text-white font-semibold truncate">
                            {rejectedEmail || userEmail}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-semibold text-rose-300 shrink-0">
                        Not on Allowlist
                      </span>
                    </div>
                  )}

                  {/* Specific Error or Maintenance Notice */}
                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                      <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{authError}</span>
                    </div>
                  )}

                  {effectiveLockNotice && (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 text-left space-y-1">
                      <div className="text-[10px] uppercase font-mono text-amber-400 tracking-wider flex items-center gap-1.5 font-semibold">
                        <AlertCircle size={12} />
                        <span>Maintenance Notice</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {effectiveLockNotice}
                      </p>
                    </div>
                  )}

                  {/* Safety & Assurance Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">100% Data & Notes Safe</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          All study notes, flashcards, question bank records, and academic progress are completely safe.
                        </div>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Instant Restoration</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Full access for students and educators will automatically restore once maintenance is complete.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 space-y-3">
                    {authSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAuthOptions((prev) => !prev)}
                        className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 active:scale-98 transition-all cursor-pointer"
                      >
                        <KeyRound size={14} className="text-slate-950" />
                        <span>
                          {showAuthOptions
                            ? "Hide Login Form"
                            : "Sign In with an Authorized Account"}
                        </span>
                        {showAuthOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={handleRecheckClearance}
                        disabled={rechecking}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          size={13}
                          className={rechecking ? "animate-spin text-amber-400" : "text-slate-300"}
                        />
                        <span>{rechecking ? "Checking..." : "Re-check Clearance"}</span>
                      </button>

                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <LogOut size={13} />
                          <span>Sign Out</span>
                        </button>
                      )}
                    </div>

                    {/* Expandable Authorized Login Area (Google & Password) */}
                    <AnimatePresence>
                      {showAuthOptions && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 border-t border-white/10 space-y-3 overflow-hidden text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-300">
                              Authorized Personnel Sign In
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Allowlist or Admin Credentials
                            </span>
                          </div>

                          {/* Google Sign In Button */}
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || authLoading}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-xs transition-all cursor-pointer shadow-md hover:border-amber-400/40 active:scale-98 disabled:opacity-50"
                          >
                            {googleLoading ? (
                              <>
                                <Loader2 size={14} className="animate-spin text-amber-400" />
                                <span>Redirecting to Google...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                  <path
                                    fill="#EA4335"
                                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                                  />
                                  <path
                                    fill="#4285F4"
                                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.5L1.9 16.2C3.7 19.9 7.5 22.5 12 22.5z"
                                  />
                                </svg>
                                <span>Sign in with Google (Allowlisted)</span>
                              </>
                            )}
                          </button>

                          {/* Expandable Staff Email/Password */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowStaffLogin((prev) => !prev)}
                              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
                            >
                              <Mail size={12} />
                              <span>Staff / Admin Email Login</span>
                              {showStaffLogin ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            <AnimatePresence>
                              {showStaffLogin && (
                                <motion.form
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  onSubmit={handleStaffPasswordLogin}
                                  className="mt-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 overflow-hidden"
                                >
                                  <div>
                                    <input
                                      type="email"
                                      value={emailInput}
                                      onChange={(e) => setEmailInput(e.target.value)}
                                      placeholder="admin@ibnexus.com"
                                      disabled={authLoading}
                                      className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="password"
                                      value={passwordInput}
                                      onChange={(e) => setPasswordInput(e.target.value)}
                                      placeholder="Password"
                                      disabled={authLoading}
                                      className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                                  >
                                    {authLoading ? (
                                      <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Verifying...</span>
                                      </>
                                    ) : (
                                      <>
                                        <LogIn size={12} />
                                        <span>Verify & Unlock</span>
                                      </>
                                    )}
                                  </button>
                                </motion.form>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer Controls within Card */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">IB Nexus Security Gateway</span>
                    <button
                      type="button"
                      onClick={replayAnimation}
                      className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer select-none active:scale-95 transition-transform"
                    >
                      <RefreshCw size={11} /> Replay Intro
                    </button>
                  </div>
                </div>
              ) : (
                /* ============================================================ */
                /* DEFAULT LOCKED CARD (For clean visitors before login attempt)*/
                /* ============================================================ */
                <div className="w-full p-5 sm:p-7 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-500" />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25">
                      <Lock size={12} />
                      <span>Workspace Temporarily Locked</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                      Scheduled Upgrade
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Welcome to IB Nexus
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {effectiveLockNotice}
                    </p>
                  </div>

                  {/* Status Items Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-xs text-slate-300">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Data & Progress Safe</span>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-xs text-slate-300">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Upgrades In Progress</span>
                    </div>
                  </div>

                  {/* SMALL LOGIN OPTION FOR THOSE WHO ARE ALLOWED TO ENTER */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          <KeyRound size={13} className="text-amber-400" />
                          <span>Authorized Access Only</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Staff / Whitelist Sign In
                        </span>
                      </div>

                      {/* Primary Small Login Option: Google Allowlist Button */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading || authLoading}
                        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-xs transition-all cursor-pointer shadow-md hover:border-amber-400/40 active:scale-98 disabled:opacity-50"
                      >
                        {googleLoading ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-amber-400" />
                            <span>Redirecting to Google...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#EA4335"
                                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                              />
                              <path
                                fill="#4285F4"
                                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.5L1.9 16.2C3.7 19.9 7.5 22.5 12 22.5z"
                              />
                            </svg>
                            <span>Sign in with Google (Allowlisted)</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Small Login Option: Expandable Email/Password */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowStaffLogin((prev) => !prev)}
                          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
                        >
                          <Mail size={12} />
                          <span>Staff / Admin Email Login</span>
                          {showStaffLogin ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        <AnimatePresence>
                          {showStaffLogin && (
                            <motion.form
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              onSubmit={handleStaffPasswordLogin}
                              className="mt-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 overflow-hidden"
                            >
                              <div>
                                <input
                                  type="email"
                                  value={emailInput}
                                  onChange={(e) => setEmailInput(e.target.value)}
                                  placeholder="admin@ibnexus.com"
                                  disabled={authLoading}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                />
                              </div>
                              <div>
                                <input
                                  type="password"
                                  value={passwordInput}
                                  onChange={(e) => setPasswordInput(e.target.value)}
                                  placeholder="Password"
                                  disabled={authLoading}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={authLoading}
                                className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                              >
                                {authLoading ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Verifying...</span>
                                  </>
                                ) : (
                                  <>
                                    <LogIn size={12} />
                                    <span>Verify & Unlock</span>
                                  </>
                                )}
                              </button>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls within Card */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">IB Academic Hub</span>
                    <button
                      type="button"
                      onClick={replayAnimation}
                      className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer select-none active:scale-95 transition-transform"
                    >
                      <RefreshCw size={11} /> Replay Intro
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-mono">
                © IB Nexus — Building the ultimate study platform for IB students.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
