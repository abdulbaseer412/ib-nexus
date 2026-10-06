import Link from "next/link";
import { 
  ArrowRight, 
  Award, 
  BookOpen, 
  BrainCircuit, 
  CheckCircle2, 
  Compass, 
  GraduationCap, 
  HeartHandshake, 
  Layers, 
  Library, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  Users 
} from "lucide-react";

export const metadata = {
  title: "About IB Nexus — Created by Abdul Baseer for Global IB Scholars",
  description: "Learn about the mission, philosophy, and architectural vision behind IB Nexus — the unified, paywall-free study platform for International Baccalaureate DP & MYP students.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-[88px] pb-16">
      {/* ── AMBIENT BACKGROUND GLOWS ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[var(--accent)]/15 via-indigo-600/10 to-transparent blur-[120px] opacity-70" />
        <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] bg-blue-500/10 blur-[130px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* ── BREADCRUMB & HERO ──────────────────────────────────────────────── */}
        <section className="text-center pt-8 sm:pt-14 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25 backdrop-blur-md shadow-xs">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span>Mission &amp; Philosophy</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[var(--foreground)] leading-[1.1]">
            Empowering IB Scholars Through <span className="bg-gradient-to-r from-[var(--accent)] via-indigo-400 to-sky-400 bg-clip-text text-transparent">Clarity, Not Chaos</span>.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto font-normal">
            IB Nexus was conceived to replace fragmented documents, scattered flashcards, and disorganized shared drives with a single, calm, curriculum-first learning environment.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn btn-brand px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2 shadow-md hover:scale-[1.02] transition-all"
            >
              <span>Explore Student Workspace</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/#curriculum-explorer"
              className="px-6 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-bold text-sm sm:text-base hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-xs"
            >
              Browse Curriculum
            </Link>
          </div>
        </section>

        {/* ── CREATOR SPOTLIGHT & FOUNDING STORY ─────────────────────────────── */}
        <section className="relative rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 sm:p-12 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_.9fr] items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                <Award size={14} />
                <span>Founder &amp; Chief Architect</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
                Designed &amp; Engineered by Abdul Baseer.
              </h2>

              <blockquote className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--accent)] pl-4">
                <p>
                  &ldquo;As someone immersed in the International Baccalaureate continuum, I saw brilliant scholars struggle not with academic aptitude, but with tool fatigue. Students were spending more time organizing Notion databases, searching through dead links in shared drives, and making flashcards in siloed apps than actually mastering concepts.&rdquo;
                </p>
                <p className="not-italic text-xs sm:text-sm text-[var(--foreground)] font-medium">
                  &ldquo;I engineered IB Nexus from first principles to be the workspace I wish every student had: anchored directly to official syllabi, equipped with spaced repetition, and 100% free of commercial paywalls.&rdquo;
                </p>
              </blockquote>

              <div className="pt-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md">
                  AB
                </div>
                <div>
                  <div className="font-extrabold text-[var(--foreground)] text-base">Abdul Baseer</div>
                  <div className="text-xs text-[var(--muted)]">Founder, Architect &amp; Lead Engineer &bull; IB Nexus</div>
                </div>
              </div>
            </div>

            {/* Architecture Highlights Card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]/70 p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                The IB Nexus Engineering Creed
              </h3>

              <div className="space-y-3.5">
                {[
                  ["Curriculum-First Alignment", "Every note, card, and paper ties directly to the official DP & MYP subject guides."],
                  ["Zero Commercial Paywalls", "Core academic revision tools remain permanently free for all students worldwide."],
                  ["Distraction-Free Environment", "No advertisements, no clickbait engagement loops, and zero algorithmic clutter."],
                  ["Evidence-Based Retention", "Algorithmic spaced repetition intervals proven to maximize exam recall."]
                ].map(([title, desc], i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--foreground)]">{title}</h4>
                      <p className="text-[11px] sm:text-xs text-[var(--muted)] leading-snug mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4 PILLARS OF EXCELLENCE ─────────────────────────────────────────── */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              Core Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--foreground)] tracking-tight">
              Why IB Nexus is Different.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Four foundational standards that guide every feature we build into the platform.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Compass,
                title: "Curriculum Alignment",
                desc: "Pre-indexed to official DP & MYP guides so you always know what can and cannot be examined.",
                color: "from-blue-500/15 to-indigo-500/5 text-blue-400"
              },
              {
                icon: BrainCircuit,
                title: "Smart Memory Review",
                desc: "Spaced repetition intervals schedule reviews right before you forget, boosting exam retention.",
                color: "from-purple-500/15 to-indigo-500/5 text-purple-400"
              },
              {
                icon: ShieldCheck,
                title: "Vetted Quality",
                desc: "Zero spam or fake uploads. Every student-shared guide is moderated for accuracy and syllabus relevance.",
                color: "from-emerald-500/15 to-teal-500/5 text-emerald-400"
              },
              {
                icon: Lock,
                title: "Always Free & Open",
                desc: "Full access to notes, flashcards, planner, and library without subscriptions or paywalls.",
                color: "from-amber-500/15 to-orange-500/5 text-amber-400"
              }
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 hover:border-[var(--accent)]/40 hover:shadow-lg transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">{pillar.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── IMPACT STATS COUNTERS ──────────────────────────────────────────── */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]/60 p-8 sm:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[var(--accent)] tracking-tight">6</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Subject Groups</div>
              <div className="text-[11px] text-[var(--muted)]">Comprehensive DP &amp; MYP Coverage</div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">4</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Study Engines</div>
              <div className="text-[11px] text-[var(--muted)]">Notes, Decks, Planner, Library</div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-500 tracking-tight">100%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Open Scholar Access</div>
              <div className="text-[11px] text-[var(--muted)]">No Paywalls or Hidden Tiers</div>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 tracking-tight">24/7</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Secure Cloud Sync</div>
              <div className="text-[11px] text-[var(--muted)]">PostgreSQL Row-Level Security</div>
            </div>
          </div>
        </section>

        {/* ── INSTITUTIONAL CTA ──────────────────────────────────────────────── */}
        <section className="text-center rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--surface-alt)] p-10 sm:p-14 space-y-6 shadow-xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
              Ready to Upgrade Your IB Study Routine?
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Create your free student account in 30 seconds and start organizing your subjects with clarity.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="btn btn-brand px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2 shadow-md hover:scale-105 transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-bold text-sm sm:text-base hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
            >
              Contact the Creator
            </Link>
          </div>
        </section>

        {/* ── CLEAN PROFESSIONAL FOOTER ───────────────────────────────────────── */}
        <footer className="pt-10 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)] text-[10px] font-black text-white">IB</span>
            <span>IB Nexus &bull; Created by Abdul Baseer</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-[var(--foreground)] transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
          </div>
        </footer>

      </div>
    </main>
  );
}
