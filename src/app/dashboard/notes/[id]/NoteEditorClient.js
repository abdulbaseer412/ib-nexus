"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, BrainCircuit, MoreHorizontal, Save, Sparkles, 
  Trash2, Star, Pin, Archive, Settings2, BookOpen, Clock
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { 
  updateNoteContent, 
  updateNoteMetadata, 
  toggleNoteState, 
  deleteNote, 
  duplicateNote,
  generateFlashcards 
} from "../actions";
import { Modal, Button, Input, Dropdown } from "@/components/ui";

export default function NoteEditorClient({ initialNote, allNotes }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  
  // States
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saving...", "Saved", "Error"
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardResult, setFlashcardResult] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Metadata edit states
  const [title, setTitle] = useState(note.title);
  
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

  // Auto-save logic (debounced)
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

  const handleToggleState = async (field) => {
    const currentValue = note[field];
    const res = await toggleNoteState(note.id, field, !currentValue);
    if (res.success) {
      setNote(prev => ({ ...prev, [field]: !currentValue }));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!editor) return;
    setIsGenerating(true);
    setFlashcardResult(null);
    const textContent = editor.getText();
    
    const res = await generateFlashcards(note.id, textContent);
    if (res.error) {
      setFlashcardResult({ error: res.error });
    } else {
      setFlashcardResult({ success: true, count: res.count });
    }
    setIsGenerating(false);
  };

  if (!editor) return null;

  return (
    <main className="surface min-h-[calc(100vh-72px)] flex flex-col md:flex-row">
      {/* Editor Main Area */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full border-r border-divider">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0 sticky top-0 bg-[var(--background)]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/notes" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-alt)] transition text-muted hover:text-primary">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="text-accent">{note.subject}</span>
              {note.topic && (
                <>
                  <span>•</span>
                  <span>{note.topic}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium flex items-center gap-1.5 ${saveStatus === 'Error' ? 'text-danger' : 'text-muted'}`}>
              {saveStatus === 'Saving...' && <Clock size={12} className="animate-spin" />}
              {saveStatus === 'Saved' && <Save size={12} />}
              {saveStatus}
            </span>
            <div className="h-4 w-px bg-divider mx-1"></div>
            
            {/* Action Bar */}
            <button onClick={() => handleToggleState("is_favorite")} className={`p-2 rounded-lg transition ${note.is_favorite ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted hover:bg-[var(--surface-alt)] hover:text-primary'}`}>
              <Star size={18} className={note.is_favorite ? 'fill-current' : ''} />
            </button>
            <button onClick={() => setIsFlashcardModalOpen(true)} className="p-2 rounded-lg hover:bg-accent/10 transition text-accent hover:text-accent-bright" title="Generate Flashcards">
              <BrainCircuit size={18} />
            </button>
            <Dropdown label={<MoreHorizontal size={18} />}>
              <div className="p-1 space-y-0.5">
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
          </div>
        </header>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              className="w-full text-4xl md:text-5xl font-bold bg-transparent text-primary outline-none placeholder:text-muted mb-8 tracking-tight"
            />
            
            {/* Formatting Toolbar (Minimal) */}
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
            </div>

            {/* Tiptap Content */}
            <div className="pb-32">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Connected Learning */}
      <aside className="w-full md:w-80 bg-[var(--surface)] p-6 shrink-0 overflow-y-auto border-t md:border-t-0 md:border-l border-divider hidden lg:block">
        <h3 className="font-semibold text-primary mb-6 flex items-center gap-2">
          <BookOpen size={16} className="text-accent" /> Connected Learning
        </h3>
        
        {/* Intelligence / Metadata */}
        <div className="card p-4 bg-[var(--surface-alt)] mb-8 border border-divider">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-muted">
              <span>Subject</span>
              <span className="font-semibold text-primary">{note.subject}</span>
            </div>
            {note.topic && (
              <div className="flex justify-between items-center text-muted">
                <span>Topic</span>
                <span className="font-semibold text-primary">{note.topic}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-muted">
              <span>Length</span>
              <span className="font-medium text-secondary">{editor.getText().split(/\s+/).length} words</span>
            </div>
          </div>
          <Button onClick={() => setIsFlashcardModalOpen(true)} className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition">
            <BrainCircuit size={14} /> Generate Flashcards
          </Button>
        </div>

        {/* Related Notes */}
        <div>
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Related Notes</h4>
          {relatedNotes.length > 0 ? (
            <div className="space-y-3">
              {relatedNotes.map(n => (
                <Link key={n.id} href={`/dashboard/notes/${n.id}`} className="block group">
                  <div className="p-3 rounded-xl border border-transparent hover:border-divider hover:bg-[var(--surface-alt)] transition">
                    <h5 className="font-medium text-sm text-primary group-hover:text-accent transition line-clamp-1">{n.title}</h5>
                    <p className="text-xs text-muted mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent/50"></span> {n.subject}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No related notes found.</p>
          )}
        </div>
      </aside>

      {/* Flashcards Modal */}
      <Modal open={isFlashcardModalOpen} onClose={() => !isGenerating && setIsFlashcardModalOpen(false)} title="Generate Flashcards">
        <div className="space-y-4">
          <p className="text-sm text-secondary leading-relaxed">
            Let AI extract key concepts from your note and transform them into active-recall flashcards. 
            These will be added directly to your Flashcards dashboard.
          </p>
          
          {flashcardResult && (
            <div className={`p-4 rounded-xl border text-sm ${flashcardResult.error ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'}`}>
              {flashcardResult.error || `Successfully generated ${flashcardResult.count} flashcards!`}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-divider">
            <button onClick={() => setIsFlashcardModalOpen(false)} className="btn btn-secondary">
              {flashcardResult?.success ? 'Close' : 'Cancel'}
            </button>
            {!flashcardResult?.success && (
              <Button onClick={handleGenerateFlashcards} disabled={isGenerating || !editor.getText().trim()} className="flex items-center gap-2">
                {isGenerating ? "Generating..." : <><Sparkles size={16} /> Generate Now</>}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Note?">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to permanently delete <strong>{note.title}</strong>? This action cannot be undone. 
            If you just want to hide it, you can Archive it instead.
          </p>
          <div className="flex justify-end gap-3 pt-4">
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
