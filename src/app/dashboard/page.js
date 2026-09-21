import { BookOpen, BrainCircuit, CalendarDays, Clock, FileText, LineChart, Notebook, PenLine, Sparkles, Target, TrendingUp, ArrowRight, Circle, Plus, ChevronRight } from "lucide-react";
import { requireCompleteProfile } from "@/lib/auth";
import { getDisplayName, getProgramLabel } from "@/lib/profile";
import Link from "next/link";
import { createServerClient } from "@/utils/supabase-server";

export const metadata = { title: "Study Hub — IB Nexus" };

import { getSubjectBadgeClasses, getSubjectBgClass, getSubjectTextClass, getSubjectIconClasses } from "@/lib/subject-colors";

const quickActions = [
  { label: "Create Note", href: "/dashboard/notes", icon: PenLine },
  { label: "Review Flashcards", href: "/dashboard/flashcards", icon: BrainCircuit },
  { label: "Open Planner", href: "/dashboard/planner", icon: CalendarDays },
  { label: "Nexus AI", href: "/dashboard/ai", icon: Sparkles },
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

function StatCard({ icon: Icon, label, value, colorVar }) {
  return (
    <div 
      style={{ '--c': colorVar }} 
      className="relative flex flex-col p-5 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--c)_10%,transparent)] hover:border-[color:var(--c)]/40 overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[color:var(--c)] opacity-80" />
      <div className="absolute inset-0 bg-[color:var(--c)] opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity" />
      <div className="relative flex items-center gap-3 mb-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[color:var(--c)]/10 text-[color:var(--c)] border border-[color:var(--c)]/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)_inset]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <p className="text-[13px] font-semibold text-[var(--muted)]">{label}</p>
      </div>
      <div className="relative">
        <p className="text-3xl font-bold tracking-tight text-[color:var(--c)] drop-shadow-sm">{value}</p>
      </div>
    </div>
  );
}

function EmptyWeeklyChart() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-3" style={{ height: 110 }}>
      {days.map((day, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative w-full rounded-md bg-[var(--surface)] border border-[var(--border)] opacity-30" style={{ height: 80 }} />
          <span className="text-[10px] font-bold text-muted uppercase">{day}</span>
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

  const supabase = await createServerClient();
  const { getSmartQueueCards } = await import("@/lib/flashcards-service");

  const [notesRes, quickRecallCardsRes] = await Promise.all([
    supabase
      .from('ib_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    getSmartQueueCards(3).catch(error => {
      console.error("Failed to fetch quick recall cards:", error);
      return [];
    })
  ]);

  const notesCount = notesRes?.count || 0;
  let quickRecallCards = quickRecallCardsRes || [];
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
    <main className="min-h-[calc(100vh-72px)] p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-muted uppercase tracking-[0.1em]">{formatDate()}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {getGreeting()}, {name}.
          </h1>
          {program && (
            <span className="rounded-full bg-[var(--surface-alt)] px-3 py-1 text-[11px] font-bold text-secondary uppercase tracking-widest border border-[var(--border)]">
              {program}
            </span>
          )}
        </div>
      </header>

      {/* Beta Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--card)] dark:bg-[#080d17] bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_6%,transparent)] via-[color-mix(in_srgb,var(--info)_4%,transparent)] to-[color-mix(in_srgb,var(--ai)_6%,transparent)] border border-[var(--border-subtle)] p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center group hover:border-[var(--accent)]/30 transition-all duration-500 hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--accent)] via-[var(--info)] to-[var(--ai)] opacity-80" />
        <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] shadow-sm border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0">
          <Sparkles size={22} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-[var(--foreground)]">Welcome to the IB Nexus Beta</h2>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] mt-1 max-w-3xl leading-relaxed">
            We are brand new and constantly evolving. If you spot bugs or have ideas for features you'd love to see, let us know! 
          </p>
        </div>
        <Link href="/settings/help" className="btn btn-secondary text-xs px-4 py-2 bg-[var(--card)] shrink-0 self-start sm:self-auto shadow-sm border border-[var(--border)] hover:border-[var(--info)]/40 hover:text-[var(--info)]">
          Send Feedback <ChevronRight size={14} />
        </Link>
      </div>

      {/* ── Quick Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Subjects enrolled" value={subjects.length} colorVar="var(--accent)" />
        <StatCard icon={FileText} label="Notes created" value={notesCount} colorVar="var(--info)" />
        <StatCard icon={BrainCircuit} label="Cards reviewed" value={cardsCount} colorVar="var(--ai)" />
        <StatCard icon={CalendarDays} label="Days to exams" value={daysLeft} colorVar="var(--warning)" />
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Studying */}
          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/20 bg-[var(--card)] shadow-md group hover:border-[var(--accent)]/40 transition-all duration-500 hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--accent)_15%,transparent)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-[var(--info)]/5 to-transparent opacity-80 pointer-events-none" />
            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[var(--info)]/10 shadow-[0_0_20px_color-mix(in_srgb,var(--info)_20%,transparent)] border border-[var(--info)]/30 group-hover:scale-105 transition-transform duration-500">
                <Target size={26} className="text-[var(--info)]" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--info)] mb-1.5 opacity-80">Focus</p>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Start your study session</h2>
                <p className="mt-1 text-[14px] font-medium text-[var(--text-secondary)]">Create notes, generate flashcards, and let AI plan your revision.</p>
              </div>
              <Link href="/dashboard/notes" className="btn shrink-0 text-[14px] py-2.5 px-6 rounded-xl shadow-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-none transition-colors">
                Get Started <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Weekly Overview */}
            <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[14px] font-bold text-[var(--foreground)] flex items-center gap-2">
                  <LineChart size={16} className="text-muted" strokeWidth={2.5} />
                  Activity
                </h2>
                <span className="text-[12px] font-semibold text-muted bg-[var(--surface)] px-2 py-1 rounded-md">0 hrs</span>
              </div>
              <EmptyWeeklyChart />
            </section>

            {/* Subject Progress */}
            <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[14px] font-bold text-[var(--foreground)] flex items-center gap-2">
                  <TrendingUp size={16} className="text-muted" strokeWidth={2.5} />
                  Progress
                </h2>
                <Link href="/dashboard/subjects" className="text-[12px] font-semibold text-[var(--accent)] hover:underline">
                  Manage
                </Link>
              </div>
              
              {!hasSubjects ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-[13px] font-medium text-[var(--foreground)]">No subjects added</p>
                  <p className="text-[12px] text-muted mt-1 mb-4">Set up your subjects.</p>
                </div>
              ) : (
                <div className="space-y-5 flex-1">
                  {subjects.map((s) => {
                    const name = s.name;
                    return (
                      <div key={name}>
                        <div className="mb-2 flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                            {name} 
                          </span>
                          <span className="font-semibold text-muted">0%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 w-0 ${getSubjectBgClass(name)}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Right: 1/3 width */}
        <div className="space-y-6">
          {/* Quick Recall */}
          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border)] hover:border-[var(--ai)]/30 transition-all duration-500 hover:shadow-[0_4px_15px_color-mix(in_srgb,var(--ai)_10%,transparent)] bg-[var(--card)] p-6 shadow-sm flex flex-col h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-bl from-[var(--ai)]/10 to-[var(--info)]/5 opacity-40 pointer-events-none" />
            <div className="relative flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-[var(--foreground)] flex items-center gap-2">
                <BrainCircuit size={16} className="text-[var(--ai)]" strokeWidth={2.5} />
                Quick Recall
              </h2>
              <Link href="/dashboard/flashcards" className="text-[12px] font-semibold text-[var(--info)] hover:underline">
                View all
              </Link>
            </div>
            
            {quickRecallCards && quickRecallCards.length > 0 ? (
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                {quickRecallCards.map((card) => (
                  <Link 
                    key={card.id} 
                    href={`/dashboard/flashcards/deck/${card.deck?.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2 w-2 rounded-full ${getSubjectBgClass(card.deck?.subject)}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${getSubjectTextClass(card.deck?.subject)}`}>
                          {card.deck?.subject || "General"}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
                        {new Date(card.next_review_at) <= new Date() ? 'DUE' : 'SOON'}
                      </span>
                    </div>
                    <h3 className="truncate font-semibold text-[13px] text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                      {card.front}
                    </h3>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-[var(--border)] rounded-xl m-1">
                <p className="text-[13px] font-medium text-[var(--foreground)]">No cards due</p>
                <p className="text-[11px] text-muted mt-1 px-4">Start generating Nexus Cards.</p>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-2.5">
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-[13px] font-medium transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:shadow-sm group"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--background)] border border-[var(--border)] group-hover:text-[var(--accent)] transition-colors">
                    <Icon size={14} strokeWidth={2.5} className="text-muted group-hover:text-[var(--accent)] transition-colors" />
                  </div>
                  <span className="text-[var(--foreground)]">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
