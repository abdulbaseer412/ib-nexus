import { BookOpen, BrainCircuit, CalendarDays, Clock, FileText, LineChart, Notebook, PenLine, Sparkles, Target, TrendingUp, ArrowRight, Circle, Plus } from "lucide-react";
import { requireCompleteProfile } from "@/lib/auth";
import { getDisplayName, getProgramLabel } from "@/lib/profile";
import Link from "next/link";
import { createServerClient } from "@/utils/supabase-server";

export const metadata = { title: "Study Hub — IB Nexus" };

/* ── Subject colour system ─────────────────────────────────────────────────── */
const C = {
  Biology:     { bg: "rgba(16,185,129,.1)",  text: "#10b981", bar: "#10b981" },
  Chemistry:   { bg: "rgba(245,158,11,.1)",  text: "#f59e0b", bar: "#f59e0b" },
  Mathematics: { bg: "rgba(79,140,255,.1)",  text: "#4f8cff", bar: "#4f8cff" },
  Economics:   { bg: "rgba(139,92,246,.1)",  text: "#8b5cf6", bar: "#8b5cf6" },
  English:     { bg: "rgba(236,72,153,.1)",  text: "#ec4899", bar: "#ec4899" },
  Physics:     { bg: "rgba(14,165,233,.1)",  text: "#0ea5e9", bar: "#0ea5e9" },
  TOK:         { bg: "rgba(244,63,94,.1)",   text: "#f43f5e", bar: "#f43f5e" },
  History:     { bg: "rgba(168,85,247,.1)",  text: "#a855f7", bar: "#a855f7" },
};
const col = (s) => C[s] || C.Biology;

