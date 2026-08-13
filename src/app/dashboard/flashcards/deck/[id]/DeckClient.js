"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Plus, Edit2, Trash2, Layers, Calendar, Activity, X, FileText, Sparkles, CheckSquare, Square } from "lucide-react";
import { deleteDeckAction, deleteCardAction, createCardAction, updateCardStatusAction, bulkDeleteCardsAction } from "../../actions";
import { useRouter } from "next/navigation";

export default function DeckClient({ initialDeck }) {
  const router = useRouter();
  const [deck, setDeck] = useState(initialDeck);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [priorityDate, setPriorityDate] = useState("");
  
  // Bulk Selection
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDeleteDeck = async () => {
    if (!confirm(`Are you sure you want to delete "${deck.title}"? All cards inside will be permanently deleted.`)) return;
    setIsDeleting(true);
    try {
      await deleteDeckAction(deck.id);
      router.push("/dashboard/flashcards");
    } catch (e) {
      alert("Failed to delete deck");
      setIsDeleting(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await deleteCardAction(cardId);
      setDeck({
        ...deck,
        cards: deck.cards.filter(c => c.id !== cardId),
        total_cards: deck.total_cards - 1,
        // (re-calculating due/mastery perfectly would require full re-iteration, but a quick filter works for UI optimism)
      });
    } catch(e) {
      alert("Failed to delete card");
    }
  };

  // --- Bulk Actions ---
  const toggleSelection = (id) => {
    setSelectedCardIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedCardIds.length === deck.cards.length) {
      setSelectedCardIds([]); // Deselect all
    } else {
      setSelectedCardIds(deck.cards.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedCardIds.length} flashcards?`)) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteCardsAction(selectedCardIds, deck.id);
      setDeck({
        ...deck,
        cards: deck.cards.filter(c => !selectedCardIds.includes(c.id)),
        total_cards: deck.total_cards - selectedCardIds.length
      });
      setSelectedCardIds([]);
    } catch(err) {
      console.error(err);
      alert("Failed to delete selected cards.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Add Card Modal logic
  const handleAddCard = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const newCard = await createCardAction(
        deck.id, 
        formData.get("front"), 
        formData.get("back"), 
        priorityDate ? new Date(priorityDate).toISOString() : null
      );
      setDeck({
        ...deck,
        cards: [newCard, ...deck.cards],
        total_cards: deck.total_cards + 1
      });
      setPriorityDate("");
      setIsAddOpen(false);
    } catch (e) {
      alert("Failed to add card");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="space-y-6">
        <Link href="/dashboard/flashcards" className="inline-flex items-center text-sm font-bold text-white/50 hover:text-white transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Flashcards
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {deck.subject && (
                <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-500/20 uppercase tracking-wider">
                  {deck.subject}
                </span>
              )}
              {deck.topic && (
                <span className="text-white/40 text-sm font-semibold">{deck.topic}</span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">{deck.title}</h1>
            {deck.description && (
              <p className="text-white/60 font-medium max-w-2xl">{deck.description}</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setIsAddOpen(true)}
              className="btn bg-white/10 text-white hover:bg-white/20"
            >
              <Plus size={16} /> Add Card
            </button>
            <Link 
              href={`/dashboard/flashcards/review?deck=${deck.id}`}
              className={`btn ${deck.due_cards > 0 ? "bg-indigo-500 hover:bg-indigo-400" : "bg-indigo-500/50 hover:bg-indigo-500"} text-white`}
            >
              <Play size={16} className={deck.due_cards > 0 ? "fill-white" : ""} /> Review {deck.due_cards > 0 ? `(${deck.due_cards} Due)` : "Nexus Card"}
            </Link>
          </div>
        </div>
      </header>

      {/* ── STATS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <Layers size={18} /> <span className="text-sm font-semibold">Total Cards</span>
          </div>
          <div className="text-2xl font-black text-white">{deck.total_cards}</div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <Calendar size={18} className="text-rose-400" /> <span className="text-sm font-semibold">Due Today</span>
          </div>
          <div className="text-2xl font-black text-white">{deck.due_cards}</div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 text-white/50 mb-2">
            <Activity size={18} className="text-emerald-400" /> <span className="text-sm font-semibold">Mastery</span>
          </div>
          <div className="text-2xl font-black text-white">{isNaN(deck.mastery_percentage) ? 0 : deck.mastery_percentage}%</div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-start">
           <button onClick={handleDeleteDeck} disabled={isDeleting} className="text-rose-500 hover:text-rose-400 font-bold text-sm flex items-center gap-2 transition-colors">
              <Trash2 size={16} /> Delete Nexus Card
           </button>
        </div>
      </div>

      {/* ── CARDS LIST ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase px-1">Cards in this Nexus Card</h3>
        
        {deck.cards.length === 0 ? (
           <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center">
            <Layers className="mx-auto text-white/10 mb-4" size={48} />
            <p className="text-white/60 mb-4 font-medium">This Nexus Card has no cards.</p>
            <button onClick={() => setIsAddOpen(true)} className="btn bg-white/10 text-white hover:bg-white/20 mx-auto">
              Add your first card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {deck.cards.map(card => (
              <CardItem 
                key={card.id} 
                card={card} 
                deckId={deck.id} 
                handleDeleteCard={handleDeleteCard} 
                isSelected={selectedCardIds.includes(card.id)}
                onToggleSelect={() => toggleSelection(card.id)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── ADD CARD MODAL ────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--background)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white tracking-tight">Add New Flashcard</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCard} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">Front (Question)</label>
                <textarea name="front" required autoFocus rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" placeholder="What is oxidative phosphorylation?" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">Back (Answer)</label>
                <textarea name="back" required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" placeholder="The process where ATP is formed as a result of the transfer of electrons from NADH or FADH2 to O2 by a series of electron carriers." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white/70">Priority Review Date (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={priorityDate}
                  onChange={(e) => setPriorityDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-white/50">Setting this will force the card to the top of your review queue on this date.</p>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors">
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* ── BULK ACTION TOOLBAR ────────────────────────────────── */}
      {selectedCardIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a2e] border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="text-white font-bold whitespace-nowrap">{selectedCardIds.length} Selected</span>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={selectAll} className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
            {selectedCardIds.length === deck.cards.length ? "Deselect All" : "Select All"}
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

function CardItem({ card: initialCard, handleDeleteCard, isSelected, onToggleSelect }) {
  const [card, setCard] = useState(initialCard);
  const isDue = new Date(card.next_review_at) <= new Date();

  // ... (keeping previous handleCardClick logic) ...
  const handleCardClick = async (e) => {
    // Determine click count
    if (e.detail === 2) {
      // Double click -> Read
      try {
        setCard({ ...card, status: "Read" });
        await updateCardStatusAction(card.id, "Read");
      } catch(err) {
        setCard(initialCard); // revert
      }
    } else if (e.detail === 3) {
      // Triple click -> Mastered
      try {
        setCard({ ...card, status: "Mastered" });
        await updateCardStatusAction(card.id, "Mastered");
      } catch(err) {
        setCard(initialCard); // revert
      }
    }
  };

  // Determine dynamic styling based on status
  let frontTheme = "bg-white/5 border-white/10";
  let backTheme = "bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20";
  let badgeLabel = null;

  if (card.status === "Read") {
    frontTheme = "bg-emerald-500/5 border-emerald-500/20";
    backTheme = "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30";
    badgeLabel = <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Read</span>;
  } else if (card.status === "Mastered") {
    frontTheme = "bg-amber-500/5 border-amber-500/20";
    backTheme = "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30";
    badgeLabel = <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1"><Activity size={10}/> Mastered</span>;
  } else {
    badgeLabel = <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Front</span>;
  }

  return (
    <div className={`group relative h-72 w-full [perspective:1000px] cursor-pointer rounded-3xl ${isSelected ? 'ring-2 ring-indigo-500/50' : ''}`} title="Double-click to mark as Read. Triple-click to mark as Mastered.">
      
      {/* Selection Checkbox (Placed outside the flip container so it stays still) */}
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}
        className={`absolute top-4 right-14 z-20 p-1.5 rounded-lg transition-all ${isSelected ? 'text-indigo-400 opacity-100 bg-indigo-500/10' : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/60 bg-black/20 hover:bg-black/40'}`}
      >
        {isSelected ? <CheckSquare size={18} className="fill-indigo-500/20" /> : <Square size={18} />}
      </button>

      <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]" onClick={handleCardClick}>
        
        {/* ── FRONT ── */}
        <div className={`absolute inset-0 w-full h-full ${frontTheme} border rounded-3xl p-6 flex flex-col justify-center items-center text-center [backface-visibility:hidden] shadow-xl overflow-hidden transition-colors duration-500 ${isSelected ? 'bg-indigo-500/5 border-indigo-500/30' : ''}`}>
           {badgeLabel}
           {card.is_ai_generated && (
             <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={10}/> AI</span>
           )}
           {isDue && !card.is_ai_generated && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500" title="Due for review" />}
           
           <p className="text-white font-medium text-lg md:text-xl line-clamp-5">{card.front}</p>
           
           {card.note_id && (
             <Link href={`/dashboard/notes/${card.note_id}`} className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-indigo-400 transition-colors z-20" onClick={e => e.stopPropagation()}>
               <FileText size={12} /> Source Note
             </Link>
           )}
        </div>
        
        {/* ── BACK ── */}
        <div className={`absolute inset-0 w-full h-full ${backTheme} border rounded-3xl p-6 flex flex-col justify-center items-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-xl overflow-hidden transition-colors duration-500`}>
           <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest opacity-50">Back (Answer)</span>
           
           <div className="absolute top-4 right-4 flex items-center gap-2">
             <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }} className="p-1.5 text-white/30 hover:text-rose-400 bg-black/20 hover:bg-rose-500/10 rounded-lg transition-colors z-20" title="Delete Card">
               <Trash2 size={14} />
             </button>
           </div>
           
           <p className="text-white/90 text-sm md:text-base whitespace-pre-wrap line-clamp-6">{card.back}</p>
        </div>
        
      </div>
    </div>
  );
}
