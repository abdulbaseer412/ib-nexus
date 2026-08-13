"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BrainCircuit, Target, Flame, Activity, Brain, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import { CreateDeckModal } from "./components/CreateDeckModal";

export default function FlashcardsClient({ initialDecks, initialStats, dbError }) {
  const [decks, setDecks] = useState(initialDecks || []);
  const [stats, setStats] = useState(initialStats || { total: 0, due: 0, mastered: 0, retention: 0 });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Compute weak areas from existing decks for display
  const weakDecks = [...decks]
    .filter(d => d.due_cards > 0)
    .sort((a, b) => b.due_cards - a.due_cards)
    .slice(0, 3);

  // Safely handle NaN if stats are somehow broken (e.g., retention calculation on 0 reviews)
  const safeRetention = isNaN(stats.retention) || stats.retention === null ? "—" : `${stats.retention}%`;

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
            <span className="text-indigo-400">scripts/sql/flashcards_v2.sql</span>
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
            <Plus size={16} /> Create Deck
          </button>
        </div>
      </header>

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
            <div className="text-3xl font-black text-white">0 <span className="text-sm font-medium text-white/30">days</span></div>
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
        {/* ── RECENT DECKS ─────────────────────────────────── */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase">All Decks</h3>
          </div>
          
          {decks.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center">
              <Brain className="mx-auto text-white/10 mb-4" size={48} />
              <p className="text-white/60 mb-4 font-medium">You haven't created any decks yet.</p>
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="btn bg-white/10 text-white hover:bg-white/20"
              >
                Create your first deck
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {decks.map(deck => (
                <Link 
                  key={deck.id} 
                  href={`/dashboard/flashcards/deck/${deck.id}`}
                  className="group relative flex flex-col bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all rounded-2xl p-5"
                >
                  <div className="flex justify-between items-start mb-4">
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
              ))}
            </div>
          )}
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
          onClose={() => setIsCreateOpen(false)} 
          onSuccess={(newDeck) => {
            setDecks([newDeck, ...decks]);
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}
