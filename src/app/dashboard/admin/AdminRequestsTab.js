"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BellRing, CheckCircle2, XCircle, Clock, ShieldCheck,
  Search, Filter, RefreshCw, FileText, MessageSquare,
  Users, AlertCircle, HelpCircle, ArrowRight, Check,
  ChevronDown, X, Pencil, ExternalLink, Sparkles,
  Lightbulb, Bug, Trash2, Send, MessageCircle
} from "lucide-react";
import { Button, Modal, Spinner } from "@/components/ui";
import {
  fetchAdminRequestsAction,
  resolveAdminRequestAction,
  replyToUserRequestAction,
  deleteAdminRequestAction
} from "./actions";

const TYPE_CONFIG = {
  document_upload: { label: "Document Upload", icon: FileText, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  discussion_approval: { label: "Discussion", icon: MessageSquare, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  question_approval: { label: "Question", icon: HelpCircle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  study_group: { label: "Study Group", icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  user_report: { label: "Bug Report", icon: Bug, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  technical_bug: { label: "Bug Report", icon: Bug, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  contact_inbox: { label: "Support Inquiry", icon: BellRing, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  feature_request: { label: "Feature Suggestion", icon: Lightbulb, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  past_paper_request: { label: "Study Material", icon: FileText, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
};

const QUICK_REPLY_TEMPLATES = [
  { label: "Roadmap Added", text: "Thank you for the proposal! We have evaluated your suggestion and added it to our product development roadmap." },
  { label: "Bug Fixed", text: "Thank you for reporting this issue. Our engineering team has deployed a fix. Please hard-refresh your browser to see the update." },
  { label: "Investigating", text: "Thank you for reaching out. We are currently investigating this report and will update your ticket once resolved." },
  { label: "Approved & Live", text: "Your submission has been reviewed, approved, and published on IB Nexus for the student community!" },
  { label: "Needs Detail", text: "Thank you for your message. Could you please provide a few additional details or steps to help us reproduce the issue?" },
];

function fmtDate(iso) {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [banner, setBanner] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'in_progress' | 'approved' | 'rejected' | 'resolved'
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Reply Modal
  const [replyModal, setReplyModal] = useState(null); // { request }
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState("resolved");

  // Action Modals
  const [actionModal, setActionModal] = useState(null); // { request, action: 'approve' | 'reject' | 'resolve' }
  const [adminNote, setAdminNote] = useState("");
  const [editModal, setEditModal] = useState(null); // { request, editData }
  const [confirmPublishModal, setConfirmPublishModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchAdminRequestsAction({ status: "all", limit: 100 });
      if (!res.success) throw new Error(res.error || "Failed to load requests");
      setRequests(res.requests || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending").length;
    const inProgress = requests.filter(r => r.status === "in_progress").length;
    const approved = requests.filter(r => r.status === "approved").length;
    const rejected = requests.filter(r => r.status === "rejected").length;
    const resolved = requests.filter(r => r.status === "resolved").length;
    return { pending, inProgress, approved, rejected, resolved, total: requests.length };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const t = (r.title || "").toLowerCase();
        const d = (r.details || "").toLowerCase();
        const u = (r.user_name || "").toLowerCase();
        const e = (r.user_email || "").toLowerCase();
        if (!t.includes(q) && !d.includes(q) && !u.includes(q) && !e.includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, typeFilter, search]);

  const handleSendReply = async () => {
    if (!replyModal) return;
    if (!replyMessage.trim()) {
      alert("Please enter a reply message for the student.");
      return;
    }
    setSubmitting(true);
    try {
      const { request } = replyModal;
      const res = await replyToUserRequestAction({
        requestId: request.id,
        replyMessage: replyMessage.trim(),
        newStatus: replyStatus,
      });

      if (!res.success) throw new Error(res.error || "Failed to send reply");

      setRequests(prev => prev.map(r => r.id === request.id ? res.request : r));
      setBanner(`Reply sent to ${request.user_name || "student"}! Notification sent to their notification tray.`);
      setTimeout(() => setBanner(null), 6000);
      setReplyModal(null);
      setReplyMessage("");
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      const { request, action } = actionModal;
      const res = await resolveAdminRequestAction({
        requestId: request.id,
        action: action === "approve" ? "approved" : action === "reject" ? "rejected" : "resolved",
        adminResponse: adminNote.trim(),
      });

      if (!res.success) throw new Error(res.error || "Failed to process request");

      setRequests(prev => prev.map(r => r.id === request.id ? res.request : r));
      setBanner(`Request "${request.title}" was ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "marked resolved"}! Notification sent to student.`);
      setTimeout(() => setBanner(null), 5000);
      setActionModal(null);
      setAdminNote("");
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditOnly = async () => {
    if (!editModal) return;
    setSubmitting(true);
    try {
      const { request, editData } = editModal;
      const res = await resolveAdminRequestAction({
        requestId: request.id,
        action: "save_only",
        editData,
      });

      if (!res.success) throw new Error(res.error || "Failed to save edits");

      setRequests(prev => prev.map(r => r.id === request.id ? res.request : r));
      setBanner(`Changes to "${editData?.title || request.title}" saved successfully! Resource remains pending review.`);
      setTimeout(() => setBanner(null), 5000);
      setEditModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditAndApprove = async () => {
    const targetModal = confirmPublishModal || editModal;
    if (!targetModal) return;
    setSubmitting(true);
    try {
      const { request, editData } = targetModal;
      const res = await resolveAdminRequestAction({
        requestId: request.id,
        action: "approved",
        adminResponse: adminNote.trim() || "Approved with editorial adjustments by admin.",
        editData,
      });

      if (!res.success) throw new Error(res.error || "Failed to update and approve");

      setRequests(prev => prev.map(r => r.id === request.id ? res.request : r));
      setBanner(`Changes saved and "${editData?.title || request.title}" approved! Published to Community Resources.`);
      setTimeout(() => setBanner(null), 5000);
      setConfirmPublishModal(null);
      setEditModal(null);
      setAdminNote("");
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteConfirmModal) return;
    setSubmitting(true);
    try {
      const res = await deleteAdminRequestAction({ requestId: deleteConfirmModal.id });
      if (!res.success) throw new Error(res.error || "Failed to delete request");
      setRequests(prev => prev.filter(r => r.id !== deleteConfirmModal.id));
      setBanner("Request record deleted successfully.");
      setTimeout(() => setBanner(null), 4000);
      setDeleteConfirmModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--card)] p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <BellRing className="w-3.5 h-3.5" />
              <span>Unified Admin Requests & Response Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
              Central Admin Requests & Tickets Hub
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
              Receive and manage student feature proposals, technical bug reports, past paper requests, and moderation inquiries. Type replies and update statuses — students instantly receive notifications and responses in their top notification bar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadRequests}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 pt-2">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "pending"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50"
                : "border-amber-500/20 bg-amber-500/[0.06] hover:bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.pending}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Awaiting reply</p>
          </button>

          <button
            onClick={() => setStatusFilter("in_progress")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "in_progress"
                ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50"
                : "border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">In Progress</span>
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.inProgress}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Being addressed</p>
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "approved"
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                : "border-emerald-500/20 bg-emerald-500/[0.06] hover:bg-emerald-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.approved}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Published & live</p>
          </button>

          <button
            onClick={() => setStatusFilter("resolved")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "resolved"
                ? "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/50"
                : "border-teal-500/20 bg-teal-500/[0.06] hover:bg-teal-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Resolved</span>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.resolved}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Replied & closed</p>
          </button>

          <button
            onClick={() => setStatusFilter("all")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "all"
                ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/50"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Total Items</span>
              <BellRing className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.total}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">All tickets</p>
          </button>
        </div>
      </div>

      {banner && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{banner}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-emerald-400/60 hover:text-emerald-300">
            <X size={16} />
          </button>
        </div>
      )}

      {err && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <span>{err}</span>
          <button onClick={() => setErr(null)} className="text-rose-400/60 hover:text-rose-300"><X size={16} /></button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by title, student name, email, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field text-xs font-semibold py-2.5 px-3"
          >
            <option value="all">All Statuses ({stats.total})</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="in_progress">In Progress ({stats.inProgress})</option>
            <option value="approved">Approved ({stats.approved})</option>
            <option value="rejected">Rejected ({stats.rejected})</option>
            <option value="resolved">Resolved ({stats.resolved})</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="field text-xs font-semibold py-2.5 px-3"
          >
            <option value="all">All Request Types</option>
            <option value="feature_request">Feature Suggestions</option>
            <option value="technical_bug">Bug Reports</option>
            <option value="contact_inbox">Support Inquiries</option>
            <option value="document_upload">Document Uploads</option>
            <option value="discussion_approval">Discussions</option>
            <option value="question_approval">Questions</option>
            <option value="study_group">Study Groups</option>
            <option value="past_paper_request">Study Material</option>
          </select>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="py-20 text-center">
          <Spinner />
          <p className="text-sm text-[var(--muted)] mt-3">Loading requests hub...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[var(--card)] border border-[var(--border)] p-8">
          <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--muted)]">
            <BellRing size={28} />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">No requests found</h3>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
            {statusFilter !== "all" || typeFilter !== "all" || search
              ? "Try adjusting your filters or search keywords."
              : "No user requests or tickets require attention right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const cfg = TYPE_CONFIG[r.request_type] || { label: r.request_type || "Request", icon: BellRing, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
            const IconComponent = cfg.icon;
            const isPending = r.status === "pending";

            return (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                        <IconComponent size={12} />
                        <span>{cfg.label}</span>
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          : r.status === "in_progress"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          : r.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : r.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      }`}>
                        {r.status === "in_progress" ? "In Progress" : r.status}
                      </span>

                      <span className="text-[11px] text-[var(--muted)]">
                        {fmtDate(r.created_at)}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[var(--foreground)]">
                      {r.title}
                    </h4>

                    {r.details && (
                      <p className="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                        {r.details}
                      </p>
                    )}

                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 pt-1">
                      <span>Submitted by: <strong className="text-[var(--foreground)]">{r.user_name || "Student"}</strong></span>
                      {r.user_email && <span>({r.user_email})</span>}
                    </div>

                    {/* Metadata Pill Strip if present */}
                    {r.metadata && typeof r.metadata === "object" && Object.keys(r.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                        {r.metadata.category && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-[var(--foreground)]">
                            Category: {r.metadata.category}
                          </span>
                        )}
                        {r.metadata.programme && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] uppercase font-semibold text-[var(--foreground)]">
                            {r.metadata.programme}
                          </span>
                        )}
                        {r.metadata.subject && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-[var(--foreground)]">
                            {r.metadata.subject}
                          </span>
                        )}
                        {r.metadata.level && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-[var(--foreground)]">
                            {r.metadata.level}
                          </span>
                        )}
                        {r.metadata.file_name && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-purple-400 font-mono text-[10px]">
                            {r.metadata.file_name}
                          </span>
                        )}
                        {r.metadata.file_url && (
                          <a
                            href={r.metadata.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold text-[11px] transition-colors"
                          >
                            <ExternalLink size={11} />
                            <span>Inspect File</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Admin Response Note */}
                    {r.admin_response && (
                      <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-[var(--foreground)] mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-400 block text-[10px] uppercase tracking-wider">
                            Admin Response Sent to Student:
                          </span>
                          {r.reviewed_at && (
                            <span className="text-[10px] text-[var(--muted)]">{fmtDate(r.reviewed_at)}</span>
                          )}
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{r.admin_response}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Strip */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0 flex-wrap sm:flex-nowrap">
                    {/* Primary: Direct Reply to User */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setReplyModal({ request: r });
                        setReplyMessage(r.admin_response || "");
                        setReplyStatus(r.status === "pending" ? "resolved" : r.status);
                      }}
                      className="text-xs h-9 px-3.5 bg-[var(--accent)] hover:opacity-90 shadow-sm"
                    >
                      <MessageSquare size={13} className="mr-1.5" />
                      <span>{r.admin_response ? "Update Reply" : "Reply to User"}</span>
                    </Button>

                    {/* If document upload or post, allow Admin to edit relevant details before approving */}
                    {(r.request_type === "document_upload" || r.request_type === "discussion_approval" || r.request_type === "question_approval") && isPending && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditModal({
                          request: r,
                          editData: {
                            title: r.title,
                            description: r.details || "",
                            subject: r.metadata?.subject || "",
                            level: r.metadata?.level || "",
                            topic: r.metadata?.topic || "",
                            category: r.metadata?.category || "",
                            programme: r.metadata?.programme || "dp",
                          }
                        })}
                        className="text-xs h-9 px-3"
                      >
                        <Pencil size={13} className="mr-1" /> Edit
                      </Button>
                    )}

                    {isPending && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActionModal({ request: r, action: "approve" });
                            setAdminNote("");
                          }}
                          className="text-xs h-9 px-3 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20"
                        >
                          <Check size={13} className="mr-1" /> Approve
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionModal({ request: r, action: "reject" });
                            setAdminNote("");
                          }}
                          className="text-xs h-9 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <X size={13} className="mr-1" /> Reject
                        </Button>
                      </>
                    )}

                    {/* Delete Option */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmModal(r)}
                      className="p-2 text-[var(--muted)] hover:text-rose-400 transition-colors rounded-xl hover:bg-rose-500/10"
                      title="Delete ticket record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPLY MODAL: ADMIN REPLIES DIRECTLY TO USER */}
      {replyModal && (
        <Modal
          open={Boolean(replyModal)}
          onClose={() => setReplyModal(null)}
          title={`Reply to ${replyModal.request.user_name || "Student"}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">{replyModal.request.title}</span>
                <span>{fmtDate(replyModal.request.created_at)}</span>
              </div>
              <p className="text-[var(--muted)] line-clamp-3">{replyModal.request.details}</p>
              <div className="text-[11px] text-[var(--muted)] pt-1 flex items-center gap-2">
                <span>Student: <strong>{replyModal.request.user_name || "Student"}</strong></span>
                {replyModal.request.user_email && <span>({replyModal.request.user_email})</span>}
              </div>
            </div>

            {/* Quick Templates */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                Quick Response Templates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyMessage(tmpl.text)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Picker */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Update Ticket Status
              </label>
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                className="field w-full text-xs py-2"
              >
                <option value="resolved">Resolved (Recommended — issue resolved or inquiry answered)</option>
                <option value="in_progress">In Progress (Under review or active development)</option>
                <option value="approved">Approved (Accepted suggestion / published content)</option>
                <option value="rejected">Declined / Needs Revision</option>
                <option value="pending">Keep Pending (Send note without changing status)</option>
              </select>
            </div>

            {/* Custom Reply Textarea */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Your Reply Message *
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your message to the student. They will receive this in their notification tray..."
                className="field w-full min-h-[110px] text-xs sm:text-sm"
                rows={4}
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">
                This response will be saved and delivered directly to the student&apos;s notification bar under &ldquo;My Requests & Moderator Updates&rdquo;.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setReplyModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSendReply}
                disabled={submitting || !replyMessage.trim()}
                className="bg-[var(--accent)] text-white hover:opacity-90"
              >
                {submitting ? <Spinner /> : (
                  <>
                    <Send size={13} className="mr-1.5" />
                    <span>Send Reply & Notify Student</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Decision / Action Modal */}
      {actionModal && (
        <Modal
          open={Boolean(actionModal)}
          onClose={() => setActionModal(null)}
          title={actionModal.action === "approve" ? "Approve Request" : actionModal.action === "reject" ? "Reject Request" : "Resolve Request"}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              {actionModal.action === "approve"
                ? `You are approving "${actionModal.request.title}". It will become immediately active and visible on IB Nexus.`
                : actionModal.action === "reject"
                ? `You are rejecting "${actionModal.request.title}". Please provide a clear reason so the student knows why and how to improve.`
                : `You are marking "${actionModal.request.title}" as resolved.`}
            </p>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                {actionModal.action === "reject" ? "Rejection Reason (Required) *" : "Custom Note for Student (Optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  actionModal.action === "reject"
                    ? "e.g. Please format the document title clearly and ensure questions include marks breakdown."
                    : "e.g. Approved! Great summary notes for the community."
                }
                className="field w-full min-h-[90px] text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setActionModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmAction}
                disabled={submitting || (actionModal.action === "reject" && !adminNote.trim())}
                className={actionModal.action === "reject" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}
              >
                {submitting ? <Spinner /> : actionModal.action === "approve" ? "Approve & Notify Student" : actionModal.action === "reject" ? "Reject & Send Reason" : "Resolve Request"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Before Approve Modal */}
      {editModal && (
        <Modal
          open={Boolean(editModal)}
          onClose={() => setEditModal(null)}
          title="Edit Details & Approve"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <p className="text-xs text-[var(--muted)]">
              Refine metadata, correct spelling, or adjust program visibility before approving for the global platform.
            </p>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Title *</label>
              <input
                className="field w-full text-sm"
                value={editModal.editData.title}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  editData: { ...prev.editData, title: e.target.value }
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Description / Summary</label>
              <textarea
                className="field w-full text-sm min-h-[80px]"
                value={editModal.editData.description || editModal.editData.content || ""}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  editData: { ...prev.editData, description: e.target.value, content: e.target.value }
                }))}
                rows={3}
              />
            </div>

            {editModal.request.request_type === "document_upload" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Programme Visibility</label>
                    <select
                      className="field w-full text-xs"
                      value={editModal.editData.programme || "dp"}
                      onChange={(e) => setEditModal(prev => ({
                        ...prev,
                        editData: { ...prev.editData, programme: e.target.value }
                      }))}
                    >
                      <option value="dp">DP Only</option>
                      <option value="myp">MYP Only</option>
                      <option value="both">Both MYP + DP</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Level</label>
                    <select
                      className="field w-full text-xs"
                      value={editModal.editData.level || ""}
                      onChange={(e) => setEditModal(prev => ({
                        ...prev,
                        editData: { ...prev.editData, level: e.target.value }
                      }))}
                    >
                      <option value="">— Standard / General —</option>
                      <option value="SL">SL</option>
                      <option value="HL">HL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Subject</label>
                  <input
                    className="field w-full text-sm"
                    value={editModal.editData.subject || ""}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      editData: { ...prev.editData, subject: e.target.value }
                    }))}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">Custom Note to Student (Optional)</label>
              <textarea
                className="field w-full text-sm"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Title updated for clarity. Approved and published!"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
              <Button variant="ghost" onClick={() => setEditModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveEditOnly}
                disabled={submitting || !editModal.editData.title.trim()}
                className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs font-semibold"
              >
                {submitting ? <Spinner /> : "Save Changes (Keep Pending)"}
              </Button>
              <Button
                variant="primary"
                onClick={() => setConfirmPublishModal(editModal)}
                disabled={submitting || !editModal.editData.title.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/10 text-xs font-semibold"
              >
                Approve & Publish...
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reconfirm Before Publishing Modal */}
      {confirmPublishModal && (
        <Modal
          open={Boolean(confirmPublishModal)}
          onClose={() => setConfirmPublishModal(null)}
          title="Reconfirm Resource Publication"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-200">Confirmation Required Before Publishing</p>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Approving will instantly publish this resource to the public <strong>Community Resources</strong> repository for all students to discover and download. A notification will also be sent to the student author.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs space-y-1.5">
              <div className="font-bold text-[var(--foreground)] text-sm">
                {confirmPublishModal.editData?.title || confirmPublishModal.request.title}
              </div>
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 flex-wrap">
                <span>Programme: <strong className="uppercase text-[var(--foreground)]">{confirmPublishModal.editData?.programme || "DP"}</strong></span>
                {confirmPublishModal.editData?.subject && (
                  <span>· Subject: <strong className="text-[var(--foreground)]">{confirmPublishModal.editData.subject}</strong></span>
                )}
                {confirmPublishModal.editData?.level && (
                  <span>· Level: <strong className="text-[var(--foreground)]">{confirmPublishModal.editData.level}</strong></span>
                )}
              </div>
              {adminNote.trim() && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
                  <span>Note to student: </span>
                  <span className="text-[var(--foreground)] italic">&ldquo;{adminNote.trim()}&rdquo;</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmPublishModal(null)}
                disabled={submitting}
              >
                Go Back to Editing
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEditAndApprove}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20"
              >
                {submitting ? <Spinner /> : "Confirm & Publish to Resources"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <Modal
          open={Boolean(deleteConfirmModal)}
          onClose={() => setDeleteConfirmModal(null)}
          title="Delete Ticket Record"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Are you sure you want to delete the record for &ldquo;{deleteConfirmModal.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeleteConfirmModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteRequest}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-500"
              >
                {submitting ? <Spinner /> : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
