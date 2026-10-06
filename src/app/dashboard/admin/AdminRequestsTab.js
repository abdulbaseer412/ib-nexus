"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BellRing, CheckCircle2, XCircle, Clock, ShieldCheck,
  Search, Filter, RefreshCw, FileText, MessageSquare,
  Users, AlertCircle, HelpCircle, ArrowRight, Check,
  ChevronDown, X, Pencil, ExternalLink, Sparkles
} from "lucide-react";
import { Button, Modal, Spinner } from "@/components/ui";
import { fetchAdminRequestsAction, resolveAdminRequestAction } from "./actions";

const TYPE_CONFIG = {
  document_upload: { label: "Document Upload", icon: FileText, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  discussion_approval: { label: "Discussion", icon: MessageSquare, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  question_approval: { label: "Question", icon: HelpCircle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  study_group: { label: "Study Group", icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  user_report: { label: "User Report", icon: AlertCircle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  contact_inbox: { label: "Support Inquiry", icon: BellRing, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
};

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
  const [statusFilter, setStatusFilter] = useState("pending"); // 'all' | 'pending' | 'approved' | 'rejected' | 'resolved'
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Action Modals
  const [actionModal, setActionModal] = useState(null); // { request, action: 'approve' | 'reject' | 'resolve' }
  const [adminNote, setAdminNote] = useState("");
  const [editModal, setEditModal] = useState(null); // { request, editData }
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
    const approved = requests.filter(r => r.status === "approved").length;
    const rejected = requests.filter(r => r.status === "rejected").length;
    const resolved = requests.filter(r => r.status === "resolved").length;
    return { pending, approved, rejected, resolved, total: requests.length };
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

  const handleSaveEditAndApprove = async () => {
    if (!editModal) return;
    setSubmitting(true);
    try {
      const { request, editData } = editModal;
      const res = await resolveAdminRequestAction({
        requestId: request.id,
        action: "approved",
        adminResponse: adminNote.trim() || "Approved with editorial adjustments by admin.",
        editData,
      });

      if (!res.success) throw new Error(res.error || "Failed to update and approve");

      setRequests(prev => prev.map(r => r.id === request.id ? res.request : r));
      setBanner(`Changes saved and "${request.title}" approved! Notification sent to student.`);
      setTimeout(() => setBanner(null), 5000);
      setEditModal(null);
      setAdminNote("");
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
              <span>Unified Moderation & Approval Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
              Central Admin Requests Hub
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
              Review and act on all student submissions requiring administrator communication, vetting, or responses. All approvals and rejections automatically update content status and send beautiful user notifications.
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "pending"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50"
                : "border-amber-500/20 bg-amber-500/[0.06] hover:bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.pending}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Awaiting decision</p>
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
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Published & active</p>
          </button>

          <button
            onClick={() => setStatusFilter("rejected")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "rejected"
                ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/50"
                : "border-rose-500/20 bg-rose-500/[0.06] hover:bg-rose-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.rejected}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">With feedback reason</p>
          </button>

          <button
            onClick={() => setStatusFilter("resolved")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "resolved"
                ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50"
                : "border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Resolved</span>
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.resolved}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Inquiries & reports</p>
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
            placeholder="Search by title, student name, email, or content..."
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
            <option value="document_upload">Document Uploads</option>
            <option value="discussion_approval">Discussions</option>
            <option value="question_approval">Questions</option>
            <option value="study_group">Study Groups</option>
            <option value="user_report">User Reports</option>
            <option value="contact_inbox">Support Inquiries</option>
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
              : "No user requests or moderation tasks require attention right now."}
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
                          : r.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : r.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}>
                        {r.status}
                      </span>

                      <span className="text-[11px] text-[var(--muted)]">
                        {fmtDate(r.created_at)}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[var(--foreground)]">
                      {r.title}
                    </h4>

                    {r.details && (
                      <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
                        {r.details}
                      </p>
                    )}

                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 pt-1">
                      <span>Submitted by: <strong className="text-[var(--foreground)]">{r.user_name || "User"}</strong></span>
                      {r.user_email && <span>({r.user_email})</span>}
                    </div>

                    {/* Metadata Pill Strip if present */}
                    {r.metadata && typeof r.metadata === "object" && Object.keys(r.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
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
                        {r.metadata.category && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium text-[var(--foreground)]">
                            {r.metadata.category}
                          </span>
                        )}
                        {r.metadata.file_name && (
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-purple-400 font-mono text-[10px]">
                            {r.metadata.file_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Admin Response Note */}
                    {r.admin_response && (
                      <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] mt-2">
                        <span className="font-bold text-[var(--muted)] block text-[10px] uppercase tracking-wider mb-0.5">Admin Response:</span>
                        <span>{r.admin_response}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
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
                        <Pencil size={13} className="mr-1" /> Edit & Approve
                      </Button>
                    )}

                    {isPending ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActionModal({ request: r, action: "approve" });
                            setAdminNote("");
                          }}
                          className="text-xs h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/10"
                        >
                          <Check size={14} className="mr-1" /> Approve
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
                          <X size={14} className="mr-1" /> Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActionModal({ request: r, action: r.status === "approved" ? "reject" : "approve" });
                          setAdminNote(r.admin_response || "");
                        }}
                        className="text-xs h-8 px-2.5 text-[var(--muted)]"
                      >
                        Change Status
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEditAndApprove}
                disabled={submitting || !editModal.editData.title.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/10"
              >
                {submitting ? <Spinner /> : "Save Changes & Approve"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
