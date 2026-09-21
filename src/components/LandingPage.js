"use client";

import Link from "next/link";
import {
  ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check, ChevronRight,
  FileText, FolderOpen, GraduationCap, LineChart, ListChecks, Sparkles,
  Layers3, MessageSquareText, LibraryBig, ShieldCheck, Clock3, Compass, Lightbulb,
  Accessibility, RefreshCw, Search, Download, Filter, Target, BarChart2, Plus, Zap
} from "lucide-react";

const faq = [
  ["Who is IB Nexus built for?", "IB Nexus is for students navigating the Middle Years Programme and Diploma Programme who want a clearer way to organise material, plan revision, and build steady learning habits."],
  ["Does it support both MYP and DP?", "Yes. The platform is structured around the IB learning journey, from MYP subject areas through DP subject groups, core components, assessments, and revision needs."],
  ["Can I organise my own study materials?", "Yes. IB Nexus gives your own notes, class handouts, links, and revision material a consistent home without forcing a single rigid methodology."],
  ["How does the AI Tutor work?", "The AI Tutor supports deep understanding through guided explanations, practice prompts, revision ideas, and step-by-step breakdowns designed specifically for IB subjects."],
  ["Can I access my resources across devices?", "Your workspace is cloud-synced and available wherever you study, whether on desktop, tablet, or mobile."],
  ["Is my data secure?", "We use enterprise-grade Supabase authentication and strict data privacy standards to keep your notes and revision data safe."]
];

