"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Plus, PenLine, Clock, Star, Archive, 
  MoreHorizontal, BrainCircuit, FileText, Trash2, Pin, 
  CheckCircle2, BookOpen, LayoutGrid, List, Sparkles, FolderPlus, DownloadCloud, Activity,
  Camera, X
} from "lucide-react";
import { createNote, toggleNoteState, duplicateNote, deleteNote, updateNoteContent } from "./actions";
import { createClient } from "@/utils/supabase-browser";
import { Modal, Button, Input, Dropdown } from "@/components/ui";

const SUBJECTS = ["Biology", "Chemistry", "Mathematics", "Economics", "English", "Physics", "TOK", "History"];

export default function NotesClient({ initialNotes }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || []);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All"); // All, Favorites, Archived
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  
  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Camera Capture
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    setNotes(initialNotes || []);
  }, [initialNotes]);

  // Command Palette Keyboard Shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Derive recent notes
  const recentNotes = useMemo(() => {
    return notes
      .filter(n => !n.is_archived)
      .sort((a, b) => new Date(b.last_opened_at) - new Date(a.last_opened_at))
      .slice(0, 3);
  }, [notes]);

  // Derive filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (categoryFilter === "Favorites" && !n.is_favorite) return false;
      if (categoryFilter === "Archived" && !n.is_archived) return false;
      if (categoryFilter !== "Archived" && n.is_archived) return false;
      if (subjectFilter !== "All" && n.subject !== subjectFilter) return false;
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
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }, [notes, search, subjectFilter, categoryFilter]);

  async function handleCreate(formData) {
    setLoading(true);
    try {
      await createNote(formData);
      setIsCreating(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleTemplateCreate(templateType) {
    setLoading(true);
    const formData = new FormData();
    formData.append("title", `${templateType} Note`);
    formData.append("subject", "Biology"); // Default, user can change later
    try {
      await createNote(formData);
    } catch (e) {
      setLoading(false);
    }
  }

  async function handleToggle(id, field, currentValue) {
    const res = await toggleNoteState(id, field, !currentValue);
    if (res.success) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: !currentValue } : n));
    }
  }

  // Camera Functions
  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      alert("Unable to access camera.");
      setIsCameraOpen(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setCameraLoading(true);
    
    // Create canvas to capture frame
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraLoading(false);
        return;
      }
      
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const supabase = createClient();
      
      // We need a temporary unique name, we don't have note ID yet
      const tempId = crypto.randomUUID();
      const fileName = `captures/${tempId}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('notes_media')
        .upload(fileName, file);

      if (error) {
        console.error("Upload failed", error);
        alert("Failed to upload capture.");
        setCameraLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('notes_media')
        .getPublicUrl(fileName);

      // Create new note with captured image
      const formData = new FormData();
      formData.append("title", "Camera Capture");
      formData.append("subject", "General");
      
      const initialContent = {
        type: 'doc',
        content: [
          { type: 'paragraph' },
          { 
            type: 'image', 
            attrs: { src: publicUrl, alt: 'Camera Capture', title: null } 
          },
          { type: 'paragraph' }
        ]
      };
      formData.append("initial_content", JSON.stringify(initialContent));
      
      try {
        // Stop camera before redirect
        stopCamera();
        
        // Let createNote redirect automatically (we intercept it)
        await createNote(formData);
      } catch (e) {
        // Catch NEXT_REDIRECT
      }
      setCameraLoading(false);
    }, "image/jpeg", 0.9);
  };

  return (
    <main className="surface min-h-[calc(100vh-72px)] p-4 sm:p-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-primary flex items-center gap-2">
            <BookOpen className="text-accent" /> Notes
          </h1>
          <p className="mt-1 text-sm text-muted">Your complete IB knowledge and revision workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCommandPaletteOpen(true)} variant="secondary" className="hidden sm:flex items-center gap-2 text-muted hover:text-primary">
            <Search size={16} /> <span className="text-xs font-semibold px-1 py-0.5 rounded">Search</span>
          </Button>
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus size={16} /> New Note
          </Button>
        </div>
      </header>

      {/* Quick Action / Command Area */}
      {notes.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={startCamera} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-divider bg-[var(--surface)] text-sm text-secondary hover:text-primary hover:border-accent transition group">
            <Camera size={14} className="text-accent group-hover:scale-110 transition-transform" /> Quick capture
          </button>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-divider bg-[var(--surface)] text-sm text-secondary hover:text-primary transition">
            <FolderPlus size={14} /> New collection
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-divider bg-[var(--surface)] text-sm text-secondary hover:text-primary transition">
            <DownloadCloud size={14} /> Import document
          </button>
        </div>
      )}

      {/* Main Area */}
      {notes.length === 0 ? (
        // Advanced Empty State
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-accent/10 border border-accent/20 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} />
            </div>
            <h2 className="text-2xl font-semibold text-primary mb-2">Your knowledge workspace is ready.</h2>
            <p className="text-secondary max-w-lg mx-auto">
              Capture your first IB concept, organise your subjects, and let AI help you generate active recall flashcards from your notes.
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-6">
                <Plus size={18} /> Create your first note
              </Button>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-6 text-center">Or start from an IB template</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Revision Summary", desc: "Core concepts & formulas", subject: "Mathematics" },
                { title: "IA Research", desc: "Sources & methodology", subject: "Biology" },
                { title: "Argument Map", desc: "Claims & counterclaims", subject: "TOK" },
                { title: "Essay Plan", desc: "Structure & evidence", subject: "English" }
              ].map(t => (
                <button key={t.title} onClick={() => handleTemplateCreate(t.title)} className="card p-5 text-left hover:border-accent transition group bg-[var(--surface-alt)] border border-divider">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-3 inline-block">{t.subject}</span>
                  <h4 className="font-semibold text-primary group-hover:text-accent transition">{t.title}</h4>
                  <p className="text-xs text-muted mt-2">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main Controls */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 w-full bg-[var(--surface-alt)]" 
                placeholder="Search knowledge base..." 
              />
            </div>
            <div className="flex gap-2">
              {["All", "Favorites", "Archived"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                    categoryFilter === cat ? "bg-accent/10 text-accent border border-accent/20" : "text-muted hover:bg-[var(--surface)] hover:text-primary border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
              <div className="w-px h-8 bg-divider mx-1"></div>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-[var(--surface)] text-primary' : 'text-muted hover:text-primary'}`}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-[var(--surface)] text-primary' : 'text-muted hover:text-primary'}`}>
                <List size={18} />
              </button>
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

          {/* Notes Display */}
          <div className="mt-6">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted">No notes match your filters.</div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredNotes.map(note => (
                  <NoteCard key={note.id} note={note} onToggle={handleToggle} onDeleteClick={() => setDeleteNoteId(note.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotes.map(note => (
                  <NoteListItem key={note.id} note={note} onToggle={handleToggle} onDeleteClick={() => setDeleteNoteId(note.id)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Command Palette Modal */}
      <Modal open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} title="Command Palette">
        <div className="space-y-4">
          <Input 
            autoFocus
            className="w-full bg-[var(--surface-alt)]" 
            placeholder="Search or run a command..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Actions</div>
          <div className="flex flex-col gap-1">
            <button onClick={() => { setIsCommandPaletteOpen(false); setIsCreating(true); }} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-[var(--surface-alt)] text-primary">
              <Plus size={16} className="text-muted" /> Create new note
            </button>
            <button onClick={() => { setIsCommandPaletteOpen(false); setCategoryFilter("Favorites"); }} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-[var(--surface-alt)] text-primary">
              <Star size={16} className="text-muted" /> Open favorites
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal open={isCreating} onClose={() => !loading && setIsCreating(false)} title="New Note">
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary mb-1.5 block">Title</label>
            <Input name="title" required placeholder="e.g. Cell Respiration" autoFocus className="bg-[var(--surface-alt)]" />
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
              <Input name="topic" placeholder="e.g. Metabolism" className="bg-[var(--surface-alt)]" />
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

      {/* Delete Modal */}
      <Modal open={!!deleteNoteId} onClose={() => !isDeleting && setDeleteNoteId(null)} title="Delete Note?">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to permanently delete this note? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-divider">
            <button onClick={() => setDeleteNoteId(null)} className="btn btn-secondary">Cancel</button>
            <form action={async () => {
              setIsDeleting(true);
              try { await deleteNote(deleteNoteId); } catch (e) {}
              setNotes(prev => prev.filter(n => n.id !== deleteNoteId));
              setDeleteNoteId(null);
              setIsDeleting(false);
            }}>
              <Button type="submit" variant="error" className="bg-danger text-white hover:bg-danger/90">
                {isDeleting ? "Deleting..." : "Yes, delete"}
              </Button>
            </form>
          </div>
        </div>
      </Modal>

      {/* Camera Fullscreen Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <h3 className="text-white font-medium flex items-center gap-2"><Camera size={18} /> Quick Capture</h3>
            <button onClick={stopCamera} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
            {cameraLoading && !videoRef.current?.srcObject && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                <Clock size={32} className="animate-spin mb-4" />
                <p>Starting camera...</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 border-[2px] border-white/20 pointer-events-none m-8 rounded-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white -mt-0.5 -ml-0.5 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white -mt-0.5 -mr-0.5 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white -mb-0.5 -ml-0.5 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white -mb-0.5 -mr-0.5 rounded-br-2xl"></div>
            </div>
          </div>
          
          <div className="p-8 bg-black flex justify-center pb-12">
            <button 
              onClick={capturePhoto} 
              disabled={cameraLoading}
              className="w-20 h-20 rounded-full border-[4px] border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {cameraLoading ? (
                <Clock size={24} className="text-white animate-spin" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function NoteCard({ note, onToggle, onDeleteClick }) {
  let previewText = "No content yet.";
  try {
    if (note.content) {
      const parsed = JSON.parse(note.content);
      if (parsed.content && parsed.content.length > 0) {
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
    <Link href={`/dashboard/notes/${note.id}`} className="group card flex flex-col p-5 hover:border-accent/40 transition-all bg-[var(--surface-alt)] border border-divider relative h-52">
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-[10px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {note.subject}
          </span>
          {note.level && (
            <span className="text-[10px] font-semibold tracking-wider text-muted border border-divider px-1.5 py-0.5 rounded-sm">
              {note.level}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 text-muted">
          {note.is_pinned && <Pin size={14} className="text-accent fill-accent/20" />}
          {note.is_favorite && <Star size={14} className="text-yellow-500 fill-yellow-500/20" />}
        </div>
      </div>
      <h3 className="font-semibold text-primary text-base line-clamp-1 mb-1 group-hover:text-accent transition-colors">
        {note.title}
      </h3>
      {note.topic && (
        <p className="text-xs text-accent font-medium mb-2 opacity-80">{note.topic}</p>
      )}
      <p className="text-sm text-secondary line-clamp-2 leading-relaxed flex-1 mt-1 opacity-80">
        {previewText}
      </p>
      {/* Revision Readiness Mock Indicator */}
      {(note.revision_readiness !== null && note.revision_readiness !== undefined && note.revision_readiness > 0) && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 bg-[var(--surface)] rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${note.revision_readiness}%` }}></div>
          </div>
          <span className="text-[10px] text-muted">{note.revision_readiness}%</span>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={12} /> {timeAgo(note.updated_at)}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_favorite", note.is_favorite); }} className="hover:text-yellow-500 transition" title={note.is_favorite ? "Unfavorite" : "Favorite"}>
            <Star size={14} className={note.is_favorite ? "fill-current" : ""} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_pinned", note.is_pinned); }} className="hover:text-accent transition" title={note.is_pinned ? "Unpin" : "Pin"}>
            <Pin size={14} className={note.is_pinned ? "fill-current" : ""} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_archived", note.is_archived); }} className="hover:text-primary transition" title={note.is_archived ? "Restore" : "Archive"}>
            <Archive size={14} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onDeleteClick(); }} className="hover:text-danger transition ml-1" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}

function NoteListItem({ note, onToggle, onDeleteClick }) {
  const timeAgo = (dateStr) => {
    const diffMs = new Date() - new Date(dateStr);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins || 1}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  return (
    <Link href={`/dashboard/notes/${note.id}`} className="group flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-alt)] border border-transparent hover:border-divider transition-all">
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <div className="shrink-0 flex gap-1">
          <Star size={16} className={note.is_favorite ? "text-yellow-500 fill-yellow-500/20" : "text-transparent group-hover:text-muted transition"} />
          <Pin size={16} className={note.is_pinned ? "text-accent fill-accent/20" : "text-transparent group-hover:text-muted transition"} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 overflow-hidden">
          <h3 className="font-semibold text-primary text-sm truncate">{note.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
              {note.subject}
            </span>
            {note.topic && <span className="text-xs text-muted truncate max-w-[150px]">{note.topic}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0 ml-4">
        <span className="text-xs text-muted hidden sm:block">Edited {timeAgo(note.updated_at)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_favorite", note.is_favorite); }} className="text-muted hover:text-yellow-500 transition p-1" title={note.is_favorite ? "Unfavorite" : "Favorite"}>
            <Star size={16} className={note.is_favorite ? "fill-current" : ""} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_pinned", note.is_pinned); }} className="text-muted hover:text-accent transition p-1" title={note.is_pinned ? "Unpin" : "Pin"}>
            <Pin size={16} className={note.is_pinned ? "fill-current" : ""} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onToggle(note.id, "is_archived", note.is_archived); }} className="text-muted hover:text-primary transition p-1" title={note.is_archived ? "Restore" : "Archive"}>
            <Archive size={16} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onDeleteClick(); }} className="text-muted hover:text-danger transition p-1" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}
