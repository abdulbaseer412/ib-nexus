/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Modal, Alert, Progress, Spinner, FeatureExplanation } from "@/components/ui";
import { fetchSmartQueueCardsAction } from "@/app/dashboard/flashcards/actions";
import { getSubjectBadgeClasses } from "@/lib/subject-colors";
import NexusLoadingState from "@/components/ui/NexusLoadingState";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Play, Flame, TrendingUp, FileText, BrainCircuit, Target, ListTodo, MoreVertical, Plus, ChevronRight } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const IB_SUBJECTS = [
  "Biology", "Chemistry", "Physics", "Environmental Systems",
  "Mathematics AA", "Mathematics AI",
  "English A", "English B", "Spanish B", "French B",
  "History", "Economics", "Business Management",
  "Psychology", "Geography", "Computer Science",
  "Visual Arts", "Music", "Theatre",
  "Theory of Knowledge", "Extended Essay", "CAS",
];

const GOAL_TYPES = [
  { value: "exam",            label: "Exam" },
  { value: "ia",              label: "Internal Assessment" },
  { value: "ee",              label: "Extended Essay" },
  { value: "tok",             label: "TOK" },
  { value: "cas",             label: "CAS" },
  { value: "myp_project",     label: "MYP Project" },
  { value: "personal_project",label: "Personal Project" },
  { value: "coursework",      label: "Coursework" },
  { value: "revision",        label: "Revision" },
];

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(iso) {
  const diff = new Date(iso) - new Date();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Simplified priority score (client-safe, no server imports)
function priorityScore(task, deadlines, goals, notes) {
  const now = new Date();
  let score = 0;
  // Deadline urgency
  const deadline = deadlines.find(d => d.id === task.deadline_id);
  if (deadline?.due_at) {
    const days = (new Date(deadline.due_at) - now) / 86400000;
    score += Math.max(0, 30 - days) * 2;
  }
  if (task.status === "missed") score += 40;
  const pmap = { low: 5, medium: 15, high: 25 };
  score += pmap[task.priority] || 0;
  const goal = goals.find(g => g.id === task.goal_id);
  if (goal) {
    const gmap = { exam: 30, ee: 28, ia: 25, tok: 20, cas: 10, revision: 15, coursework: 20, myp_project: 18, personal_project: 15 };
    score += gmap[goal.type] || 0;
  }
  if (task.note_id) {
    const note = notes?.find(n => n.id === task.note_id);
    if (note) {
      const impMap = { High: 20, "Mid-Level": 10, Low: 0 };
      score += impMap[note.exam_importance] || 0;
      if ((note.revision_readiness ?? 100) < 40) score += 20;
      else if ((note.revision_readiness ?? 100) < 70) score += 10;
      if (note.is_favorite) score += 5;
    }
  }
  return Math.round(score);
}

function buildNBAExplanation(task, deadlines, goals, notes) {
  const deadline = deadlines.find(d => d.id === task.deadline_id);
  const goal = goals.find(g => g.id === task.goal_id);
  const note = notes?.find(n => n.id === task.note_id);
  const parts = [];
  if (task.isVirtual) return `You have ${task.estimated_duration / 2} flashcards due for review.`;
  if (deadline?.due_at) {
    const days = Math.ceil((new Date(deadline.due_at) - new Date()) / 86400000);
    if (days <= 0) parts.push("This task is overdue.");
    else if (days === 1) parts.push("The deadline is tomorrow.");
    else if (days <= 7) parts.push(`The deadline is in ${days} days.`);
  }
  if (goal) parts.push(`This is part of your ${goal.title} goal.`);
  if (note && (note.revision_readiness ?? 100) < 50) parts.push(`Your exam is approaching and related revision material needs attention.`);
  else if (note) parts.push(`Review ${note.subject} — ${note.title}.`);
  if (task.priority === "high") parts.push("You marked this as high priority.");
  if (task.status === "missed") parts.push("You missed this session previously.");
  return parts.length ? parts.join(" ") : "This is the most important task for you right now.";
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Field Component ─────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
        {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FieldInput({ label, required, ...props }) {
  return (
    <Field label={label} required={required}>
      <input className="field w-full" {...props} />
    </Field>
  );
}

function FieldSelect({ label, required, children, ...props }) {
  return (
    <Field label={label} required={required}>
      <select className="field w-full" {...props}>{children}</select>
    </Field>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────

function GoalModal({ open, onClose, goal, onSave, onDelete, userProgram }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("exam");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState("active");
  const [topics, setTopics] = useState("");
  const [importance, setImportance] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setType(goal?.type ?? "exam");
      setTargetDate(goal?.target_date ?? "");
      setStatus(goal?.status ?? "active");
      
      let parsedDesc = {};
      try { parsedDesc = JSON.parse(goal?.description || "{}"); } catch (e) {}
      setTopics(parsedDesc.topics || "");
      setImportance(parsedDesc.importance || "Medium");
      
      setErr(null);
    }
  }, [open, goal]);

  const save = async e => {
    e.preventDefault();
    if (!title.trim()) return setErr("Please enter a goal title.");
    setLoading(true); setErr(null);
    try {
      const descObj = JSON.stringify({ topics, importance });
      const body = { title: title.trim(), type, target_date: targetDate || null, status, description: descObj };
      let saved;
      if (goal?.id) {
        saved = await api(`/api/planner/goals?id=${goal.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        saved = await api("/api/planner/goals", { method: "POST", body: JSON.stringify(body) });
      }
      onSave(saved, !goal?.id);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const del = () => {
    if (!goal?.id) return;
    // Optimistic: close + update UI immediately, sync to API in background
    onDelete(goal.id);
    api(`/api/planner/goals?id=${goal.id}`, { method: "DELETE" }).catch(console.error);
  };

  return (
    <Modal open={open} onClose={onClose} title={goal?.id ? "Edit Goal" : "Set a Goal"}>
      <form onSubmit={save} className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <FieldInput label="What are you working toward?" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology Final Exam" />
        <FieldSelect label="Type" required value={type} onChange={e => setType(e.target.value)}>
          {GOAL_TYPES.filter(t => {
            if (userProgram === "dp" && (t.value === "myp_project" || t.value === "personal_project")) return false;
            if (userProgram === "myp" && (t.value === "ee" || t.value === "tok" || t.value === "cas" || t.value === "ia")) return false;
            return true;
          }).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </FieldSelect>
        {type === "exam" && (
          <>
            <FieldInput label="Topics to cover" value={topics} onChange={e => setTopics(e.target.value)} placeholder="e.g. Cell Division, DNA, RNA" />
            <FieldSelect label="Importance" value={importance} onChange={e => setImportance(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </FieldSelect>
          </>
        )}
        <FieldInput label="Finish by" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        {goal?.id && (
          <FieldSelect label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </FieldSelect>
        )}
        <div className="flex gap-2 pt-2">
          {goal?.id && <Button type="button" variant="danger" onClick={del} disabled={loading}>Delete</Button>}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner /> : (goal?.id ? "Save" : "Create Goal")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ open, onClose, task, goals, notes, onSave, onDelete, userProgram }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState("medium");
  const [goalId, setGoalId] = useState("");
  const [noteId, setNoteId] = useState("");
  const [status, setStatus] = useState("pending");
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      let initialTitle = task?.title ?? "";
      let initialSubject = task?.subject ?? "";
      const pNoteId = task?.prefilled_note_id;
      if (pNoteId && !task?.id) {
        const foundNote = notes?.find(n => n.id === pNoteId);
        if (foundNote) {
          initialTitle = `Review ${foundNote.title}`;
          initialSubject = foundNote.subject || "";
        }
      }

      setTitle(initialTitle);
      setSubject(initialSubject);
      setDuration(task?.estimated_duration ?? 30);
      setPriority(task?.priority ?? "medium");
      setGoalId(task?.goal_id ?? "");
      setNoteId(task?.note_id ?? pNoteId ?? "");
      setStatus(task?.status ?? "pending");
      setShowMore(false);
      setErr(null);
    }
  }, [open, task, notes]);

  const save = async e => {
    e.preventDefault();
    if (!title.trim()) return setErr("Please enter a task name.");
    setLoading(true); setErr(null);
    try {
      const body = { title: title.trim(), subject: subject || null, estimated_duration: Number(duration), priority, goal_id: goalId || null, note_id: noteId || null, status };
      let saved;
      if (task?.id) {
        saved = await api(`/api/planner/tasks?id=${task.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        saved = await api("/api/planner/tasks", { method: "POST", body: JSON.stringify(body) });
      }
      onSave(saved, !task?.id);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const del = () => {
    if (!task?.id) return;
    onDelete(task.id);
    api(`/api/planner/tasks?id=${task.id}`, { method: "DELETE" }).catch(console.error);
  };

  return (
    <Modal open={open} onClose={onClose} title={task?.id ? "Edit Plan" : "Study Something"}>
      <form onSubmit={save} className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <FieldInput label="What do you need to study?" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Revise Cell Respiration" />
        <div className="grid grid-cols-2 gap-3">
          <FieldSelect label="How much time do you need?" value={duration} onChange={e => setDuration(e.target.value)}>
            {[15,20,25,30,45,60,90,120].map(m => <option key={m} value={m}>{fmtDuration(m)}</option>)}
          </FieldSelect>
          <FieldSelect label="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">— No subject —</option>
            {IB_SUBJECTS.filter(s => {
              if (userProgram === "myp" && (s === "Theory of Knowledge" || s === "Extended Essay" || s === "CAS" || s === "Mathematics AA" || s === "Mathematics AI")) return false;
              return true;
            }).map(s => <option key={s} value={s}>{s}</option>)}
          </FieldSelect>
        </div>

        <button type="button" className="text-sm text-[var(--accent)] hover:underline" onClick={() => setShowMore(v => !v)}>
          {showMore ? "Fewer options ↑" : "More options ↓"}
        </button>

        {showMore && (
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <FieldSelect label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </FieldSelect>
            <FieldSelect label="Related note (optional)" value={noteId} onChange={e => setNoteId(e.target.value)}>
              <option value="">— No note —</option>
              {notes?.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
            </FieldSelect>
            <FieldSelect label="Which goal is this for? (optional)" value={goalId} onChange={e => setGoalId(e.target.value)}>
              <option value="">— No goal —</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </FieldSelect>
            {task?.id && (
              <FieldSelect label="Status" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
                <option value="stalled">Stalled</option>
              </FieldSelect>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {task?.id && <Button type="button" variant="danger" onClick={del} disabled={loading}>Delete</Button>}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner /> : (task?.id ? "Save" : "Add Task")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Session Modal ────────────────────────────────────────────────────────────

function SessionModal({ open, onClose, session, tasks, notes, onSave, onDelete }) {
  const [taskId, setTaskId] = useState("");
  const [noteId, setNoteId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      let initialTitle = session?.title ?? "";
      const pNoteId = session?.prefilled_note_id;
      if (pNoteId && !session?.id) {
        const foundNote = notes?.find(n => n.id === pNoteId);
        if (foundNote) {
          initialTitle = `Review ${foundNote.title}`;
        }
      }

      setTaskId(session?.task_id ?? "");
      setNoteId(session?.note_id ?? pNoteId ?? "");
      setTitle(initialTitle);
      // Initialise start/end
      if (session?.scheduled_start) {
        setStart(new Date(session.scheduled_start).toISOString().slice(0, 16));
        setEnd(new Date(session.scheduled_end).toISOString().slice(0, 16));
      } else {
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        const later = new Date(now.getTime() + 60 * 60000);
        setStart(now.toISOString().slice(0, 16));
        setEnd(later.toISOString().slice(0, 16));
      }
      setErr(null);
    }
  }, [open, session, notes]);

  // Auto-fill title and note_id from task
  useEffect(() => {
    if (taskId && !session?.id) {
      const t = tasks.find(t => t.id === taskId);
      if (t) {
        if (!title) setTitle(t.title);
        if (t.note_id) setNoteId(t.note_id);
      }
    }
  }, [taskId]);

  const save = async e => {
    e.preventDefault();
    const startDt = new Date(start);
    const endDt = new Date(end);
    if (endDt <= startDt) return setErr("End time must be after start time.");
    setLoading(true); setErr(null);
    try {
      const body = {
        title: title.trim() || (tasks.find(t => t.id === taskId)?.title) || "Study session",
        task_id: taskId || null,
        note_id: noteId || null,
        scheduled_start: startDt.toISOString(),
        scheduled_end: endDt.toISOString(),
        status: session?.status || "scheduled",
      };
      let saved;
      if (session?.id) {
        saved = await api(`/api/planner/sessions?id=${session.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        saved = await api("/api/planner/sessions", { method: "POST", body: JSON.stringify(body) });
      }
      onSave(saved, !session?.id);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const del = () => {
    if (!session?.id) return;
    onDelete(session.id);
    api(`/api/planner/sessions?id=${session.id}`, { method: "DELETE" }).catch(console.error);
  };

  return (
    <Modal open={open} onClose={onClose} title={session?.id ? "Edit Study Time" : "Schedule Study Time"}>
      <form onSubmit={save} className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <FieldSelect label="What are you working on?" value={taskId} onChange={e => setTaskId(e.target.value)}>
          <option value="">— Independent study —</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}{t.subject ? ` · ${t.subject}` : ""}</option>)}
        </FieldSelect>
        <FieldInput label="Label (optional)" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology revision" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="Starts" required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          <FieldInput label="Ends" required type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          {session?.id && <Button type="button" variant="danger" onClick={del} disabled={loading}>Delete</Button>}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner /> : (session?.id ? "Save" : "Schedule")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Deadline Modal ───────────────────────────────────────────────────────────

function DeadlineModal({ open, onClose, deadline, goals, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [goalId, setGoalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(deadline?.title ?? "");
      setDueAt(deadline?.due_at ? new Date(deadline.due_at).toISOString().slice(0, 16) : "");
      setGoalId(deadline?.goal_id ?? "");
      setErr(null);
    }
  }, [open, deadline]);

  const save = async e => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return setErr("Title and due date are required.");
    setLoading(true); setErr(null);
    try {
      const body = { title: title.trim(), due_at: new Date(dueAt).toISOString(), goal_id: goalId || null };
      let saved;
      if (deadline?.id) {
        saved = await api(`/api/planner/deadlines?id=${deadline.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        saved = await api("/api/planner/deadlines", { method: "POST", body: JSON.stringify(body) });
      }
      onSave(saved, !deadline?.id);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const del = () => {
    if (!deadline?.id) return;
    onDelete(deadline.id);
    api(`/api/planner/deadlines?id=${deadline.id}`, { method: "DELETE" }).catch(console.error);
  };

  return (
    <Modal open={open} onClose={onClose} title={deadline?.id ? "Edit Deadline" : "Add a Deadline"}>
      <form onSubmit={save} className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <FieldInput label="What is due?" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology IA Final Draft" />
        <FieldInput label="When is it due?" required type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
        <FieldSelect label="Which goal is this for? (optional)" value={goalId} onChange={e => setGoalId(e.target.value)}>
          <option value="">— No goal —</option>
          {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </FieldSelect>
        <div className="flex gap-2 pt-2">
          {deadline?.id && <Button type="button" variant="danger" onClick={del} disabled={loading}>Delete</Button>}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner /> : (deadline?.id ? "Save" : "Add Deadline")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Focus Session Timer ──────────────────────────────────────────────────────

function FocusModal({ open, onClose, session, onComplete, onMissed, notes }) {
  const [phase, setPhase] = useState("ready"); // ready | running | paused | done
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const timerRef = useRef(null);

  const stop = () => { clearInterval(timerRef.current); timerRef.current = null; };

  useEffect(() => {
    if (!open) { stop(); setPhase("ready"); setElapsed(0); setErr(null); }
  }, [open]);

  useEffect(() => () => stop(), []);

  const startTimer = () => {
    if (phase === "running") return;
    setPhase("running");
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const pauseTimer = () => { stop(); setPhase("paused"); };

  const finish = async () => {
    stop(); setLoading(true); setErr(null);
    try {
      if (!session?.id) throw new Error("Session ID is missing.");
      const mins = Math.max(1, Math.floor(elapsed / 60));
      const updated = await api(`/api/planner/sessions?id=${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", actual_duration: mins }),
      });
      onComplete(updated);
    } catch (e) { setErr(e.message); setLoading(false); }
  };

  const markMissed = async () => {
    stop(); setLoading(true); setErr(null);
    try {
      if (!session?.id) throw new Error("Session ID is missing.");
      const updated = await api(`/api/planner/sessions?id=${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "missed" }),
      });
      onMissed(updated);
    } catch (e) { setErr(e.message); setLoading(false); }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (!session) return null;

  return (
    <Modal open={open} onClose={() => { stop(); onClose(); }} title="Focus Session">
      <div className="text-center py-4 space-y-6">
        {err && <Alert variant="error" title={err} />}
        <div>
          <p className="font-semibold text-lg">{session.title || "Study Session"}</p>
          {session.subject && <p className="text-sm text-[var(--muted)] mt-0.5">{session.subject}</p>}
          
          {session.note_id && (
            <div className="mt-4 flex justify-center gap-4">
              {notes?.find(n => n.id === session.note_id) ? (
                <>
                  <a href={`/dashboard/notes/${session.note_id}`} target="_blank" rel="noopener noreferrer" className="text-xs uppercase font-bold text-[var(--accent)] hover:underline flex items-center gap-1">Open Note</a>
                  <a href={`/dashboard/flashcards?note_id=${session.note_id}`} target="_blank" rel="noopener noreferrer" className="text-xs uppercase font-bold text-[var(--foreground)] hover:underline flex items-center gap-1">Flashcards</a>
                </>
              ) : (
                <span className="text-xs italic text-[var(--muted)]">Source note unavailable</span>
              )}
            </div>
          )}
        </div>

        <div className="text-7xl font-mono font-bold text-[var(--accent)] tabular-nums">
          {mm}:{ss}
        </div>

        {phase !== "done" && (
          <div className="flex justify-center gap-3">
            {phase === "running"
              ? <Button variant="secondary" onClick={pauseTimer}>Pause</Button>
              : <Button variant="primary" onClick={startTimer}>{phase === "paused" ? "Resume" : "Start"}</Button>
            }
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-4 flex justify-center gap-3">
          <Button variant="ghost" onClick={markMissed} disabled={loading}>Mark missed</Button>
          <Button variant="success" onClick={finish} disabled={loading || elapsed < 5}>
            {loading ? <Spinner /> : "Finish & save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Build My Day Modal ───────────────────────────────────────────────────────

function BuildMyDayModal({ open, onClose, tasks, sessions, preferences, onAccept }) {
  const [proposal, setProposal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const generate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = sessions.filter(s => {
      const d = new Date(s.scheduled_start);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const occupiedMinutes = new Set();
    todaySessions.forEach(s => {
      let cur = new Date(s.scheduled_start);
      const end = new Date(s.scheduled_end);
      while (cur < end) {
        const key = `${cur.getHours()}:${cur.getMinutes()}`;
        occupiedMinutes.add(key);
        cur = new Date(cur.getTime() + 15 * 60000);
      }
    });

    const maxMins = preferences?.daily_max_minutes ?? 300;
    const breakMins = preferences?.break_minutes ?? 10;
    const pending = tasks.filter(t => t.status !== "completed" && t.status !== "stalled");

    let now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    if (now.getHours() < 8) now.setHours(8, 0, 0, 0);

    const slots = [];
    let allocated = 0;
    let cursor = new Date(now);

    for (const task of pending) {
      if (allocated >= maxMins) break;
      const dur = task.estimated_duration || 30;
      // find next free slot
      let slotStart = new Date(cursor);
      let found = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (slotStart.getHours() >= 22) break;
        const key = `${slotStart.getHours()}:${slotStart.getMinutes()}`;
        if (!occupiedMinutes.has(key)) { found = true; break; }
        slotStart = new Date(slotStart.getTime() + 15 * 60000);
      }
      if (!found || slotStart.getHours() >= 22) break;
      const slotEnd = new Date(slotStart.getTime() + dur * 60000);
      slots.push({ task, scheduled_start: new Date(slotStart), scheduled_end: slotEnd });
      allocated += dur;
      cursor = new Date(slotEnd.getTime() + breakMins * 60000);
    }
    setProposal(slots);
  }, [sessions, tasks, preferences]);

  useEffect(() => {
    if (open) { setErr(null); generate(); }
    else setProposal([]);
  }, [open, generate]);

  const accept = async () => {
    if (!proposal.length) return;
    setLoading(true); setErr(null);
    try {
      const created = [];
      for (const slot of proposal) {
        const body = {
          title: slot.task.title,
          task_id: slot.task.id,
          scheduled_start: slot.scheduled_start.toISOString(),
          scheduled_end: slot.scheduled_end.toISOString(),
          status: "scheduled",
        };
        const s = await api("/api/planner/sessions", { method: "POST", body: JSON.stringify(body) });
        created.push(s);
      }
      onAccept(created);
    } catch (e) { setErr(e.message); setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Plan my day">
      <div className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <p className="text-sm text-[var(--foreground)] font-medium bg-[var(--surface)] p-4 rounded-xl">
          I&apos;ll look at what you need to finish, your deadlines, and your available time to suggest a realistic plan.
        </p>
        {proposal.length > 0 ? (
          <ul className="space-y-2">
            {proposal.map((slot, i) => (
              <li key={i} className="flex justify-between items-center bg-[var(--surface)] rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{slot.task.title}</p>
                  {slot.task.subject && <p className="text-xs text-[var(--muted)]">{slot.task.subject}</p>}
                </div>
                <span className="text-sm text-[var(--muted)] tabular-nums">
                  {fmtTime(slot.scheduled_start)} – {fmtTime(slot.scheduled_end)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-6 text-[var(--muted)] text-sm">
            {tasks.filter(t => t.status !== "completed").length === 0
              ? "No pending tasks to schedule."
              : "No available slots found for today. Check your preferences or add tasks."}
          </div>
        )}
        <div className="flex gap-2 pt-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={accept} disabled={loading || !proposal.length}>
            {loading ? <Spinner /> : "Use this plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Preferences Modal ────────────────────────────────────────────────────────

function PreferencesModal({ open, onClose, preferences, onSave }) {
  const [maxMins, setMaxMins] = useState(300);
  const [breakMins, setBreakMins] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (open) {
      setMaxMins(preferences?.daily_max_minutes ?? 300);
      setBreakMins(preferences?.break_minutes ?? 10);
      setErr(null);
    }
  }, [open, preferences]);

  const save = async e => {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const body = { daily_max_minutes: Number(maxMins), break_minutes: Number(breakMins) };
      const saved = await api("/api/planner/preferences", { method: "PUT", body: JSON.stringify(body) });
      onSave(saved);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Study Preferences">
      <form onSubmit={save} className="space-y-4">
        {err && <Alert variant="error" title={err} />}
        <p className="text-sm text-[var(--muted)] mb-2">Configure how IB Nexus automatically plans your day.</p>
        <FieldInput label="Max study minutes per day" type="number" min="0" required value={maxMins} onChange={e => setMaxMins(e.target.value)} />
        <FieldInput label="Break minutes between sessions" type="number" min="0" required value={breakMins} onChange={e => setBreakMins(e.target.value)} />
        <div className="flex gap-2 pt-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner /> : "Save Settings"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    scheduled: "bg-accent-soft text-[var(--accent)]",
    completed: "bg-success-soft text-success-strong",
    missed: "bg-danger-soft text-danger-strong",
    in_progress: "bg-warning-soft text-warning-strong",
  };
  const labels = { scheduled: "Scheduled", completed: "Done", missed: "Missed", in_progress: "In progress" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || "bg-[var(--surface)] text-[var(--muted)]"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ sessions, tasks, onClickSession }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1 + i); // Mon–Sun
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
      {days.map((day, index) => {
        const daySessions = sessions.filter(s => {
          const sd = new Date(s.scheduled_start);
          return sd.toDateString() === day.toDateString();
        });
        const isToday = day.getTime() === today.getTime();

        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            key={day.toDateString()} 
            className={`card p-4 flex flex-col h-full min-h-[200px] transition-all hover:shadow-md ${isToday ? "border-[var(--accent)]/50 bg-gradient-to-b from-[var(--accent)]/5 to-transparent" : ""}`}
          >
            <div className="pb-3 mb-3 border-b border-[var(--border)]/50 flex justify-between items-start">
              <div>
                <p className={`text-sm font-bold uppercase tracking-wider ${isToday ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                  {day.toLocaleDateString("en-GB", { weekday: "short" })}
                </p>
                <p className={`text-2xl font-semibold mt-1 tabular-nums ${isToday ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>
                  {day.toLocaleDateString("en-GB", { day: "numeric" })}
                </p>
              </div>
              {isToday && <span className="text-[10px] font-bold uppercase bg-[var(--accent)] text-white px-2 py-0.5 rounded-full">Today</span>}
            </div>

            <div className="flex-1">
              {daySessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 py-4">
                  <div className="w-8 h-8 rounded-full border border-dashed border-[var(--foreground)] mb-2" />
                  <p className="text-xs text-[var(--foreground)] font-medium">Clear</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {daySessions.map((s, i) => {
                    const isCompleted = s.status === "completed";
                    return (
                      <li 
                        key={s.id} 
                        className={`flex flex-col gap-1 text-sm cursor-pointer hover:bg-[var(--surface-hover)] p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-[var(--border)] ${isCompleted ? 'opacity-50' : ''}`} 
                        onClick={() => onClickSession(s)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tabular-nums text-[var(--muted)] shrink-0">{fmtTime(s.scheduled_start)}</span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-[var(--success)]' : s.status === 'in_progress' ? 'bg-[var(--warning)] animate-pulse' : 'bg-[var(--accent)]'}`} />
                        </div>
                        <span className={`font-medium leading-tight ${isCompleted ? 'line-through text-[var(--muted)]' : 'text-[var(--foreground)]'}`}>{s.title || "Session"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── AI Planner ───────────────────────────────────────────────────────────────

function AIPlannerView({ tasks, sessions, goals, deadlines, preferences, onApplyProposal }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        text: "Hi! I'm your AI study planner. Tell me what you'd like to do — for example:\n\n\"I have 1 hour free tonight. What should I study?\"\n\"Move Biology to tomorrow evening.\"\n\"Plan my revision for the next 3 days.\""
      }]);
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      // Build context summary for AI
      const ctx = {
        tasks: tasks.map(t => ({ id: t.id, title: t.title, subject: t.subject, priority: t.priority, status: t.status, duration: t.estimated_duration })),
        sessions: sessions.map(s => ({ id: s.id, title: s.title, start: s.scheduled_start, end: s.scheduled_end, status: s.status })),
        goals: goals.map(g => ({ id: g.id, title: g.title, type: g.type, target_date: g.target_date })),
        deadlines: deadlines.map(d => ({ id: d.id, title: d.title, due_at: d.due_at })),
        preferences,
        now: new Date().toISOString(),
      };

      const response = await api("/api/planner/ai", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, context: ctx }),
      });

      setMessages(m => [...m, { role: "assistant", text: response.reply }]);
      if (response.proposal) setProposal(response.proposal);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: `Sorry, I couldn't process that: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const applyProposal = async () => {
    if (!proposal) return;
    try {
      await onApplyProposal(proposal);
      setMessages(m => [...m, { role: "assistant", text: "Done! I've applied the changes. Your planner is now up to date." }]);
      setProposal(null);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: `Something went wrong: ${e.message}` }]);
    }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-[var(--ai)] text-white rounded-tr-sm"
                : "bg-[var(--surface-alt)] text-[var(--foreground)] rounded-tl-sm border border-[var(--ai-border)] shadow-sm"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] rounded-2xl rounded-tl-sm px-4 py-3">
              <NexusLoadingState state="thinking" message="" fullHeight={false} className="py-2" />
            </div>
          </div>
        )}
        {proposal && (
          <div className="card bg-[var(--ai-surface)] border-[var(--ai-border)] border p-4 space-y-3">
            <p className="text-sm font-semibold text-[var(--ai)]">Proposed changes:</p>
            <pre className="text-xs text-[var(--muted)] whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
            <div className="flex gap-2">
              <Button className="btn-ai" onClick={applyProposal}>Apply changes</Button>
              <Button variant="ghost" onClick={() => setProposal(null)}>Dismiss</Button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="field flex-1"
          placeholder="Ask your AI planner..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          disabled={loading}
        />
        <Button className="btn-ai" onClick={send} disabled={loading || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}

// ─── Main PlannerClient ───────────────────────────────────────────────────────

export default function PlannerClient({ userProgram }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");
  const initialNoteId = searchParams.get("note_id");
  const initialTab = searchParams.get("tab") || "today";
  
  const [tab, setTab] = useState(initialTab); // today | week | goals | deadlines | ai

  // Data
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Modals
  const [goalModal, setGoalModal] = useState({ open: false, item: null });
  const [taskModal, setTaskModal] = useState({ open: false, item: null });
  const [sessionModal, setSessionModal] = useState({ open: false, item: null });
  const [deadlineModal, setDeadlineModal] = useState({ open: false, item: null });
  const [focusModal, setFocusModal] = useState({ open: false, session: null });
  const [buildModal, setBuildModal] = useState(false);
  const [prefModal, setPrefModal] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [dueFlashcards, setDueFlashcards] = useState(0);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [g, t, s, d, p, n, fcQueue] = await Promise.all([
        api("/api/planner/goals").catch(() => []),
        api("/api/planner/tasks").catch(() => []),
        api("/api/planner/sessions").catch(() => []),
        api("/api/planner/deadlines").catch(() => []),
        api("/api/planner/preferences").catch(() => ({})),
        api("/api/planner/notes").catch(() => []),
        fetchSmartQueueCardsAction().catch(() => [])
      ]);
      setGoals(Array.isArray(g) ? g : []);
      setTasks(Array.isArray(t) ? t : []);
      setSessions(Array.isArray(s) ? s : []);
      setDeadlines(Array.isArray(d) ? d : []);
      setPreferences(p || {});
      setNotes(Array.isArray(n) ? n : []);
      setDueFlashcards(Array.isArray(fcQueue) ? fcQueue.length : 0);
    } catch (e) {
      setErr("Couldn't load your planner. Please refresh.");
    } finally {
      setLoading(false);
      
      // Handle initial action from URL
      if (initialAction === "add_task") {
        setTaskModal({ open: true, item: { prefilled_note_id: initialNoteId } });
        // Clean up URL without reload
        router.replace("/dashboard/planner", { scroll: false });
      } else if (initialAction === "review_note") {
        setSessionModal({ open: true, item: { prefilled_note_id: initialNoteId } });
        router.replace("/dashboard/planner", { scroll: false });
      }
    }
  }, [initialAction, initialNoteId, router]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  // Computed NBA reactively based on local state
  const nba = useMemo(() => {
    const pending = tasks.filter(x => x.status !== "completed" && x.status !== "stalled");
    const scored = pending.map(x => ({ task: x, score: priorityScore(x, deadlines, goals, notes) }));
    
    // Virtual Flashcard task if there are due cards
    if (dueFlashcards > 0) {
      scored.push({
        task: {
          id: "virtual-flashcards",
          title: "Review Due Flashcards",
          subject: "Spaced Repetition",
          estimated_duration: Math.min(60, dueFlashcards * 2), // 2 mins per card max approx
          priority: dueFlashcards > 20 ? "high" : "medium",
          isVirtual: true,
        },
        score: dueFlashcards > 20 ? 50 : 30 // Assign high score for due flashcards
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored[0] || null;
  }, [tasks, deadlines, goals, notes, dueFlashcards]);

  // Today's sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.scheduled_start);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));

  const completedMins = todaySessions.filter(s => s.status === "completed").reduce((a, s) => a + (s.actual_duration || 0), 0);
  const plannedMins = todaySessions.reduce((a, s) => a + Math.round((new Date(s.scheduled_end) - new Date(s.scheduled_start)) / 60000), 0);
  const progressPct = plannedMins > 0 ? Math.min(100, Math.round((completedMins / plannedMins) * 100)) : 0;

  // Upcoming deadlines (next 30 days)
  const upcomingDeadlines = deadlines
    .filter(d => new Date(d.due_at) >= new Date())
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 10);

  const TABS = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "goals", label: "Goals" },
    { key: "deadlines", label: "Deadlines" },
    { key: "ai", label: "AI Planner" },
  ];

  // ── helpers ──────────────────────────────────────────────────────────────────

  const startFocus = (session) => {
    if (!session?.id) return;
    setFocusModal({ open: true, session });
  };

  const handleNBAStart = () => {
    if (!nba?.task) return;
    if (nba.task.isVirtual) {
      router.push("/dashboard/flashcards");
      return;
    }
    // Create a quick session and open timer
    const now = new Date();
    const end = new Date(now.getTime() + (nba.task.estimated_duration || 30) * 60000);
    api("/api/planner/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: nba.task.title,
        task_id: nba.task.id,
        scheduled_start: now.toISOString(),
        scheduled_end: end.toISOString(),
        status: "in_progress",
      }),
    }).then(s => {
      setSessions(prev => [s, ...prev]);
      setFocusModal({ open: true, session: s });
    }).catch(e => alert(e.message));
  };

  const applyAIProposal = async (proposal) => {
    if (proposal.create_sessions) {
      for (const s of proposal.create_sessions) {
        const created = await api("/api/planner/sessions", { method: "POST", body: JSON.stringify(s) });
        setSessions(prev => [...prev, created]);
      }
    }
    if (proposal.update_sessions) {
      for (const upd of proposal.update_sessions) {
        const { id, ...rest } = upd;
        const updated = await api(`/api/planner/sessions?id=${id}`, { method: "PUT", body: JSON.stringify(rest) });
        setSessions(prev => prev.map(s => s.id === id ? updated : s));
      }
    }
    if (proposal.delete_sessions) {
      for (const id of proposal.delete_sessions) {
        await api(`/api/planner/sessions?id=${id}`, { method: "DELETE" });
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <NexusLoadingState state="loading" message="Loading your planner..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] p-6 sm:p-10 max-w-7xl mx-auto space-y-8">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>IB Nexus Planner</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">Study Planner</h1>
          <p className="text-[14px] text-secondary mt-2 flex items-center gap-1.5">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={() => setBuildModal(true)} className="shadow-md hover:shadow-lg transition-all shadow-[var(--accent)]/20 px-5">
            <Flame className="w-4 h-4 mr-1.5" /> Plan my day
          </Button>
          <div className="relative">
            <Button variant="secondary" onClick={() => setAddMenu(v => !v)} className="px-3">
              <Plus className="w-4 h-4" />
            </Button>
            {addMenu && (
              <div className="card absolute right-0 mt-2 z-30 min-w-40 p-1 animate-in shadow-xl" onMouseLeave={() => setAddMenu(false)}>
                {[
                  { label: "Study something", action: () => { setTaskModal({ open: true, item: null }); setAddMenu(false); } },
                  { label: "Set a goal", action: () => { setGoalModal({ open: true, item: null }); setAddMenu(false); } },
                  { label: "Add a deadline", action: () => { setDeadlineModal({ open: true, item: null }); setAddMenu(false); } },
                  { label: "Settings", action: () => { setPrefModal(true); setAddMenu(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-[var(--hover)] rounded-lg transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {err && <Alert variant="error" title={err} />}

      {/* ── Conversational AI Layer ────────────────────────────────────── */}
      <div 
        className="card p-2 sm:p-3 flex items-center gap-3 shadow-sm border-[var(--border)] mb-8 transition-colors focus-within:border-[var(--accent)]/50 focus-within:ring-1 focus-within:ring-[var(--accent)]/50 cursor-text hover:border-[var(--accent)]/30" 
        onClick={() => setTab("ai")}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <input 
          className="bg-transparent outline-none flex-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] px-2 cursor-text"
          placeholder="Tell me what you need, and I'll help organize your plan..."
          readOnly
        />
        <FeatureExplanation featureKey="ai" iconOnly />
        <Button variant="secondary" className="hidden sm:flex px-4 ml-1" onClick={(e) => { e.stopPropagation(); setTab("ai"); }}>Ask AI</Button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "ai" ? (
          <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="card p-6 border border-[var(--accent)]/20 shadow-lg shadow-[var(--accent)]/5">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]/50">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setTab("today")} className="px-2 hover:bg-[var(--surface-hover)]"><ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to Planner</Button>
                <FeatureExplanation featureKey="ai">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">AI Study Assistant</h2>
                </FeatureExplanation>
              </div>
            </div>
            <AIPlannerView
              tasks={tasks} sessions={sessions} goals={goals} deadlines={deadlines} preferences={preferences}
              onApplyProposal={applyAIProposal}
            />
          </motion.div>
        ) : (goals.length === 0 && tasks.length === 0 && sessions.length === 0 && deadlines.length === 0) ? (
          <motion.div key="onboarding" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8 sm:p-12 text-center max-w-2xl mx-auto mt-8 border-[var(--border)]">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--accent)] to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Welcome to your Study Planner</h2>
            <p className="text-[var(--muted)] mb-8">Let&apos;s get your study life organized.</p>
            
            <div className="space-y-4 max-w-md mx-auto text-left mb-10">
              <div className="flex gap-4 items-center bg-[var(--surface)] p-4 rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]" onClick={() => setGoalModal({ open: true, item: null })}>
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold shrink-0">1</div>
                <div><p className="font-semibold text-sm text-[var(--foreground)]">What are you working toward?</p><p className="text-xs text-[var(--muted)]">e.g. Biology Final Exam</p></div>
              </div>
              <div className="flex gap-4 items-center bg-[var(--surface)] p-4 rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]" onClick={() => setTaskModal({ open: true, item: null })}>
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold shrink-0">2</div>
                <div><p className="font-semibold text-sm text-[var(--foreground)]">What needs to be finished?</p><p className="text-xs text-[var(--muted)]">e.g. Revise Cell Respiration</p></div>
              </div>
              <div className="flex gap-4 items-center bg-[var(--surface)] p-4 rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]" onClick={() => setBuildModal(true)}>
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold shrink-0">3</div>
                <div><p className="font-semibold text-sm text-[var(--foreground)]">When do you have time?</p><p className="text-xs text-[var(--muted)]">Let IB Nexus build your plan</p></div>
              </div>
            </div>
            <Button variant="primary" className="px-8 py-2.5 rounded-full shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-transform" onClick={() => setBuildModal(true)}>Build my first plan</Button>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-12">
            
            {/* ── What to do next ─────────────────────────────────────── */}
            <section>
              <FeatureExplanation featureKey="nba">
                <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--muted)] mb-4 ml-1">What should I do now?</h2>
              </FeatureExplanation>
              {nba ? (
                <div 
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--card)] border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => setTaskModal({ open: true, item: nba.task })}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wider uppercase text-[var(--accent)] flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> Recommended Focus
                        </span>
                        {nba.task.priority === "high" && <span className="flex h-2 w-2 rounded-full bg-[var(--danger)]"></span>}
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{nba.task.title}</h2>
                        <div className="flex items-center gap-3 mt-2 text-sm font-medium text-[var(--muted)]">
                          {nba.task.subject && <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getSubjectBadgeClasses(nba.task.subject)}`}>{nba.task.subject}</span>}
                          {nba.task.estimated_duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDuration(nba.task.estimated_duration)}</span>}
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl bg-[var(--surface-hover)] p-3 rounded-lg border border-[var(--border)]/50 mt-2">
                        <span className="font-semibold text-[var(--foreground)]">Why: </span>{buildNBAExplanation(nba.task, deadlines, goals, notes)}
                      </p>
                    </div>
                    <Button 
                      variant="primary" 
                      className="sm:self-center shrink-0 rounded-full px-8 py-2.5 shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-transform" 
                      onClick={(e) => { e.stopPropagation(); handleNBAStart(); }}
                    >
                      Start <Play className="w-4 h-4 ml-1.5 fill-current" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-transparent p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">All Caught Up</h3>
                  <p className="text-[var(--muted)] max-w-sm mx-auto mb-6 text-sm">
                    Nothing urgent needs your attention right now. You can relax or get ahead of your schedule.
                  </p>
                  <div className="flex justify-center items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button variant="primary" onClick={() => setBuildModal(true)}>Plan my day</Button>
                      <FeatureExplanation featureKey="build" iconOnly />
                    </div>
                    <Button variant="secondary" onClick={() => setTaskModal({ open: true, item: null })}>+ Add work</Button>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
              
              {/* ── Left Column: Today & Coming Up ───────────────────── */}
              <div className="space-y-12">
                
                {/* TODAY */}
                <section>
                  <div className="flex items-end justify-between mb-6 pb-2 border-b border-[var(--border)]/50">
                    <div>
                      <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">Today&apos;s Plan</h2>
                    </div>
                    <Button variant="ghost" className="text-xs hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] -mr-2" onClick={() => setSessionModal({ open: true, item: null })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add study time
                    </Button>
                  </div>
                  
                  {todaySessions.length > 0 && (
                    <div className="flex items-center gap-6 py-2 px-2 mb-6">
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <FeatureExplanation featureKey="progress">
                              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-[var(--accent)]" /> Daily Progress
                              </h3>
                            </FeatureExplanation>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium tabular-nums text-[var(--foreground)]">
                              <span className="text-[var(--accent)] font-bold">{fmtDuration(completedMins)}</span> / {fmtDuration(plannedMins)}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 w-12 h-12 rounded-full border-2 border-[var(--surface-hover)] flex items-center justify-center relative bg-[var(--surface)]">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="22" cy="22" r="21" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--surface-hover)]" />
                          <circle 
                            cx="22" cy="22" r="21" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)] transition-all duration-1000 ease-out" 
                            strokeDasharray="132" strokeDashoffset={132 - (132 * progressPct) / 100}
                          />
                        </svg>
                        <span className="text-xs font-bold text-[var(--foreground)] tabular-nums">{progressPct}%</span>
                      </div>
                    </div>
                  )}

                  {todaySessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-4 rotate-3">
                        <ListTodo className="w-8 h-8 text-[var(--muted)]" />
                      </div>
                      <h3 className="font-medium text-[var(--foreground)] mb-1">Your day is open</h3>
                      <p className="text-[var(--muted)] text-sm max-w-sm mb-6">Plan your study sessions for the day to stay focused and on track.</p>
                      <div className="flex justify-center gap-2 items-center">
                        <Button variant="secondary" onClick={() => setBuildModal(true)}>Plan my day</Button>
                        <FeatureExplanation featureKey="build" iconOnly />
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:inset-y-2 before:left-4 sm:before:left-6 before:w-px before:bg-[var(--border)]">
                      {todaySessions.map((s, i) => {
                        const linkedTask = tasks.find(t => t.id === s.task_id);
                        const isCompleted = s.status === "completed";
                        const isCurrent = s.status === "in_progress";
                        
                        return (
                          <div 
                            key={s.id} 
                            className={`relative flex flex-col sm:flex-row gap-4 sm:gap-6 group ${isCompleted ? 'opacity-60' : ''}`}
                          >
                            <div className={`absolute -left-[5px] top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-[var(--background)] z-10 transition-colors ${
                              isCompleted ? 'bg-[var(--success)]' : isCurrent ? 'bg-[var(--accent)] ring-[var(--accent)]/20' : 'bg-[var(--border)] group-hover:bg-[var(--muted)]'
                            }`} />
                            
                            <div className="w-16 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-[var(--muted)]">
                              {fmtTime(s.scheduled_start)}
                            </div>
                            
                            <div 
                              className={`flex-1 rounded-xl p-4 transition-all cursor-pointer border ${
                                isCurrent 
                                  ? 'bg-[var(--surface)] border-[var(--accent)]/30 shadow-sm' 
                                  : 'bg-transparent border-transparent hover:bg-[var(--surface-hover)]'
                              }`}
                              onClick={() => setSessionModal({ open: true, item: s })}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className={`font-medium text-base ${isCompleted ? 'line-through text-[var(--muted)]' : 'text-[var(--foreground)]'}`}>
                                    {s.title || linkedTask?.title || "Study Session"}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--muted)] font-medium">
                                    {linkedTask?.subject && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {linkedTask.subject}</span>}
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDuration(Math.round((new Date(s.scheduled_end) - new Date(s.scheduled_start)) / 60000))}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {!isCompleted && (
                                    <Button
                                      variant="secondary"
                                      className={`text-xs py-1.5 px-4 rounded-full transition-all ${isCurrent ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-transparent' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                                      onClick={e => { e.stopPropagation(); startFocus(s); }}
                                    >
                                      {isCurrent ? 'Resume' : 'Focus'}
                                    </Button>
                                  )}
                                  <StatusBadge status={s.status} />
                                </div>
                              </div>

                              {s.note_id && notes?.find(n => n.id === s.note_id) && (
                                <div className="mt-4 pt-3 border-t border-[var(--border)]/50">
                                  <div className="flex flex-wrap gap-2">
                                    <a href={`/dashboard/notes/${s.note_id}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-[var(--surface)] hover:bg-[var(--border)] px-2.5 py-1 rounded-md text-[var(--foreground)] transition-colors" onClick={e => e.stopPropagation()}>
                                      <FileText className="w-3.5 h-3.5 text-[var(--accent)]" /> {notes.find(n => n.id === s.note_id).title}
                                    </a>
                                    <a href={`/dashboard/flashcards?note_id=${s.note_id}`} className="inline-flex items-center gap-1.5 text-xs font-medium bg-[var(--surface)] hover:bg-[var(--border)] px-2.5 py-1 rounded-md text-[var(--foreground)] transition-colors" onClick={e => e.stopPropagation()}>
                                      <BrainCircuit className="w-3.5 h-3.5 text-[var(--success)]" /> Review Cards
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* COMING UP */}
                <section>
                  <div className="flex items-end justify-between mb-6 pb-2 border-b border-[var(--border)]/50">
                    <div>
                      <FeatureExplanation featureKey="deadline">
                        <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">Coming Up</h2>
                      </FeatureExplanation>
                    </div>
                    <Button variant="ghost" className="text-xs hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] -mr-2" onClick={() => setDeadlineModal({ open: true, item: null })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add deadline
                    </Button>
                  </div>

                  {deadlines.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
                      <p className="text-[var(--muted)] text-sm mb-4">No upcoming deadlines tracked.</p>
                      <Button variant="secondary" className="text-xs" onClick={() => setDeadlineModal({ open: true, item: null })}>Add a deadline</Button>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {deadlines.sort((a, b) => new Date(a.due_at) - new Date(b.due_at)).map((d) => {
                        const days = Math.ceil((new Date(d.due_at) - new Date()) / 86400000);
                        const overdue = days < 0;
                        const urgent = days >= 0 && days <= 3;
                        
                        return (
                          <li 
                            key={d.id} 
                            className={`card p-4 flex items-center gap-5 cursor-pointer hover:shadow-md transition-all border ${
                              overdue ? "border-[var(--danger-strong)] bg-danger-soft" : urgent ? "border-[var(--warning-strong)] bg-warning-soft" : "border-[var(--border)] hover:border-[var(--accent-strong)]"
                            }`} 
                            onClick={() => setDeadlineModal({ open: true, item: d })}
                          >
                            <div className={`text-center w-16 shrink-0 ${overdue ? "text-[var(--danger)]" : urgent ? "text-[var(--warning)] text-opacity-90" : "text-[var(--accent)]"}`}>
                              <p className="text-2xl font-bold tabular-nums leading-none">{overdue ? "!" : days === 0 ? "0" : days}</p>
                              <p className="text-[10px] uppercase tracking-widest font-bold mt-1">{overdue ? "overdue" : days === 0 ? "today" : "days"}</p>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-[var(--foreground)] truncate">{d.title}</p>
                              <p className="text-sm text-[var(--muted)] mt-0.5 font-medium flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {fmtDate(d.due_at)}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

              </div>

              {/* ── Right Column: Goals & Work ─────────────────────────── */}
              <div className="space-y-12">
                
                {/* CURRENT GOALS */}
                <section>
                  <div className="flex items-end justify-between mb-6 pb-2 border-b border-[var(--border)]/50">
                    <div>
                      <FeatureExplanation featureKey="goal">
                        <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">Current Goals</h2>
                      </FeatureExplanation>
                    </div>
                    <Button variant="ghost" className="text-xs hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] -mr-2" onClick={() => setGoalModal({ open: true, item: null })}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  {goals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center flex flex-col items-center">
                      <Target className="w-6 h-6 text-[var(--muted)] mb-3" />
                      <p className="text-[var(--muted)] text-sm mb-4">Set specific targets for exams or coursework to stay focused.</p>
                      <Button variant="secondary" className="text-xs" onClick={() => setGoalModal({ open: true, item: null })}>Set a goal</Button>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {goals.map(g => {
                        const goalTasks = tasks.filter(t => t.goal_id === g.id);
                        const doneTasks = goalTasks.filter(t => t.status === "completed");
                        const pct = goalTasks.length > 0 ? Math.round((doneTasks.length / goalTasks.length) * 100) : 0;
                        return (
                          <li 
                            key={g.id} 
                            className="group card p-5 cursor-pointer hover:border-[var(--accent)]/50 hover:shadow-md transition-all bg-gradient-to-br from-[var(--surface)] to-[var(--card)] relative overflow-hidden" 
                            onClick={() => setGoalModal({ open: true, item: g })}
                          >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div>
                                <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors leading-tight">{g.title}</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="text-xs text-[var(--muted)] font-medium bg-[var(--surface-hover)] px-2 py-0.5 rounded-md mt-2 inline-block">
                                    {GOAL_TYPES.find(t => t.value === g.type)?.label ?? g.type}
                                  </span>
                                  {g.type === "exam" && (() => {
                                    let meta = {};
                                    try { meta = JSON.parse(g.description || "{}"); } catch (e) {}
                                    if (meta.importance) {
                                      const color = meta.importance === "High" ? "text-[var(--danger)]" : meta.importance === "Medium" ? "text-[var(--warning)]" : "text-[var(--accent)]";
                                      return <span className={`text-xs font-bold mt-2 inline-block ${color}`}>{meta.importance} Priority</span>;
                                    }
                                    return null;
                                  })()}
                                  {g.target_date && (() => {
                                    const days = Math.ceil((new Date(g.target_date) - new Date()) / 86400000);
                                    if (days > 0) return <span className="text-xs font-semibold mt-2 inline-block text-[var(--muted)]">{days} days left</span>;
                                    return null;
                                  })()}
                                </div>
                                {g.type === "exam" && (() => {
                                  let meta = {};
                                  try { meta = JSON.parse(g.description || "{}"); } catch (e) {}
                                  if (meta.topics) {
                                    return <p className="text-xs text-[var(--muted)] mt-2 line-clamp-1"><span className="font-semibold">Topics:</span> {meta.topics}</p>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                            {goalTasks.length > 0 && (
                              <div className="relative z-10">
                                <div className="flex justify-between text-xs font-medium text-[var(--muted)] mb-2">
                                  <span>{doneTasks.length} / {goalTasks.length} work items done</span>
                                  <span className="text-[var(--foreground)]">{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                  <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )}
                            {pct === 100 && <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[var(--success)]/10 blur-2xl rounded-full z-0" />}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* WORK NEEDING ATTENTION (Unscheduled or Independent Tasks) */}
                <section>
                  <div className="flex items-end justify-between mb-6 pb-2 border-b border-[var(--border)]/50">
                    <div>
                      <FeatureExplanation featureKey="task">
                        <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">Work Needing Attention</h2>
                      </FeatureExplanation>
                    </div>
                    <Button variant="ghost" className="text-xs hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] -mr-2" onClick={() => setTaskModal({ open: true, item: null })}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  {/* SUBJECT BALANCE VISUALIZATION */}
                  {tasks.filter(t => t.status !== "completed").length > 0 && (() => {
                    const pendingTasks = tasks.filter(t => t.status !== "completed");
                    const subjectCounts = pendingTasks.reduce((acc, t) => {
                      const s = t.subject || "Other";
                      acc[s] = (acc[s] || 0) + (t.estimated_duration || 30);
                      return acc;
                    }, {});
                    const totalMins = Object.values(subjectCounts).reduce((a, b) => a + b, 0);
                    const subjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);
                    
                    if (subjects.length < 2) return null; // Only show balance if multiple subjects
                    
                    return (
                      <div className="mb-6 card p-4 bg-[var(--surface-hover)] border-transparent flex flex-col gap-3 shadow-inner">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[var(--muted)]">Subject Balance (Est. Time)</span>
                        </div>
                        <div className="flex h-2 w-full rounded-full overflow-hidden">
                          {subjects.map(([subj, mins], idx) => (
                            <div 
                              key={subj} 
                              style={{ width: `${(mins / totalMins) * 100}%` }}
                              className={`h-full border-r border-[var(--background)] ${idx % 3 === 0 ? "bg-[var(--accent)]" : idx % 3 === 1 ? "bg-[var(--warning)]" : "bg-indigo-400"}`}
                              title={`${subj}: ${fmtDuration(mins)}`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {subjects.map(([subj, mins], idx) => (
                            <div key={subj} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                              <span className={`w-2 h-2 rounded-full ${idx % 3 === 0 ? "bg-[var(--accent)]" : idx % 3 === 1 ? "bg-[var(--warning)]" : "bg-indigo-400"}`} />
                              <span>{subj} <span className="font-medium text-[var(--foreground)]">({Math.round((mins/totalMins)*100)}%)</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {tasks.filter(t => t.status !== "completed").length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-8 h-8 text-[var(--success)]/50 mx-auto mb-2" />
                      <p className="text-sm text-[var(--muted)]">All work is finished.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {tasks.filter(t => t.status !== "completed").slice(0, 8).map(t => (
                        <li key={t.id} className="card p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-all" onClick={() => setTaskModal({ open: true, item: t })}>
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{t.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {t.subject && <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getSubjectBadgeClasses(t.subject)}`}>{t.subject}</span>}
                              {t.estimated_duration && <span className="text-xs text-[var(--muted)] flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(t.estimated_duration)}</span>}
                            </div>
                          </div>
                          {t.priority === "high" && <div className="w-2 h-2 rounded-full bg-[var(--danger)] shrink-0" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════ MODALS ════════════════════════════ */}
      <GoalModal
        open={goalModal.open}
        onClose={() => setGoalModal({ open: false, item: null })}
        goal={goalModal.item}
        onSave={(saved, isNew) => {
          if (isNew) setGoals(prev => [saved, ...prev]);
          else setGoals(prev => prev.map(g => g.id === saved.id ? saved : g));
          setGoalModal({ open: false, item: null });
        }}
        onDelete={id => {
          setGoals(prev => prev.filter(g => g.id !== id));
          setGoalModal({ open: false, item: null });
        }}
        userProgram={userProgram}
      />

      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, item: null })}
        task={taskModal.item}
        goals={goals}
        notes={notes}
        onSave={(saved, isNew) => {
          if (isNew) setTasks(prev => [saved, ...prev]);
          else setTasks(prev => prev.map(t => t.id === saved.id ? saved : t));
          setTaskModal({ open: false, item: null });
        }}
        onDelete={id => {
          setTasks(prev => prev.filter(t => t.id !== id));
          setTaskModal({ open: false, item: null });
        }}
        userProgram={userProgram}
      />

      <SessionModal
        open={sessionModal.open}
        onClose={() => setSessionModal({ open: false, item: null })}
        session={sessionModal.item}
        tasks={tasks}
        notes={notes}
        onSave={(saved, isNew) => {
          if (isNew) setSessions(prev => [...prev, saved]);
          else setSessions(prev => prev.map(s => s.id === saved.id ? saved : s));
          setSessionModal({ open: false, item: null });
        }}
        onDelete={id => {
          setSessions(prev => prev.filter(s => s.id !== id));
          setSessionModal({ open: false, item: null });
        }}
      />

      <DeadlineModal
        open={deadlineModal.open}
        onClose={() => setDeadlineModal({ open: false, item: null })}
        deadline={deadlineModal.item}
        goals={goals}
        onSave={(saved, isNew) => {
          if (isNew) setDeadlines(prev => [...prev, saved]);
          else setDeadlines(prev => prev.map(d => d.id === saved.id ? saved : d));
          setDeadlineModal({ open: false, item: null });
        }}
        onDelete={id => {
          setDeadlines(prev => prev.filter(d => d.id !== id));
          setDeadlineModal({ open: false, item: null });
        }}
      />

      <FocusModal
        open={focusModal.open}
        onClose={() => setFocusModal({ open: false, session: null })}
        session={focusModal.session}
        notes={notes}
        onComplete={updated => {
          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
          setFocusModal({ open: false, session: null });
        }}
        onMissed={updated => {
          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
          setFocusModal({ open: false, session: null });
        }}
      />

      <BuildMyDayModal
        open={buildModal}
        onClose={() => setBuildModal(false)}
        tasks={tasks}
        sessions={sessions}
        preferences={preferences}
        onAccept={created => {
          setSessions(prev => [...prev, ...created]);
          setBuildModal(false);
        }}
      />

      <PreferencesModal
        open={prefModal}
        onClose={() => setPrefModal(false)}
        preferences={preferences}
        onSave={(updated) => {
          setPreferences(updated);
          setPrefModal(false);
        }}
      />
    </div>
  );
}
