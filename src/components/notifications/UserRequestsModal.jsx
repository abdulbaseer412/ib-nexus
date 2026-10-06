"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BellRing, CheckCircle2, XCircle, Clock, ShieldCheck,
  Search, X, FileText, MessageSquare, Users, AlertCircle,
  HelpCircle, ExternalLink, RefreshCw, CheckCheck, Trash2,
  Inbox, Sparkles, Filter, Plus, Bug, Lightbulb, ChevronRight
} from "lucide-react";
import { Modal, Spinner, Button } from "@/components/ui";
import Link from "next/link";
import {
  fetchUserRequestsAction,
  fetchUserNotificationsAction,
  markAllNotificationsReadAction,
  dismissUserNotificationAction,
  deleteUserNotificationAction,
  submitUserSupportRequestAction
} from "@/app/dashboard/admin/actions";
import { createClient } from "@/utils/supabase-browser";

const TYPE_CONFIG = {
  document_upload: { label: "Document Upload", icon: FileText, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  discussion_approval: { label: "Discussion", icon: MessageSquare, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  question_approval: { label: "Question", icon: HelpCircle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  study_group: { label: "Study Group", icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  user_report: { label: "Bug Report", icon: Bug, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  contact_inbox: { label: "Support Inquiry", icon: BellRing, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  feature_request: { label: "Feature Suggestion", icon: Lightbulb, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  rejected: { label: "Action Needed", icon: AlertCircle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  info: { label: "System Update", icon: Sparkles, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
};

function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return iso;
  }
}

export default function UserRequestsModal({ open, onClose, onMarkAllRead }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'notifications' | 'requests'
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState("all"); // 'all' | 'pending' | 'approved' | 'rejected'

  // Quick submission mode
  const [showQuickSubmit, setShowQuickSubmit] = useState(false);
  const [submitType, setSubmitType] = useState("contact_inbox");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDetails, setSubmitDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setSyncing(true);
    try {
      const [reqRes, notifRes] = await Promise.all([
        fetchUserRequestsAction(),
        fetchUserNotificationsAction(),
      ]);

      if (reqRes?.success) {
        setRequests(reqRes.requests || []);
      }
      if (notifRes?.success) {
        setNotifications(notifRes.notifications || []);
      }
    } catch (e) {
      console.warn("[UserRequestsModal] loadAllData error:", e?.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  // Reload when modal opens
  useEffect(() => {
    if (open) {
      loadAllData();
    }
  }, [open, loadAllData]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    let channel = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`user-hub-updates-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
          () => {
            loadAllData(true);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "admin_requests" },
          () => {
            loadAllData(true);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [open, loadAllData]);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onMarkAllRead) onMarkAllRead();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:notifications-updated"));
      }
    } catch (e) {
      console.error("[UserRequestsModal] markAllRead error:", e);
    }
  };

  // Dismiss a notification
  const handleDismissNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await dismissUserNotificationAction(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (onMarkAllRead) onMarkAllRead();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:notifications-updated"));
      }
    } catch (err) {
      console.error("[UserRequestsModal] dismiss error:", err);
    }
  };

  // Quick submit handler
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (!submitTitle.trim()) return;
    setSubmitting(true);
    setSubmitSuccess("");

    try {
      const res = await submitUserSupportRequestAction({
        type: submitType,
        title: submitTitle.trim(),
        details: submitDetails.trim(),
      });

      if (res?.success) {
        setSubmitSuccess("Your submission has been queued! Moderator feedback will appear here.");
        setSubmitTitle("");
        setSubmitDetails("");
        await loadAllData(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nexus:notifications-updated"));
        }
        setTimeout(() => {
          setSubmitSuccess("");
          setShowQuickSubmit(false);
        }, 2200);
      }
    } catch (err) {
      console.error("Quick submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Combined and filtered items
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesFilter = requestFilter === "all" || r.status === requestFilter;
      if (!matchesFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.details?.toLowerCase().includes(q) ||
        r.admin_response?.toLowerCase().includes(q) ||
        r.request_type?.toLowerCase().includes(q)
      );
    });
  }, [requests, requestFilter, searchQuery]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
      );
    });
  }, [notifications, searchQuery]);

  return (
    <Modal open={open} onClose={onClose} title="Activity & Moderator Updates">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Top Description & Subheader */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Real-time status of your submitted past papers, community posts, feature requests, and moderator decisions.
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => loadAllData(false)}
              disabled={syncing}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-all shadow-sm"
              title="Sync updates"
              aria-label="Sync updates"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin text-[var(--accent)]" : ""} />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors border border-[var(--accent)]/20"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowQuickSubmit(!showQuickSubmit)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              <span>{showQuickSubmit ? "Cancel" : "New Request"}</span>
            </button>
          </div>
        </div>

        {/* Quick Submit Form Drawer */}
        {showQuickSubmit && (
          <form
            onSubmit={handleQuickSubmit}
            className="p-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-alt)] space-y-3 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--accent)]" />
                <span>Submit Quick Request to Moderation Team</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickSubmit(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            </div>

            {submitSuccess ? (
              <p className="text-xs font-semibold text-emerald-400 p-2 bg-emerald-500/10 rounded-xl">
                {submitSuccess}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--muted)]">Type</label>
                    <select
                      value={submitType}
                      onChange={(e) => setSubmitType(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] outline-none"
                    >
                      <option value="contact_inbox">Academic Inquiry</option>
                      <option value="user_report">Bug Report</option>
                      <option value="feature_request">Feature Proposal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--muted)]">Subject</label>
                    <input
                      type="text"
                      required
                      value={submitTitle}
                      onChange={(e) => setSubmitTitle(e.target.value)}
                      placeholder="Brief topic..."
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--muted)]">Details</label>
                  <textarea
                    rows={2}
                    value={submitDetails}
                    onChange={(e) => setSubmitDetails(e.target.value)}
                    placeholder="Provide context or explanation..."
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit to Moderators"}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Search inside modal */}
        <div className="relative">
          <div className="relative flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)] transition-all">
            <div className="pl-3 pr-2 text-[var(--muted)]">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates, submissions, moderator responses..."
              className="w-full bg-transparent py-2 pr-8 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="pr-3 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Main Category Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
              {requests.length + notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "notifications"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <BellRing size={12} />
            <span>Moderator Alerts</span>
            {unreadCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "requests"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <FileText size={12} />
            <span>Submissions & Requests</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
              {requests.length}
            </span>
          </button>
        </div>

        {/* Sub-status filters for Requests tab */}
        {activeTab === "requests" && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: "all", label: `All (${requests.length})` },
              { id: "pending", label: `Pending (${requests.filter((r) => r.status === "pending").length})` },
              { id: "approved", label: `Approved (${requests.filter((r) => r.status === "approved").length})` },
              { id: "rejected", label: `Needs Revision (${requests.filter((r) => r.status === "rejected").length})` },
            ].map((subTab) => (
              <button
                key={subTab.id}
                type="button"
                onClick={() => setRequestFilter(subTab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  requestFilter === subTab.id
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Feeds */}
        {loading ? (
          <div className="py-14 text-center space-y-2">
            <Spinner />
            <p className="text-xs text-[var(--muted)]">Syncing latest moderator updates...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* NOTIFICATIONS FEED (Moderator Alerts) */}
            {(activeTab === "all" || activeTab === "notifications") && filteredNotifications.length > 0 && (
              <div className="space-y-2">
                {activeTab === "all" && (
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] px-1">
                    Moderator Alerts & Direct Feedback
                  </p>
                )}
                {filteredNotifications.map((notif) => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                  const IconComp = cfg.icon;

                  return (
                    <div
                      key={`notif-${notif.id}`}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        !notif.is_read
                          ? "bg-[var(--accent)]/5 border-[var(--accent)]/40 shadow-sm"
                          : "bg-[var(--surface)] border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            <IconComp size={11} />
                            <span>{cfg.label}</span>
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)] font-mono">
                            {fmtDate(notif.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDismissNotification(notif.id, e)}
                            className="text-[var(--muted)] hover:text-rose-400 p-0.5"
                            title="Dismiss notification"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-[var(--foreground)]">{notif.title}</h4>
                        <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {notif.target_url && (
                        <div className="pt-1 flex justify-end">
                          <Link
                            href={notif.target_url}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                          >
                            <span>Open Content</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* REQUESTS FEED (Submitted Content & Requests) */}
            {(activeTab === "all" || activeTab === "requests") && filteredRequests.length > 0 && (
              <div className="space-y-2">
                {activeTab === "all" && filteredNotifications.length > 0 && (
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] px-1 pt-2">
                    Submitted Content & Support Inquiries
                  </p>
                )}
                {filteredRequests.map((r) => {
                  const cfg = TYPE_CONFIG[r.request_type] || {
                    label: "Inquiry",
                    icon: BellRing,
                    color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
                  };
                  const IconComp = cfg.icon;

                  return (
                    <div
                      key={`req-${r.id}`}
                      className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            <IconComp size={11} />
                            <span>{cfg.label}</span>
                          </span>

                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            r.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : r.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : r.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}>
                            {r.status === "rejected" ? "Needs Revision" : r.status}
                          </span>
                        </div>

                        <span className="text-[11px] text-[var(--muted)] font-mono shrink-0">
                          {fmtDate(r.created_at)}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">{r.title}</h4>
                        {r.details && (
                          <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">
                            {r.details}
                          </p>
                        )}
                      </div>

                      {/* Moderator Response Display */}
                      {r.admin_response ? (
                        <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs text-[var(--foreground)] space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                            <ShieldCheck size={12} />
                            <span>Moderator Decision & Note</span>
                          </div>
                          <p className="leading-relaxed pl-0.5">{r.admin_response}</p>
                        </div>
                      ) : r.status === "pending" ? (
                        <p className="text-[11px] text-amber-400/90 flex items-center gap-1 font-medium">
                          <Clock size={12} />
                          <span>Under active review by the IB Nexus moderation board</span>
                        </p>
                      ) : null}

                      {/* Direct target link */}
                      {r.status === "approved" && r.target_id && (
                        <div className="pt-1 flex justify-end">
                          <Link
                            href={
                              r.request_type === "document_upload"
                                ? `/dashboard/resources/${r.target_id}`
                                : r.request_type === "discussion_approval" || r.request_type === "question_approval"
                                ? `/dashboard/community/${r.target_id}`
                                : "/dashboard/community"
                            }
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                          >
                            <span>View Live Published Item</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* EMPTY STATE */}
            {filteredNotifications.length === 0 && filteredRequests.length === 0 && (
              <div className="py-14 text-center text-[var(--muted)] text-xs space-y-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 p-6">
                <Inbox className="w-10 h-10 mx-auto opacity-40 mb-1" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[var(--foreground)]">No activity found</p>
                  <p>
                    {searchQuery
                      ? `No updates or requests match "${searchQuery}".`
                      : "You haven't submitted any study material requests or received moderator updates yet."}
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickSubmit(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90"
                  >
                    Submit a Request or Bug
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <Link
            href="/help"
            onClick={onClose}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 font-medium"
          >
            <HelpCircle size={13} />
            <span>Help Centre & Guides</span>
          </Link>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
