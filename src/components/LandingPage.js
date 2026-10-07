"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check, ChevronRight,
  FileText, FolderOpen, GraduationCap, LineChart, ListChecks, Sparkles,
  Layers, MessageSquareText, LibraryBig, ShieldCheck, Clock3, Compass, Lightbulb,
  Search, Download, Filter, Target, BarChart2, Plus, Zap,
  Play, Eye, Award, CheckCircle2, RotateCw, Globe, HelpCircle,
  ExternalLink, ArrowUpRight, Scale, CheckCircle, XCircle
} from "lucide-react";
import VisitorOpeningExperience from "@/components/VisitorOpeningExperience";
import {
  CANONICAL_DP_SUBJECTS,
  CANONICAL_MYP_SUBJECTS,
  getSubjectSupportedLevels,
  isSLOnlySubject,
  getSubjectLevelNote
} from "@/lib/subject-levels";
import { getSubjectColorTheme } from "@/lib/subject-colors";
import { motion } from "motion/react";
import {
  InView,
  TextEffect,
  TextShimmer,
  AnimatedGroup,
  AnimatedBackground,
  BorderTrail,
  Tilt,
} from "@/components/motion-primitives";

/* ── Comprehensive Academic FAQ ────────────────────────────────────────────── */
const ACADEMIC_FAQ = [
  {
    q: "What is IB Nexus and how is it specifically tailored for the International Baccalaureate?",
    a: "IB Nexus is an integrated academic learning environment constructed exclusively around the International Baccalaureate continuum — supporting both the Diploma Programme (DP) and Middle Years Programme (MYP). Unlike generic note-taking or flashcard applications, every component in IB Nexus is indexed to official IB subject groups, syllabus topic codes, assessment objectives, and examination formats."
  },
  {
    q: "How does IB Nexus support both the Diploma Programme (DP) and Middle Years Programme (MYP)?",
    a: "The platform provides curriculum-aware navigation. For DP scholars, materials differentiate between Higher Level (HL — 240 recommended hours) and Standard Level (SL — 150 recommended hours), including core requirements (Theory of Knowledge, Extended Essay, CAS). For MYP scholars, subjects map to the 8 official MYP subject groups with support for Criteria A, B, C, and D assessment rubrics and the Personal Project."
  },
  {
    q: "How does the Spaced Repetition Flashcards engine work mathematically?",
    a: "Our active recall system implements a customized SuperMemo SM-2 cognitive algorithm. When reviewing a card, your self-assessed rating (Again, Hard, Good, Easy) recalculates the card's ease factor (EF) and repetition count, dynamically scheduling the next review date to intersect your optimal memory retention half-life before forgetting occurs."
  },
  {
    q: "How does the Educator-Moderated Community Library ensure academic integrity?",
    a: "To eliminate unverified notes, inaccurate mark schemes, and copyright violations, IB Nexus operates a two-tiered moderation system through the central Admin Request Hub. When a user uploads a resource or discussion, it remains in a pending state until vetted and approved by a moderator before becoming visible to the student body."
  },
  {
    q: "Can I manage deadlines for Internal Assessments (IAs), TOK, and Extended Essays?",
    a: "Yes. The Academic Revision Planner features pre-configured milestone workflows for Internal Assessments across Group 1 to 6 subjects, TOK Exhibitions and Essays, and the 4,000-word Extended Essay, prioritizing daily tasks using a Next-Best-Action (NBA) urgency scoring algorithm."
  },
  {
    q: "Is IB Nexus free for students and schools?",
    a: "Yes. IB Nexus was founded by Abdul Baseer as an independent open educational initiative to dismantle commercial paywalls and provide high-caliber, structured IB learning tools to every candidate globally."
  },
  {
    q: "Does IB Nexus reflect recent syllabus updates (e.g., Mathematics AA/AI, new Sciences)?",
    a: "Yes. The curriculum database supports the current syllabus specifications, including Mathematics: Analysis & Approaches (AA), Mathematics: Applications & Interpretation (AI), and recent updates across Biology, Chemistry, Physics, and Environmental Systems & Societies."
  },
  {
    q: "How is student data protected across devices?",
    a: "All personal notes, study schedules, and flashcard progress are stored with PostgreSQL Row Level Security (RLS) via Supabase, ensuring that your private academic notes and account credentials remain strictly private and accessible only by you across all synced devices."
  }
];