const quickActions = [
  { label: "Create Note", href: "/dashboard/notes", icon: PenLine },
  { label: "Review Flashcards", href: "/dashboard/flashcards", icon: BrainCircuit },
  { label: "Open Planner", href: "/dashboard/planner", icon: CalendarDays },
  { label: "Ask AI Tutor", href: "/dashboard/ai", icon: Sparkles },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-4 sm:p-5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)]">
        <Icon size={18} className="text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-0.5 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function EmptyWeeklyChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3" style={{ height: 120 }}>
      {days.map((day) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-2 opacity-50">
          <div className="relative w-full rounded-lg bg-[var(--surface)] overflow-hidden" style={{ height: 100 }} />
          <span className="text-[11px] text-muted">{day}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */

export default async function Dashboard() {
  const { profile } = await requireCompleteProfile();
  const name = getDisplayName(null, profile);
  const program = getProgramLabel(profile.ib_program);

  // Dynamic Data
  const subjects = Array.isArray(profile.subjects) ? profile.subjects : [];
  const examSession = profile.exam_session || "Not set";
  const hasSubjects = subjects.length > 0;

  // Fetch real notes data
  const supabase = createServerClient();
  const { data: recentNotes, count: notesTotalCount } = await supabase
    .from('ib_notes')
    .select('id, title, subject, topic, updated_at', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(3);

  const notesCount = notesTotalCount || 0;
  const cardsCount = 0; // Still zero state until flashcards are implemented
  
  // Calculate days left roughly if exam session is set (e.g. "May 2026")
  let daysLeft = "—";
  if (examSession && examSession !== "Not set") {
    const [month, year] = examSession.split(" ");
    if (month && year) {
      const monthNum = month === "May" ? 4 : 10; // May=4 (0-indexed), Nov=10
      const examDate = new Date(parseInt(year), monthNum, 1);
      const diffTime = examDate - new Date();
      if (diffTime > 0) {
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        daysLeft = 0;
      }
    }
  }

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {getGreeting()}, {name}.
            </h1>
            {program && (
              <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-accent">
                {program}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{formatDate()}</p>
        </div>
      </header>

      {/* Beta Welcome Banner */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-accent/10 via-purple-500/10 to-transparent border border-accent/20 p-4 sm:p-5 flex gap-4 items-start sm:items-center">
        <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-primary">Welcome to the IB Nexus Beta!</h2>
          <p className="text-xs text-secondary mt-0.5 max-w-3xl leading-relaxed">
            We are brand new and constantly evolving. If you spot bugs or have ideas for features you'd love to see, let us know! 
            <Link href="/settings/help" className="text-accent hover:underline font-medium ml-1">Send Feedback &rarr;</Link>
          </p>
        </div>
      </div>

      {/* ── Quick Stats (Zero State) ────────────────────────────────────────── */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Subjects enrolled" value={subjects.length} />
        <StatCard icon={FileText} label="Notes created" value={notesCount} />
        <StatCard icon={BrainCircuit} label="Cards reviewed" value={cardsCount} />
        <StatCard icon={CalendarDays} label="Days until exams" value={daysLeft} />
      </div>

      {/* ── Continue Studying (Zero State) ──────────────────────────────────── */}
      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--surface)]">
            <BookOpen size={24} className="text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Ready to begin?</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">Start your first study session</h2>
            <p className="mt-1 text-sm text-muted">Create notes, generate flashcards, and let the AI Tutor plan your revision.</p>
          </div>
          <Link href="/dashboard/notes" className="btn btn-primary shrink-0">
            Create a Note <ArrowRight size={15} />
          </Link>
        </div>
        <div className="border-t border-[var(--divider)] px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Overall Progress</span>
            <span className="font-medium">0%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
            <div className="h-full w-0 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </section>

      {/* ── Two-Column Layout ────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Left: Weekly Overview + Subject Progress */}
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart size={17} className="text-muted" />
                <h2 className="font-semibold">Weekly study overview</h2>
              </div>
              <span className="text-xs text-muted">0 hrs total</span>
            </div>
            <div className="mt-6">
              <EmptyWeeklyChart />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} className="text-muted" />
                <h2 className="font-semibold">Subject progress</h2>
              </div>
              <Link href="/dashboard/subjects" className="text-xs font-medium text-accent hover:underline">
                Manage subjects
              </Link>
            </div>
            
            {!hasSubjects ? (
              <div className="mt-8 flex flex-col items-center justify-center text-center pb-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface)] mb-3">
                  <BookOpen size={20} className="text-muted" />
                </div>
                <p className="text-sm font-medium">No subjects added yet.</p>
                <p className="text-xs text-muted mt-1 mb-4">Set up your IB subjects during onboarding.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {subjects.map((s) => {
                  const name = s.name;
                  const c = col(name);
                  return (
                    <div key={name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.bar }} />
                          {name} <span className="text-[10px] bg-[var(--surface)] px-1.5 py-0.5 rounded-md text-muted font-medium">{s.level}</span>
                        </span>
                        <span className="font-medium text-muted">0%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface)]">
                        <div className="h-full rounded-full transition-all duration-500 w-0" style={{ background: c.bar }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Today's Schedule + Recent Activity */}
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={17} className="text-muted" />
                <h2 className="font-semibold">Today&apos;s schedule</h2>
              </div>
              <Link href="/dashboard/planner" className="text-xs font-medium text-accent hover:underline">
                View planner
              </Link>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center text-center pb-4">
              <Circle size={24} className="text-[var(--divider)] mb-3" />
              <p className="text-sm font-medium">Nothing planned for today.</p>
              <p className="text-xs text-muted mt-1 mb-4">Add tasks to your planner to stay on top of your deadlines.</p>
              <Link href="/dashboard/planner" className="btn btn-secondary py-1.5 px-4 text-xs">
                Open Planner
              </Link>
            </div>
          </section>

          <section className="card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-accent" />
                <h2 className="font-semibold text-primary">Quick Recall</h2>
              </div>
              <Link href="/dashboard/notes" className="text-xs font-medium text-accent hover:underline">
                View all notes
              </Link>
            </div>
            
            {recentNotes && recentNotes.length > 0 ? (
              <div className="flex-1 flex flex-col gap-3">
                {recentNotes.map((note) => (
                  <Link 
                    key={note.id} 
                    href={`/dashboard/notes/${note.id}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-accent/40 hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] dark:hover:shadow-[0_4px_20px_rgba(255,255,255,0.02)]"
                  >
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex h-2 w-2 rounded-full" style={{ background: col(note.subject).bar }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                            {note.subject}
                          </span>
                        </div>
                        <h3 className="truncate font-semibold text-[15px] group-hover:text-accent transition-colors">
                          {note.title}
                        </h3>
                        {note.topic && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {note.topic}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)] text-muted opacity-50 group-hover:opacity-100 group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent transition-all">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center text-center pb-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface)] mb-3">
                  <Notebook size={20} className="text-muted" />
                </div>
                <p className="text-sm font-medium">No notes created yet.</p>
                <p className="text-xs text-muted mt-1 mb-4">Start building your knowledge base today.</p>
                <Link href="/dashboard/notes" className="btn btn-secondary py-1.5 px-4 text-xs">
                  Create First Note
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Bottom: Exam Countdown + Quick Actions ───────────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="card flex items-center gap-5 p-5 sm:p-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)]">
            <Target size={24} className="text-accent" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">IB Examinations</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{daysLeft === "—" ? "—" : `${daysLeft} days remaining`}</p>
            <p className="mt-0.5 text-xs text-muted">{examSession} session</p>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Quick actions</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm font-medium transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] group"
              >
                <Icon size={16} className="text-muted group-hover:text-accent transition" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
