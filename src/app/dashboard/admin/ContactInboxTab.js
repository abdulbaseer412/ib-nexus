"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Mail, Bug, ShieldAlert, Sparkles, MessageCircle, Building2, 
  CreditCard, Scale, HelpCircle, Search, Filter, CheckCircle2, 
  Clock, AlertTriangle, ChevronRight, X, ExternalLink, Trash2, Send, Save, RefreshCw, CheckSquare, Square
} from "lucide-react";
import { 
  updateContactMessageStatusAction, 
  deleteContactMessageAction, 
  deleteMultipleContactMessagesAction,
  clearAllContactMessagesAction,
  fetchContactMessagesAction 
} from "./actions";

const CATEGORY_MAP = {
  bug: { label: "Bug Report", icon: Bug, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  account: { label: "Account Access", icon: ShieldAlert, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  support: { label: "Product Support", icon: MessageCircle, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  feedback: { label: "Feature Request", icon: Sparkles, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  feature: { label: "Feature Request", icon: Sparkles, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  business: { label: "School Partnership", icon: Building2, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  billing: { label: "Billing Inquiry", icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  privacy: { label: "Privacy / Legal", icon: Scale, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  other: { label: "General Inquiry", icon: HelpCircle, color: "text-slate-300 bg-slate-500/10 border-slate-500/20" },
};

const STATUS_MAP = {
  pending: { label: "Pending", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  in_progress: { label: "In Progress", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  resolved: { label: "Resolved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  archived: { label: "Archived", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

export default function ContactInboxTab({ initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Selection & Bulk deletion states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null); // null | { type: 'single' | 'selected' | 'all', id?: string }

  const isRefreshing = isPending;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const refreshMessages = async () => {
    startTransition(async () => {
      const res = await fetchContactMessagesAction();
      if (res.success) {
        setMessages(res.messages);
      }
    });
  };

  // Metrics
  const totalCount = messages.length;
  const pendingCount = messages.filter(m => m.status === "pending" || !m.status).length;
  const inProgressCount = messages.filter(m => m.status === "in_progress").length;
  const resolvedCount = messages.filter(m => m.status === "resolved").length;

  // Filtered List
  const filteredMessages = messages.filter(m => {
    const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || (m.status || "pending") === selectedStatus;
    
    const searchWords = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matchesSearch = searchWords.length === 0 || searchWords.every(word => 
      (m.name || "").toLowerCase().includes(word) ||
      (m.email || "").toLowerCase().includes(word) ||
      (m.message || "").toLowerCase().includes(word) ||
      (m.category || "").toLowerCase().includes(word)
    );
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const visibleIds = filteredMessages.map(m => m.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const handleToggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleOpenDetail = (msg) => {
    if (isSelectMode) {
      handleToggleSelect(msg.id);
      return;
    }
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || "");
  };

  const handleStatusChange = async (msgId, newStatus) => {
    setBanner(null);
    startTransition(async () => {
      const res = await updateContactMessageStatusAction({
        messageId: msgId,
        status: newStatus,
        adminNotes: adminNotes,
      });

      if (res.success) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: newStatus, admin_notes: adminNotes } : m));
        if (selectedMessage?.id === msgId) {
          setSelectedMessage(prev => ({ ...prev, status: newStatus, admin_notes: adminNotes }));
        }
        setBanner({ type: "success", text: `Status updated to "${STATUS_MAP[newStatus]?.label || newStatus}"` });
      } else {
        setBanner({ type: "error", text: res.error || "Failed to update status." });
      }
    });
  };

  const handleExecuteDelete = async () => {
    if (!confirmModal) return;
    const { type, id } = confirmModal;
    setConfirmModal(null);
    setBanner(null);

    startTransition(async () => {
      if (type === "single") {
        const res = await deleteContactMessageAction(id);
        if (res.success) {
          setMessages(prev => prev.filter(m => m.id !== id));
          setSelectedIds(prev => prev.filter(i => i !== id));
          if (selectedMessage?.id === id) setSelectedMessage(null);
          setBanner({ type: "success", text: "Contact request deleted." });
        } else {
          setBanner({ type: "error", text: res.error || "Failed to delete request." });
        }
      } else if (type === "selected") {
        const count = selectedIds.length;
        const res = await deleteMultipleContactMessagesAction(selectedIds);
        if (res.success) {
          setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
          if (selectedMessage && selectedIds.includes(selectedMessage.id)) {
            setSelectedMessage(null);
          }
          setSelectedIds([]);
          setIsSelectMode(false);
          setBanner({ type: "success", text: `Successfully deleted ${count} selected request(s).` });
        } else {
          setBanner({ type: "error", text: res.error || "Failed to delete selected requests." });
        }
      } else if (type === "all") {
        const res = await clearAllContactMessagesAction();
        if (res.success) {
          setMessages([]);
          setSelectedIds([]);
          setSelectedMessage(null);
          setIsSelectMode(false);
          setBanner({ type: "success", text: "All contact messages and feedback have been cleared." });
        } else {
          setBanner({ type: "error", text: res.error || "Failed to clear all messages." });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
            <Mail className="w-3.5 h-3.5" /> Support & Contact Management
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Contact Inbox & Support Requests</h2>
          <p className="text-xs text-slate-400 mt-1">Review, categorize, track, and purge incoming user inquiries, support tickets, and feedback.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshMessages}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} /> Refresh Inbox
          </button>
        </div>
      </div>

      {banner && (
        <div className={`p-4 rounded-2xl text-xs font-bold border ${banner.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
          {banner.text}
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
          <span className="text-2xl font-black text-white">{totalCount}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total Received</span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <span className="text-2xl font-black text-amber-400">{pendingCount}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mt-0.5">Pending Action</span>
        </div>
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
          <span className="text-2xl font-black text-sky-400">{inProgressCount}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-300/80 mt-0.5">In Progress</span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-2xl font-black text-emerald-400">{resolvedCount}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mt-0.5">Resolved</span>
        </div>
      </div>

      {/* Filter, Search & Bulk Actions Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sender, email, or text..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option className="bg-slate-900 text-slate-200" value="all">All Categories</option>
              <option className="bg-slate-900 text-slate-200" value="bug">Bug Reports</option>
              <option className="bg-slate-900 text-slate-200" value="account">Account Access</option>
              <option className="bg-slate-900 text-slate-200" value="support">Product Support</option>
              <option className="bg-slate-900 text-slate-200" value="feedback">Feature Requests</option>
              <option className="bg-slate-900 text-slate-200" value="business">School Inquiry</option>
              <option className="bg-slate-900 text-slate-200" value="billing">Billing Inquiry</option>
              <option className="bg-slate-900 text-slate-200" value="privacy">Privacy / Legal</option>
              <option className="bg-slate-900 text-slate-200" value="other">General Inquiry</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option className="bg-slate-900 text-slate-200" value="all">All Statuses</option>
              <option className="bg-slate-900 text-slate-200" value="pending">Pending</option>
              <option className="bg-slate-900 text-slate-200" value="in_progress">In Progress</option>
              <option className="bg-slate-900 text-slate-200" value="resolved">Resolved</option>
              <option className="bg-slate-900 text-slate-200" value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Selection & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.015] border border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsSelectMode(prev => !prev);
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSelectMode
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {isSelectMode ? "Cancel Selection" : "Select Feedback"}
            </button>

            {isSelectMode && (
              <button
                onClick={handleSelectAllVisible}
                disabled={visibleIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all disabled:opacity-40"
              >
                {allVisibleSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>{allVisibleSelected ? "Deselect All Visible" : `Select All Visible (${visibleIds.length})`}</span>
              </button>
            )}

            {isSelectMode && selectedIds.length > 0 && (
              <button
                onClick={() => setConfirmModal({ type: 'selected' })}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>

          <div>
            {messages.length > 0 && !isSelectMode && (
              <button
                onClick={() => setConfirmModal({ type: 'all' })}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Messages ({messages.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className={`transition-all duration-300 ${isRefreshing ? 'opacity-40 scale-[0.99] blur-[1px] pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/[0.01] border border-white/10 text-slate-400 space-y-2">
            <Mail className="w-10 h-10 mx-auto text-slate-500 opacity-50" />
            <h3 className="text-base font-bold text-white">No Contact Submissions Found</h3>
            <p className="text-xs">No user inquiries match your current search and category filters.</p>
          </div>
        ) : (
          <div className="grid gap-3">
          {filteredMessages.map(msg => {
            const catInfo = CATEGORY_MAP[msg.category] || CATEGORY_MAP.other;
            const statusInfo = STATUS_MAP[msg.status || "pending"] || STATUS_MAP.pending;
            const Icon = catInfo.icon;
            const isSelected = selectedIds.includes(msg.id);

            return (
              <div
                key={msg.id}
                onClick={() => handleOpenDetail(msg)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isSelected
                    ? "bg-indigo-500/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                    : selectedMessage?.id === msg.id 
                    ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10" 
                    : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Select Mode Checkbox */}
                  {isSelectMode && (
                    <div 
                      onClick={(e) => handleToggleSelect(msg.id, e)}
                      className="pt-1 shrink-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-white/20 accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${catInfo.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm tracking-tight truncate">{msg.name || "Anonymous"}</span>
                      <span className="text-xs text-slate-400 font-mono">({msg.email})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {msg.created_at ? new Date(msg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </span>

                  {/* Individual Delete Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmModal({ type: 'single', id: msg.id });
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete this message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Confirmation Modal */}
      {isMounted && confirmModal && createPortal(
        <div className="fixed inset-0 z-[100000] overflow-y-auto overscroll-contain p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="bg-[#121217] border border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-left space-y-5 my-auto relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {confirmModal.type === 'all'
                    ? "Clear All Messages & Feedbacks?"
                    : confirmModal.type === 'selected'
                    ? `Delete ${selectedIds.length} Selected Submissions?`
                    : "Delete Contact Submission?"}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {confirmModal.type === 'all'
                    ? `Are you sure you want to permanently delete ALL ${messages.length} feedback submissions and support messages? This action cannot be undone.`
                    : confirmModal.type === 'selected'
                    ? `Are you sure you want to delete ${selectedIds.length} selected submission(s)? This will permanently remove them from the database.`
                    : "Are you sure you want to delete this contact submission? This action cannot be undone."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Submission Detail Modal / Drawer */}
      {isMounted && selectedMessage && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto overscroll-contain p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center py-6">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative custom-scrollbar my-auto">
              
              <button
                onClick={() => setSelectedMessage(null)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${CATEGORY_MAP[selectedMessage.category]?.color || CATEGORY_MAP.other.color}`}>
                    {CATEGORY_MAP[selectedMessage.category]?.label || selectedMessage.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${STATUS_MAP[selectedMessage.status || "pending"]?.color}`}>
                    {STATUS_MAP[selectedMessage.status || "pending"]?.label}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Contact Submission Details</h3>
                <p className="text-xs text-slate-400">Received on {new Date(selectedMessage.created_at).toLocaleString()}</p>
              </div>

              {/* Sender Info */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Sender Name</span>
                    <span className="text-white font-semibold text-sm">{selectedMessage.name || "Anonymous"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Email Address</span>
                    <a href={`mailto:${selectedMessage.email}`} className="text-indigo-400 hover:underline font-mono text-sm block truncate">
                      {selectedMessage.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Inquiry Message */}
              <div className="space-y-2">
                <span className="text-slate-400 block text-xs font-bold uppercase tracking-wider">Message Content</span>
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-white text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Status Update & Admin Notes */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-white text-xs font-bold block">Update Status</span>
                    <span className="text-[11px] text-slate-400">Change the workflow progress for this inquiry.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {["pending", "in_progress", "resolved", "archived"].map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedMessage.id, st)}
                        disabled={isPending}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                          (selectedMessage.status || "pending") === st 
                            ? `${STATUS_MAP[st]?.color} shadow-sm` 
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {STATUS_MAP[st]?.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Internal Notes */}
                <div className="space-y-2 pt-2">
                  <span className="text-slate-400 block text-xs font-bold uppercase tracking-wider">Admin Internal Notes</span>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add private staff notes on this inquiry (e.g. 'Replied via email on 28 Sep', 'Forwarded to lead engineer')..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <button
                      onClick={() => handleStatusChange(selectedMessage.id, selectedMessage.status || "pending")}
                      disabled={isPending}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-all self-end"
                      title="Save internal notes"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Note
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium px-1">
                    Notes are only visible to staff with admin privileges.
                  </p>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedMessage.email)}&su=${encodeURIComponent("RE: " + (CATEGORY_MAP[selectedMessage.category]?.label || "IB Nexus Support"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" /> Compose Reply in Gmail
                </a>

                <button
                  onClick={() => setConfirmModal({ type: 'single', id: selectedMessage.id })}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Submission
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