/* ── Comparison Matrix Data (Faithful, Plain-English, Balanced) ─────────────── */
const COMPARISON_ROWS = [
  {
    feature: "Full IB Syllabus & Topic Checklists",
    note: "See exactly what can be examined without searching through 200-page guides",
    nexus: { type: "full", label: "Built-in", text: "Official DP & MYP topics pre-loaded for all 6 subject groups" },
    notion: { type: "manual", label: "Manual Setup", text: "Flexible blank canvas, but you must build and paste syllabi yourself" },
    quizlet: { type: "partial", label: "Not Available", text: "Question cards only; no course syllabus structure" },
    drives: { type: "scattered", label: "Unorganized", text: "Folders of random PDFs with no interactive topic checklist" }
  },
  {
    feature: "Higher Level (HL) vs Standard Level (SL) Separation",
    note: "Never waste hours revising HL content if you are only taking SL",
    nexus: { type: "full", label: "Clear Tags", text: "HL-only content is clearly flagged across notes and decks" },
    notion: { type: "manual", label: "Manual Tagging", text: "Requires custom tags or separate pages you manage yourself" },
    quizlet: { type: "scattered", label: "Often Mixed", text: "Public decks often blend SL and HL questions together" },
    drives: { type: "scattered", label: "Unclear", text: "Files rarely specify whether they cover SL or HL depth" }
  },
  {
    feature: "Smart Memory Review (Spaced Repetition)",
    note: "Automatically schedules reviews right before you forget a concept",
    nexus: { type: "full", label: "Built-in", text: "Automatic review timing tied directly to your subject topics" },
    notion: { type: "none", label: "None", text: "Static notes; you have to remember when to review on your own" },
    quizlet: { type: "manual", label: "Paid Feature", text: "Basic flashcards are free; spaced review requires a subscription" },
    drives: { type: "none", label: "None", text: "Static documents with zero revision scheduling" }
  },
  {
    feature: "IA, Extended Essay & TOK Milestones",
    note: "Track proposal drafts, supervisor meetings, and final deadlines",
    nexus: { type: "full", label: "Built-in", text: "Pre-configured milestone calendars with official assessment criteria" },
    notion: { type: "manual", label: "Manual Setup", text: "Doable, but requires setting up custom databases and kanban boards" },
    quizlet: { type: "none", label: "None", text: "Flashcard app only; no coursework management" },
    drives: { type: "partial", label: "Storage Only", text: "Stores your drafts, but cannot track deadlines or rubrics" }
  },
  {
    feature: "Math Formulas & Science LaTeX Support",
    note: "Write equations, fractions, and chemical reactions cleanly",
    nexus: { type: "full", label: "Full LaTeX", text: "Smooth math formula editor plus built-in IB command term guide" },
    notion: { type: "manual", label: "Supported", text: "Good math equation blocks ($$), but no IB command term guide" },
    quizlet: { type: "partial", label: "Limited", text: "Basic text only; scientific symbols often distort or require paid plan" },
    drives: { type: "partial", label: "View Only", text: "Equations only work if pre-formatted inside uploaded PDFs" }
  },
  {
    feature: "Quality & Accuracy of Shared Resources",
    note: "Ensure you are learning accurate material aligned to current exams",
    nexus: { type: "full", label: "Vetted", text: "Every upload is reviewed to remove spam, errors, and outdated syllabi" },
    notion: { type: "partial", label: "Solo / Private", text: "You only see your own notes or templates you purchase" },
    quizlet: { type: "scattered", label: "Unverified", text: "Millions of public cards, but riddled with student typos and errors" },
    drives: { type: "scattered", label: "Unmaintained", text: "Dead links, duplicate files, and abandoned shared folders" }
  },
  {
    feature: "Cost & Commercial Paywalls",
    note: "Access to serious academic tools should not depend on your wallet",
    nexus: { type: "full", label: "100% Free", text: "All features, study engines, and tools open to every student" },
    notion: { type: "manual", label: "Freemium", text: "Generous free personal plan; charges extra for AI add-ons" },
    quizlet: { type: "scattered", label: "Ad-Heavy / Paid", text: "Free tier is flooded with ads; best study modes require subscription" },
    drives: { type: "manual", label: "Free Storage", text: "Free cloud storage, but no actual study tools" }
  }
];

