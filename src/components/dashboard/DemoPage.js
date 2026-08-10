"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bell, BookOpen, BrainCircuit, CalendarDays, Check, CheckCircle2, Circle,
  Clock, Download, FileText, Filter, FolderOpen, Heart, MessageCircle,
  MoreHorizontal, PenLine, Pin, Plus, Search, Send, Sparkles, Star,
  ThumbsUp, TrendingUp, Upload, Users, AlertCircle, Archive, ChevronRight,
  Layers, GraduationCap, Target
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════════
   Subject colour system — consistent across all dashboard pages
   ══════════════════════════════════════════════════════════════════════════════ */
const C = {
  Biology:     { bg: "rgba(16,185,129,.1)",  text: "#10b981", bar: "#10b981" },
  Chemistry:   { bg: "rgba(245,158,11,.1)",  text: "#f59e0b", bar: "#f59e0b" },
  Mathematics: { bg: "rgba(79,140,255,.1)",  text: "#4f8cff", bar: "#4f8cff" },
  Economics:   { bg: "rgba(139,92,246,.1)",  text: "#8b5cf6", bar: "#8b5cf6" },
  English:     { bg: "rgba(236,72,153,.1)",  text: "#ec4899", bar: "#ec4899" },
  Physics:     { bg: "rgba(14,165,233,.1)",  text: "#0ea5e9", bar: "#0ea5e9" },
  TOK:         { bg: "rgba(244,63,94,.1)",   text: "#f43f5e", bar: "#f43f5e" },
  History:     { bg: "rgba(168,85,247,.1)",   text: "#a855f7", bar: "#a855f7" },
};
const col = (s) => C[s] || C.Biology;

/* ══════════════════════════════════════════════════════════════════════════════
   1. NOTES
   ══════════════════════════════════════════════════════════════════════════════ */
const notesData = [];

function NotesPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const tabs = ["All", "Biology", "Chemistry", "Mathematics", "Economics", "English", "Physics", "TOK"];
  const filtered = notesData
    .filter(n => activeTab === "All" || n.subject === activeTab)
    .filter(n => n.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notes</h1>
          <p className="mt-1 text-sm text-muted">Organise your revision notes, class material, and study guides by subject.</p>
        </div>
        <button className="btn btn-primary shrink-0"><PenLine size={15} /> Create note</button>
      </header>

      {/* Search + Tabs */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} className="field pl-9" placeholder="Search notes..." />
        </label>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
              activeTab === tab
                ? "bg-[var(--accent)] text-white font-medium"
                : "border border-[var(--border)] text-muted hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border)] rounded-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] mb-4">
            <PenLine size={24} className="text-muted" />
          </div>
          <h3 className="text-lg font-semibold">You don't have any notes yet</h3>
          <p className="mt-1 text-sm text-muted max-w-sm">Create your first revision note. You can organise them by subject and generate flashcards directly from them.</p>
          <button className="btn btn-primary mt-6"><PenLine size={15} /> Create your first note</button>
        </div>
      ) : (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(note => {
            const c = col(note.subject);
            return (
              <article key={note.title} className="card group relative overflow-hidden p-5 transition hover:border-[var(--accent)]">
                {note.pinned && <Pin size={13} className="absolute right-4 top-4 text-accent" />}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: c.bar }} />
                <span className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: c.bg, color: c.text }}>{note.subject}</span>
                <h2 className="mt-3 text-sm font-semibold leading-snug">{note.title}</h2>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{note.preview}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
                  <span>{note.words.toLocaleString()} words</span>
                  <span>Edited {note.edited}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   2. FLASHCARDS
   ══════════════════════════════════════════════════════════════════════════════ */
const decksData = [];

function MasteryRing({ pct, size = 48 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" className="rotate-90 origin-center fill-current text-[11px] font-semibold"
        style={{ transformOrigin: "center" }}>{pct}%</text>
    </svg>
  );
}

