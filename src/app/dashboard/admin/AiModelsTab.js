"use client";

import { useState, useTransition } from "react";
import {
  Cpu, Star, Pause, Play, Eye, EyeOff, Edit3, Trash2, CheckCircle2,
  AlertTriangle, RefreshCw, X, Sparkles, ShieldCheck, Search, Filter, Layers, Zap
} from "lucide-react";
import {
  fetchAdminModelConfigsAction,
  setAdminDefaultModelAction,
  toggleModelPauseAction,
  toggleModelHideAction,
  updateModelMetadataAction,
  deleteAdminModelAction,
} from "./actions";

const PROVIDER_METADATA = {
  google: {
    name: "Google Gemini",
    label: "GOOGLE",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "High-performance multimodal models built by Google DeepMind.",
  },
  groq: {
    name: "Groq (LPU Accelerator)",
    label: "GROQ",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Ultra-low latency inference on custom Groq LPU hardware.",
  },
  openai: {
    name: "OpenAI",
    label: "OPENAI",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description: "Flagship multi-step reasoning models from OpenAI.",
  },
  together: {
    name: "Together AI",
    label: "TOGETHER AI",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Cloud-hosted open models for long-context work.",
  },
  remote_qwen: {
    name: "Remote Qwen (FastAPI / Ollama)",
    label: "REMOTE QWEN",
    color: "text-teal-400 border-teal-500/30 bg-teal-500/10",
    badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    description: "Private dedicated server AI endpoint.",
  },
};