function SectionHeader({ badge, title, copy, className = "" }) {
  return (
    <div className={`max-w-3xl ${className}`}>
      {badge && (
        <span className="inline-flex items-center rounded-full bg-accent-soft px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-bright border border-accent-soft">
          {badge}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-primary sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {copy && (
        <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg sm:leading-8">
          {copy}
        </p>
      )}
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-subtle to-transparent" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing overflow-hidden bg-background text-primary">
      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative isolate px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent-soft blur-[150px]" />
        <div className="mx-auto max-w-7xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-bright border border-accent-soft">
            <Sparkles size={14} /> The Ultimate IB Study System
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            A calmer way<br />to master the IB.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-secondary sm:text-xl">
            IB Nexus brings your notes, flashcards, AI tutor, study planner, past papers, and progress tracking into one production-ready workspace.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn btn-brand inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-semibold shadow-lifted transition hover:scale-[1.02]"
            >
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a
              href="#notes"
              className="rounded-xl border border-subtle bg-card px-7 py-4 text-base font-semibold text-secondary hover:border-accent-soft hover:text-primary transition"
            >
              Explore Workspace
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-secondary">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent-bright" /> Built for MYP & DP</span>
            <span className="flex items-center gap-2"><Clock3 size={16} className="text-accent-bright" /> Instant Auth & Sync</span>
            <span className="flex items-center gap-2"><Zap size={16} className="text-accent-bright" /> AI Powered</span>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 1: NOTES WORKSPACE ─────────────────────────────────────────── */}
      <section id="notes" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeader
                badge="NOTES WORKSPACE"
                title="Organise every idea in one place."
                copy="Capture lessons, summaries, diagrams, and revision notes across every IB subject. Connect your class notes directly to syllabus points and past papers."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Structured by IB Subject Groups (Sciences, Maths, Humanities, Arts)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Rich formatting with code blocks, math LaTeX, and diagram embeds</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>One-click conversion into active recall flashcards</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Try Notes Workspace <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="card rounded-2xl border border-subtle bg-card p-6 shadow-lifted">
              <div className="flex items-center justify-between border-b border-divider pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-accent-bright" size={20} />
                  <span className="font-semibold text-primary text-sm">Biology HL — Cell Respiration</span>
                </div>
                <span className="text-xs rounded-md bg-accent-soft px-2.5 py-1 text-accent-bright font-medium">Topic 2.8</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-surface-alt p-3.5 border border-subtle">
                  <p className="font-semibold text-primary text-xs uppercase tracking-wider">Key Concept: Glycolysis</p>
                  <p className="mt-1 text-secondary leading-relaxed">
                    Occurs in the cytoplasm. Glucose (6C) is phosphorylated using 2 ATP, then split into two triose phosphate (3C) molecules...
                  </p>
                </div>
                <div className="rounded-xl bg-surface-alt p-3.5 border border-subtle">
                  <p className="font-semibold text-primary text-xs uppercase tracking-wider">Link Reaction & Krebs Cycle</p>
                  <p className="mt-1 text-secondary leading-relaxed">
                    Pyruvate is actively transported into the mitochondrial matrix. Decarboxylation releases CO₂ and produces acetyl-CoA...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 2: FLASHCARDS ─────────────────────────────────────────────── */}
      <section id="flashcards" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Visual Mockup first for layout variety */}
            <div className="order-2 lg:order-1 card rounded-2xl border border-subtle bg-card p-7 shadow-lifted text-center">
              <div className="flex justify-between items-center text-xs text-muted mb-4">
                <span>Card 14 of 48</span>
                <span className="text-accent-bright font-semibold">Active Recall Mode</span>
              </div>
              <div className="my-8 py-8 px-6 rounded-2xl bg-surface-alt border border-accent-soft">
                <p className="text-xs uppercase tracking-widest text-accent-bright font-semibold mb-2">Question</p>
                <p className="text-lg font-bold text-primary">What is the net yield of ATP produced during aerobic respiration per glucose molecule?</p>
              </div>
              <div className="flex justify-center gap-3">
                <button className="px-4 py-2 rounded-xl border border-subtle text-xs font-semibold hover:bg-danger-soft hover:text-danger transition">Hard (1d)</button>
                <button className="px-4 py-2 rounded-xl border border-subtle text-xs font-semibold hover:bg-warning-soft hover:text-warning transition">Good (3d)</button>
                <button className="px-4 py-2 rounded-xl bg-accent-soft text-accent-bright text-xs font-semibold hover:opacity-90 transition">Easy (7d)</button>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <SectionHeader
                badge="FLASHCARDS"
                title="Remember concepts faster."
                copy="Create active recall cards connected to your notes and syllabus. Spaced repetition algorithm ensures you review material right when memory begins to fade."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Auto-generate flashcards from your notes using AI</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Spaced repetition engine tailored for exam preparation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Track mastery metrics per subject and topic</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Build Flashcards <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 3: AI TUTOR ────────────────────────────────────────────────── */}
      <section id="ai-tutor" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeader
                badge="AI TUTOR"
                title="Understand difficult concepts instantly."
                copy="Receive explanations designed specifically for IB students. Ask questions, clarify markscheme criteria, or request practice problem walk-throughs 24/7."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Trained on IB command terms (Evaluate, Discuss, Explain, Contrast)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Step-by-step guidance for TOK, EE, and Internal Assessments</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Instant practice quiz generation per topic</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Ask AI Tutor <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="card rounded-2xl border border-subtle bg-card p-6 shadow-lifted">
              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-surface-alt p-4 border border-subtle">
                  <p className="text-xs font-semibold text-muted">You</p>
                  <p className="mt-1 text-primary font-medium">Explain the Keynesian multiplier effect for IB Economics HL.</p>
                </div>
                <div className="rounded-xl bg-accent-soft p-4 border border-accent-soft text-secondary">
                  <p className="text-xs font-semibold text-accent-bright">IB Nexus AI Tutor</p>
                  <p className="mt-2 leading-relaxed">
                    The Keynesian multiplier shows how an initial injection of aggregate demand leads to a greater final increase in national income:
                  </p>
                  <div className="mt-3 p-2.5 rounded-lg bg-background text-primary font-mono text-xs border border-subtle">
                    Multiplier (k) = 1 / (1 - MPC) = 1 / MPW
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-card text-xs text-primary font-medium border border-subtle">Generate Quiz</span>
                    <span className="px-2.5 py-1 rounded-md bg-card text-xs text-primary font-medium border border-subtle">Create Flashcard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 4: STUDY PLANNER ───────────────────────────────────────────── */}
      <section id="planner" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Visual Mockup */}
            <div className="order-2 lg:order-1 card rounded-2xl border border-subtle bg-card p-6 shadow-lifted">
              <div className="flex items-center justify-between border-b border-divider pb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-accent-bright" size={20} />
                  <span className="font-semibold text-primary text-sm">Revision Schedule</span>
                </div>
                <span className="text-xs text-muted">May 2026 Exams</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-subtle">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                    <div>
                      <p className="font-semibold text-primary text-xs">Physics HL — Paper 2 Practice</p>
                      <p className="text-xs text-muted">Today · 16:00 - 17:30</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-danger-soft text-danger text-xs font-medium">High Priority</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-subtle">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                    <div>
                      <p className="font-semibold text-primary text-xs">TOK Essay — Final Draft Review</p>
                      <p className="text-xs text-muted">Tomorrow · 10:00 - 11:30</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-warning-soft text-warning text-xs font-medium">Medium</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <SectionHeader
                badge="STUDY PLANNER"
                title="Plan revision with clarity."
                copy="Keep deadlines, study sessions, and your next best task in view. Never let an Internal Assessment or exam prep session sneak up on you."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Pre-configured IB assessment calendar and deadline tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Smart session blocks matched to your personal revision goals</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Integrates seamlessly with notes and flashcards</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Open Planner <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 5: PAST PAPERS & RESOURCES ─────────────────────────────────── */}
      <section id="resources" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeader
                badge="PAST PAPERS & RESOURCES"
                title="Practice with confidence."
                copy="Keep papers, markschemes, formula sheets, and study guides organized by subject. Search across years and exam zones effortlessly."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Comprehensive repository across DP1, DP2, and MYP subjects</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Paired markschemes for instant self-correction</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Downloadable formula booklets and data packages</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Explore Resources <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="card rounded-2xl border border-subtle bg-card p-6 shadow-lifted">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-alt border border-subtle text-xs text-muted mb-4">
                <Search size={16} />
                <span>Search Chemistry HL Past Papers 2021-2025...</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-subtle">
                  <div className="flex items-center gap-3">
                    <LibraryBig className="text-accent-bright" size={18} />
                    <div>
                      <p className="font-semibold text-primary text-xs">May 2024 TZ2 Paper 1 (HL)</p>
                      <p className="text-xs text-muted">Chemistry · 40 Marks</p>
                    </div>
                  </div>
                  <Download size={16} className="text-secondary hover:text-primary cursor-pointer" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-subtle">
                  <div className="flex items-center gap-3">
                    <LibraryBig className="text-accent-bright" size={18} />
                    <div>
                      <p className="font-semibold text-primary text-xs">May 2024 TZ2 Markscheme</p>
                      <p className="text-xs text-muted">Official Answer Key</p>
                    </div>
                  </div>
                  <Download size={16} className="text-secondary hover:text-primary cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURE 6: PROGRESS TRACKING ───────────────────────────────────────── */}
      <section id="progress" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Visual Mockup */}
            <div className="order-2 lg:order-1 card rounded-2xl border border-subtle bg-card p-6 shadow-lifted">
              <div className="flex items-center justify-between border-b border-divider pb-4">
                <div className="flex items-center gap-2">
                  <LineChart className="text-accent-bright" size={20} />
                  <span className="font-semibold text-primary text-sm">Weekly Study Rhythm</span>
                </div>
                <span className="text-xs font-bold text-success">14 Day Streak 🔥</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-xl bg-surface-alt border border-subtle">
                  <p className="text-xs text-muted">Hours Revision</p>
                  <p className="text-2xl font-bold text-primary mt-1">18.5h</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-alt border border-subtle">
                  <p className="text-xs text-muted">Cards Mastered</p>
                  <p className="text-2xl font-bold text-accent-bright mt-1">340</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <SectionHeader
                badge="PROGRESS TRACKING"
                title="Understand your study rhythm."
                copy="Notice what is working and build a more consistent study habit. Get actionable insight into subject readiness and topic confidence."
              />
              <ul className="mt-8 space-y-3 text-secondary text-base">
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Visual analytics for weekly study hours and card recall</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Subject confidence heatmaps identifying weak topics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="mt-1 shrink-0 text-accent-bright" />
                  <span>Streak & consistency feedback built for steady habit formation</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm">
                  Start Tracking Progress <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FAQ SECTION ───────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            badge="FAQ"
            title="Frequently Asked Questions"
            copy="Everything you need to know about IB Nexus."
            className="text-center mx-auto"
          />
          <div className="mt-12 space-y-4">
            {faq.map(([question, answer]) => (
              <details key={question} className="card group rounded-2xl border border-subtle bg-card p-5">
                <summary className="cursor-pointer list-none font-semibold text-primary flex items-center justify-between">
                  <span>{question}</span>
                  <span className="text-accent-bright text-xl transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-secondary border-t border-divider pt-3">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-accent-soft bg-accent-soft p-10 sm:p-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            Build a study system you can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            Join IB Nexus today and experience a calmer, more productive IB journey.
          </p>
          <Link
            href="/signup"
            className="btn btn-brand mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 font-semibold text-base shadow-lifted"
          >
            Create Your Study Workspace <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t border-divider bg-surface-alt/50 px-4 pt-16 pb-8 sm:px-6 text-sm text-secondary">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs text-white">N</span> IB Nexus
            </div>
            <p className="max-w-xs leading-relaxed text-muted">A clear, focused study platform designed to respect students&apos; attention and simplify IB revision.</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-primary">Platform</h4>
            <div className="flex flex-col gap-3">
              <Link href="/subjects/dp" className="hover:text-accent-bright transition">Subjects</Link>
              <Link href="/about" className="hover:text-accent-bright transition">About</Link>
              <Link href="/features" className="hover:text-accent-bright transition">Features</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-primary">Support</h4>
            <div className="flex flex-col gap-3">
              <Link href="/help" className="hover:text-accent-bright transition">Help Centre</Link>
              <Link href="/contact" className="hover:text-accent-bright transition">Contact</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-primary">Legal</h4>
            <div className="flex flex-col gap-3">
              <Link href="/privacy" className="hover:text-accent-bright transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-accent-bright transition">Terms of Service</Link>
              <Link href="/accessibility" className="hover:text-accent-bright transition">Accessibility</Link>
            </div>
          </div>
        </div>
        <div className="mt-16 flex items-center justify-between border-t border-divider pt-8 text-muted">
          <span>&copy; {new Date().getFullYear()} IB Nexus. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
