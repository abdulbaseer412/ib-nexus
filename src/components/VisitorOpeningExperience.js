"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  LibraryBig,
  ArrowRight,
  CheckCircle2,
  FastForward,
  RotateCcw,
  Compass,
  GraduationCap,
  ShieldCheck,
  X
} from "lucide-react";

const VISITOR_PILLARS = [
  {
    id: "curriculum",
    icon: GraduationCap,
    title: "Dual Curriculum Architecture",
    badge: "MYP & DP Supported",
    desc: "Seamlessly navigate both Middle Years (MYP) and Diploma Programme (DP) subject groups with official syllabus structures.",
    color: "from-amber-500 to-amber-600",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  {
    id: "notes",
    icon: BookOpen,
    title: "Syllabus-Aligned Notes",
    badge: "Topic & Level Mapping",
    desc: "Draft structured lesson notes tied directly to Higher Level (HL) and Standard Level (SL) course requirements.",
    color: "from-indigo-500 to-indigo-600",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
  },
  {
    id: "flashcards",
    icon: BrainCircuit,
    title: "Spaced Repetition Mastery",
    badge: "SM-2 Cognitive Engine",
    desc: "Turn your notes into active recall flashcards with interval scheduling that prepares you for examination day.",
    color: "from-purple-500 to-purple-600",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
  },
  {
    id: "library",
    icon: LibraryBig,
    title: "Moderated Academic Library",
    badge: "Verified Community Resources",
    desc: "Access peer-reviewed past paper breakdowns, study guides, and subject materials verified by moderators.",
    color: "from-emerald-500 to-teal-600",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
];

export default function VisitorOpeningExperience({ isOpen = false, onClose = () => {} }) {
  const [stage, setStage] = useState(0); // 0: Closed Book, 1: Pages Unfold, 2: Pillar Showcase, 3: Scholar Invitation
  const [activePillar, setActivePillar] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const timersRef = useRef([]);

  const runSequence = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    setStage(0);
    const t1 = setTimeout(() => setStage(1), 600);   // Book opens
    const t2 = setTimeout(() => setStage(2), 2200);  // Pillars reveal
    const t3 = setTimeout(() => setStage(3), 4800);  // Invitation settles

    timersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    if (isOpen) {
      runSequence();
    }
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, [isOpen, replayKey]);

  // Auto-cycle through pillars during stage 2
  useEffect(() => {
    if (stage === 2) {
      const interval = setInterval(() => {
        setActivePillar((prev) => (prev + 1) % VISITOR_PILLARS.length);
      }, 1400);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current = [];
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSkip = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setStage(3);
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl overflow-y-auto overflow-x-hidden nexus-custom-slider scroll-smooth">
      {/* Ambient Radial Lights */}
      <div className="fixed top-1/4 left-1/4 w-[35vw] h-[35vw] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[35vw] h-[35vw] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Floating Control Bar */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
        {stage < 3 ? (
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-slate-200 font-mono transition-all backdrop-blur-md shadow-lg"
          >
            <span>Skip Tour</span>
            <FastForward size={13} />
          </button>
        ) : (
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-slate-200 font-mono transition-all backdrop-blur-md shadow-lg"
          >
            <RotateCcw size={13} />
            <span>Replay</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 flex items-center justify-center transition-all backdrop-blur-md shadow-lg"
          aria-label="Close intro"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-full w-full flex flex-col items-center justify-start pt-10 pb-16 sm:py-14 px-4 relative z-10">
        <div className="relative w-full max-w-2xl text-center flex flex-col items-center my-auto">
          <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* STAGE 0 & 1: 3D Academic Codex Opening Experience            */}
          {/* ============================================================ */}
          {stage < 2 && (
            <motion.div
              key={`visitor-book-${replayKey}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center py-6"
            >
              {/* 3D Perspective Codex */}
              <div
                className="relative w-48 h-64 mb-8 [perspective:1200px]"
                style={{ perspective: "1200px" }}
              >
                <motion.div
                  className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#1c1813] via-[#0f172a] to-[#1e1b4b] border border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center p-4 overflow-hidden"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{
                    rotateY: stage === 1 ? -28 : -6,
                    rotateX: stage === 1 ? 12 : 4,
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  {/* Subtle Gold Foil Accent Borders */}
                  <div className="absolute inset-2 border border-amber-400/25 rounded-xl pointer-events-none" />
                  <div className="absolute inset-3 border border-amber-400/10 rounded-lg pointer-events-none" />

                  {/* Emblem on Cover */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-400/50 flex items-center justify-center shadow-2xl relative">
                    <span className="text-2xl font-black text-amber-300 tracking-tighter">IB</span>
                    <div className="absolute -bottom-1 text-[9px] font-black uppercase tracking-widest text-indigo-300">NEXUS</div>
                  </div>

                  {/* Unfolding Syllabus Pages */}
                  {stage === 1 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 0.96, scaleX: 1 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-2 right-2 w-1/2 bg-gradient-to-r from-amber-50/95 via-white to-slate-100 rounded-r-lg shadow-2xl origin-left border-l border-amber-900/40 flex flex-col justify-around p-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span className="text-[8px] font-black uppercase text-amber-900">DP & MYP</span>
                      </div>
                      <div className="h-1 w-full bg-slate-300/80 rounded" />
                      <div className="h-1 w-5/6 bg-indigo-300/80 rounded" />
                      <div className="h-1 w-4/5 bg-slate-300/80 rounded" />
                      <div className="h-1 w-3/4 bg-amber-300/80 rounded" />
                    </motion.div>
                  )}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {stage === 0 ? "Welcome to IB Nexus" : "Opening Academic System..."}
                </span>
                <p className="text-xs text-slate-400 font-medium">
                  Designed exclusively for the International Baccalaureate
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 2: Four Core Pillars Spotlight                         */}
          {/* ============================================================ */}
          {stage === 2 && (
            <motion.div
              key={`pillars-stage-${replayKey}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.6 }}
              className="w-full space-y-6 py-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                  The Four Pillars of IB Nexus
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Built for Serious IB Scholars
                </h3>
              </div>

              {/* Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                {VISITOR_PILLARS.map((p, idx) => {
                  const Icon = p.icon;
                  const isActive = activePillar === idx;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setActivePillar(idx)}
                      className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? `${p.border} ${p.bg} shadow-lg shadow-black/30 scale-[1.02]`
                          : "border-white/10 bg-slate-900/50 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon size={16} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          {p.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{p.title}</h4>
                      <p className="text-xs text-slate-300/80 leading-relaxed">{p.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-1.5 pt-2">
                {VISITOR_PILLARS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activePillar === i ? "w-6 bg-amber-400" : "w-1.5 bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* STAGE 3: Final Visitor Invitation Card                       */}
          {/* ============================================================ */}
          {stage === 3 && (
            <motion.div
              key={`invite-stage-${replayKey}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-2xl shadow-2xl space-y-6 text-left relative overflow-hidden"
            >
              {/* Shimmering Top Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-teal-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                    IB
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">IB NEXUS</h3>
                    <p className="text-[11px] font-semibold text-slate-400">Created by Abdul Baseer</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Public Ready</span>
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Your academic companion for DP and MYP excellence.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join hundreds of students studying smarter with syllabus-mapped notes, spaced repetition flashcards, a central study planner, and a moderated resource library.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(99,102,241,0.35)] hover:scale-[1.02] transition-all text-center"
                >
                  <span>Get Started Free</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all text-center"
                >
                  Sign In
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Explore Features
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
