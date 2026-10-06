"use client";

import { useState, useTransition, useRef } from "react";
import {
  Sparkles, Plus, Save, CheckCircle2, History, X, AlertTriangle, Play,
  Cpu, ArrowRight, RefreshCw, FileText, Check, ShieldAlert, Layers, Eye,
  Trash2, Lock, ShieldCheck, RotateCcw, Edit3
} from "lucide-react";
import {
  createAdminAiCoreVersionAction,
  activateAdminAiCoreVersionAction,
  compileAdminAiCoreDraftAction,
  rollbackAdminAiCoreVersionAction,
  testAdminAiCoreDraftAction,
  deleteAdminAiCoreRuleAction,
  deleteAdminAiCoreVersionAction
} from "./ai-actions";
import { CONSTITUTION_CATEGORIES, DEFAULT_CORE_RULES, extractCustomRules, parseCoreInstructions } from "@/lib/ai/nexus-compiler";

/**
 * Safely extracts raw natural language instructions from a version object.
 * Prevents raw [META_START] JSON blocks from leaking into UI text displays or textareas.
 */
function getRawText(version) {
  if (!version) return "";
  if (typeof version.raw_instructions === "string" && version.raw_instructions.trim() !== "") {
    return version.raw_instructions.trim();
  }
  if (version.core_instructions) {
    const parsed = parseCoreInstructions(version.core_instructions);
    return (parsed.rawText || "").trim();
  }
  return "";
}

