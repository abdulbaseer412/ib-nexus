"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, Shield, RefreshCw } from "lucide-react";

// TEMPORARILY LOCKED - Opening Experience Entry Point
// 3D Book Opening Intro on initial visit -> Settle into Locked Card -> Replay Intro available

export default function NexusOpeningExperience() {
  const [animationStage, setAnimationStage] = useState(0); // 0: 3D Book closed -> 1: 3D Book opening -> 2: Logo reveal -> 3: Locked screen
  const [replayCount, setReplayCount] = useState(0);
  const timersRef = useRef([]);

  const startSequence = () => {
    // Clear any active timers to prevent state conflicts
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];

    // Stage 0: 3D Book Closed
    setAnimationStage(0);

    // Sequence timing
    const t1 = setTimeout(() => setAnimationStage(1), 500);   // Stage 1: 3D Book opens & pages unfold
    const t2 = setTimeout(() => setAnimationStage(2), 2400);  // Stage 2: Logo & branding reveal
    const t3 = setTimeout(() => setAnimationStage(3), 4800);  // Stage 3: Animation ends -> Show locked card with Replay button
    
    timersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    // Play 3D book opening animation first when user enters the website
    startSequence();

    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const replayAnimation = () => {
    setReplayCount((prev) => prev + 1);
    startSequence();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07070a] text-white overflow-hidden select-none font-sans">
      {/* Background Ambient Lighting Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-900/20 via-purple-900/15 to-amber-700/10 rounded-full blur-[140px] opacity-60 animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-cyan-900/15 rounded-full blur-[120px] opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          {/* STAGE 0 & 1: 3D Book Opening Animation (Plays First on Entry) */}
          {animationStage < 2 && (
            <motion.div
              key={`book-stage-${replayCount}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              {/* 3D Book Graphic */}
              <div className="relative w-44 h-56 mb-8 [perspective:1000px]" style={{ perspective: "1000px" }}>
                <motion.div
                  className="relative w-full h-full rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center p-4 overflow-hidden [transform-style:preserve-3d]"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{
                    rotateY: animationStage === 1 ? -25 : -6,
                    rotateX: animationStage === 1 ? 10 : 3,
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  {/* Book Cover Design */}
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
                animate={{ opacity: 0.8 }}
                className="text-xs uppercase tracking-[0.3em] text-amber-300 font-mono"
              >
                {animationStage === 0 ? "Opening IB Nexus Workspace..." : "Unfolding Knowledge Engine..."}
              </motion.p>
            </motion.div>
          )}

          {/* STAGE 2: Logo & Branding Reveal */}
          {animationStage === 2 && (
            <motion.div
              key={`logo-stage-${replayCount}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center space-y-6"
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

          {/* STAGE 3: Minimal Locked IB Nexus Screen (Appears after 3D animation ends) */}
          {animationStage === 3 && (
            <motion.div
              key={`locked-stage-${replayCount}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center space-y-8 w-full"
            >
              {/* Brand Emblem Header */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-indigo-500/30 to-cyan-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
                  <div className="relative w-20 h-20 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-2xl flex items-center justify-center p-3 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/ib-nexus-icon.png"
                      alt="IB Nexus"
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    IB NEXUS
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 tracking-wider uppercase">
                    Academic Workspace
                  </p>
                </div>
              </div>

              {/* Minimal Locked Presentation Card */}
              <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-500" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <Lock size={12} />
                    <span>Workspace Temporarily Locked</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">System Preservation Mode</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white">Welcome to IB Nexus</h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    The active application entry points have been temporarily disabled. All core features, database structures, user profiles, authentication, and academic resources remain 100% preserved and secure.
                  </p>
                </div>

                {/* Status Items Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-xs text-slate-300">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Code & Data Preserved</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-xs text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Modular Feature Locks</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>IB Nexus Architecture</span>
                  <button
                    type="button"
                    onClick={replayAnimation}
                    className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px] font-medium bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer select-none active:scale-95 transition-transform"
                  >
                    <RefreshCw size={12} /> Replay Intro
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-mono">
                © IB Nexus — All feature modules safely stored & ready for restoration.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
