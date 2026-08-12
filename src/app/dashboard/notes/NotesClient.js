"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Plus, PenLine, Clock, Star, Archive, 
  MoreHorizontal, BrainCircuit, FileText, Trash2, Pin, CheckCircle2 
} from "lucide-react";
import { createNote, toggleNoteState, duplicateNote, deleteNote } from "./actions";
import { Modal, Button, Input } from "@/components/ui";

const SUBJECTS = ["Biology", "Chemistry", "Mathematics", "Economics", "English", "Physics", "TOK", "History"];

export default function NotesClient({ initialNotes }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || []);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All"); // All, Favorites, Archived
  
  // Note Creation Modal
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Derive recent notes (top 3 edited recently, not archived)
  const recentNotes = useMemo(() => {
    return notes
      .filter(n => !n.is_archived)
      .sort((a, b) => new Date(b.last_opened_at) - new Date(a.last_opened_at))
      .slice(0, 3);
  }, [notes]);

  // Derive filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // 1. Category Filter
      if (categoryFilter === "Favorites" && !n.is_favorite) return false;
      if (categoryFilter === "Archived" && !n.is_archived) return false;
      if (categoryFilter !== "Archived" && n.is_archived) return false; // Hide archived from other views

      // 2. Subject Filter
      if (subjectFilter !== "All" && n.subject !== subjectFilter) return false;

      // 3. Search Filter
      if (search) {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) || 
          n.subject.toLowerCase().includes(q) ||
          (n.topic && n.topic.toLowerCase().includes(q))
        );
      }

      return true;
    }).sort((a, b) => {
      // Pinned notes always at top
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [notes, search, subjectFilter, categoryFilter]);

  async function handleCreate(formData) {
    setLoading(true);
    try {
      await createNote(formData);
      // router redirects inside action, but in case we need to close:
      setIsCreating(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleToggle(id, field, currentValue) {
    const res = await toggleNoteState(id, field, !currentValue);
    if (res.success) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: !currentValue } : n));
    }
  }

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-5 sm:p-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-primary">Notes</h1>
          <p className="mt-1 text-sm text-muted">Organise your revision notes, class material, and study guides by subject.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="shrink-0 flex items-center gap-2">
          <Plus size={16} /> Create note
        </Button>
      </header>

      {/* Continue Studying (Recent) */}
      {recentNotes.length > 0 && categoryFilter === "All" && search === "" && subjectFilter === "All" && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} /> Continue studying
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentNotes.map(note => (
              <NoteCard key={note.id} note={note} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      )}

      {/* Main Controls */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 w-full bg-[var(--surface-alt)]" 
            placeholder="Search notes..." 
          />
        </div>

        {/* Secondary Category Filters */}
        <div className="flex gap-2">
          {["All", "Favorites", "Archived"].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                categoryFilter === cat ? "bg-accent/10 text-accent" : "text-muted hover:bg-[var(--surface)] hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-divider">
        <button
          onClick={() => setSubjectFilter("All")}
          className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition ${
            subjectFilter === "All" ? "border-accent text-accent" : "border-transparent text-muted hover:text-primary"
          }`}
        >
          All Subjects
        </button>
        {SUBJECTS.map(sub => (
          <button
            key={sub}
            onClick={() => setSubjectFilter(sub)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition ${
              subjectFilter === sub ? "border-accent text-accent" : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div className="mt-6">
        {filteredNotes.length === 0 ? (
          <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed">
            <div className="w-16 h-16 bg-[var(--surface)] rounded-2xl flex items-center justify-center text-muted mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-primary">You don't have any notes here yet</h3>
            <p className="mt-2 text-sm text-secondary max-w-md mx-auto">
              Create your first revision note. Organise your class material, revision notes, and study guides in one place.
            </p>
            <Button onClick={() => setIsCreating(true)} className="mt-6">
              Create your first note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={isCreating} onClose={() => !loading && setIsCreating(false)} title="Create a new note">
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary mb-1.5 block">Title</label>
            <Input name="title" required placeholder="e.g. Cell Respiration" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium text-primary mb-1.5 block">Subject</label>
            <select name="subject" required className="field w-full bg-[var(--surface-alt)]">
              <option value="" disabled selected>Select subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary mb-1.5 block">Topic (Optional)</label>
              <Input name="topic" placeholder="e.g. Metabolism" />
            </div>
            <div>
              <label className="text-sm font-medium text-primary mb-1.5 block">Level</label>
              <select name="level" className="field w-full bg-[var(--surface-alt)]">
                <option value="HL">HL</option>
                <option value="SL">SL</option>
                <option value="Core">Core</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-divider">
            <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create note"}
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}

function NoteCard({ note, onToggle }) {
  // Extract text snippet safely from Tiptap JSON
  let previewText = "No content yet.";
  try {
    if (note.content) {
      const parsed = JSON.parse(note.content);
      if (parsed.content && parsed.content.length > 0) {
        // Very rough text extraction for preview
        const firstParagraph = parsed.content.find(n => n.type === 'paragraph' && n.content);
        if (firstParagraph && firstParagraph.content) {
          previewText = firstParagraph.content.map(c => c.text).join(" ").substring(0, 100);
          if (previewText.length === 100) previewText += "...";
        }
      }
    }
  } catch(e) {}

  const timeAgo = (dateStr) => {
    const diffMs = new Date() - new Date(dateStr);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins || 1}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  return (
    <Link href={`/dashboard/notes/${note.id}`} className="group card flex flex-col p-5 hover:border-accent/50 transition-colors bg-[var(--surface-alt)] relative overflow-hidden h-48">
      {/* Top Meta */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-[10px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {note.subject}
          </span>
          {note.level && (
            <span className="text-[10px] font-semibold tracking-wider text-muted border border-subtle px-1.5 py-0.5 rounded-sm">
              {note.level}
            </span>
          )}
        </div>
        
        {/* Indicators */}
        <div className="flex gap-1.5 text-muted">
          {note.is_pinned && <Pin size={14} className="text-accent fill-accent/20" />}
          {note.is_favorite && <Star size={14} className="text-yellow-500 fill-yellow-500/20" />}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-primary text-base line-clamp-1 mb-1 group-hover:text-accent transition-colors">
        {note.title}
      </h3>
      {note.topic && (
        <p className="text-xs text-accent font-medium mb-2">{note.topic}</p>
      )}

      {/* Preview */}
      <p className="text-sm text-secondary line-clamp-2 leading-relaxed flex-1 mt-1">
        {previewText}
      </p>

      {/* Bottom Meta */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={12} /> Edited {timeAgo(note.updated_at)}
        </span>
        
        {/* Quick Actions (Hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button 
            onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_favorite", note.is_favorite); }}
            className="hover:text-yellow-500 transition"
          >
            <Star size={14} className={note.is_favorite ? "fill-current" : ""} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_pinned", note.is_pinned); }}
            className="hover:text-accent transition"
          >
            <Pin size={14} className={note.is_pinned ? "fill-current" : ""} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_archived", note.is_archived); }}
            className="hover:text-danger transition"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}
