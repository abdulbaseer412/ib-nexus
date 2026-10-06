"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileText, Users, ShieldCheck, Clock, CheckCircle2, XCircle, 
  Search, Filter, RefreshCw, Eye, Pencil, Trash2, Download, 
  ExternalLink, Sparkles, BookOpen, AlertCircle, X, ChevronRight,
  Shield, Check, CalendarDays, Globe
} from "lucide-react";
import { Button, Modal, Alert, Spinner } from "@/components/ui";

const RESOURCE_TYPES = [
  { value: "past_paper",        label: "Past Paper" },
  { value: "markscheme",        label: "Markscheme" },
  { value: "revision_guide",    label: "Revision Guide" },
  { value: "formula_sheet",     label: "Formula Sheet" },
  { value: "ib_guide",          label: "IB Guide" },
  { value: "coursework_example",label: "Coursework Example" },
  { value: "ia_example",        label: "IA Example" },
  { value: "ee_example",        label: "EE Example" },
  { value: "tok_resource",      label: "TOK Resource" },
  { value: "teacher_resource",  label: "Teacher Resource" },
  { value: "study_guide",       label: "Study Guide" },
  { value: "worksheet",         label: "Worksheet" },
  { value: "other",             label: "Other" },
];

const typeLabel = (v) => RESOURCE_TYPES.find(t => t.value === v)?.label || v;

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ResourceSubmissionsTab() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Filters
  const [activeSubTab, setActiveSubTab] = useState("pending"); // 'pending' | 'approved' | 'rejected' | 'all'
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");

  // Action states
  const [workingId, setWorkingId] = useState(null);
  const [previewResource, setPreviewResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);

  // Fetch all community submissions
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // In admin mode, fetching with limit=100 and source=community returns all submissions
      const res = await fetch("/api/resources?limit=100&offset=0");
      if (!res.ok) throw new Error("Failed to load community resources");
      const d = await res.json();
      // Filter for community resources or submissions needing moderation
      const allCommunity = (d.resources || []).filter(r => 
        r.source === "community" || 
        r.visibility === "pending_approval" || 
        r.visibility === "approved" || 
        r.visibility === "rejected"
      );
      setResources(allCommunity);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Derived metrics
  const stats = useMemo(() => {
    const pending = resources.filter(r => r.visibility === "pending_approval").length;
    const approved = resources.filter(r => r.visibility === "approved" || r.visibility === "public").length;
    const rejected = resources.filter(r => r.visibility === "rejected").length;
    const uniquePublishers = new Set(resources.map(r => r.publisher?.id || r.user_id).filter(Boolean)).size;
    return { pending, approved, rejected, contributors: uniquePublishers };
  }, [resources]);

  // Unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set();
    resources.forEach(r => {
      if (r.subject) subjects.add(r.subject);
    });
    return Array.from(subjects).sort();
  }, [resources]);

  // Filtered items
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      // Sub-tab filter
      if (activeSubTab === "pending" && r.visibility !== "pending_approval") return false;
      if (activeSubTab === "approved" && r.visibility !== "approved" && r.visibility !== "public") return false;
      if (activeSubTab === "rejected" && r.visibility !== "rejected") return false;

      // Subject filter
      if (selectedSubject !== "all") {
        if (selectedSubject === "general") {
          if (r.subject) return false;
        } else if (r.subject !== selectedSubject) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (r.title || "").toLowerCase().includes(q);
        const descMatch = (r.description || "").toLowerCase().includes(q);
        const subjMatch = (r.subject || "").toLowerCase().includes(q);
        const topicMatch = (r.topic || "").toLowerCase().includes(q);
        const pubName = (r.publisher?.name || "").toLowerCase().includes(q);
        const pubSchool = (r.publisher?.school_name || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !subjMatch && !topicMatch && !pubName && !pubSchool) {
          return false;
        }
      }

      return true;
    });
  }, [resources, activeSubTab, selectedSubject, search]);

  // Quick Approve
  const handleApprove = async (resource) => {
    setWorkingId(resource.id);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "approved" }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Failed to approve resource");
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, ...updated, visibility: "approved" } : r));
      setSuccessBanner(`"${resource.title}" approved and published to IB Community Resources!`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (e) {
      alert(e.message);
    } finally {
      setWorkingId(null);
    }
  };

  // Quick Reject
  const handleReject = async (resource) => {
    if (!confirm(`Are you sure you want to mark "${resource.title}" as rejected / needs revision?`)) return;
    setWorkingId(resource.id);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "rejected" }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Failed to reject resource");
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, ...updated, visibility: "rejected" } : r));
      setSuccessBanner(`"${resource.title}" rejected. Submitter can review and update.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (e) {
      alert(e.message);
    } finally {
      setWorkingId(null);
    }
  };

  // Delete submission
  const handleDelete = async (resource) => {
    if (!confirm(`Are you sure you want to permanently delete "${resource.title}"? This cannot be undone.`)) return;
    setWorkingId(resource.id);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete resource");
      }
      setResources(prev => prev.filter(r => r.id !== resource.id));
      setSuccessBanner(`"${resource.title}" was permanently deleted.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (e) {
      alert(e.message);
    } finally {
      setWorkingId(null);
    }
  };

  // Save after edit
  const handleSavedEdit = (updated) => {
    setResources(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
    setSuccessBanner(`Changes saved for "${updated.title}"!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--card)] p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Academic Integrity Moderation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
              Community Resource Submissions
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
              Verify student peer-to-peer uploads, refine metadata or titles, and approve high-yield study materials before publication to the global community.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubmissions}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
              title="Refresh submissions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.pending}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Awaiting admin review</p>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.approved}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Visible to community</p>
          </div>

          <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Needs Revision</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.rejected}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Rejected submissions</p>
          </div>

          <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Contributors</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.contributors}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Unique student authors</p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <Alert variant="success" title={successBanner} />
      )}

      {/* Error Alert */}
      {err && (
        <Alert variant="error" title={err} />
      )}

      {/* Filter and Sub-Tab Navigation Bar */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sub-Tabs */}
          <div className="inline-flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1 flex-wrap">
            <button
              onClick={() => setActiveSubTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "pending"
                  ? "bg-[var(--card)] text-amber-400 shadow-sm border border-amber-500/30"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Review</span>
              {stats.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black">
                  {stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("approved")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "approved"
                  ? "bg-[var(--card)] text-emerald-400 shadow-sm border border-emerald-500/30"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approved & Live</span>
              <span className="text-[11px] opacity-70">({stats.approved})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("rejected")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "rejected"
                  ? "bg-[var(--card)] text-rose-400 shadow-sm border border-rose-500/30"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Needs Revision</span>
              <span className="text-[11px] opacity-70">({stats.rejected})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "all"
                  ? "bg-[var(--card)] text-[var(--accent)] shadow-sm border border-[var(--accent)]/30"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Submissions</span>
              <span className="text-[11px] opacity-70">({resources.length})</span>
            </button>
          </div>

          {/* Search & Subject Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title, student, school..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Subjects</option>
              <option value="general">General (No Subject)</option>
              {uniqueSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-24 text-center bg-[var(--card)] rounded-3xl border border-[var(--border)]">
          <Spinner className="w-8 h-8 mx-auto text-[var(--accent)] mb-3" />
          <p className="text-xs text-[var(--muted)]">Loading community submissions...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-20 text-center bg-[var(--card)] rounded-3xl border border-[var(--border)] p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-[var(--foreground)] mb-1">
            {activeSubTab === "pending" ? "All Caught Up! No Pending Submissions" : "No Submissions Match Filters"}
          </h4>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            {activeSubTab === "pending"
              ? "All student community uploads have been checked and moderated. When new resources are submitted, they will appear here automatically."
              : "Try adjusting your search query, subject filter, or switching sub-tabs."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredResources.map((res) => {
            const pub = res.publisher || {};
            const pubName = pub.name || "Community Student";
            const pubSchool = pub.school_name || "IB World School";
            const isWorking = workingId === res.id;
            const isPending = res.visibility === "pending_approval";
            const isApproved = res.visibility === "approved" || res.visibility === "public";
            const isRejected = res.visibility === "rejected";

            return (
              <div
                key={res.id}
                className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] hover:border-[var(--border-strong)] transition-all shadow-sm space-y-4"
              >
                {/* Header: Submitter Profile & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {pub.avatar_url ? (
                      <img src={pub.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-[var(--accent)]/30 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-sm shrink-0">
                        {pubName[0] || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--foreground)] truncate">{pubName}</span>
                        <span className="text-[11px] text-[var(--muted)] font-normal">· {pubSchool}</span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[var(--muted)]" />
                        <span>Submitted on {fmtDate(res.created_at)}</span>
                        {res.programme && <span className="uppercase font-semibold">· {res.programme}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isPending ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Under Review
                      </span>
                    ) : isApproved ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approved & Published
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Needs Revision / Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Resource Title & Academic Metadata */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {res.subject ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)]">
                        {res.subject}{res.level ? ` (${res.level})` : ""}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> General (All Subjects)
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md border border-[var(--accent)]/20">
                      {typeLabel(res.resource_type)}
                    </span>

                    {res.topic && (
                      <span className="text-[11px] text-[var(--muted)]">
                        · Unit: <strong className="text-[var(--foreground)]">{res.topic}</strong>
                      </span>
                    )}

                    {res.file_size && (
                      <span className="text-[11px] text-[var(--muted)]">
                        · {fmtSize(res.file_size)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-[var(--foreground)] leading-snug">
                    {res.title}
                  </h3>
                </div>

                {/* Submitter Notes / Description */}
                {res.description && (
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)]/90 leading-relaxed">
                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider block mb-1">
                      Author's Notes & Syllabus Details:
                    </span>
                    {res.description}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]/70">
                  {/* Inspect File in Modal */}
                  <button
                    type="button"
                    onClick={() => setPreviewResource(res)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--accent)]" /> Inspect Document
                  </button>

                  {/* Edit Details before approving */}
                  <button
                    type="button"
                    onClick={() => setEditingResource(res)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Details
                  </button>

                  {/* Download */}
                  {res.file_url && (
                    <a
                      href={res.file_url}
                      download={res.file_name || res.title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> File
                    </a>
                  )}

                  <div className="flex-1" />

                  {/* Reject / Revision */}
                  {!isRejected && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleReject(res)}
                      disabled={isWorking}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs py-1.5 px-3"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  )}

                  {/* Approve / Publish */}
                  {!isApproved && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleApprove(res)}
                      disabled={isWorking}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 shadow-md shadow-emerald-500/20"
                    >
                      {isWorking ? <Spinner className="w-3.5 h-3.5" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Publish</>}
                    </Button>
                  )}

                  {/* Delete option */}
                  <button
                    type="button"
                    onClick={() => handleDelete(res)}
                    disabled={isWorking}
                    className="p-2 rounded-xl text-[var(--muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Submission Modal */}
      {editingResource && (
        <AdminEditResourceModal
          open={!!editingResource}
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSaved={handleSavedEdit}
        />
      )}

      {/* Document Inspector Modal */}
      {previewResource && (
        <AdminDocumentPreviewModal
          open={!!previewResource}
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </div>
  );
}

/* ── Admin Edit Modal ─────────────────────────────────────────────────────── */
function AdminEditResourceModal({ open, resource, onClose, onSaved }) {
  const [title, setTitle] = useState(resource?.title || "");
  const [subject, setSubject] = useState(resource?.subject || "");
  const [level, setLevel] = useState(resource?.level || "");
  const [topic, setTopic] = useState(resource?.topic || "");
  const [resourceType, setResourceType] = useState(resource?.resource_type || "other");
  const [description, setDescription] = useState(resource?.description || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  if (!open || !resource) return null;

  const handleSave = async (overrideVisibility = null) => {
    if (!title.trim()) return setErr("Title is required");
    setLoading(true);
    setErr(null);

    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim() || null,
        level: level || null,
        topic: topic.trim() || null,
        resource_type: resourceType,
        description: description.trim() || null,
      };

      if (overrideVisibility) {
        payload.visibility = overrideVisibility;
      }

      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update resource");

      onSaved(data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isPending = resource.visibility === "pending_approval";

  return (
    <Modal open={open} onClose={onClose} title="Edit & Moderate Resource Submission">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {err && <Alert variant="error" title={err} />}

        <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-xs text-purple-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-purple-200">Moderator Editorial Controls</p>
            <p className="text-[11px] text-purple-300/90 leading-relaxed">
              Refine the title, select standard IB subject name, and polish contributor notes before publication. Clicking <strong>Approve & Publish</strong> will instantly make it live in IB Community Resources.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Title *</label>
          <input
            className="field w-full text-sm"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Complete Biology HL Photosynthesis Summary Notes"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Subject</label>
            <input
              className="field w-full text-xs"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Biology (or leave blank for General)"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Level</label>
            <select className="field w-full text-xs" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">None / Core</option>
              <option value="SL">Standard Level (SL)</option>
              <option value="HL">Higher Level (HL)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Unit / Topic</label>
            <input
              className="field w-full text-xs"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Cell Biology, Genetics"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Category</label>
            <select className="field w-full text-xs" value={resourceType} onChange={e => setResourceType(e.target.value)}>
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Contributor Notes & Highlights</label>
          <textarea
            className="field w-full min-h-[90px] text-sm resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Syllabus notes, key concepts covered, exam tips..."
            rows={3}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="danger"
            onClick={() => handleSave("rejected")}
            disabled={loading}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Submission
          </Button>

          <div className="flex-1" />

          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSave(null)}
            disabled={loading}
            className="text-xs"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave("approved")}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20"
          >
            {loading ? <Spinner /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Publish</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Admin Document Preview Modal ─────────────────────────────────────────── */
function AdminDocumentPreviewModal({ open, resource, onClose }) {
  if (!open || !resource) return null;

  const isImage = resource.file_url && /\.(jpe?g|png|webp|gif|svg)$/i.test(resource.file_url);

  return (
    <Modal open={open} onClose={onClose} title={resource.title || "Inspect Document"}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--muted)] pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--foreground)]">{resource.file_name || resource.title}</span>
            {resource.file_size && <span>({fmtSize(resource.file_size)})</span>}
          </div>
          {resource.file_url && (
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
            </a>
          )}
        </div>

        <div className="w-full h-[65vh] bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center border border-[var(--border)]">
          {isImage ? (
            <img src={resource.file_url} alt="" className="max-w-full max-h-full object-contain p-2" />
          ) : (
            <iframe
              src={`${resource.file_url}#toolbar=1`}
              className="w-full h-full border-none bg-white"
              title="Document Viewer"
            />
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
}
