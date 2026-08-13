"use client";

import { useState } from "react";
import Link from "next/link";
import { generateFlashcardsFromNotesAction, toggleAIPreferenceAction, bulkDeleteDecksAction } from "./actions";
import { Plus, BrainCircuit, Target, Flame, Activity, Brain, BookOpen, AlertCircle, Sparkles, Check, Settings2, Trash2, CheckSquare, Square } from "lucide-react";
import { CreateDeckModal } from "./components/CreateDeckModal";

export default function FlashcardsClient({ initialDecks, initialStats, initialSmartQueue, dbError }) {
  const [decks, setDecks] = useState(initialDecks || []);
  const [smartQueue, setSmartQueue] = useState(initialSmartQueue || []);
  const [stats, setStats] = useState(initialStats || { total: 0, due: 0, mastered: 0, retention: 0 });
  const [activeTab, setActiveTab] = useState("manual"); // "manual", "ai", "queue"
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(initialStats?.aiEnabled || false);
  const [isTogglingAI, setIsTogglingAI] = useState(false);
  
  // Bulk Selection
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Categorize Decks (Fallback to checking title for '[AI]' if column is missing)
  const manualDecks = decks.filter(d => d.is_ai_generated === false || (d.is_ai_generated == null && !d.title.startsWith("[AI]")));
  const aiDecks = decks.filter(d => d.is_ai_generated === true || (d.is_ai_generated == null && d.title.startsWith("[AI]")));
  const displayDecks = activeTab === "manual" ? manualDecks : aiDecks;

  // Compute weak areas from existing decks for display
  const weakDecks = [...decks]
    .filter(d => d.due_cards > 0)
    .sort((a, b) => b.due_cards - a.due_cards)
    .slice(0, 3);

  // Safely handle NaN if stats are somehow broken (e.g., retention calculation on 0 reviews)
  const safeRetention = isNaN(stats.retention) || stats.retention === null ? "—" : `${stats.retention}%`;

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await generateFlashcardsFromNotesAction();
      if (res.success) {
        window.location.reload();
      }
    } catch (err) {
      setGenerateError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAI = async () => {
    try {
      setIsTogglingAI(true);
      const newState = !aiEnabled;
      await toggleAIPreferenceAction(newState);
      setAiEnabled(newState);
    } catch(err) {
      console.error(err);
    } finally {
      setIsTogglingAI(false);
    }
  };

  // --- Bulk Actions ---
  const toggleSelection = (id) => {
    setSelectedDeckIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedDeckIds.length === displayDecks.length) {
      setSelectedDeckIds([]); // Deselect all
    } else {
      setSelectedDeckIds(displayDecks.map(d => d.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedDeckIds.length} Nexus Cards and all their contents?`)) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteDecksAction(selectedDeckIds);
      setDecks(prev => prev.filter(d => !selectedDeckIds.includes(d.id)));
      setSelectedDeckIds([]);
    } catch(err) {
      console.error(err);
      alert("Failed to delete selected Nexus Cards.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Database Initialization Required</h2>
          <p className="text-white/70 mb-6 text-[15px] leading-relaxed">
            The advanced Spaced Repetition engine has been implemented, but your Supabase database needs the new tables. 
            Please run the SQL migration script.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left font-mono text-xs text-white/80 overflow-x-auto">
            1. Go to Supabase SQL Editor<br/>
            2. Run the script located at:<br/>
            <span className="text-indigo-400">scripts/sql/flashcards_v2.sql</span><br/><br/>
            <span className="text-rose-400 font-bold">Error Details:</span> {dbError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">Flashcards</h1>
          <p className="text-white/50 font-medium">Build durable recall across your IB subjects.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="btn bg-[var(--primary)] text-white hover:brightness-110"
          >
            <Plus size={16} /> Create Nexus Card
          </button>
        </div>
      </header>
      
      {/* ── AI KNOWLEDGE EXTRACTION ─────────────────────────────────── */}
      <section className={`border rounded-3xl p-6 mb-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-500 ${aiEnabled ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20' : 'bg-white/5 border-white/10'}`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Brain size={120} />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
             <Sparkles className={aiEnabled ? "text-indigo-400" : "text-white/40"} size={20} />
             <h2 className="text-lg font-bold text-white tracking-tight">AI Knowledge Extraction</h2>
          </div>
          
          {aiEnabled ? (
            <p className="text-white/70 text-sm leading-relaxed mb-1">
              Nexus AI is actively monitoring your notes. Click the button below to extract high-yield active recall cards. 
              AI-generated cards are marked with high priority and appear first in your review queues.
            </p>
          ) : (
            <p className="text-white/50 text-sm leading-relaxed mb-1">
              Unlock seamless AI integration. Allow the Nexus AI to read your notes and generate beautifully formatted flashcards automatically. Turn this on to supercharge your active recall workflow.
            </p>
          )}
          
          {generateError && <p className="text-rose-400 text-xs font-bold mt-2">{generateError}</p>}
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <button 
            onClick={handleToggleAI}
            disabled={isTogglingAI}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${aiEnabled ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'}`}
          >
            {aiEnabled ? <><Check size={16}/> AI Allowed</> : <><Settings2 size={16}/> Allow AI</>}
          </button>
          
          {aiEnabled && (
            <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="btn bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 animate-in fade-in zoom-in duration-300"
            >
              {isGenerating ? "Scanning..." : "Scan Notes & Extract"}
            </button>
          )}
        </div>
      </section>

      {/* ── SMART REVIEW CTA ──────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-8 md:p-10">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <BrainCircuit size={160} strokeWidth={1} className="text-indigo-400" />
        </div>
        
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold tracking-widest text-xs uppercase mb-4">
            <Sparkles size={14} /> Today's Review
          </div>
          <h2 className="text-3xl font-black text-white mb-2">
            {stats.due > 0 ? `${stats.due} cards due` : "You're all caught up!"}
          </h2>
          <p className="text-white/60 mb-8 font-medium">
            {stats.due > 0 
              ? `Estimated time: ~${Math.ceil(stats.due * 0.7)} minutes. Focus on your weakest topics first.` 
              : "No mandatory reviews scheduled right now. You can create new cards or do an early review."}
          </p>
          
          {stats.due > 0 ? (
            <Link 
              href="/dashboard/flashcards/review?mode=smart"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            >
              Start Smart Review
            </Link>
          ) : (
            <button 
              disabled
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-white/5 text-white/30 font-bold border border-white/5"
            >
              Start Smart Review
            </button>
          )}
        </div>
      </section>

      {/* ── PROGRESS & STATS ──────────────────────────────── */}
      <section>
        <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase mb-4 px-1">Your Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 text-white/50 mb-2">
              <Target size={18} className="text-emerald-400" />
              <span className="text-sm font-semibold">Mastered</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.mastered}</div>
          </div>
          
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 text-white/50 mb-2">
              <Activity size={18} className="text-blue-400" />
              <span className="text-sm font-semibold">Retention</span>
            </div>
            <div className="text-3xl font-black text-white">{safeRetention}</div>
          </div>
          
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 text-white/50 mb-2">
              <Flame size={18} className="text-orange-400" />
              <span className="text-sm font-semibold">Streak</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.streak || 0}</div>
          </div>
          
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 text-white/50 mb-2">
              <BookOpen size={18} className="text-purple-400" />
              <span className="text-sm font-semibold">Total Cards</span>
            </div>
            <div className="text-3xl font-black text-white">{stats.total}</div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        {/* ── MAIN CONTENT AREA ─────────────────────────────────── */}
        <div className="md:col-span-2 space-y-4">
          {/* ── TABS ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-6 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/10">
            
            {/* MANUAL CARDS TAB */}
            <div className="group relative">
              <button 
                onClick={() => setActiveTab("manual")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                <BookOpen size={16} className={activeTab === 'manual' ? 'text-white' : 'text-indigo-400'} />
                My Nexus Cards
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none scale-95 group-hover:scale-100 origin-top">
                <p className="text-xs text-white/70 leading-relaxed font-medium">Flashcard decks that you have created manually.</p>
              </div>
            </div>

            {/* AI CARDS TAB */}
            <div className="group relative">
              <button 
                onClick={() => setActiveTab("ai")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                <Sparkles size={16} className={activeTab === 'ai' ? 'text-white' : 'text-purple-400'} />
                AI Nexus Cards
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none scale-95 group-hover:scale-100 origin-top">
                <p className="text-xs text-white/70 leading-relaxed font-medium">Decks generated entirely by AI based on your notes and subjects.</p>
              </div>
            </div>

            {/* SMART QUEUE TAB */}
            <div className="group relative">
              <button 
                onClick={() => setActiveTab("queue")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                <Flame size={16} className={activeTab === 'queue' ? 'text-white' : 'text-rose-400'} />
                Smart Priority Queue
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-3 bg-[#1a1a2e] border border-rose-500/20 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none scale-95 group-hover:scale-100 origin-top">
                <p className="text-xs text-rose-200/70 leading-relaxed font-medium">An intelligent feed aggregating the top highest-priority cards that need review across all your decks.</p>
              </div>
            </div>

          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase">
              {activeTab === 'queue' ? 'Priority Action Required' : (activeTab === 'ai' ? 'AI Generated Decks' : 'Manually Created Decks')}
            </h3>
          </div>
          
          {activeTab === 'queue' ? (
            /* SMART QUEUE UI */
            smartQueue.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center bg-white/[0.02]">
                <Check className="mx-auto text-emerald-400 mb-4" size={48} />
                <p className="text-white/60 mb-4 font-medium">You're all caught up! No high-priority cards pending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {smartQueue.map((card, idx) => (
                  <div key={card.id} className="group relative flex items-center gap-4 hover:bg-white/[0.08] transition-all rounded-2xl p-4 border bg-white/5 border-white/5 hover:border-white/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-black text-white/30 border border-white/10">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {new Date(card.next_review_at) <= new Date() ? 'DUE NOW' : 'UPCOMING'}
                        </span>
                        <span className="text-xs font-semibold text-white/40 truncate">
                          {card.deck?.subject} — {card.deck?.title}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white truncate pr-8">{card.front}</p>
                    </div>
                    <Link 
                      href={`/dashboard/flashcards/deck/${card.deck?.id}`}
                      className="flex-shrink-0 btn bg-rose-500 hover:bg-rose-400 text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-rose-500/20 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* DECKS GRID (MANUAL / AI) */
            displayDecks.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center bg-white/[0.02]">
                <Brain className="mx-auto text-white/10 mb-4" size={48} />
                <p className="text-white/60 mb-4 font-medium">
                  {activeTab === 'ai' ? "No AI-generated Nexus Cards yet." : "You haven't created any manual Nexus Cards yet."}
                </p>
                {activeTab === 'manual' && (
                  <button 
                    onClick={() => setIsCreateOpen(true)}
                    className="btn bg-white/10 text-white hover:bg-white/20"
                  >
                    Create your first Nexus Card
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {displayDecks.map(deck => {
                const isSelected = selectedDeckIds.includes(deck.id);
                return (
                  <Link 
                    key={deck.id} 
                    href={`/dashboard/flashcards/deck/${deck.id}`}
                    className={`group relative flex flex-col hover:bg-white/[0.08] transition-all rounded-2xl p-5 border ${isSelected ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    {/* Checkbox */}
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelection(deck.id); }}
                      className={`absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-all ${isSelected ? 'text-indigo-400 opacity-100 bg-indigo-500/10' : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/60 bg-black/20 hover:bg-black/40'}`}
                    >
                      {isSelected ? <CheckSquare size={18} className="fill-indigo-500/20" /> : <Square size={18} />}
                    </button>

                    <div className="flex justify-between items-start mb-4 pr-8">
                    <div>
                      {deck.subject && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1 block">
                          {deck.subject}
                        </span>
                      )}
                      <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{deck.title}</h4>
                    </div>
                    {deck.due_cards > 0 && (
                      <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-500/20">
                        {deck.due_cards} due
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between text-white/40 text-sm font-medium">
                    <span>{deck.total_cards} cards</span>
                    <span>{deck.topic || "General"}</span>
                  </div>
                </Link>
              )})}
            </div>
          ))}
        </div>

        {/* ── WEAK AREAS ───────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase px-1">Weak Areas</h3>
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5">
            {weakDecks.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">No weak areas identified yet. Keep reviewing!</p>
            ) : (
              <div className="space-y-4">
                {weakDecks.map(deck => (
                  <div key={`weak-${deck.id}`} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                    <div>
                      <h5 className="text-white font-semibold text-sm">{deck.subject || "General"} — {deck.title}</h5>
                      <p className="text-xs text-white/40">{deck.due_cards} cards struggling</p>
                    </div>
                    <Link 
                      href={`/dashboard/flashcards/review?deck=${deck.id}&mode=weak`}
                      className="text-xs font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500/10 px-3 py-1.5 rounded-full"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <CreateDeckModal 
          isOpen={isCreateOpen} 
          onClose={() => setIsCreateOpen(false)} 
          onSuccess={(newDeck) => {
            setDecks([newDeck, ...decks]);
            setIsCreateOpen(false);
          }}
        />
      )}

      {/* ── BULK ACTION TOOLBAR ────────────────────────────────── */}
      {selectedDeckIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="text-white font-bold whitespace-nowrap">{selectedDeckIds.length} Selected</span>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={selectAll} className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
            {selectedDeckIds.length === decks.length ? "Deselect All" : "Select All"}
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button 
            onClick={handleBulkDelete} 
            disabled={isBulkDeleting}
            className="flex items-center gap-2 text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} /> {isBulkDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