export default function AiModelsTab({ initialModelConfigs = [] }) {
  const [models, setModels] = useState(initialModelConfigs || []);
  const [isPending, startTransition] = useTransition();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [editModalModel, setEditModalModel] = useState(null);
  const [deleteModalModel, setDeleteModalModel] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Edit Form Fields
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAllowedRoles, setEditAllowedRoles] = useState("all");
  const [editMaxTokens, setEditMaxTokens] = useState(4096);
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editFallbackModelId, setEditFallbackModelId] = useState("gemini-3.6-flash");

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const reloadModels = async () => {
    const res = await fetchAdminModelConfigsAction();
    if (res.success && res.models) {
      setModels(res.models);
    }
  };

  // Handlers
  const handleSetDefault = (modelId) => {
    startTransition(async () => {
      const res = await setAdminDefaultModelAction(modelId);
      if (res.success) {
        if (res.models) setModels(res.models);
        else await reloadModels();
        showToast(res.message || `Set default model to ${modelId}`, "success");
      } else {
        showToast(res.error || "Failed to set default model", "error");
      }
    });
  };

  const handleTogglePause = (modelId, currentPaused) => {
    startTransition(async () => {
      const res = await toggleModelPauseAction(modelId, !currentPaused);
      if (res.success) {
        if (res.models) setModels(res.models);
        else await reloadModels();
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to update pause status", "error");
      }
    });
  };

  const handleToggleHide = (modelId, currentHidden) => {
    startTransition(async () => {
      const res = await toggleModelHideAction(modelId, !currentHidden);
      if (res.success) {
        if (res.models) setModels(res.models);
        else await reloadModels();
        showToast(res.message, "success");
      } else {
        showToast(res.error || "Failed to update visibility", "error");
      }
    });
  };

  const handleOpenEdit = (m) => {
    setEditModalModel(m);
    setEditDisplayName(m.display_name || m.displayName || m.model_id);
    setEditDescription(m.description || "");
    setEditAllowedRoles(m.allowed_roles || m.allowedRoles || "all");
    setEditMaxTokens(m.max_tokens || m.maxTokens || 4096);
    setEditTemperature(m.temperature !== undefined ? m.temperature : 0.7);
    setEditFallbackModelId(m.fallback_model_id || m.fallbackModelId || "gemini-3.6-flash");
  };

  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModalModel) return;

    setIsSubmittingEdit(true);
    const targetId = editModalModel.model_id || editModalModel.id;

    startTransition(async () => {
      const res = await updateModelMetadataAction({
        modelId: targetId,
        displayName: editDisplayName,
        description: editDescription,
        allowedRoles: editAllowedRoles,
        maxTokens: editMaxTokens,
        temperature: editTemperature,
        fallbackModelId: editFallbackModelId,
      });

      setIsSubmittingEdit(false);
      if (res.success) {
        if (res.models) setModels(res.models);
        else await reloadModels();
        showToast("Model settings updated successfully.", "success");
        setEditModalModel(null);
      } else {
        showToast(res.error || "Failed to update model", "error");
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteModalModel) return;
    const targetId = deleteModalModel.model_id || deleteModalModel.id;

    setIsDeleting(true);
    startTransition(async () => {
      const res = await deleteAdminModelAction(targetId);
      setIsDeleting(false);

      if (res.success) {
        if (res.models) setModels(res.models);
        else await reloadModels();
        showToast(res.message || "Model removed from registry.", "success");
        setDeleteModalModel(null);
      } else {
        showToast(res.error || "Failed to delete model.", "error");
      }
    });
  };

  // Filtered Models
  const filteredModels = models.filter((m) => {
    const id = m.model_id || m.id || "";
    const name = m.display_name || m.displayName || "";
    const provider = m.provider || "";

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!id.toLowerCase().includes(q) && !name.toLowerCase().includes(q) && !provider.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (providerFilter !== "all" && provider.toLowerCase() !== providerFilter.toLowerCase()) {
      return false;
    }

    if (statusFilter === "default" && !m.is_default) return false;
    if (statusFilter === "active" && (m.is_paused || m.is_hidden || m.enabled === false)) return false;
    if (statusFilter === "paused" && !m.is_paused) return false;
    if (statusFilter === "hidden" && !m.is_hidden) return false;

    return true;
  });

  // Grouping by Provider
  const groupedProviders = {};
  filteredModels.forEach((m) => {
    const pKey = m.provider?.toLowerCase() || "other";
    if (!groupedProviders[pKey]) groupedProviders[pKey] = [];
    groupedProviders[pKey].push(m);
  });

  const activeCount = models.filter((m) => !m.is_paused && !m.is_hidden && m.enabled !== false).length;
  const defaultModelObj = models.find((m) => m.is_default);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === "error"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 backdrop-blur-md"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-400" />
            AI Model Control Center
          </h2>
          <p className="text-[var(--muted)] text-xs mt-1">
            Authoritative registry & lifecycle management for every AI model available to Nexus AI.
          </p>
        </div>

        {/* Real-time Summary Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-bold text-[var(--foreground)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Showing {filteredModels.length} models</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-bold text-emerald-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeCount} Active</span>
          </div>

          {defaultModelObj && (
            <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 font-bold text-indigo-300 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" />
              <span>Default: {defaultModelObj.display_name || defaultModelObj.displayName || defaultModelObj.model_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search model by ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[var(--foreground)]"
          />
        </div>

        <div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer text-[var(--foreground)]"
          >
            <option value="all">All Providers</option>
            <option value="google">Google Gemini</option>
            <option value="groq">Groq (LPU)</option>
            <option value="openai">OpenAI</option>
            <option value="together">Together AI</option>
            <option value="remote_qwen">Remote Qwen</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer text-[var(--foreground)]"
          >
            <option value="all">All Lifecycle States</option>
            <option value="default">Default Model</option>
            <option value="active">Active & Available</option>
            <option value="paused">Paused Models</option>
            <option value="hidden">Hidden Models</option>
          </select>
        </div>
      </div>

      {/* Provider-Grouped Model Grid */}
      <div className="space-y-8">
        {Object.keys(groupedProviders).length === 0 ? (
          <div className="py-16 text-center bg-[var(--card)] border border-dashed border-[var(--border)] rounded-3xl space-y-2">
            <Cpu className="w-10 h-10 text-[var(--muted)]/40 mx-auto" />
            <p className="text-sm font-bold text-[var(--foreground)]">No matching models found in registry.</p>
            <p className="text-xs text-[var(--muted)]">Try adjusting your provider or status filter.</p>
          </div>
        ) : (
          Object.entries(groupedProviders).map(([providerKey, pModels]) => {
            const pMeta = PROVIDER_METADATA[providerKey] || {
              name: providerKey.toUpperCase(),
              label: providerKey.toUpperCase(),
              color: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
              badgeBg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
              description: "AI Provider adapter",
            };

            return (
              <div key={providerKey} className="space-y-4">
                {/* Provider Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${pMeta.badgeBg}`}>
                      {pMeta.label}
                    </span>
                    <h3 className="font-extrabold text-base text-[var(--foreground)]">
                      {pMeta.name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--muted)]">
                    {pModels.length} {pModels.length === 1 ? "model" : "models"} configured
                  </span>
                </div>

                {/* Model Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pModels.map((m) => {
                    const isDefault = m.is_default || m.isDefault;
                    const isPaused = m.is_paused || m.isPaused;
                    const isHidden = m.is_hidden || m.isHidden;
                    const isModelActive = !isPaused && !isHidden && m.enabled !== false;

                    return (
                      <div
                        key={m.model_id || m.id}
                        className={`p-5 rounded-3xl border flex flex-col justify-between transition-all space-y-4 ${
                          isDefault
                            ? "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/40 shadow-lg"
                            : isPaused
                            ? "bg-amber-500/5 border-amber-500/20"
                            : isHidden
                            ? "bg-[var(--surface)] border-[var(--border)] opacity-80"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-indigo-500/30"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Top Row: State Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isDefault && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                  <Star size={10} fill="currentColor" className="text-indigo-400" /> DEFAULT MODEL
                                </span>
                              )}

                              {isModelActive && !isDefault && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  ● ACTIVE
                                </span>
                              )}

                              {isPaused && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Pause size={10} /> PAUSED
                                </span>
                              )}

                              {isHidden && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 flex items-center gap-1">
                                  <EyeOff size={10} /> HIDDEN
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Model Name & ID */}
                          <div>
                            <h4 className="font-extrabold text-base text-[var(--foreground)]">
                              {m.display_name || m.displayName || m.model_id}
                            </h4>
                            <p className="text-xs font-mono text-[var(--muted)] mt-0.5 truncate">
                              {m.model_id || m.id}
                            </p>
                            <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed line-clamp-2">
                              {m.description || "No description configured for this AI model."}
                            </p>
                          </div>

                          {/* Capabilities Tags */}
                          {Array.isArray(m.capabilities) && m.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {m.capabilities.map((cap, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Metadata Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--border)]">
                            <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                              <span className="text-[10px] font-black text-[var(--muted)] uppercase block">Max Tokens</span>
                              <span className="font-mono font-bold text-[var(--foreground)]">{m.max_tokens || m.maxTokens || 4096}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                              <span className="text-[10px] font-black text-[var(--muted)] uppercase block">Temperature</span>
                              <span className="font-mono font-bold text-[var(--foreground)]">{m.temperature !== undefined ? m.temperature : 0.7}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Controls Footer */}
                        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                          {/* Row 1: Pause/Resume & Hide/Show */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Pause / Resume Button */}
                            {isPaused ? (
                              <button
                                onClick={() => handleTogglePause(m.model_id || m.id, true)}
                                disabled={isPending}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Play size={13} /> Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePause(m.model_id || m.id, false)}
                                disabled={isPending}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Pause size={13} /> Pause
                              </button>
                            )}

                            {/* Hide / Show Button */}
                            {isHidden ? (
                              <button
                                onClick={() => handleToggleHide(m.model_id || m.id, true)}
                                disabled={isPending}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Eye size={13} /> Show
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleHide(m.model_id || m.id, false)}
                                disabled={isPending}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <EyeOff size={13} /> Hide
                              </button>
                            )}
                          </div>

                          {/* Row 2: Set Default, Edit & Delete */}
                          <div className="flex items-center gap-1.5">
                            {!isDefault ? (
                              <button
                                onClick={() => handleSetDefault(m.model_id || m.id)}
                                disabled={isPending || isPaused || isHidden}
                                className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isPaused || isHidden ? "Cannot set a paused or hidden model as default" : "Set as canonical default"}
                              >
                                <Star size={13} /> Set Default
                              </button>
                            ) : (
                              <div className="flex-1 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-500 text-white shadow-sm flex items-center justify-center gap-1.5">
                                <Star size={13} fill="currentColor" /> Active Default
                              </div>
                            )}

                            <button
                              onClick={() => handleOpenEdit(m)}
                              disabled={isPending}
                              className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                              title="Edit model configuration"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => setDeleteModalModel(m)}
                              disabled={isPending}
                              className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                              title="Permanently delete model from registry"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT MODEL MODAL */}
      {editModalModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base text-[var(--foreground)]">Edit Model Configuration</h3>
              </div>
              <button
                onClick={() => setEditModalModel(null)}
                className="p-1 hover:bg-[var(--surface)] rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModelMetadataSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)] uppercase tracking-wider">Model ID (Read-only)</label>
                <input
                  type="text"
                  readOnly
                  value={editModalModel.model_id || editModalModel.id}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--muted)] cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)] uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-bold text-xs text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)] uppercase tracking-wider">User-Facing Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)] uppercase tracking-wider">User Access Level</label>
                  <select
                    value={editAllowedRoles}
                    onChange={(e) => setEditAllowedRoles(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-bold text-xs text-[var(--foreground)] cursor-pointer"
                  >
                    <option value="all">All Students & Users</option>
                    <option value="premium">Premium Students Only</option>
                    <option value="admin">Admin Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)] uppercase tracking-wider">Max Output Tokens</label>
                  <input
                    type="number"
                    value={editMaxTokens}
                    onChange={(e) => setEditMaxTokens(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)] uppercase tracking-wider">Temperature (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={editTemperature}
                    onChange={(e) => setEditTemperature(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)] uppercase tracking-wider">Fallback Model ID</label>
                  <select
                    value={editFallbackModelId}
                    onChange={(e) => setEditFallbackModelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-bold text-xs text-[var(--foreground)] cursor-pointer"
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditModalModel(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl font-bold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl font-black bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODEL CONFIRMATION MODAL */}
      {deleteModalModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete AI Model from Registry</span>
              </div>
              <button
                onClick={() => setDeleteModalModel(null)}
                disabled={isDeleting}
                className="p-1 hover:bg-[var(--surface)] rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-bold text-[var(--foreground)] text-sm">
                Are you sure you want to permanently delete this model from the Nexus AI Model Registry?
              </p>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1 font-mono text-rose-300 font-medium">
                <p className="font-bold text-sm text-rose-200">
                  {deleteModalModel.display_name || deleteModalModel.displayName}
                </p>
                <p className="text-xs text-rose-400">
                  ID: {deleteModalModel.model_id || deleteModalModel.id} · Provider: {deleteModalModel.provider}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 text-[var(--muted)]">
                <p className="flex items-center gap-1.5 font-bold text-[var(--foreground)] text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Registry Removal & Historical Preservation
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-1 leading-relaxed">
                  <li>The model will be removed from Admin Model Management and user model dropdowns.</li>
                  <li>Backend provider routing and default model selection will immediately update.</li>
                  <li>Historical chat logs, feedback, notes, and resources referencing this model ID will remain intact.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setDeleteModalModel(null)}
                disabled={isDeleting || isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || isPending}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Deleting from Registry...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Confirm Delete Model
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