export default function AiCoreTab({ initialCoreVersions, availableModels = [] }) {
  const [coreVersions, setCoreVersions] = useState(initialCoreVersions || []);
  const [isPending, startTransition] = useTransition();

  // Element Refs for smooth scrolling & focus
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [compiledDraft, setCompiledDraft] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);

  // Test Sandbox states
  const [showTestSandbox, setShowTestSandbox] = useState(false);
  const [testPrompt, setTestPrompt] = useState("What is your name and how do you help IB students?");
  const [testModelId, setTestModelId] = useState("gemini-3.6-flash");
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Inspection Modal state
  const [inspectVersion, setInspectVersion] = useState(null);

  // Delete Custom Rule modal state
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  // Delete Core Version modal state
  const [versionToDelete, setVersionToDelete] = useState(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const activeVersion = coreVersions.find((v) => v.is_active);

  const activeRawText = getRawText(activeVersion);
  const activeCustomRules = activeRawText ? extractCustomRules(activeRawText) : [];

  const handleCreateNew = () => {
    setIsEditing(true);
    setCompiledDraft(null);
    setTestResults(null);
    setNewInstructions(activeRawText);

    setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      textareaRef.current?.focus();
    }, 100);
  };

  const handleResetToDefaultsInEditor = () => {
    setNewInstructions("");
    setCompiledDraft(null);
    showToast("Cleared instructions. Save/Publishing now will revert Core to built-in system defaults.", "info");
  };

  const handleLoadActiveInstructions = () => {
    setNewInstructions(activeRawText);
    showToast("Loaded current active natural language instructions.", "info");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewInstructions("");
    setCompiledDraft(null);
    setTestResults(null);
  };

  const handleCompileDraft = () => {
    setIsCompiling(true);
    startTransition(async () => {
      const res = await compileAdminAiCoreDraftAction({ core_instructions: newInstructions });
      setIsCompiling(false);
      if (res.success) {
        setCompiledDraft(res.compiled);
        showToast("Constitution compiled successfully. Review proposed rules below.", "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleSaveDraft = (publish = false) => {
    startTransition(async () => {
      const res = await createAdminAiCoreVersionAction({
        core_instructions: newInstructions,
        publish,
      });

      if (res.success) {
        if (publish) {
          setCoreVersions((prev) =>
            [res.version, ...prev.map((v) => ({ ...v, is_active: false }))]
          );
          showToast(`Nexus Core Version ${res.version.version_number} Published & Activated!`, "success");
        } else {
          setCoreVersions((prev) => [res.version, ...prev]);
          showToast(`Draft Version ${res.version.version_number} saved`, "success");
        }
        setIsEditing(false);
        setNewInstructions("");
        setCompiledDraft(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleActivate = (id) => {
    startTransition(async () => {
      const res = await activateAdminAiCoreVersionAction(id);
      if (res.success) {
        setCoreVersions((prev) =>
          prev.map((v) => ({
            ...v,
            is_active: v.id === id,
          }))
        );
        showToast("Nexus Core Version Activated", "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleRollback = (versionId) => {
    startTransition(async () => {
      const res = await rollbackAdminAiCoreVersionAction(versionId);
      if (res.success) {
        setCoreVersions((prev) =>
          [res.version, ...prev.map((v) => ({ ...v, is_active: false }))]
        );
        showToast(`Rolled back! New Version ${res.version.version_number} published.`, "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleConfirmDeleteRule = () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    startTransition(async () => {
      const res = await deleteAdminAiCoreRuleAction({ ruleText: ruleToDelete });
      setIsDeletingRule(false);
      if (res.success) {
        setCoreVersions((prev) => [
          res.version,
          ...prev.map((v) => ({ ...v, is_active: false })),
        ]);
        showToast(`Custom rule deleted! Activated Version ${res.version.version_number}.`, "success");
        setRuleToDelete(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleConfirmDeleteVersion = () => {
    if (!versionToDelete) return;
    setIsDeletingVersion(true);
    startTransition(async () => {
      const res = await deleteAdminAiCoreVersionAction(versionToDelete.id);
      setIsDeletingVersion(false);
      if (res.success) {
        setCoreVersions(res.versions || []);
        showToast(res.message || `Version ${versionToDelete.version_number} deleted.`, "success");
        setVersionToDelete(null);
      } else {
        showToast(res.error, "error");
      }
    });
  };

  const handleRunComparisonTest = () => {
    setIsTesting(true);
    startTransition(async () => {
      const res = await testAdminAiCoreDraftAction({
        draft_instructions: newInstructions,
        prompt: testPrompt,
        model_id: testModelId,
      });

      setIsTesting(false);
      if (res.success) {
        setTestResults(res);
        showToast("Comparison test completed!", "success");
      } else {
        showToast(res.error, "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === "error"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 backdrop-blur-md"
              : toast.type === "info"
              ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 backdrop-blur-md"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : toast.type === "info" ? <Sparkles size={18} /> : <CheckCircle2 size={18} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Nexus AI Core Constitution
          </h2>
          <p className="text-[var(--muted)] text-xs mt-1">
            Central management pipeline for Nexus AI behavior, prompt compilation, conflict resolution & runtime deployment.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <button
              onClick={() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Edit3 className="w-4 h-4 animate-pulse text-purple-400" /> Currently Drafting...
            </button>
          ) : (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Create New Version
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE VERSION BANNER */}
      {activeVersion ? (
        <div className="bg-gradient-to-br from-emerald-500/10 via-indigo-500/5 to-purple-500/5 border border-emerald-500/30 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> Current Active
              </span>
              <span className="font-extrabold text-lg text-[var(--foreground)]">
                Version {activeVersion.version_number}
              </span>
            </div>

            <div className="text-xs font-mono text-[var(--muted)]">
              Published: {new Date(activeVersion.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">CANONICAL IDENTITY</span>
              <p className="font-extrabold text-indigo-400 text-sm">
                {activeVersion.compiled_constitution?.identity?.ai_name || "Nexus"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-1 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">TECHNICAL SUMMARY</span>
              <p className="font-medium text-[var(--foreground)] truncate">
                {activeVersion.summary || "Master identity & behavior rules active across all configured Nexus models."}
              </p>
            </div>
          </div>

          {/* ACTIVE INSTRUCTIONS DISPLAY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">RAW NATURAL LANGUAGE INSTRUCTIONS</span>
              <span className="text-[11px] text-[var(--muted)] font-mono">
                {activeCustomRules.length} Custom Rule(s) Configured
              </span>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 max-h-48 overflow-y-auto font-mono text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
              {activeRawText || (
                <span className="text-[var(--muted)] italic">
                  No custom instructions configured. Nexus AI is operating 100% on built-in system default rules.
                </span>
              )}
            </div>
          </div>

          {/* RULE TYPE BREAKDOWN & DELETION CONTROLS */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Active Core Rules & System Fallbacks
                </h4>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Custom rules refine AI behavior. Built-in default rules serve as permanent system fallbacks when custom rules are deleted.
                </p>
              </div>

              {activeCustomRules.length > 0 && (
                <button
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add / Edit Rules
                </button>
              )}
            </div>

            {/* CUSTOM ADMIN RULES SECTION */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Custom Admin Rules ({activeCustomRules.length})
                </span>
                <span className="text-[11px] text-[var(--muted)]">Admin-added instructions (can be deleted)</span>
              </div>

              {activeCustomRules.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {activeCustomRules.map((ruleText, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Custom Rule #{idx + 1}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-[var(--foreground)] leading-relaxed">
                          "{ruleText}"
                        </p>
                      </div>

                      <button
                        onClick={() => setRuleToDelete(ruleText)}
                        disabled={isPending || isDeletingRule}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Rule</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)] text-xs text-[var(--muted)] text-center">
                  No custom rules configured. Nexus AI is operating entirely on built-in system default rules.
                </div>
              )}
            </div>

            {/* BUILT-IN SYSTEM DEFAULT RULES SECTION */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  Built-In System Default Rules
                </span>
                <span className="text-[11px] text-[var(--muted)]">Permanent system behavior (automatic fallback)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {Object.entries(DEFAULT_CORE_RULES).map(([catKey, rules]) => (
                  <div key={catKey} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                        {CONSTITUTION_CATEGORIES[catKey] || catKey}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1">
                        <Lock size={10} /> System Default
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-[var(--muted)]">
                      {rules.map((r, rIdx) => (
                        <li key={rIdx} className="leading-normal flex items-start gap-1.5">
                          <span className="text-zinc-500 select-none">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 border border-dashed border-[var(--border)] rounded-3xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-[var(--foreground)]">No active Core Constitution published.</p>
          <p className="text-xs text-[var(--muted)]">Nexus AI will use system default fallback rules until you create & publish a version.</p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Version
          </button>
        </div>
      )}

      {/* NEW VERSION EDITOR / DRAFT COMPILER */}
      {isEditing && (
        <div ref={editorRef} className="bg-[var(--card)] border border-indigo-500/30 rounded-3xl p-6 space-y-5 shadow-lg animate-in fade-in-50">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="font-black text-base">Draft New Core Constitution</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadActiveInstructions}
                className="px-3 py-1 rounded-xl text-[11px] font-semibold bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors"
                title="Load Active Instructions"
              >
                Load Active Text
              </button>
              <button
                onClick={handleResetToDefaultsInEditor}
                className="px-3 py-1 rounded-xl text-[11px] font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1"
                title="Clear instructions to revert Core to default rules"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Defaults
              </button>
              <button onClick={handleCancelEdit} className="p-1.5 hover:bg-[var(--surface)] rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Write Natural Language Instructions
              </label>
              <span className="text-[11px] font-mono text-[var(--muted)]">
                {newInstructions.length} characters · {newInstructions.split(/\n+/).filter(Boolean).length} rule line(s)
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder={`Example:\nAlways call yourself Baseer. Help MYP and DP students. When a user's notes are available, prioritize them over general knowledge. Explain complex concepts in simple steps. When information is missing from their notes, clearly say so and then use reliable general knowledge.`}
              className="w-full h-64 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y leading-relaxed text-[var(--foreground)]"
            />
          </div>

          {/* COMPILER CONTROL BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCompileDraft}
                disabled={isCompiling || isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCompiling ? "animate-spin" : ""}`} />
                {isCompiling ? "Compiling & Checking Conflicts..." : "Compile & Validate Draft"}
              </button>

              <button
                onClick={() => setShowTestSandbox(!showTestSandbox)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {showTestSandbox ? "Hide Test Sandbox" : "Test Draft vs Active"}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCancelEdit}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSaveDraft(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[var(--muted)]" /> Save Draft
              </button>

              <button
                onClick={() => handleSaveDraft(true)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Publish & Activate
              </button>
            </div>
          </div>

          {/* COMPILED DRAFT & CONFLICT PREVIEW */}
          {compiledDraft && (
            <div className="mt-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 animate-in fade-in-50">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Proposed Change Summary & Conflicts
                </span>
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  Detected Identity: <strong className="text-indigo-400">{compiledDraft.identity?.ai_name}</strong>
                </span>
              </div>

              <p className="text-xs font-medium text-[var(--foreground)] bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                {compiledDraft.summary}
              </p>

              {/* CONFLICT WARNINGS */}
              {compiledDraft.conflicts && compiledDraft.conflicts.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Potential Conflicts Detected
                  </span>
                  {compiledDraft.conflicts.map((conf, idx) => (
                    <div key={idx} className="text-xs text-rose-300 space-y-0.5">
                      <p className="font-semibold">• {conf.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Zero conflicts detected against active Constitution.
                </div>
              )}

              {/* DIFF PREVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {compiledDraft.diff?.added?.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-400">Added Rules</span>
                    <ul className="space-y-1 text-[var(--foreground)]">
                      {compiledDraft.diff.added.map((r, i) => (
                        <li key={i} className="truncate">+ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {compiledDraft.diff?.removed?.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <span className="text-[10px] font-black uppercase text-rose-400">Removed / Replaced Rules</span>
                    <ul className="space-y-1 text-[var(--muted)]">
                      {compiledDraft.diff.removed.map((r, i) => (
                        <li key={i} className="truncate">- {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEST SANDBOX CONTAINER */}
          {showTestSandbox && (
            <div className="mt-4 p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Test Constitution Sandbox
                </span>
                <span className="text-[11px] text-[var(--muted)]">Run prompt against Active vs Draft Core</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Enter test prompt..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={testModelId}
                    onChange={(e) => setTestModelId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gpt-oss-120b">GPT-OSS 120B</option>
                    <option value="glm-5.3-flash">GLM-5.3 Flash</option>
                  </select>
                  <button
                    onClick={handleRunComparisonTest}
                    disabled={isTesting}
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-purple-500 text-white hover:bg-purple-600 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isTesting ? "Testing..." : "Run Test"}
                  </button>
                </div>
              </div>

              {testResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Current Active Output</span>
                    <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap font-medium leading-relaxed max-h-60 overflow-y-auto">
                      {testResults.activeOutput}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                    <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider">Draft Version Output</span>
                    <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap font-medium leading-relaxed max-h-60 overflow-y-auto">
                      {testResults.draftOutput}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VERSION HISTORY */}
      <div className="space-y-4 pt-2">
        <h3 className="font-extrabold text-base flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--muted)]" />
          Constitution Version History
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {coreVersions.map((v) => (
            <div
              key={v.id}
              className={`p-4 rounded-2xl border transition-all ${
                v.is_active
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-[var(--foreground)]">
                    Version {v.version_number}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      v.is_active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                    }`}
                  >
                    {v.is_active ? "Active" : "Archived"}
                  </span>
                  <span className="text-xs text-[var(--muted)] font-mono">
                    {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setInspectVersion(v)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors flex items-center gap-1.5"
                  >
                    <Eye size={14} /> Inspect
                  </button>

                  {!v.is_active && (
                    <>
                      <button
                        onClick={() => handleActivate(v.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors disabled:opacity-50"
                      >
                        Activate Directly
                      </button>
                      <button
                        onClick={() => handleRollback(v.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50"
                      >
                        Create Version From This
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setVersionToDelete(v)}
                    disabled={isPending || isDeletingVersion}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              {v.summary && (
                <p className="mt-2 text-xs text-[var(--muted)] font-medium line-clamp-1">
                  {v.summary}
                </p>
              )}
            </div>
          ))}

          {coreVersions.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic text-center py-8">
              No Core Constitution versions found in history.
            </p>
          )}
        </div>
      </div>

      {/* INSPECT VERSION MODAL */}
      {inspectVersion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-extrabold text-base">Version {inspectVersion.version_number} Details</h3>
                <p className="text-xs text-[var(--muted)]">
                  Status: {inspectVersion.is_active ? "Active" : "Archived"} · Created: {new Date(inspectVersion.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectVersion(null)}
                className="p-1.5 hover:bg-[var(--surface)] rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {inspectVersion.summary && (
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                  <span className="font-black text-indigo-400 uppercase tracking-wider text-[10px]">Summary</span>
                  <p className="font-medium text-[var(--foreground)] mt-0.5">{inspectVersion.summary}</p>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-black text-[var(--muted)] uppercase tracking-wider text-[10px]">Raw Natural Language Instructions</span>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 font-mono text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {getRawText(inspectVersion) || (
                    <span className="text-[var(--muted)] italic">
                      No custom instructions configured for this version. Operates entirely on system defaults.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectVersion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOM RULE CONFIRMATION MODAL */}
      {ruleToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Custom Rule</span>
              </div>
              <button
                onClick={() => setRuleToDelete(null)}
                disabled={isDeletingRule}
                className="p-1.5 hover:bg-[var(--surface)] rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-[var(--foreground)]">
                Are you sure you want to delete this custom instruction from active Core?
              </p>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 font-mono text-xs text-rose-300 font-medium whitespace-pre-wrap leading-relaxed">
                "{ruleToDelete}"
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 text-[var(--muted)]">
                <p className="flex items-center gap-1.5 font-bold text-[var(--foreground)] text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Automatic Fallback & Audit Trail
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-1 leading-relaxed">
                  <li>Nexus AI will immediately fall back to system default rules for affected behavior.</li>
                  <li>A new version (Version {(activeVersion?.version_number || 0) + 1}) will be recompiled & activated.</li>
                  <li>Version {activeVersion?.version_number} will be preserved in Version History for inspection or restoration.</li>
                  <li>Action will be permanently recorded in Activity Audit Logs.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setRuleToDelete(null)}
                disabled={isDeletingRule || isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDeleteRule}
                disabled={isDeletingRule || isPending}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingRule ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting & Recompiling Core...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete Rule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CORE VERSION CONFIRMATION MODAL */}
      {versionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Version {versionToDelete.version_number}</span>
              </div>
              <button
                onClick={() => setVersionToDelete(null)}
                disabled={isDeletingVersion}
                className="p-1.5 hover:bg-[var(--surface)] rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-[var(--foreground)]">
                Are you sure you want to permanently delete Version {versionToDelete.version_number} from history?
              </p>

              {versionToDelete.is_active && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-4 h-4" /> Warning: Active Version Selected
                  </p>
                  <p>
                    This is currently the active Nexus AI Core version. Deleting it will automatically activate the previous most recent version in history, or fall back to system default rules if no versions remain.
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] font-mono text-[11px] text-[var(--muted)] space-y-1">
                <p>Summary: {versionToDelete.summary || "N/A"}</p>
                <p>Created: {new Date(versionToDelete.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setVersionToDelete(null)}
                disabled={isDeletingVersion || isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDeleteVersion}
                disabled={isDeletingVersion || isPending}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingVersion ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting Version...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