function FlashcardsPage() {
  const totalDue = decksData.reduce((a, d) => a + d.due, 0);
  const avgMastery = Math.round(decksData.reduce((a, d) => a + d.mastery, 0) / decksData.length);

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Flashcards</h1>
          <p className="mt-1 text-sm text-muted">Build durable recall with spaced repetition across all your IB subjects.</p>
        </div>
        <button className="btn btn-primary shrink-0"><Plus size={15} /> Create deck</button>
      </header>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold">{decksData.length}</p>
          <p className="mt-1 text-xs text-muted">Total decks</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-accent">{totalDue}</p>
          <p className="mt-1 text-xs text-muted">Cards due today</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold">{avgMastery}%</p>
          <p className="mt-1 text-xs text-muted">Average mastery</p>
        </div>
      </div>

      {/* Deck Grid */}
      {decksData.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border)] rounded-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] mb-4">
            <BrainCircuit size={24} className="text-muted" />
          </div>
          <h3 className="text-lg font-semibold">No flashcard decks yet</h3>
          <p className="mt-1 text-sm text-muted max-w-sm">Create a deck manually or generate one instantly using the AI Tutor from your notes.</p>
          <button className="btn btn-primary mt-6"><Plus size={15} /> Create your first deck</button>
        </div>
      ) : (
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {decksData.map(deck => {
            const c = col(deck.subject);
            return (
              <article key={deck.name} className="card group overflow-hidden p-5 transition hover:border-[var(--accent)]">
                <div className="flex items-start justify-between">
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ background: c.bg, color: c.text }}>{deck.subject}</span>
                  <MasteryRing pct={deck.mastery} />
                </div>
                <h2 className="mt-3 text-sm font-semibold">{deck.name}</h2>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span>{deck.cards} cards</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--muted)]" />
                  <span>{deck.due} due</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted">Last reviewed {deck.lastReviewed}</span>
                  <button className="btn btn-secondary py-1.5 text-xs">Review</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   3. PLANNER
   ══════════════════════════════════════════════════════════════════════════════ */
const plannerTasks = { Morning: [], Afternoon: [], Evening: [] };
const deadlines = [];

function PlannerPage() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [activeDay, setActiveDay] = useState(0);

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Study Planner</h1>
          <p className="mt-1 text-sm text-muted">A structured plan for assignments, revision sessions, and deadlines.</p>
        </div>
        <button className="btn btn-primary shrink-0"><Plus size={15} /> Add task</button>
      </header>

      {/* Day Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <button
            key={day}
            onClick={() => setActiveDay(i)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
              activeDay === i
                ? "bg-[var(--accent)] text-white font-medium"
                : "border border-[var(--border)] text-muted hover:bg-[var(--surface)]"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Task List */}
        <div className="space-y-6">
          <div className="mt-8 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border)] rounded-2xl h-full">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] mb-4">
              <CalendarDays size={24} className="text-muted" />
            </div>
            <h3 className="text-lg font-semibold">Your day is clear</h3>
            <p className="mt-1 text-sm text-muted max-w-sm">Add study sessions, assignment blocks, or revision targets to stay on track.</p>
            <button className="btn btn-primary mt-6"><Plus size={15} /> Add a task</button>
          </div>
        </div>

        {/* Deadlines Sidebar */}
        <aside className="card h-fit p-5">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent" />
            <h3 className="font-semibold">Upcoming deadlines</h3>
          </div>
          {deadlines.length === 0 ? (
            <div className="mt-6 text-center pb-4">
              <p className="text-sm text-muted">No deadlines tracked.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {deadlines.map(d => (
                <div key={d.title} className="border-b border-[var(--divider)] pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{d.title}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted">
                    <span>{d.date}</span>
                    <span className={`font-medium ${d.daysLeft <= 40 ? "text-danger" : d.daysLeft <= 60 ? "text-warning" : "text-muted"}`}>
                      {d.daysLeft} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   4. RESOURCES
   ══════════════════════════════════════════════════════════════════════════════ */
const resourcesData = [];

function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const tabs = ["All", "Past Papers", "Mark Schemes", "Revision Notes", "Formula Sheets", "IB Guides"];
  const filtered = resourcesData
    .filter(r => activeTab === "All" || r.type === activeTab.replace(/s$/, "").replace("Paper", "Past Paper").replace("Sheet", "Formula Sheet").replace("Guide", "IB Guide") || r.type + "s" === activeTab || r.type === activeTab.slice(0, -1))
    .filter(r => activeTab === "All" || r.type === activeTab.replace(/s$/, ""))
    .filter(r => r.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resources</h1>
          <p className="mt-1 text-sm text-muted">Past papers, mark schemes, formula booklets, and revision material for your IB subjects.</p>
        </div>
        <button className="btn btn-primary shrink-0"><Upload size={15} /> Upload resource</button>
      </header>

      {/* Search + Tabs */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} className="field pl-9" placeholder="Search resources..." />
        </label>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
              activeTab === tab
                ? "bg-[var(--accent)] text-white font-medium"
                : "border border-[var(--border)] text-muted hover:bg-[var(--surface)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border)] rounded-2xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] mb-4">
            <FolderOpen size={24} className="text-muted" />
          </div>
          <h3 className="text-lg font-semibold">No resources available</h3>
          <p className="mt-1 text-sm text-muted max-w-sm">Upload past papers, mark schemes, or guides to build your resource library.</p>
          <button className="btn btn-primary mt-6"><Upload size={15} /> Upload resource</button>
        </div>
      ) : (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(res => {
            const c = col(res.subject);
            return (
              <article key={res.title + res.session} className="card group flex flex-col p-5 transition hover:border-[var(--accent)]">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: c.bg }}>
                    <FileText size={18} style={{ color: c.text }} />
                  </div>
                  <div className="flex gap-1">
                    <button aria-label="Favourite" className="rounded-lg p-1.5 hover:bg-[var(--surface)]">
                      <Heart size={15} className={res.favourited ? "fill-accent text-accent" : "text-muted"} />
                    </button>
                    <button aria-label="Download" className="rounded-lg p-1.5 hover:bg-[var(--surface)]">
                      <Download size={15} className="text-muted" />
                    </button>
                  </div>
                </div>
                <h2 className="mt-3 text-sm font-semibold">{res.title}</h2>
                <p className="mt-1 text-xs text-muted">{res.session}</p>
                <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-muted">
                  <span className="rounded-md px-1.5 py-0.5 font-medium" style={{ background: c.bg, color: c.text }}>{res.subject}</span>
                  <span>{res.size}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   5. AI TUTOR
   ══════════════════════════════════════════════════════════════════════════════ */
const aiPrompts = [
  { prompt: "Explain the Krebs Cycle step by step", subject: "Biology" },
  { prompt: "Help me structure my TOK essay", subject: "TOK" },
  { prompt: "Generate practice questions for Chemical Bonding", subject: "Chemistry" },
  { prompt: "Summarise the causes of World War I", subject: "History" },
  { prompt: "Create flashcards for Economics key terms", subject: "Economics" },
  { prompt: "Help me plan my Biology IA experiment", subject: "Biology" },
  { prompt: "Solve this integration problem step by step", subject: "Mathematics" },
  { prompt: "Explain electromagnetic induction", subject: "Physics" },
];

const conversationHistory = [];

export function AiTutor() {
  const [message, setMessage] = useState("");
  const subjects = ["All subjects", "Biology", "Chemistry", "Mathematics", "Economics", "English", "Physics", "TOK", "History"];
  const [selectedSubject, setSelectedSubject] = useState("All subjects");

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Tutor</h1>
        <p className="mt-1 text-sm text-muted">A focused study partner for your IB questions. Ask anything about your subjects.</p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Chat Area */}
        <div className="space-y-5">
          {/* Subject Selector */}
          <div className="flex items-center gap-3">
            <GraduationCap size={16} className="text-muted" />
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="field max-w-[200px] py-2 text-sm"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Message Area */}
          <section className="card overflow-hidden">
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)]">
                <Sparkles size={24} className="text-accent" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Start a conversation</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Ask a question about any IB topic, request practice problems, or get help structuring your essays and IAs.
              </p>
            </div>
            <div className="border-t border-[var(--divider)] p-4">
              <div className="flex gap-3">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="field min-h-[80px] flex-1 resize-none"
                  placeholder="Ask anything about your IB studies..."
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button className="btn btn-primary"><Send size={14} /> Send</button>
              </div>
            </div>
          </section>

          {/* Suggested Prompts */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Suggested prompts</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {aiPrompts.map(({ prompt, subject }) => {
                const c = col(subject);
                return (
                  <button
                    key={prompt}
                    onClick={() => setMessage(prompt)}
                    className="card flex items-center gap-3 p-3.5 text-left text-sm transition hover:border-[var(--accent)]"
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c.bar }} />
                    <span className="line-clamp-1">{prompt}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Conversation History */}
        <aside className="card h-fit p-5">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-accent" />
            <h3 className="font-semibold">Recent conversations</h3>
          </div>
          {conversationHistory.length === 0 ? (
            <div className="mt-6 text-center pb-4">
              <p className="text-sm text-muted">No conversations yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              {conversationHistory.map(conv => (
                <button key={conv.title} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface)]">
                  <span className="truncate">{conv.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{conv.time}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   6. COMMUNITY
   ══════════════════════════════════════════════════════════════════════════════ */
const discussions = [];
const studyGroups = [];

function CommunityPage() {
  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Community</h1>
          <p className="mt-1 text-sm text-muted">Learn alongside students preparing for the same IB examinations.</p>
        </div>
        <button className="btn btn-primary shrink-0"><PenLine size={15} /> New discussion</button>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Discussions */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Recent discussions</h3>
          {discussions.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border)] rounded-2xl h-full">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] mb-4">
                <Users size={24} className="text-muted" />
              </div>
              <h3 className="text-lg font-semibold">No discussions found</h3>
              <p className="mt-1 text-sm text-muted max-w-sm">Be the first to start a discussion about your subjects.</p>
              <button className="btn btn-primary mt-6"><PenLine size={15} /> Start discussion</button>
            </div>
          ) : (
            discussions.map(post => {
              const c = col(post.subject);
              return (
                <article key={post.title} className="card p-5 transition hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold leading-snug">{post.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="rounded-md px-1.5 py-0.5 font-medium" style={{ background: c.bg, color: c.text }}>{post.subject}</span>
                        <span>by {post.author}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--muted)]" />
                        <span>{post.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><MessageCircle size={13} /> {post.replies} replies</span>
                    <span className="flex items-center gap-1"><ThumbsUp size={13} /> {post.likes}</span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Study Groups Sidebar */}
        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-accent" />
              <h3 className="font-semibold">Study groups</h3>
            </div>
            {studyGroups.length === 0 ? (
              <div className="mt-6 text-center pb-4">
                <p className="text-sm text-muted">No active study groups.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {studyGroups.map(group => {
                  const c = col(group.subject);
                  return (
                    <div key={group.name} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{group.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span>{group.members} members</span>
                          {group.active && <span className="flex items-center gap-1 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Active</span>}
                        </div>
                      </div>
                      <button className="btn btn-secondary py-1.5 text-xs">Join</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              <h3 className="font-semibold">Trending topics</h3>
            </div>
            <div className="mt-4 space-y-2">
              {["Biology IA methodology", "TOK exhibition tips", "Economics evaluation", "Mathematics IA topics", "Extended Essay structure"].map(topic => (
                <button key={topic} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)]">
                  <ChevronRight size={13} className="text-muted" />
                  {topic}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Export — route each type to its dedicated layout
   ══════════════════════════════════════════════════════════════════════════════ */
export function DemoPage({ type }) {
  if (type === "notes") return <NotesPage />;
  if (type === "flashcards") return <FlashcardsPage />;
  if (type === "planner") return <PlannerPage />;
  if (type === "resources") return <ResourcesPage />;
  if (type === "community") return <CommunityPage />;
  return null;
}
