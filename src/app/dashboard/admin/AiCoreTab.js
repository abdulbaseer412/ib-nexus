"use client";

import { useState, useTransition } from "react";
import { Sparkles, Plus, Save, CheckCircle2, History, X } from "lucide-react";
import { createAdminAiCoreVersionAction, activateAdminAiCoreVersionAction } from "./ai-actions";

export default function AiCoreTab({ initialCoreVersions }) {
  const [coreVersions, setCoreVersions] = useState(initialCoreVersions || []);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const activeVersion = coreVersions.find(v => v.is_active);
  const inactiveVersions = coreVersions.filter(v => !v.is_active);

  const handleCreateNew = () => {
    setIsEditing(true);
    setNewInstructions(activeVersion?.core_instructions || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewInstructions("");
  };

  const handleSaveNew = () => {
    if (!newInstructions.trim()) {
      showToast("Instructions cannot be empty", "error");
      return;
    }
    
    startTransition(async () => {
      const res = await createAdminAiCoreVersionAction({ core_instructions: newInstructions });
      if (res.success) {
        setCoreVersions([res.version, ...coreVersions]);
        setIsEditing(false);
        setNewInstructions("");
        showToast("New core version created (inactive)", "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleActivate = (id) => {
    startTransition(async () => {
      const res = await activateAdminAiCoreVersionAction(id);
      if (res.success) {
        setCoreVersions(coreVersions.map(v => ({
          ...v,
          is_active: v.id === id
        })));
        showToast("Nexus Core Version Activated", "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-lg z-50 text-sm font-medium animate-in slide-in-from-bottom-5 ${toast.type === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}>
          {toast.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            Nexus AI Core Constitution
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Manage the master intelligence rules that define Nexus's identity and behavior.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Version
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Draft New Core Constitution</h3>
            <button onClick={handleCancelEdit} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          <textarea
            value={newInstructions}
            onChange={(e) => setNewInstructions(e.target.value)}
            placeholder="SYSTEM SECURITY & RESPONSE STYLE RULES:\n1. IDENTITY: You are Nexus..."
            className="w-full h-96 p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancelEdit}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNew}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : <><Save className="w-4 h-4" /> Save Version</>}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Active Version
          </h3>
          {activeVersion ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Current Active</div>
                  <div className="text-xl font-bold">Version {activeVersion.version_number}</div>
                </div>
              </div>
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap text-[var(--text-secondary)]">
                  {activeVersion.core_instructions}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-6 border border-dashed border-[var(--border)] rounded-2xl text-center">
              <p className="text-[var(--text-secondary)]">No active core version. AI will fall back to local rules.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--text-secondary)]" />
            Version History
          </h3>
          <div className="space-y-3">
            {inactiveVersions.map((v) => (
              <div key={v.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Version {v.version_number}</span>
                  <button
                    onClick={() => handleActivate(v.id)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 bg-[var(--surface-hover)] hover:bg-indigo-500 hover:text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Activate
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {v.core_instructions}
                </p>
              </div>
            ))}
            {inactiveVersions.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] italic">No previous versions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
