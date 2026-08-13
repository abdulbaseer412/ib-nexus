"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowLeft, Loader2, Sparkles, AlertCircle, TrendingUp, HelpCircle } from "lucide-react";
import { submitReviewAction } from "../actions";
import { useRouter } from "next/navigation";

export default function ReviewClient({ initialCards, mode, deckId }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  
  // Session Stats
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Reset timer when card changes
    setCardStartTime(Date.now());
    setIsFlipped(false);
  }, [currentIndex]);

  const currentCard = cards[currentIndex];

  const handleReveal = () => {
    setIsFlipped(true);
  };

  const handleRate = async (rating) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const duration = Date.now() - cardStartTime;
    
    try {
      await submitReviewAction(currentCard.id, rating, duration);
      
      // Update session stats
      setStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
      
      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    } catch (e) {
      alert("Failed to submit review. Check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFinished) {
    const total = stats.again + stats.hard + stats.good + stats.easy;
    const strong = stats.good + stats.easy;
    const practice = stats.hard;
    const difficult = stats.again;
    const totalTime = Math.round((Date.now() - sessionStartTime) / 60000); // minutes

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="text-emerald-400 w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Review Complete!</h1>
        <p className="text-white/60 mb-8 font-medium">You reviewed {total} cards in ~{totalTime || "< 1"} minutes.</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="text-2xl font-bold text-emerald-400">{strong}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400/50 mt-1">Strong</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-2xl font-bold text-amber-400">{practice}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400/50 mt-1">Practice</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
            <div className="text-2xl font-bold text-rose-400">{difficult}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-rose-400/50 mt-1">Difficult</div>
          </div>
        </div>
        
        <Link 
          href={deckId ? `/dashboard/flashcards/deck/${deckId}` : "/dashboard/flashcards"}
          className="btn bg-white/10 hover:bg-white/20 text-white font-bold h-12 px-8 rounded-full"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] p-4 max-w-4xl mx-auto">
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between mb-8 shrink-0">
        <button 
          onClick={() => {
            if (confirm("End review session early? Progress on completed cards is saved.")) {
              router.push(deckId ? `/dashboard/flashcards/deck/${deckId}` : "/dashboard/flashcards");
            }
          }}
          className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="flex-1 max-w-md mx-6">
          <div className="flex items-center justify-between text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">
            <span>{mode === 'smart' ? 'Smart Review' : 'Deck Review'}</span>
            <span>{currentIndex + 1} of {cards.length}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* ── FLASHCARD ── */}
      <div className="flex-1 flex flex-col relative perspective-[1000px]">
        
        <div className="absolute inset-x-0 top-0 flex justify-center -translate-y-1/2 z-10 pointer-events-none">
           {currentCard.ib_flashcard_decks?.title && (
             <span className="bg-[#111111] border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-400 shadow-xl">
               {currentCard.ib_flashcard_decks.title}
             </span>
           )}
        </div>

        <div 
          className="flex-1 flex flex-col w-full bg-[var(--background)] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative transition-all duration-300 transform-gpu"
        >
          {/* Front */}
          <div className="flex-1 flex items-center justify-center text-center">
            <h2 className="text-2xl md:text-4xl font-semibold text-white leading-tight">
              {currentCard.front}
            </h2>
          </div>

          {/* Divider */}
          {isFlipped && (
            <div className="w-full h-[1px] bg-white/10 my-8 shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          )}

          {/* Back */}
          <div className={`flex-1 flex flex-col items-center justify-center text-center transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute'}`}>
            {isFlipped && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-lg md:text-2xl text-white/80 leading-relaxed font-medium">
                  {currentCard.back}
                </p>
                
                {currentCard.note_id && (
                  <Link 
                    href={`/dashboard/notes/${currentCard.note_id}`} 
                    target="_blank"
                    className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-sm font-bold transition-colors"
                  >
                    <ArrowLeft size={14} className="rotate-180" /> Open Source Note
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div className="h-32 shrink-0 flex items-center justify-center mt-6">
          {currentCard.is_ai_generated && (
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-full flex items-center gap-2">
                <Sparkles size={12} /> AI Extracted
              </span>
            </div>
          )}
          {!isFlipped ? (
            <button
              onClick={handleReveal}
              className="w-full max-w-md h-14 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-lg rounded-2xl transition-all shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:shadow-[0_0_60px_rgba(99,102,241,0.4)]"
            >
              Reveal Answer
            </button>
          ) : (
            <div className="w-full grid grid-cols-4 gap-2 md:gap-4 max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
              <button 
                disabled={isSubmitting}
                onClick={() => handleRate('again')}
                className="flex flex-col items-center justify-center h-20 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl transition-colors disabled:opacity-50"
              >
                <span className="text-rose-400 font-bold text-lg">Again</span>
                <span className="text-rose-400/50 text-[10px] uppercase tracking-widest mt-1">Forgot</span>
              </button>
              
              <button 
                disabled={isSubmitting}
                onClick={() => handleRate('hard')}
                className="flex flex-col items-center justify-center h-20 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-2xl transition-colors disabled:opacity-50"
              >
                <span className="text-amber-400 font-bold text-lg">Hard</span>
                <span className="text-amber-400/50 text-[10px] uppercase tracking-widest mt-1">Barely</span>
              </button>
              
              <button 
                disabled={isSubmitting}
                onClick={() => handleRate('good')}
                className="flex flex-col items-center justify-center h-20 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl transition-colors disabled:opacity-50"
              >
                <span className="text-emerald-400 font-bold text-lg">Good</span>
                <span className="text-emerald-400/50 text-[10px] uppercase tracking-widest mt-1">Remembered</span>
              </button>
              
              <button 
                disabled={isSubmitting}
                onClick={() => handleRate('easy')}
                className="flex flex-col items-center justify-center h-20 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl transition-colors disabled:opacity-50"
              >
                <span className="text-blue-400 font-bold text-lg">Easy</span>
                <span className="text-blue-400/50 text-[10px] uppercase tracking-widest mt-1">Instant</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
