"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createDeckAction } from "../actions";

export function CreateDeckModal({ onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData(e.target);
      const newDeck = await createDeckAction(formData);
      onSuccess(newDeck);
    } catch (err) {
      setError(err.message || "Failed to create deck");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--background)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-tight">Create Nexus Card</h2>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white/70">Nexus Card Title</label>
            <input 
              name="title" 
              required 
              autoFocus
              placeholder="e.g. Cell Respiration"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/70">Subject (Optional)</label>
              <select 
                name="subject"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
              >
                <option className="bg-gray-900" value="">None</option>
                <option className="bg-gray-900" value="Biology">Biology</option>
                <option className="bg-gray-900" value="Chemistry">Chemistry</option>
                <option className="bg-gray-900" value="Physics">Physics</option>
                <option className="bg-gray-900" value="Mathematics">Mathematics</option>
                <option className="bg-gray-900" value="Economics">Economics</option>
                <option className="bg-gray-900" value="History">History</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white/70">Topic (Optional)</label>
              <input 
                name="topic" 
                placeholder="e.g. Topic 2"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white/70">Description (Optional)</label>
            <textarea 
              name="description" 
              rows={2}
              placeholder="What is this Nexus Card about?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none custom-scrollbar"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Create Nexus Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