export default function LandingPage() {
  const [showVisitorTour, setShowVisitorTour] = useState(false);

  // Autoplay intro for first-time visitors entering outside login
  useEffect(() => {
    try {
      const seen = localStorage.getItem("ibnexus_intro_visitor_seen");
      if (!seen) {
        const timer = setTimeout(() => {
          setShowVisitorTour(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, []);

  const handleCloseVisitorTour = () => {
    setShowVisitorTour(false);
    try {
      localStorage.setItem("ibnexus_intro_visitor_seen", "true");
    } catch {}
  };
  
  // Interactive Curriculum Explorer State
  const [explorerProgram, setExplorerProgram] = useState("dp");
  const [explorerSearch, setExplorerSearch] = useState("");
  const [selectedSubjectPreview, setSelectedSubjectPreview] = useState(null);

  // Interactive Flashcard Flip State
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardRating, setFlashcardRating] = useState(null);

  // Interactive Notes Topic Switcher State
  const [notesActiveTopic, setNotesActiveTopic] = useState("respiration");

  // Get subjects for explorer
  const availableExplorerSubjects = useMemo(() => {
    const list = explorerProgram === "dp" ? CANONICAL_DP_SUBJECTS : CANONICAL_MYP_SUBJECTS;
    if (!explorerSearch.trim()) return list;
    const q = explorerSearch.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q))
    );
  }, [explorerProgram, explorerSearch]);

  return (
    <main className="landing overflow-hidden bg-background text-primary selection:bg-[var(--accent)] selection:text-white">
      {/* ── VISITOR INTRO EXPERIENCE MODAL (Req 22) ─────────────────────────── */}
      <VisitorOpeningExperience
        isOpen={showVisitorTour}
        onClose={handleCloseVisitorTour}
      />

      {/* ── TOP INSTITUTIONAL ACADEMIC NOTICE BAR ───────────────────────────── */}
      <aside className="border-b border-[var(--border)] bg-[var(--surface-alt)]/90 backdrop-blur-md px-4 py-2 text-center text-xs font-semibold text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong className="text-[var(--foreground)]">IB Continuum Architecture:</strong> Diploma Programme (DP) &amp; Middle Years Programme (MYP) Fully Supported
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
            <a href="#curriculum-explorer" className="hover:text-[var(--accent)] transition-colors underline underline-offset-2">
              Browse Official Subjects ↓
            </a>
            <span>•</span>
            <button
              onClick={() => setShowVisitorTour(true)}
              className="text-[var(--accent)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Play size={11} className="fill-current" />
              <span>Launch 60s Tour</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── HERO SECTION: DEFINITIVE ACADEMIC AUTHORITY ─────────────────────── */}
      <section className="relative isolate px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-24 border-b border-[var(--border)]">
        {/* Ambient Subtle Background Grid */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(66,102,232,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(66,102,232,0.18),rgba(0,0,0,0))]" />
        
        <div className="mx-auto max-w-6xl text-center space-y-6">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)] shadow-sm">
            <GraduationCap size={15} className="text-[var(--accent)]" />
            <TextShimmer duration={2.5}>International Baccalaureate Academic Learning Platform</TextShimmer>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--foreground)] leading-[1.08]">
            <TextEffect
              preset="fade-in-blur"
              per="word"
              delay={0.1}
              as="span"
              className="inline"
            >
              The definitive workspace for
            </TextEffect>
            <br className="hidden sm:inline" />{" "}
            <span className="bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-[var(--info)] bg-clip-text text-transparent">
              IB Diploma &amp; Middle Years
            </span>{" "}
            scholars.
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-base sm:text-xl text-[var(--text-secondary)] font-normal leading-relaxed"
          >
            IB Nexus unifies syllabus-mapped notes, active recall flashcards powered by the SM-2 algorithm, assessment milestone scheduling, and educator-moderated past paper resources into one authoritative, distraction-free environment.
          </motion.p>

          {/* Action CTAs */}
          <AnimatedGroup
            preset="fade"
            className="pt-2 flex flex-wrap items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup"
                className="btn btn-brand inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-base font-extrabold shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_30%,transparent)] hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--accent)_40%,transparent)] transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight size={18} />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <button
                type="button"
                onClick={() => setShowVisitorTour(true)}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-7 py-4 text-base font-bold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-alt)] transition-all shadow-sm cursor-pointer"
              >
                <Play size={16} className="text-[var(--accent)] fill-current" />
                <span>Interactive Platform Tour</span>
              </button>
            </motion.div>

            <motion.div whileHover={{ x: 3 }}>
              <a
                href="#curriculum-explorer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-transparent px-6 py-4 text-base font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <span>Explore Curriculum Groups</span>
                <ChevronRight size={16} />
              </a>
            </motion.div>
          </AnimatedGroup>

          {/* 4 Pillar Badges */}
          <AnimatedGroup
            preset="blur-slide"
            className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left"
          >
            <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2.5 shadow-sm hover:border-[var(--accent)] transition-all">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--foreground)]">DP Groups 1–6 + Core</div>
                <div className="text-[10px] text-[var(--muted)]">HL &amp; SL Syllabus Mapping</div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2.5 shadow-sm hover:border-[var(--accent)] transition-all">
              <BrainCircuit size={18} className="text-[var(--ai)] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--foreground)]">SM-2 Spaced Recall</div>
                <div className="text-[10px] text-[var(--muted)]">Calculated Interval Engine</div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2.5 shadow-sm hover:border-[var(--accent)] transition-all">
              <CalendarDays size={18} className="text-[var(--warning)] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--foreground)]">Assessment Planner</div>
                <div className="text-[10px] text-[var(--muted)]">IA, EE &amp; Exam Milestones</div>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2.5 shadow-sm hover:border-[var(--accent)] transition-all">
              <LibraryBig size={18} className="text-[var(--info)] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--foreground)]">Vetted Library</div>
                <div className="text-[10px] text-[var(--muted)]">Educator-Moderated Hub</div>
              </div>
            </motion.div>
          </AnimatedGroup>
        </div>
      </section>

      {/* ── ACADEMIC STANDARDS & ARCHITECTURAL METRICS ──────────────────────── */}
      <section className="bg-[var(--surface)] py-12 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -40px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <AnimatedGroup preset="fade" className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <motion.div whileHover={{ y: -3 }} className="space-y-1 p-2 rounded-2xl hover:bg-[var(--surface-alt)]/60 transition-colors">
                <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">30+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">IB Courses Configured</div>
                <p className="text-xs text-[var(--text-secondary)] max-w-[200px] mx-auto">
                  Official DP &amp; MYP syllabus specifications across all 6 groups.
                </p>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="space-y-1 p-2 rounded-2xl hover:bg-[var(--surface-alt)]/60 transition-colors">
                <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">SM-2</div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--ai)]">Cognitive Algorithm</div>
                <p className="text-xs text-[var(--text-secondary)] max-w-[200px] mx-auto">
                  Mathematical review intervals calculated to halt memory decay.
                </p>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="space-y-1 p-2 rounded-2xl hover:bg-[var(--surface-alt)]/60 transition-colors">
                <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">100%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Moderated Repository</div>
                <p className="text-xs text-[var(--text-secondary)] max-w-[200px] mx-auto">
                  Every community document vetted by administrators prior to release.
                </p>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="space-y-1 p-2 rounded-2xl hover:bg-[var(--surface-alt)]/60 transition-colors">
                <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">Free</div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--warning)]">Universal Access</div>
                <p className="text-xs text-[var(--text-secondary)] max-w-[200px] mx-auto">
                  Zero commercial paywalls; dedicated to global IB equity.
                </p>
              </motion.div>
            </AnimatedGroup>
          </InView>
        </div>
      </section>

      {/* ── INTERACTIVE CURRICULUM EXPLORER (FUNCTIONAL REQ) ────────────────── */}
      <section id="curriculum-explorer" className="scroll-mt-24 py-20 bg-[var(--surface-alt)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-3">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
              Interactive Curriculum Explorer
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
              Explore the official IB Subject Directory.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Browse course level availability (Higher Level, Standard Level, or MYP), syllabus structures, and learning tools across the International Baccalaureate continuum.
            </p>
          </div>

          {/* Controls: Program Switcher & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            {/* DP vs MYP Segmented Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] shrink-0">
              <AnimatedBackground
                defaultValue={explorerProgram}
                onValueChange={(val) => val && setExplorerProgram(val)}
                className={`rounded-lg ${explorerProgram === "myp" ? "bg-emerald-600" : "bg-[var(--accent)]"} shadow-sm`}
                transition={{
                  type: "spring",
                  bounce: 0.15,
                  duration: 0.35,
                }}
              >
                <button
                  type="button"
                  data-id="dp"
                  onClick={() => setExplorerProgram("dp")}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors z-10 ${
                    explorerProgram === "dp"
                      ? "text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Diploma Programme (DP)
                </button>
                <button
                  type="button"
                  data-id="myp"
                  onClick={() => setExplorerProgram("myp")}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors z-10 ${
                    explorerProgram === "myp"
                      ? "text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Middle Years Programme (MYP)
                </button>
              </AnimatedBackground>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                placeholder={`Search ${explorerProgram.toUpperCase()} subjects (e.g. Mathematics, Biology, Spanish, History)...`}
                className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {explorerSearch && (
                <button
                  onClick={() => setExplorerSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <InView
            viewOptions={{ once: true, margin: "0px 0px -40px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <AnimatedGroup preset="scale" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {availableExplorerSubjects.map((subj) => {
                const theme = getSubjectColorTheme(subj.name);
                const colorVar = theme === "brand" ? "var(--accent)" : `var(--subject-${theme})`;
                const isSLOnly = isSLOnlySubject(subj.name, explorerProgram);
                const levelNote = getSubjectLevelNote(subj.name, explorerProgram);

                return (
                  <motion.div
                    key={subj.id || subj.name}
                    style={{ "--c": colorVar }}
                    whileHover={{ y: -4, scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setSelectedSubjectPreview(subj)}
                    className="group relative p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[color:var(--c)] hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: colorVar }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded border border-[var(--border)] truncate">
                          {subj.category || "Curriculum"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                        {subj.name}
                      </h4>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--border)]/60 flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${isSLOnly ? 'text-sky-500' : 'text-[var(--text-secondary)]'}`}>
                        {levelNote}
                      </span>
                      <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-0.5">
                        Explore <ArrowRight size={12} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatedGroup>
          </InView>

          {/* Quick Subject Modal / Preview Card when clicked */}
          {selectedSubjectPreview && (
            <div className="relative overflow-hidden p-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <BorderTrail
                size={80}
                className="bg-gradient-to-r from-[var(--accent)] via-indigo-500 to-sky-400"
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "linear",
                }}
              />
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                    Course Preview
                  </span>
                  <span className="text-[var(--border-strong)]">•</span>
                  <span className="text-xs text-[var(--muted)]">{selectedSubjectPreview.category}</span>
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  {selectedSubjectPreview.name}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                  Fully supported in IB Nexus with topic-level notes architecture, SM-2 flashcard decks, formula booklet access, and moderated past paper analyses.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/signup"
                  className="btn btn-brand px-5 py-2.5 text-xs font-extrabold rounded-xl"
                >
                  Enroll in Subject Workspace
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectPreview(null)}
                  className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── THE 4 CORE FUNCTIONAL STUDY ENGINES (RIGOROUSLY DEFINED) ────────── */}

      {/* ── ENGINE 1: SYLLABUS NOTES ARCHITECTURE ───────────────────────────── */}
      <section id="notes" className="scroll-mt-24 py-20 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -80px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/30">
                    Engine 1 • Syllabus Documentation
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                    The Syllabus-Mapped Notes Architecture.
                  </h2>
                </div>

                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  Most student notes are disconnected summaries with no clear link to final examination criteria. IB Nexus binds every note directly to official IB syllabus numbers, Higher Level (HL) vs Standard Level (SL) depth, and command term requirements.
                </p>

                <AnimatedGroup preset="fade" className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Topic &amp; Sub-Topic Hierarchy</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Organized by official curriculum codes (e.g. Topic 2.8 Cell Respiration or Calculus HL derivatives) so no learning objective is missed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Mathematical LaTeX &amp; Scientific Notation</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Render complex calculus integrals, stoichiometry equations, and physics formulas with crystal-clear typography.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">One-Click Active Recall Generation</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Instantly convert notes into flashcards without retyping questions or fragmenting your revision materials.
                      </p>
                    </div>
                  </div>
                </AnimatedGroup>

                <div className="pt-2">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                    <Link href="/signup" className="btn btn-brand px-6 py-3 text-sm font-extrabold rounded-xl inline-flex items-center gap-2">
                      <span>Open Notes Workspace</span>
                      <ArrowRight size={15} />
                    </Link>
                  </motion.div>
                </div>
              </div>

              {/* Live Interactive Notes Preview */}
              <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7 shadow-xl space-y-4">
                <BorderTrail
                  size={75}
                  className="bg-gradient-to-r from-blue-500 via-[var(--accent)] to-indigo-500"
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                />
                {/* Header with Topic Badges */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-[var(--foreground)]">Biology HL — Syllabus Unit 2</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/25">
                      HL Content
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)]">
                      Exam Weight: High
                    </span>
                  </div>
                </div>

                {/* Topic Selector Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] shrink-0 max-w-fit">
                  <AnimatedBackground
                    defaultValue={notesActiveTopic}
                    onValueChange={(val) => val && setNotesActiveTopic(val)}
                    className="rounded-lg bg-[var(--accent)] shadow-sm"
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.35,
                    }}
                  >
                    <button
                      type="button"
                      data-id="respiration"
                      onClick={() => setNotesActiveTopic("respiration")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors z-10 ${
                        notesActiveTopic === "respiration"
                          ? "text-white"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Topic 2.8: Cell Respiration
                    </button>
                    <button
                      type="button"
                      data-id="photosynthesis"
                      onClick={() => setNotesActiveTopic("photosynthesis")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors z-10 ${
                        notesActiveTopic === "photosynthesis"
                          ? "text-white"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Topic 2.9: Photosynthesis
                    </button>
                  </AnimatedBackground>
                </div>

              {/* Note Body */}
              {notesActiveTopic === "respiration" ? (
                <div className="space-y-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase text-[10px] text-[var(--accent)]">
                        Command Term: Explain (Level 3 Assessment Objective)
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted)]">Paper 2 Section B</span>
                    </div>
                    <p className="text-[var(--foreground)] font-semibold">
                      Explain the process of aerobic respiration in eukaryotic cells:
                    </p>
                    <p>
                      1. <strong>Glycolysis</strong> takes place in the cytoplasm, yielding 2 net ATP and 2 pyruvate molecules.<br />
                      2. <strong>Link Reaction</strong> transports pyruvate into the mitochondrial matrix, forming acetyl-CoA + CO₂.<br />
                      3. <strong>Krebs Cycle</strong> produces electron carriers (NADH, FADH₂) through cyclic decarboxylation.<br />
                      4. <strong>Oxidative Phosphorylation</strong> utilizes the electron transport chain (ETC) along the inner cristae, generating ~32-34 ATP via chemiosmosis.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] flex items-center justify-between">
                    <span>Net Reaction: C₆H₁₂O₆ + 6 O₂ ➔ 6 CO₂ + 6 H₂O + ~36 ATP</span>
                    <span className="text-[10px] text-emerald-500 font-sans font-bold">✓ Syllabus Verified</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] space-y-1.5">
                    <span className="font-black uppercase text-[10px] text-emerald-600">
                      Topic 2.9 Photolysis &amp; Action Spectrum
                    </span>
                    <p className="text-[var(--foreground)] font-semibold">
                      Light-dependent reactions occur within the thylakoid membranes:
                    </p>
                    <p>
                      Photons excite electrons in Photosystem II (P680). Photolysis of water releases O₂ as a byproduct while generating an electrochemical proton gradient driving ATP Synthase.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </InView>
      </div>
    </section>

      {/* ── ENGINE 2: SM-2 ACTIVE RECALL & SPACED REPETITION ────────────────── */}
      <section id="flashcards" className="scroll-mt-24 py-20 bg-[var(--surface-alt)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -80px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Interactive Flippable Card Simulator */}
              <div className="order-2 lg:order-1 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl text-center space-y-5">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="font-bold text-[var(--accent)]">Mathematics AA HL • Calculus Module</span>
                  <span>Card 18 of 54 (Active Queue)</span>
                </div>

                {/* 3D Flip Card */}
                <Tilt rotationFactor={6} isRevese className="w-full">
                  <div
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="p-8 sm:p-10 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-strong)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-inner min-h-[170px] flex flex-col items-center justify-center relative select-none"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">
                      {flashcardFlipped ? "Answer & Formula Specification" : "IB Exam Question (Click to Flip)"}
                    </div>

                    <div className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                      {flashcardFlipped ? (
                        <div className="space-y-1">
                          <div>f&apos;(x) = [u&apos;(x)·v(x) - u(x)·v&apos;(x)] / [v(x)]²</div>
                          <div className="text-xs font-normal text-[var(--muted)]">
                            Provided in Section 5.3 of the official IB Formula Booklet.
                          </div>
                        </div>
                      ) : (
                        "State the Quotient Rule formula for differentiating y = u(x) / v(x)."
                      )}
                    </div>

                    <div className="text-[10px] text-[var(--muted)] mt-4 inline-flex items-center gap-1 font-semibold">
                      <RotateCw size={11} /> {flashcardFlipped ? "Click to view front" : "Click to view answer"}
                    </div>
                  </div>
                </Tilt>

              {/* SM-2 Rating Buttons */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Rate your recall to trigger SuperMemo SM-2 interval recalculation:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFlashcardRating("again")}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      flashcardRating === "again"
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                        : "border-[var(--border)] text-rose-500 hover:bg-rose-500/10"
                    }`}
                  >
                    <div>Again</div>
                    <div className="text-[9px] opacity-75">&lt; 10m</div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFlashcardRating("hard")}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      flashcardRating === "hard"
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "border-[var(--border)] text-amber-500 hover:bg-amber-500/10"
                    }`}
                  >
                    <div>Hard</div>
                    <div className="text-[9px] opacity-75">1 day</div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFlashcardRating("good")}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      flashcardRating === "good"
                        ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                        : "border-[var(--border)] text-sky-500 hover:bg-sky-500/10"
                    }`}
                  >
                    <div>Good</div>
                    <div className="text-[9px] opacity-75">3 days</div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFlashcardRating("easy")}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      flashcardRating === "easy"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "border-[var(--border)] text-emerald-500 hover:bg-emerald-500/10"
                    }`}
                  >
                    <div>Easy</div>
                    <div className="text-[9px] opacity-75">6 days</div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Engine 2 Explanatory Content */}
            <div className="order-1 lg:order-2 space-y-6">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-[var(--ai)]/15 text-[var(--ai)] border border-[var(--ai)]/30">
                  Engine 2 • Cognitive Retention
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                  SuperMemo SM-2 Spaced Repetition Engine.
                </h2>
              </div>

              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                The 2-year IB continuum presents an immense volume of conceptual material. Cramming causes rapid memory decay before final examination sessions. IB Nexus applies the verified SM-2 spaced repetition formula to schedule reviews at exact forgetting thresholds.
              </p>

              <AnimatedGroup preset="fade" className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--ai)]/10 text-[var(--ai)] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--foreground)]">Dynamic Ease Factor (EF) Recalculation</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Adapts difficulty based on individual card performance so difficult formulas appear frequently and mastered concepts extend out to weeks.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--ai)]/10 text-[var(--ai)] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--foreground)]">Persistent True Retention Metrics</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Tracks real 30-day retention rates, review lapses, and historical streaks without hardcoding dummy statistics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--ai)]/10 text-[var(--ai)] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--foreground)]">Subject &amp; Deck Organization</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Decks correspond directly to enrolled courses (Group 1–6) and integrate with your personal academic profile.
                    </p>
                  </div>
                </div>
              </AnimatedGroup>

              <div className="pt-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                  <Link href="/signup" className="btn btn-brand px-6 py-3 text-sm font-extrabold rounded-xl inline-flex items-center gap-2">
                    <span>Start Active Recall Free</span>
                    <ArrowRight size={15} />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </InView>
      </div>
    </section>

      {/* ── ENGINE 3: ACADEMIC REVISION PLANNER ─────────────────────────────── */}
      <section id="planner" className="scroll-mt-24 py-20 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -80px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                    Engine 3 • Assessment Milestones
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                    Academic Revision Planner &amp; NBA Prioritizer.
                  </h2>
                </div>

                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  Generic calendars fail in the IB because they cannot balance Internal Assessments (IAs), TOK Exhibition dates, and 6 simultaneous subject revision tracks. The IB Nexus Planner computes a real-time Next-Best-Action (NBA) score based on exam proximity and topic readiness.
                </p>

                <AnimatedGroup preset="fade" className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Next-Best-Action (NBA) Urgency Scoring</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Algorithmically ranks tasks so you always know precisely which course, IA draft, or past paper requires immediate focus.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Official Examination Countdown</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Synchronized to your cohort session (May 2027, Nov 2026, May 2028) with live days-remaining tracking on your dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Daily Study Rhythm Analytics</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Monitors real study hours, completed sessions, and card reviews through the 7-day activity graph.
                      </p>
                    </div>
                  </div>
                </AnimatedGroup>

                <div className="pt-2">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                    <Link href="/signup" className="btn btn-brand px-6 py-3 text-sm font-extrabold rounded-xl inline-flex items-center gap-2">
                      <span>Open Assessment Planner</span>
                      <ArrowRight size={15} />
                    </Link>
                  </motion.div>
                </div>
              </div>

              {/* Planner UI Preview */}
              <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl space-y-4">
                <BorderTrail
                  size={80}
                  className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600"
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                />
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div>
                    <span className="text-xs font-bold text-[var(--foreground)]">Academic Revision Schedule</span>
                    <p className="text-[10px] text-[var(--muted)]">Calculated for May 2027 Examination Cohort</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[var(--warning)] bg-[var(--warning)]/15 border border-[var(--warning)]/30">
                    786 Days Remaining
                  </span>
                </div>

                <AnimatedGroup preset="blur-slide" className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-rose-500/30 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">Physics HL: Internal Assessment (IA) Final Draft</div>
                        <div className="text-[11px] text-[var(--muted)]">NBA Priority Score: 94 • Due Thursday 17:00</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/25 shrink-0">
                      High Priority
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">Mathematics AA HL: Past Paper 1 Practice Session</div>
                        <div className="text-[11px] text-[var(--muted)]">NBA Priority Score: 78 • Scheduled for 90 mins</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 shrink-0">
                      Exam Prep
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">Economics HL: 24 Spaced Repetition Due Cards</div>
                        <div className="text-[11px] text-[var(--muted)]">NBA Priority Score: 65 • Estimated 15 mins</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shrink-0">
                      Active Recall
                    </span>
                  </div>
                </AnimatedGroup>
              </div>
            </div>
          </InView>
        </div>
      </section>

      {/* ── ENGINE 4: EDUCATOR-MODERATED RESOURCE LIBRARY ───────────────────── */}
      <section id="resources" className="scroll-mt-24 py-20 bg-[var(--surface-alt)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -80px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Library Mockup */}
              <div className="relative overflow-hidden order-2 lg:order-1 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl space-y-4">
                <BorderTrail
                  size={75}
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
                  transition={{
                    repeat: Infinity,
                    duration: 8,
                    ease: "linear",
                  }}
                />
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div>
                    <span className="text-xs font-bold text-[var(--foreground)]">Verified Academic Library</span>
                    <p className="text-[10px] text-[var(--muted)]">Moderated by Central Admin Request Hub</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-1">
                    <CheckCircle2 size={11} /> 100% Vetted
                  </span>
                </div>

                <AnimatedGroup preset="blur-slide" className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">Chemistry HL: Option B Biochemistry Syllabus Guide</div>
                        <div className="text-[10px] text-[var(--muted)]">42 Pages • Level: DP Only • Verified Markschemes</div>
                      </div>
                    </div>
                    <Download size={15} className="text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer" />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        DOC
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">History: Authoritarian States Paper 2 Structure Matrix</div>
                        <div className="text-[10px] text-[var(--muted)]">Exemplar Essay • Level: Both MYP + DP • Approved</div>
                      </div>
                    </div>
                    <Download size={15} className="text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer" />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--foreground)]">Mathematics: Comprehensive Formula Annotation Guide</div>
                        <div className="text-[10px] text-[var(--muted)]">Section 1 to 5 • Level: DP Only • Reviewed</div>
                      </div>
                    </div>
                    <Download size={15} className="text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer" />
                  </div>
                </AnimatedGroup>
              </div>

              {/* Engine 4 Explanatory Content */}
              <div className="order-1 lg:order-2 space-y-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.18em] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                    Engine 4 • Quality Assurance
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                    Educator-Moderated Resource Library.
                  </h2>
                </div>

                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  Online study groups and student forums are often overrun by unverified notes, outdated syllabi, and low-quality summaries. IB Nexus enforces a central administrative approval workflow for all community contributions.
                </p>

                <AnimatedGroup preset="fade" className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Two-Tiered Review Protocol</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        User submissions generate an administrative request requiring verification before becoming publicly visible in the Community Library.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Course-Level DP vs MYP Visibility</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Uploads specify curriculum target (DP Only, MYP Only, or Both) to ensure students only see resources pertinent to their syllabus.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">Direct Subject-Context Uploads</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        No redundant destination picker questionnaires. Uploading while inside Chemistry HL automatically associates the document with Chemistry HL.
                      </p>
                    </div>
                  </div>
                </AnimatedGroup>

                <div className="pt-2">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                    <Link href="/signup" className="btn btn-brand px-6 py-3 text-sm font-extrabold rounded-xl inline-flex items-center gap-2">
                      <span>Browse Resource Library</span>
                      <ArrowRight size={15} />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </InView>
        </div>
      </section>

      {/* ── ACADEMIC COMPARISON MATRIX ("WHY IB NEXUS") ─────────────────────── */}
      <section className="py-20 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <InView
            viewOptions={{ once: true, margin: "0px 0px -60px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                Honest Academic Comparison
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                How IB Nexus Compares to Your Current Study Setup.
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Most IB students juggle three or four separate tools. Here is an honest, straightforward look at what each option actually offers without the marketing fluff.
              </p>
            </div>
          </InView>

          <InView
            viewOptions={{ once: true, margin: "0px 0px -40px 0px" }}
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)]">
                    <th className="py-4 px-6 font-extrabold text-[var(--foreground)] w-[28%]">
                      Study Need &amp; Feature
                    </th>
                    <th className="py-4 px-5 font-black text-[var(--accent)] bg-[var(--accent)]/10 text-center w-[22%] border-x border-[var(--border)]">
                      <div className="flex flex-col items-center">
                        <span className="text-sm sm:text-base">IB Nexus</span>
                        <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider">Unified Platform</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 font-bold text-[var(--foreground)] text-center w-[17%]">
                      <div className="flex flex-col items-center">
                        <span>Notion / Google Docs</span>
                        <span className="text-[10px] font-normal text-[var(--muted)]">Custom Notes</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 font-bold text-[var(--foreground)] text-center w-[17%]">
                      <div className="flex flex-col items-center">
                        <span>Quizlet / Apps</span>
                        <span className="text-[10px] font-normal text-[var(--muted)]">Flashcard Tools</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 font-bold text-[var(--foreground)] text-center w-[16%]">
                      <div className="flex flex-col items-center">
                        <span>Shared Drives</span>
                        <span className="text-[10px] font-normal text-[var(--muted)]">File Folders</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--surface-alt)]/40 transition-colors">
                      {/* Capability column */}
                      <td className="py-5 px-6 font-semibold text-[var(--foreground)] align-top">
                        <div className="font-bold text-sm text-[var(--foreground)] leading-snug">{row.feature}</div>
                        <div className="text-xs font-normal text-[var(--muted)] mt-1 leading-relaxed">{row.note}</div>
                      </td>

                      {/* IB Nexus (Featured) */}
                      <td className="py-5 px-5 align-top bg-[var(--accent)]/[0.03] border-x border-[var(--border)]">
                        <div className="flex flex-col items-center text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-xs">
                            <Check size={13} strokeWidth={3} className="shrink-0" />
                            <span>{row.nexus.label}</span>
                          </span>
                          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed max-w-[210px] font-medium">
                            {row.nexus.text}
                          </p>
                        </div>
                      </td>

                      {/* Notion / Docs */}
                      <td className="py-5 px-4 align-top">
                        <div className="flex flex-col items-center text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            row.notion.type === "full" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                            row.notion.type === "manual" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                            row.notion.type === "partial" ? "bg-sky-500/15 text-sky-500 border-sky-500/30" :
                            "bg-slate-500/15 text-slate-400 border-slate-500/20"
                          }`}>
                            {row.notion.label}
                          </span>
                          <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed max-w-[170px]">
                            {row.notion.text}
                          </p>
                        </div>
                      </td>

                      {/* Quizlet / Flashcard apps */}
                      <td className="py-5 px-4 align-top">
                        <div className="flex flex-col items-center text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            row.quizlet.type === "full" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                            row.quizlet.type === "manual" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                            row.quizlet.type === "partial" ? "bg-sky-500/15 text-sky-500 border-sky-500/30" :
                            "bg-slate-500/15 text-slate-400 border-slate-500/20"
                          }`}>
                            {row.quizlet.label}
                          </span>
                          <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed max-w-[170px]">
                            {row.quizlet.text}
                          </p>
                        </div>
                      </td>

                      {/* Google Drives */}
                      <td className="py-5 px-4 align-top">
                        <div className="flex flex-col items-center text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            row.drives.type === "full" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                            row.drives.type === "manual" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                            row.drives.type === "partial" ? "bg-sky-500/15 text-sky-500 border-sky-500/30" :
                            "bg-slate-500/15 text-slate-400 border-slate-500/20"
                          }`}>
                            {row.drives.label}
                          </span>
                          <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed max-w-[170px]">
                            {row.drives.text}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InView>
        </div>
      </section>

      {/* ── ACADEMIC PHILOSOPHY & CREATOR STATEMENT (Req 7) ─────────────────── */}
      <section className="py-20 bg-[var(--surface-alt)] border-b border-[var(--border)]">
        <InView
          viewOptions={{ once: true, margin: "0px 0px -60px 0px" }}
          variants={{
            hidden: { opacity: 0, y: 25 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
              <Award size={14} />
              <span>Academic Philosophy &amp; Governance</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
              Created by Abdul Baseer for the Global IB Community.
            </h2>

            <div className="relative overflow-hidden text-left p-8 sm:p-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              <BorderTrail
                size={85}
                className="bg-gradient-to-r from-indigo-500 via-[var(--accent)] to-sky-400"
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              />
              <p>
                &ldquo;The International Baccalaureate continuum is one of the most rigorous secondary educational programs in the world. Yet, for years, students have been forced to juggle disparate applications — pasting syllabus notes into unformatted documents, manually computing flashcard repetitions, and searching through messy, unmoderated drives.&rdquo;
              </p>
              <p>
                &ldquo;IB Nexus was architected from the ground up to solve this fragmentation. By anchoring every note, flashcard, planner item, and community resource directly to the official IB curriculum architecture, we provide scholars with a single, calm, production-grade learning environment. Our commitment is simple: rigorous tools, zero commercial paywalls, and uncompromising academic integrity for every student.&rdquo;
              </p>
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-[var(--foreground)] text-sm sm:text-base">Abdul Baseer</div>
                  <div className="text-xs text-[var(--muted)]">Founder &amp; Chief Architect, IB Nexus</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--accent)]">
                  Established 2026
                </div>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* ── COMPREHENSIVE ACADEMIC FAQ ───────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-[var(--surface)] border-b border-[var(--border)]">
        <InView
          viewOptions={{ once: true, margin: "0px 0px -60px 0px" }}
          variants={{
            hidden: { opacity: 0, y: 25 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                Curriculum &amp; Platform Inquiries
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                Frequently Asked Academic Questions.
              </h2>
            </div>

            <AnimatedGroup preset="fade" className="space-y-4">
              {ACADEMIC_FAQ.map((item, idx) => (
                <details
                  key={idx}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition-all duration-200 open:border-[var(--accent)]/50 open:bg-[var(--surface)] open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-bold text-sm sm:text-base text-[var(--foreground)] flex items-center justify-between gap-4 select-none">
                    <span>{item.q}</span>
                    <span className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center shrink-0 transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] border-t border-[var(--border)]/70 pt-3">
                    {item.a}
                  </p>
                </details>
              ))}
            </AnimatedGroup>
          </div>
        </InView>
      </section>

      {/* ── BOTTOM INSTITUTIONAL CALL TO ACTION ──────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-[var(--surface-alt)] to-[var(--surface)] border-b border-[var(--border)]">
        <InView
          viewOptions={{ once: true, margin: "0px 0px -50px 0px" }}
          variants={{
            hidden: { opacity: 0, scale: 0.98 },
            visible: { opacity: 1, scale: 1 },
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 sm:p-14 max-w-5xl mx-auto shadow-2xl text-center space-y-6">
            <BorderTrail
              size={100}
              className="bg-gradient-to-r from-[var(--accent)] via-indigo-500 to-sky-400"
              transition={{ repeat: Infinity, duration: 7, ease: "linear" }}
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)]">
              <Sparkles size={14} />
              <span>Ready for the Examination Session</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-[var(--foreground)] tracking-tight">
              Build your personal IB study system today.
            </h2>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
              Join thousands of scholars navigating DP and MYP course requirements with clarity, confidence, and cognitive retention.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className="btn btn-brand inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-extrabold text-base shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_30%,transparent)] transition-all"
                >
                  <span>Create Your Student Workspace</span>
                  <ArrowRight size={18} />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <button
                  type="button"
                  onClick={() => setShowVisitorTour(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-4 font-bold text-[var(--foreground)] text-base shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
                >
                  <Play size={16} className="text-[var(--accent)] fill-current" />
                  <span>Launch 60s Tour</span>
                </button>
              </motion.div>
            </div>
          </div>
        </InView>
      </section>

      {/* ── ACADEMIC INSTITUTIONAL FOOTER ────────────────────────────────────── */}
      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)] px-4 pt-14 pb-10 sm:px-6 text-sm text-[var(--text-secondary)]">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 items-start">
          {/* Brand & Creator Attribution */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5 text-[var(--foreground)] font-black text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 text-xs font-black text-white shadow-md">
                IB
              </span>
              <span className="tracking-tight">IB NEXUS</span>
            </div>
            <p className="max-w-sm leading-relaxed text-xs sm:text-sm text-[var(--muted)]">
              A calm, unified study platform built for International Baccalaureate (DP &amp; MYP) scholars worldwide.
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Created with care by <strong className="font-bold text-[var(--accent)]">Abdul Baseer</strong></span>
            </div>
          </div>

          {/* Core Navigation - Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground)]">Platform</h4>
            <div className="flex flex-col gap-2 text-xs font-medium">
              <a href="#curriculum-explorer" className="hover:text-[var(--accent)] transition-colors">Curriculum Explorer</a>
              <a href="#notes" className="hover:text-[var(--accent)] transition-colors">Syllabus Notes</a>
              <a href="#flashcards" className="hover:text-[var(--accent)] transition-colors">Memory Flashcards</a>
              <a href="#planner" className="hover:text-[var(--accent)] transition-colors">Study Planner</a>
              <a href="#resources" className="hover:text-[var(--accent)] transition-colors">Resource Library</a>
            </div>
          </div>

          {/* Company & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground)]">About &amp; Support</h4>
            <div className="flex flex-col gap-2 text-xs font-medium">
              <Link href="/about" className="hover:text-[var(--accent)] transition-colors">About IB Nexus</Link>
              <Link href="/contact" className="hover:text-[var(--accent)] transition-colors">Contact Support</Link>
              <Link href="/help" className="hover:text-[var(--accent)] transition-colors">Help Centre</Link>
              <Link href="/dashboard" className="hover:text-[var(--accent)] transition-colors">Student Dashboard</Link>
            </div>
          </div>

          {/* Essential Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground)]">Legal &amp; Trust</h4>
            <div className="flex flex-col gap-2 text-xs font-medium">
              <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[var(--accent)] transition-colors">Terms of Service</Link>
              <Link href="/accessibility" className="hover:text-[var(--accent)] transition-colors">Accessibility Standards</Link>
            </div>
          </div>
        </div>

        {/* Clean, Streamlined Bottom Bar */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>&copy; {new Date().getFullYear()} IB Nexus. All rights reserved. Open Academic Platform.</span>
          <span className="text-[11px] max-w-md sm:text-right">
            Independent student platform. Not affiliated with or endorsed by the International Baccalaureate Organization (IBO).
          </span>
        </div>
      </div>
    </footer>
  );
}
