"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, BrainCircuit, MoreHorizontal, Save, Sparkles, 
  Trash2, Star, Pin, Archive, Settings2, BookOpen, Clock, 
  CalendarDays, Lightbulb, Target, ArrowRight, LayoutList, CheckCircle2
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { createClient } from "@/utils/supabase-browser";
import { 
  updateNoteContent, 
  updateNoteMetadata, 
  toggleNoteState, 
  deleteNote, 
  duplicateNote,
  generateFlashcards,
  analyzeNoteReadiness
} from "../actions";
import { Modal, Button, Input, Dropdown } from "@/components/ui";

export default function NoteEditorClient({ initialNote, allNotes }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  
  // States
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardResult, setFlashcardResult] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  
  // AI Readiness
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File Upload State
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Metadata edit states
  const [title, setTitle] = useState(note.title);
  const [examImportance, setExamImportance] = useState(note.exam_importance || "Mid-Level");
  
  // Derived Data
  const relatedNotes = allNotes.filter(n => 
    n.id !== note.id && 
    (n.subject === note.subject || n.topic === note.topic)
  ).slice(0, 4);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl border border-divider max-w-full my-4 cursor-pointer hover:border-accent transition-colors',
        },
      }),
      LinkExtension.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-accent underline hover:text-accent/80',
        },
      }),
      Placeholder.configure({ placeholder: "Start typing your notes here..." })
    ],
    content: note.content ? JSON.parse(note.content) : "",
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-p:text-secondary prose-headings:text-primary max-w-none focus:outline-none min-h-[500px] text-base leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("Saving...");
      debouncedSaveContent(editor.getJSON());
    }
  });

  // Auto-save logic
  const debounceTimer = useRef(null);
  const debouncedSaveContent = useCallback((contentJSON) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await updateNoteContent(note.id, JSON.stringify(contentJSON));
        setSaveStatus("Saved");
      } catch (e) {
        setSaveStatus("Error");
      }
    }, 1500);
  }, [note.id]);

  // Title Auto-save
  const titleDebounceTimer = useRef(null);
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus("Saving...");
    
    if (titleDebounceTimer.current) clearTimeout(titleDebounceTimer.current);
    titleDebounceTimer.current = setTimeout(async () => {
      const formData = new FormData();
      formData.append("title", newTitle);
      await updateNoteMetadata(note.id, formData);
      setSaveStatus("Saved");
    }, 1000);
  };

  const handleMetadataChange = async (field, value) => {
    const formData = new FormData();
    formData.append(field, value);
    await updateNoteMetadata(note.id, formData);
  };

  const handleToggleState = async (field) => {
    const currentValue = note[field];
    const res = await toggleNoteState(note.id, field, !currentValue);
    if (res.success) {
      setNote(prev => ({ ...prev, [field]: !currentValue }));
    }
  };


  const handleAnalyzeReadiness = async () => {
    if (!editor) return;
    setIsAnalyzing(true);
    const textContent = editor.getText();
    const res = await analyzeNoteReadiness(note.id, textContent);
    if (res.success) {
      setNote(prev => ({ ...prev, revision_readiness: res.score }));
    }
    setIsAnalyzing(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const supabase = createClient();
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${note.id}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('notes_media')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('notes_media')
      .getPublicUrl(fileName);

    // Insert into editor
    if (file.type.startsWith('image/')) {
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } else {
      // For PDFs and docs, insert as a link
      const linkText = file.name;
      editor.chain().focus().insertContent(`<a href="${publicUrl}" target="_blank">📄 ${linkText}</a> `).run();
    }

    setIsUploading(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Keyboard shortcuts (Cmd+S)
  useEffect(() => {
    const down = (e) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Force save immediately
        if (editor) {
          setSaveStatus("Saving...");
          updateNoteContent(note.id, JSON.stringify(editor.getJSON())).then(() => setSaveStatus("Saved"));
        }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [editor, note.id]);

  if (!editor) return null;

  return (
    <main className="surface min-h-[calc(100vh-72px)] flex flex-col md:flex-row">
      {/* Editor Main Area */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full border-r border-divider">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0 sticky top-0 bg-[var(--background)]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/notes" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-alt)] transition text-muted hover:text-primary">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-full">{note.subject}</span>
              {note.level && <span className="bg-[var(--surface)] px-2 py-0.5 rounded-sm border border-divider">{note.level}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium flex items-center gap-1.5 ${saveStatus === 'Error' ? 'text-danger' : 'text-muted'}`}>
              {saveStatus === 'Saving...' && <Clock size={12} className="animate-spin" />}
              {saveStatus === 'Saved' && <Save size={12} />}
              {saveStatus}
            </span>
            <div className="h-4 w-px bg-divider mx-1"></div>
            
            <button onClick={() => handleToggleState("is_favorite")} className={`p-2 rounded-lg transition ${note.is_favorite ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted hover:bg-[var(--surface-alt)] hover:text-primary'}`}>
              <Star size={18} className={note.is_favorite ? 'fill-current' : ''} />
            </button>
            <Dropdown label={<MoreHorizontal size={18} />}>
              <div className="p-1 space-y-0.5 min-w-[180px]">
                <button onClick={() => handleToggleState("is_pinned")} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--surface-alt)] flex items-center justify-between">
                  {note.is_pinned ? "Unpin Note" : "Pin Note"} <Pin size={14} className="text-muted" />
                </button>
                <button onClick={() => duplicateNote(note.id)} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--surface-alt)] flex items-center justify-between">
                  Duplicate <Sparkles size={14} className="text-muted" />
                </button>
                <button onClick={() => handleToggleState("is_archived")} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--surface-alt)] flex items-center justify-between">
                  {note.is_archived ? "Restore Note" : "Archive Note"} <Archive size={14} className="text-muted" />
                </button>
                <div className="h-px bg-divider my-1"></div>
                <button onClick={() => setIsDeleteModalOpen(true)} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-danger/10 text-danger flex items-center justify-between">
                  Delete Note <Trash2 size={14} />
                </button>
              </div>
            </Dropdown>
            <Button onClick={() => setIsFlashcardModalOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs bg-accent text-white">
              <BrainCircuit size={14} /> Turn into Flashcards
            </Button>
          </div>
        </header>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16">
            
            {/* IB Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted">
              {note.topic && (
                <div className="flex items-center gap-1.5">
                  <LayoutList size={14} />
                  <span>{note.topic}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Target size={14} />
                <select 
                  value={examImportance}
                  onChange={(e) => {
                    setExamImportance(e.target.value);
                    handleMetadataChange("exam_importance", e.target.value);
                  }}
                  className="bg-transparent font-medium hover:text-primary outline-none cursor-pointer"
                >
                  <option value="Least Important">Least Important 🔵</option>
                  <option value="Mid-Level">Mid-Level 🟡</option>
                  <option value="Most Important">Most Important 🔴</option>
                </select>
              </div>
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              className="w-full text-4xl md:text-5xl font-bold bg-transparent text-primary outline-none placeholder:text-[var(--border)] mb-8 tracking-tight"
            />
            
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-1 mb-8 bg-[var(--surface-alt)] border border-divider rounded-xl sticky top-4 z-10 shadow-sm backdrop-blur-md bg-opacity-80">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg text-sm font-semibold w-8 h-8 flex items-center justify-center transition ${editor.isActive('bold') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>B</button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg text-sm italic font-serif w-8 h-8 flex items-center justify-center transition ${editor.isActive('italic') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>I</button>
              <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded-lg text-sm line-through w-8 h-8 flex items-center justify-center transition ${editor.isActive('strike') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>S</button>
              <div className="w-px h-5 bg-divider mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded-lg text-sm font-bold w-8 h-8 flex items-center justify-center transition ${editor.isActive('heading', { level: 1 }) ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>H1</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-lg text-sm font-bold w-8 h-8 flex items-center justify-center transition ${editor.isActive('heading', { level: 2 }) ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>H2</button>
              <div className="w-px h-5 bg-divider mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-lg text-sm w-8 h-8 flex items-center justify-center transition ${editor.isActive('bulletList') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>•</button>
              <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-lg text-sm font-mono w-8 h-8 flex items-center justify-center transition ${editor.isActive('orderedList') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>1.</button>
              <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded-lg text-sm w-8 h-8 flex items-center justify-center transition ${editor.isActive('taskList') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>☑</button>
              <div className="w-px h-5 bg-divider mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded-lg text-sm w-8 h-8 flex items-center justify-center transition ${editor.isActive('blockquote') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>"</button>
              <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded-lg text-sm font-mono w-8 h-8 flex items-center justify-center transition ${editor.isActive('codeBlock') ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-[var(--surface)] hover:text-primary'}`}>{'</>'}</button>
              
              <div className="w-px h-5 bg-divider mx-1"></div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="p-1.5 rounded-lg text-sm w-auto px-3 h-8 flex items-center gap-1.5 justify-center text-muted hover:bg-[var(--surface)] hover:text-primary transition"
              >
                {isUploading ? <Clock size={14} className="animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
                {isUploading ? "Uploading..." : "Attach"}
              </button>
            </div>

            {/* Tiptap Content */}
            <div className="pb-32">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Connected Learning */}
      <aside className="w-full md:w-[340px] bg-[var(--background)] p-6 shrink-0 overflow-y-auto border-t md:border-t-0 md:border-l border-divider hidden lg:block">
        
        {/* Revision Readiness */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Revision Readiness</h4>
          <div className="card p-4 bg-[var(--surface-alt)] border border-divider">
            {(note.revision_readiness !== null && note.revision_readiness !== undefined && note.revision_readiness > 0) ? (
              <>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold tracking-tight text-primary">
                    {note.revision_readiness}%
                  </span>
                  <button onClick={handleAnalyzeReadiness} disabled={isAnalyzing} className="text-[10px] text-accent hover:underline pb-1 disabled:opacity-50">
                    {isAnalyzing ? "Recalculating..." : "Refresh"}
                  </button>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-accent" style={{ width: `${note.revision_readiness}%` }}></div>
                </div>
                <ul className="space-y-2 text-xs text-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-success shrink-0" /> Topic coverage analyzed
                  </li>
                  <li className="flex items-start gap-2">
                    {note.revision_readiness > 50 ? (
                      <><CheckCircle2 size={14} className="text-success shrink-0" /> Sufficient details</>
                    ) : (
                      <><div className="w-3.5 h-3.5 rounded-full border border-dashed border-muted shrink-0 mt-0.5"></div> More details needed</>
                    )}
                  </li>
                </ul>
              </>
            ) : (
              <div className="text-center py-4">
                <span className="block text-2xl font-bold text-muted mb-2">0%</span>
                <p className="text-xs text-secondary mb-4">Not yet evaluated by AI.</p>
                <Button onClick={handleAnalyzeReadiness} disabled={isAnalyzing} className="w-full text-xs py-1.5 flex justify-center items-center gap-2">
                  {isAnalyzing ? "Analyzing..." : <><Sparkles size={14} /> Calculate Readiness</>}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Smart AI Actions */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" /> Smart Insights
          </h4>
          <div className="flex flex-col gap-2">
            <button className="text-left p-3 rounded-xl border border-divider hover:border-accent hover:bg-accent/5 transition flex items-start gap-3 group">
              <Lightbulb size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-semibold text-primary group-hover:text-accent transition">Explain Simply</span>
                <span className="block text-xs text-muted mt-0.5">Have AI break this down</span>
              </div>
            </button>
            <button onClick={() => setIsStudyModalOpen(true)} className="text-left p-3 rounded-xl border border-divider hover:border-accent hover:bg-accent/5 transition flex items-start gap-3 group">
              <CalendarDays size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-semibold text-primary group-hover:text-accent transition">Study this note</span>
                <span className="block text-xs text-muted mt-0.5">Add to your planner</span>
              </div>
            </button>
          </div>
        </div>

        {/* Related Notes */}
        <div>
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BookOpen size={14} className="text-muted" /> Connected Knowledge
          </h4>
          {relatedNotes.length > 0 ? (
            <div className="space-y-2">
              {relatedNotes.map(n => (
                <Link key={n.id} href={`/dashboard/notes/${n.id}`} className="block group">
                  <div className="p-3 rounded-xl border border-transparent hover:border-divider hover:bg-[var(--surface-alt)] transition">
                    <h5 className="font-medium text-sm text-primary group-hover:text-accent transition line-clamp-1">{n.title}</h5>
                    <p className="text-xs text-muted mt-1 flex items-center gap-2">
                      <ArrowRight size={10} className="opacity-50" /> {n.subject}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted p-4 border border-dashed rounded-xl text-center">No connections found.</p>
          )}
        </div>
      </aside>

      {/* Flashcards Modal */}
      <Modal open={isFlashcardModalOpen} onClose={() => setIsFlashcardModalOpen(false)} title="Generate Flashcards">
        <div className="space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3">
             <Sparkles className="text-indigo-400 shrink-0 mt-0.5" size={20} />
             <div>
                <h4 className="text-sm font-bold text-indigo-400 mb-1">AI Generation (Coming Soon)</h4>
                <p className="text-xs text-indigo-400/70 leading-relaxed">
                  The AI Flashcard generator is currently being integrated with the new advanced Spaced Repetition engine. 
                  Soon, you will be able to extract high-yield active recall questions directly from your notes.
                </p>
             </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-divider">
            <button onClick={() => setIsFlashcardModalOpen(false)} className="btn bg-white/10 hover:bg-white/20 text-white">
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Study Planner Modal */}
      <Modal open={isStudyModalOpen} onClose={() => setIsStudyModalOpen(false)} title="Add to Study Planner">
        <div className="space-y-4">
          <p className="text-sm text-secondary leading-relaxed">
            Schedule a focused review session for <strong>{note.title}</strong> in your planner.
          </p>
          <div>
            <label className="text-sm font-medium text-primary mb-1.5 block">When?</label>
            <select className="field w-full bg-[var(--surface-alt)]">
              <option>Today</option>
              <option>Tomorrow</option>
              <option>Next Week</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-divider">
            <button onClick={() => setIsStudyModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <Button onClick={() => setIsStudyModalOpen(false)}>Schedule Session</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Note?">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to permanently delete <strong>{note.title}</strong>? This action cannot be undone. 
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-divider">
            <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <form action={() => deleteNote(note.id)}>
              <Button type="submit" variant="error" className="bg-danger text-white hover:bg-danger/90">
                Yes, delete note
              </Button>
            </form>
          </div>
        </div>
      </Modal>
    </main>
  );
}
