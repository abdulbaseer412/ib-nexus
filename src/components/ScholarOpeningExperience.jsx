"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  FastForward,
  RotateCcw,
  GraduationCap,
  X,
  Search,
  Compass,
  ArrowRight,
  Zap,
  Terminal,
  Layers
} from "lucide-react";

export default function ScholarOpeningExperience({
  profile = null,
  user = null,
  forceOpen = false,
  onClose = () => {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState(0); // 0: Biometric/Handshake, 1: Holographic Core, 2: Cockpit Telemetry, 3: Launchpad
  const [activeFeature, setActiveFeature] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const timersRef = useRef([]);

  // Scholar identity data
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Scholar";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const enrolledSubjects = profile?.academic_profile?.enrolled_subjects || profile?.subjects || [];
  const program = profile?.academic_profile?.program || "DP";

  // Check autoplay condition on mount
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const seen = localStorage.getItem("ibnexus_intro_scholar_seen");
      if (!seen) {
        // Autoplay for first-time direct dashboard entrance
        const t = setTimeout(() => {
          setIsOpen(true);
        }, 400);
        return () => clearTimeout(t);
      }
    } catch {
      // Fallback
    }
  }, [forceOpen]);

  // Global listener to trigger scholar tour on demand
  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
      setReplayKey((k) => k + 1);
    };
    window.addEventListener("nexus:open-scholar-intro", handleTrigger);
    return () => window.removeEventListener("nexus:open-scholar-intro", handleTrigger);
  }, []);

  // Sequence runner
  const runSequence = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    setStage(0);
    const t1 = setTimeout(() => setStage(1), 700);   // Security handshake completes
    const t2 = setTimeout(() => setStage(2), 2400);  // Cockpit Telemetry unfolds
    const t3 = setTimeout(() => setStage(3), 5200);  // Ready for Launchpad

    timersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    if (isOpen) {
      runSequence();
    }
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, [isOpen, replayKey]);

  // Auto-cycle through feature tools in stage 2
  useEffect(() => {
    if (stage === 2) {
      const interval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % 4);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setIsOpen(false);
    try {
      localStorage.setItem("ibnexus_intro_scholar_seen", "true");
    } catch {}
    onClose();
  };

  const handleSkip = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setStage(3);
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  if (!isOpen) return null;

  const SCHOLAR_FEATURES = [
    {
      id: "smart-notes",
      title: "Syllabus Smart Notes",
      badge: "KaTeX Math & HL/SL",
      desc: "Instant LaTeX formula rendering, command term cues, and structured notes directly mapped to official sub-topics.",
      icon: BookOpen,
      color: "from-blue-500 to-indigo-600",
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      id: "flashcards",
      title: "Spaced Recall Engine",
      badge: "SM-2 Cognitive Cycle",
      desc: "Supercharge your long-term memory for final exam definitions, formulas, and historical dates with active recall scheduling.",
      icon: BrainCircuit,
      color: "from-purple-500 to-pink-600",
      accent: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    },
    {
      id: "ai-companion",
      title: "Curriculum AI Tutor",
      badge: "2025/2026 Rubrics",
      desc: "Get syllabus breakdowns, marking scheme explanations, and command term breakdowns without hallucinated content.",
      icon: Sparkles,
      color: "from-amber-500 to-emerald-600",
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      id: "planner",
      title: "Central IA & Revision Planner",
      badge: "Milestones & Timelines",
      desc: "Track Internal Assessments, EE drafts, and mock exams across all 6 courses without academic burnout.",
      icon: CalendarDays,
      color: "from-emerald-500 to-teal-600",
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050811]/90 backdrop-blur-2xl">
      {/* Cyber-Academic Ambience Lighting */}
      <div className="absolute top-1/4 -left-1/4 w-[45vw] h-[45vw] bg-[var(--accent)]/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[45vw] h-[45vw] bg-indigo-600/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,8,17,0.7)_100%)] pointer-events-none" />

      {/* Floating HUD Controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
        {stage < 3 ? (
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white font-mono transition-all backdrop-blur-md"
          >
            <span>Skip Tour</span>
            <FastForward size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white font-mono transition-all backdrop-blur-md"
          >
            <RotateCcw size={13} />
            <span>Replay</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all backdrop-blur-md"
          aria-label="Enter Dashboard"
          title="Enter Dashboard (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative w-full max-w-2xl text-center flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* STAGE 0 & 1: SCHOLAR IDENTITY & BIOMETRIC INITIALIZATION     */}
          {/* ============================================================ */}
          {stage < 2 && (
            <motion.div
              key={`scholar-init-${replayKey}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center py-6 space-y-6"
            >
              {/* Holographic Glowing Core */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Outer spinning ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--accent)]/50"
                />
                {/* Secondary counter-spinning ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border border-[var(--accent)]/30 border-t-[var(--accent)]"
                />

                {/* Avatar / Scholar Emblem */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A101D] border-2 border-[var(--accent)] shadow-[0_0_40px_rgba(66,102,232,0.45)] flex items-center justify-center overflow-hidden relative">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-3xl font-black text-white bg-gradient-to-r from-[var(--accent)] to-sky-400 bg-clip-text text-transparent">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  <ShieldCheck size={13} />
                  <span>{stage === 0 ? "Decrypting Scholar Workspace..." : "Access Clearance Confirmed"}</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Welcome back, <span className="bg-gradient-to-r from-sky-400 via-[var(--accent)] to-indigo-300 bg-clip-text text-transparent">{displayName}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
                  IB {program} Candidate • Personal Study Hub Initialized
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: "10%" }}
                  animate={{ width: stage === 1 ? "100%" : "50%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400"
                />
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: SCHOLAR ARSENAL & COCKPIT TELEMETRY                 */}
          {/* ============================================================ */}
          {stage === 2 && (
            <motion.div
              key={`scholar-cockpit-${replayKey}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.5 }}
              className="w-full space-y-6 py-6"
            >
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--accent)] flex items-center justify-center gap-1.5">
                  <Zap size={13} />
                  <span>Your Academic Arsenal</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Engineered for Maximum IB Output
                </h3>
              </div>

              {/* 4 Feature Cockpit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                {SCHOLAR_FEATURES.map((feat, idx) => {
                  const Icon = feat.icon;
                  const isActive = activeFeature === idx;

                  return (
                    <div
                      key={feat.id}
                      onClick={() => setActiveFeature(idx)}
                      className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_30px_rgba(66,102,232,0.25)] scale-[1.02]"
                          : "border-white/10 bg-slate-900/60 hover:bg-slate-900/90"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon size={16} strokeWidth={2.5} />
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${feat.accent}`}>
                          {feat.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{feat.title}</h4>
                      <p className="text-xs text-slate-300/80 leading-relaxed">{feat.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Subject pill badges preview */}
              {enrolledSubjects.length > 0 && (
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-mono text-slate-400">Enrolled Courses:</span>
                  {enrolledSubjects.slice(0, 4).map((sub, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300"
                    >
                      {sub.name || sub}
                    </span>
                  ))}
                  {enrolledSubjects.length > 4 && (
                    <span className="text-[11px] text-[var(--accent)] font-semibold">
                      +{enrolledSubjects.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 3: SCHOLAR LAUNCHPAD & QUICK ACTIONS                   */}
          {/* ============================================================ */}
          {stage === 3 && (
            <motion.div
              key={`scholar-launch-${replayKey}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-[var(--accent)]/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(66,102,232,0.2)] space-y-6 text-left relative overflow-hidden"
            >
              {/* Shimmering Top Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-[var(--accent)] to-indigo-500 shadow-[0_0_20px_rgba(66,102,232,0.6)]" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                    IB
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">IB NEXUS COCKPIT</h3>
                    <p className="text-[11px] font-semibold text-slate-400">Authenticated Session Active</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                  <span>Ctrl</span>
                  <span>+</span>
                  <span>K</span>
                  <span className="text-slate-500 ml-1">Search</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Ready to excel, {displayName}.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your syllabus notes, active flashcards, AI learning companion, and IA planner are calibrated to your enrolled subjects. Dive straight into today&apos;s session.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-indigo-700 text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(66,102,232,0.35)] hover:scale-[1.02] transition-all text-center"
                >
                  <span>Enter Study Hub</span>
                  <ArrowRight size={16} />
                </button>

                <Link
                  href="/dashboard/flashcards"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all text-center"
                >
                  Review Flashcards
                </Link>

                <Link
                  href="/dashboard/notes"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all text-center"
                >
                  New Note
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
