"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, CalendarDays,
  FileText, Download, CheckCircle2, BookOpen, BrainCircuit,
  Link2, Sparkles, Clock, Trash2, ChevronRight, Play
} from "lucide-react";
import { Button, Input, Select, Textarea, Checkbox, Modal, Alert, Spinner, Badge } from "@/components/ui";
import { PRESET_AVATARS } from "@/lib/avatars";
import NexusLoadingState from "@/components/ui/NexusLoadingState";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const COLOURS = {
  Biology: { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  Chemistry: { bg: "rgba(245,158,11,.1)", text: "#f59e0b" },
  Mathematics: { bg: "rgba(79,140,255,.1)", text: "#4f8cff" },
  Economics: { bg: "rgba(139,92,246,.1)", text: "#8b5cf6" },
  English: { bg: "rgba(236,72,153,.1)", text: "#ec4899" },
  Physics: { bg: "rgba(14,165,233,.1)", text: "#0ea5e9" },
  History: { bg: "rgba(168,85,247,.1)", text: "#a855f7" },
  TOK: { bg: "rgba(244,63,94,.1)", text: "#f43f5e" },
};
const col = (s) => COLOURS[s] || { bg: "rgba(99,102,241,.1)", text: "#6366f1" };

const RESOURCE_TYPES = {
  past_paper: "Past Paper", markscheme: "Markscheme", revision_guide: "Revision Guide",
  formula_sheet: "Formula Sheet", ib_guide: "IB Guide", coursework_example: "Coursework Example",
  ia_example: "IA Example", ee_example: "EE Example", tok_resource: "TOK Resource",
  teacher_resource: "Teacher Resource", study_guide: "Study Guide", worksheet: "Worksheet", other: "Other",
};
const typeLabel = (v) => RESOURCE_TYPES[v] || v;

function api(url, opts = {}) {
  return fetch(url, { headers: { "Content-Type": "application/json" }, ...opts }).then(async r => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  });
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Study Path ───────────────────────────────────────────────────────────── */
function StudyPath({ resource, related, paired, relatedNotes, relatedDecks }) {
  const steps = [];

  // 1. If it's a past paper, suggest reading revision guide first
  const revisionGuide = related.find(r => r.resource_type === "revision_guide");
  if (resource.resource_type === "past_paper" && revisionGuide) {
    steps.push({ label: "Read the revision guide", icon: BookOpen, href: `/dashboard/resources/${revisionGuide.id}` });
  }

  // 2. Review related notes
  if (relatedNotes.length > 0) {
    steps.push({ label: "Review your related notes", icon: FileText, href: `/dashboard/notes/${relatedNotes[0].id}` });
  }

  // 3. Practice with this resource
  steps.push({ label: resource.resource_type === "past_paper" ? "Practice the past paper" : "Study the resource", icon: Play, href: resource.file_url, external: true });

  // 4. Check markscheme
  if (paired && resource.resource_type === "past_paper") {
    steps.push({ label: "Check the markscheme", icon: CheckCircle2, href: `/dashboard/resources/${paired.id}` });
  }

  // 5. Review flashcards
  if (relatedDecks.length > 0) {
    steps.push({ label: "Review related flashcards", icon: BrainCircuit, href: "/dashboard/flashcards" });
  }

  // 6. Schedule another review
  steps.push({ label: "Schedule another review", icon: CalendarDays, href: "/dashboard/planner" });

  if (steps.length <= 2) return null; // Not enough context for a meaningful path

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">Study Path</h2>
      </div>
      <div className="relative pl-6 space-y-3 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-[var(--border)]">
        {steps.map((step, i) => (
          <div key={i} className="relative flex items-center gap-3">
            <div className="absolute -left-6 w-6 h-6 rounded-full border-2 border-[var(--border)] bg-[var(--card)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--muted)]">{i + 1}</span>
            </div>
            {step.external ? (
              <a href={step.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                <step.icon className="w-4 h-4 text-[var(--accent)]" />
                {step.label}
                <ExternalLink className="w-3 h-3 text-[var(--muted)]" />
              </a>
            ) : (
              <Link href={step.href} className="flex items-center gap-2 text-sm text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                <step.icon className="w-4 h-4 text-[var(--accent)]" />
                {step.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Main Detail Client ───────────────────────────────────────────────────── */
export default function ResourceDetailClient({ resourceId, userProgram, isAdmin }) {
  const router = useRouter();
  const [resource, setResource] = useState(null);
  const [paired, setPaired] = useState(null);
  const [reverseLinked, setReverseLinked] = useState([]);
  const [related, setRelated] = useState([]);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [relatedDecks, setRelatedDecks] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyDuration, setStudyDuration] = useState(30);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studySuccess, setStudySuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const data = await api(`/api/resources/${resourceId}`);
      setResource(data.resource);
      setPaired(data.paired);
      setReverseLinked(data.reverseLinked);
      setRelated(data.related);

      // Record view
      api("/api/resources/views", {
        method: "POST",
        body: JSON.stringify({ resource_id: resourceId }),
      }).catch(() => {});

      // Check saved
      const savedIds = await api("/api/resources/save");
      setIsSaved(savedIds.includes(resourceId));

      // Load related notes (user's notes matching subject)
      if (data.resource.subject) {
        try {
          const notesRes = await api("/api/planner/notes");
          const matched = (notesRes || []).filter(n =>
            n.subject && data.resource.subject &&
            n.subject.toLowerCase().includes(data.resource.subject.toLowerCase().split(" ")[0])
          ).slice(0, 4);
          setRelatedNotes(matched);
        } catch { /* no notes API available */ }
      }

      // Load related flashcard decks
      // Try to find decks matching subject
      try {
        // We don't have a direct API — this is a best-effort approach
        setRelatedDecks([]);
      } catch { /* ignore */ }

    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async () => {
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      await api("/api/resources/save", {
        method: "POST",
        body: JSON.stringify({ resource_id: resourceId, action: wasSaved ? "unsave" : "save" }),
      });
    } catch {
      setIsSaved(wasSaved);
    }
  };

  const addToPlan = async () => {
    setStudyLoading(true);
    try {
      await api("/api/planner/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: `Review ${resource.title}`,
          subject: resource.subject || null,
          estimated_duration: studyDuration,
          priority: "medium",
          resource_id: resource.id,
          origin: "resource",
        }),
      });
      setStudySuccess(true);
      setTimeout(() => { setStudyOpen(false); setStudySuccess(false); }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setStudyLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api(`/api/resources/${resourceId}`, { method: "DELETE" });
      router.push("/dashboard/resources");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 min-h-[50vh]"><NexusLoadingState state="loading" message="Loading resource..." /></div>;
  }

  if (err || !resource) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Alert variant="error" title={err || "Resource not found"} />
        <Link href="/dashboard/resources" className="text-sm text-[var(--accent)] hover:underline mt-4 inline-block">
          ← Back to Resources
        </Link>
      </div>
    );
  }

  const c = col(resource.subject);
  const sessionLabel = resource.exam_session
    ? `${resource.exam_session === "may" ? "May" : "November"} ${resource.year || ""}`
    : resource.year ? `${resource.year}` : null;
  const canDelete = isAdmin || resource.source === "user";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Back */}
      <Link href="/dashboard/resources" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Resources
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {resource.subject && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
                  {resource.subject}{resource.level ? ` ${resource.level}` : ""}
                </span>
              )}
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--muted)]">
                {typeLabel(resource.resource_type)}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                resource.source === "platform"
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "bg-[var(--surface)] text-[var(--muted)]"
              }`}>
                {resource.source === "platform" ? "IB Nexus" : "My Library"}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] leading-tight">
              {resource.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--muted)]">
              {sessionLabel && <span>{sessionLabel}</span>}
              {resource.paper_number && <span>· {resource.paper_number}</span>}
              {resource.topic && <span>· {resource.topic}</span>}
            </div>

            {/* Description */}
            {resource.description && (
              <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">{resource.description}</p>
            )}
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mt-6 pb-6 border-b border-[var(--border)]">
          <a
            href={resource.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Open Resource
          </a>
          <Button variant="secondary" onClick={toggleSave}>
            {isSaved ? <BookmarkCheck className="w-4 h-4 mr-1.5 text-[var(--accent)]" /> : <Bookmark className="w-4 h-4 mr-1.5" />}
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button variant="secondary" onClick={() => { setStudyOpen(true); setStudySuccess(false); }}>
            <CalendarDays className="w-4 h-4 mr-1.5" /> Add to Plan
          </Button>
          {canDelete && (
            <Button variant="ghost" onClick={() => setDeleteConfirm(true)} className="text-red-400 hover:text-red-300 ml-auto">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* ── Paired Resource (Paper ↔ Markscheme) ──────────────────────────── */}
        {(paired || reverseLinked.length > 0) && (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Paired Resource
            </h2>
            <div className="space-y-2">
              {paired && (
                <Link href={`/dashboard/resources/${paired.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors">
                  <FileText className="w-5 h-5 text-[var(--accent)]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{paired.title}</p>
                    <p className="text-xs text-[var(--muted)]">{typeLabel(paired.resource_type)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              )}
              {reverseLinked.map(r => (
                <Link key={r.id} href={`/dashboard/resources/${r.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors">
                  <FileText className="w-5 h-5 text-[var(--accent)]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{r.title}</p>
                    <p className="text-xs text-[var(--muted)]">{typeLabel(r.resource_type)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Study Path ────────────────────────────────────────────────────── */}
        <StudyPath
          resource={resource}
          related={related}
          paired={paired}
          relatedNotes={relatedNotes}
          relatedDecks={relatedDecks}
        />

        {/* ── Related Notes ─────────────────────────────────────────────────── */}
        {relatedNotes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Your Notes
            </h2>
            <div className="space-y-2">
              {relatedNotes.map(n => (
                <Link key={n.id} href={`/dashboard/notes/${n.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors">
                  <FileText className="w-4 h-4 text-[var(--muted)]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{n.title}</p>
                    <p className="text-xs text-[var(--muted)]">{n.subject}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              ))}
            </div>
            <Link href={`/dashboard/notes`} className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mt-3">
              View all notes <ChevronRight className="w-3 h-3" />
            </Link>
          </section>
        )}

        {/* ── Related Resources ─────────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map(r => {
                const rc = col(r.subject);
                return (
                  <Link key={r.id} href={`/dashboard/resources/${r.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors">
                    <div className="w-2 h-8 rounded-full shrink-0" style={{ background: rc.text }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{r.title}</p>
                      <p className="text-xs text-[var(--muted)]">{typeLabel(r.resource_type)}{r.year ? ` · ${r.year}` : ""}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Flashcards link ───────────────────────────────────────────────── */}
        {resource.subject && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" /> Flashcards
            </h2>
            <Link href="/dashboard/flashcards" className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors">
              <BrainCircuit className="w-5 h-5 text-[var(--accent)]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">Review flashcards</p>
                <p className="text-xs text-[var(--muted)]">Study your {resource.subject} cards</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </Link>
          </section>
        )}

        {/* ── File info ─────────────────────────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[var(--muted)]">
            {resource.file_type && <span>Type: {resource.file_type}</span>}
            {resource.file_size && <span>Size: {(resource.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
            <span>Added: {fmtDate(resource.created_at)}</span>
            {resource.programme && <span>Programme: {resource.programme.toUpperCase()}</span>}
          </div>
        </div>
      </motion.div>

      {/* ── Study From This Modal ───────────────────────────────────────────── */}
      <Modal open={studyOpen} onClose={() => setStudyOpen(false)} title="Study from this">
        {studySuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--accent)] mx-auto mb-3" />
            <p className="font-medium">Added to your plan!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">{resource.title}</p>
            <div>
              <label className="text-sm font-medium mb-2 block">How long?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mins: 20, label: "Quick review", sub: "20 min" },
                  { mins: 30, label: "Practice", sub: "30 min" },
                  { mins: 60, label: "Deep study", sub: "60 min" },
                ].map(opt => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => setStudyDuration(opt.mins)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      studyDuration === opt.mins
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setStudyOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={addToPlan} disabled={studyLoading}>
                {studyLoading ? <Spinner /> : "Add to plan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Resource">
        <p className="text-sm text-[var(--muted)] mb-4">
          Are you sure you want to delete &quot;{resource.title}&quot;? This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
