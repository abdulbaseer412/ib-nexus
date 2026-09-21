"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Upload, Filter, X, BookOpen, FileText, CheckCircle2,
  Download, Heart, Clock, ChevronRight, Plus, MoreVertical,
  Bookmark, BookmarkCheck, CalendarDays, Star, FolderOpen,
  Sparkles, ArrowRight, ArrowLeft, ExternalLink, Trash2, Pencil, Library,
  Sigma, Compass, Lightbulb, Beaker, FileSpreadsheet, PlayCircle, Book, Archive, Layers
} from "lucide-react";
import { Button, Modal, Alert, Spinner } from "@/components/ui";
import LayeredBrowser from "@/components/LayeredBrowser";

import { getSubjectColorTheme, getSubjectIconClasses } from "@/lib/subject-colors";

/* ── Constants ────────────────────────────────────────────────────────────── */
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

const MAIN_TABS = [
  { value: "my_subjects",  label: "My Subjects",  icon: Bookmark },
  { value: "all_subjects", label: "All Subjects", icon: Layers },
  { value: "my_library",   label: "My Library",   icon: Archive },
];

const LEVELS_DP = ["HL", "SL"];
const LEVELS_MYP = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function api(url, opts = {}) {
  return fetch(url, { headers: { "Content-Type": "application/json" }, ...opts }).then(async r => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  });
}

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

/* ── Upload Modal ─────────────────────────────────────────────────────────── */
const UPLOAD_DP_GROUPS = [
  {
    category: "Group 1: Studies in Language & Literature",
    courses: [
      { name: "Language A: Literature", levels: ["SL", "HL"] },
      { name: "Language A: Language & Literature", levels: ["SL", "HL"] },
      { name: "Literature & Performance", levels: ["SL"] }
    ]
  },
  {
    category: "Group 2: Language Acquisition",
    courses: [
      { name: "English B", levels: ["SL", "HL"] },
      { name: "Spanish B", levels: ["SL", "HL"] },
      { name: "French B", levels: ["SL", "HL"] },
      { name: "German B", levels: ["SL", "HL"] },
      { name: "Mandarin B", levels: ["SL", "HL"] },
      { name: "Spanish ab initio", levels: ["SL"] },
      { name: "French ab initio", levels: ["SL"] },
      { name: "German ab initio", levels: ["SL"] },
      { name: "Mandarin ab initio", levels: ["SL"] },
      { name: "Classical Languages (Latin/Greek)", levels: ["SL", "HL"] }
    ]
  },
  {
    category: "Group 3: Individuals & Societies",
    courses: [
      { name: "Business Management", levels: ["SL", "HL"] },
      { name: "Digital Society", levels: ["SL", "HL"] },
      { name: "Economics", levels: ["SL", "HL"] },
      { name: "Geography", levels: ["SL", "HL"] },
      { name: "Global Politics", levels: ["SL", "HL"] },
      { name: "History", levels: ["SL", "HL"] },
      { name: "Philosophy", levels: ["SL", "HL"] },
      { name: "Psychology", levels: ["SL", "HL"] },
      { name: "Social & Cultural Anthropology", levels: ["SL", "HL"] },
      { name: "World Religions", levels: ["SL"] }
    ]
  },
  {
    category: "Group 4: Sciences",
    courses: [
      { name: "Biology", levels: ["SL", "HL"] },
      { name: "Chemistry", levels: ["SL", "HL"] },
      { name: "Computer Science", levels: ["SL", "HL"] },
      { name: "Design Technology", levels: ["SL", "HL"] },
      { name: "Environmental Systems & Societies (ESS)", levels: ["SL", "HL"] },
      { name: "Physics", levels: ["SL", "HL"] },
      { name: "Sports, Exercise & Health Science", levels: ["SL", "HL"] }
    ]
  },
  {
    category: "Group 5: Mathematics",
    courses: [
      { name: "Mathematics: Analysis & Approaches (AA)", levels: ["SL", "HL"] },
      { name: "Mathematics: Applications & Interpretation (AI)", levels: ["SL", "HL"] }
    ]
  },
  {
    category: "Group 6: The Arts",
    courses: [
      { name: "Visual Arts", levels: ["SL", "HL"] },
      { name: "Music", levels: ["SL", "HL"] },
      { name: "Theatre", levels: ["SL", "HL"] },
      { name: "Film", levels: ["SL", "HL"] },
      { name: "Dance", levels: ["SL", "HL"] }
    ]
  },
  {
    category: "DP Core",
    courses: [
      { name: "Theory of Knowledge (TOK)", levels: null },
      { name: "Extended Essay (EE)", levels: null },
      { name: "Creativity, Activity, Service (CAS)", levels: null }
    ]
  }
];

const UPLOAD_MYP_GROUPS = [
  {
    category: "Language and Literature",
    courses: [
      { name: "English Language & Literature", levels: null },
      { name: "Spanish Language & Literature", levels: null },
      { name: "German Language & Literature", levels: null },
      { name: "French Language & Literature", levels: null }
    ]
  },
  {
    category: "Language Acquisition",
    courses: [
      { name: "English Language Acquisition", levels: null },
      { name: "Spanish Language Acquisition", levels: null },
      { name: "French Language Acquisition", levels: null },
      { name: "German Language Acquisition", levels: null },
      { name: "Mandarin Language Acquisition", levels: null }
    ]
  },
  {
    category: "Individuals and Societies",
    courses: [
      { name: "History", levels: null },
      { name: "Geography", levels: null },
      { name: "Economics", levels: null },
      { name: "Global Politics", levels: null },
      { name: "Integrated Humanities", levels: null }
    ]
  },
  {
    category: "Sciences",
    courses: [
      { name: "Biology", levels: null },
      { name: "Chemistry", levels: null },
      { name: "Physics", levels: null },
      { name: "Integrated Sciences", levels: null },
      { name: "Environmental Sciences", levels: null }
    ]
  },
  {
    category: "Mathematics",
    courses: [
      { name: "Mathematics (Standard)", levels: null },
      { name: "Mathematics (Extended)", levels: null }
    ]
  },
  {
    category: "Arts",
    courses: [
      { name: "Visual Arts", levels: null },
      { name: "Music", levels: null },
      { name: "Drama/Theatre", levels: null }
    ]
  },
  {
    category: "Physical and Health Education",
    courses: [
      { name: "Physical and Health Education (PHE)", levels: null }
    ]
  },
  {
    category: "Design",
    courses: [
      { name: "Design", levels: null }
    ]
  }
];

function UploadModal({ open, onClose, onSuccess, isAdmin, userProfile, subjects, userProgram, initialTab }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("other");
  const [programme, setProgramme] = useState(userProgram || "dp");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [examSession, setExamSession] = useState("");
  const [paperNumber, setPaperNumber] = useState("");
  const [adminUpload, setAdminUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (initialTab && initialTab !== "all" && initialTab !== "my_library") {
        setResourceType(initialTab);
      } else {
        setResourceType("other");
      }
      setFile(null);
      setTitle("");
      setDescription("");
      setProgramme(userProgram || "dp");
      setSelectedGroup("");
      setSubject("");
      setLevel("");
      setTopic("");
      setYear("");
      setExamSession("");
      setPaperNumber("");
      setAdminUpload(false);
      setErr(null);
    }
  }, [open, userProgram, initialTab]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  const handleProgrammeChange = (newProg) => {
    setProgramme(newProg);
    setSelectedGroup("");
    setSubject("");
    setLevel("");
  };

  const handleGroupChange = (groupCategory) => {
    setSelectedGroup(groupCategory);
    setSubject("");
    setLevel("");
  };

  const currentCatalog = programme === "myp" ? UPLOAD_MYP_GROUPS : UPLOAD_DP_GROUPS;
  const currentGroupObj = currentCatalog.find(g => g.category === selectedGroup);
  const availableCourses = currentGroupObj ? currentGroupObj.courses : currentCatalog.flatMap(g => g.courses);

  const selectedCourseObj = availableCourses.find(c => c.name === subject);
  const availableLevels = selectedCourseObj?.levels || null;

  const handleSubjectChange = (subjectName) => {
    setSubject(subjectName);
    const course = availableCourses.find(c => c.name === subjectName);
    if (!course || !course.levels || programme === "myp") {
      setLevel("");
    } else if (course.levels.length === 1) {
      setLevel(course.levels[0]);
    } else {
      setLevel("SL");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setErr("Please select a file.");
    if (!title.trim()) return setErr("Please enter a title.");
    setLoading(true); setErr(null);

    try {
      // 1. Upload file
      const fd = new FormData();
      fd.append("file", file);
      if (isAdmin && adminUpload) fd.append("admin_upload", "true");

      const uploadRes = await fetch("/api/resources/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      // 2. Create resource record
      const resource = await api("/api/resources", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          file_url: uploadData.url,
          file_name: uploadData.name,
          file_size: uploadData.size,
          file_type: uploadData.type,
          resource_type: resourceType,
          programme,
          subject: subject || null,
          level: level || null,
          topic: topic.trim() || null,
          year: year ? parseInt(year) : null,
          exam_session: examSession || null,
          paper_number: paperNumber || null,
          source: (isAdmin && adminUpload) ? "platform" : "user",
        }),
      });

      onSuccess(resource);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = useMemo(() => {
    let types = RESOURCE_TYPES;
    if (!isAdmin) {
      // Regular users can only upload these types
      types = types.filter(t => ["study_guide", "worksheet", "coursework_example", "other"].includes(t.value));
    } else if (userProgram === "myp") {
      types = types.filter(t => !["ia_example", "ee_example", "tok_resource"].includes(t.value));
    }
    return types;
  }, [userProgram, isAdmin]);

  return (
    <Modal open={open} onClose={onClose} title={isAdmin && adminUpload ? "Upload to IB Nexus Library" : "Upload Resource"}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {err && <Alert variant="error" title={err} />}

        {isAdmin && (
          <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] cursor-pointer">
            <input type="checkbox" checked={adminUpload} onChange={e => setAdminUpload(e.target.checked)} className="accent-[var(--accent)]" />
            <span className="text-sm font-medium">Upload to IB Nexus Library (platform resource)</span>
          </label>
        )}

        {/* File */}
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">File *</label>
          <div
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">{file.name}</span>
                <span className="text-xs text-[var(--muted)]">({fmtSize(file.size)})</span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-[var(--muted)] mb-2" />
                <p className="text-sm text-[var(--muted)]">Click to choose a file</p>
                <p className="text-xs text-[var(--muted)] mt-1">PDF, Word, Excel, PowerPoint, Images</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt" />
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Title *</label>
          <input className="field w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology HL May 2025 Paper 2" />
        </div>

        {/* Row: Type + Programme */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Type *</label>
            <select 
              className={`field w-full ${initialTab && initialTab !== "all" && initialTab !== "my_library" ? "opacity-70 cursor-not-allowed" : ""}`} 
              value={resourceType} 
              onChange={e => setResourceType(e.target.value)}
              disabled={initialTab && initialTab !== "all" && initialTab !== "my_library"}
            >
              {filteredTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Target Programme *</label>
            <select className="field w-full" value={programme} onChange={e => handleProgrammeChange(e.target.value)}>
              <option value="dp">DP 2 (Diploma Programme)</option>
              <option value="myp">MYP 5 (Middle Years Programme)</option>
            </select>
          </div>
        </div>

        {/* Cascading Subject Group Selection */}
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Subject Group</label>
          <select className="field w-full" value={selectedGroup} onChange={e => handleGroupChange(e.target.value)}>
            <option value="">— All Subject Groups —</option>
            {currentCatalog.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
          </select>
        </div>

        {/* Row: Subject + Level */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Subject Course *</label>
            <select className="field w-full" value={subject} onChange={e => handleSubjectChange(e.target.value)}>
              <option value="">— Select Course —</option>
              {availableCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Course Level</label>
            {programme === "myp" || !availableLevels ? (
              <div className="field w-full opacity-60 text-xs flex items-center justify-center bg-[var(--surface-muted)] cursor-not-allowed">
                N/A (Group Level)
              </div>
            ) : availableLevels.length === 1 ? (
              <div className="field w-full opacity-80 text-xs flex items-center justify-between bg-[var(--surface-muted)]">
                <span>{availableLevels[0]}</span>
                <span className="text-[10px] text-[var(--muted)]">(SL Only)</span>
              </div>
            ) : (
              <select className="field w-full" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="SL">Standard Level (SL)</option>
                <option value="HL">Higher Level (HL)</option>
              </select>
            )}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Topic / Unit</label>
          <input className="field w-full" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cell Respiration / Option B" />
        </div>

        {/* Row: Year + Session + Paper (for past papers) */}
        {(resourceType === "past_paper" || resourceType === "markscheme") && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Year</label>
              <input className="field w-full" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2025" min="2000" max="2030" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Exam Session</label>
              <select className="field w-full" value={examSession} onChange={e => setExamSession(e.target.value)}>
                <option value="">—</option>
                <option value="may">May</option>
                <option value="november">November</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Paper</label>
              <select className="field w-full" value={paperNumber} onChange={e => setPaperNumber(e.target.value)}>
                <option value="">—</option>
                <option value="Paper 1">Paper 1</option>
                <option value="Paper 2">Paper 2</option>
                <option value="Paper 3">Paper 3</option>
              </select>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Description</label>
          <textarea className="field w-full min-h-[60px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        </div>

        <div className="flex gap-2 pt-2">
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner /> : "Upload"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Study From This Modal ────────────────────────────────────────────────── */
function StudyFromModal({ open, onClose, resource }) {
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (open) { setSuccess(false); setDuration(30); } }, [open]);

  const addToPlan = async () => {
    setLoading(true);
    try {
      await api("/api/planner/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: `Review ${resource.title}`,
          subject: resource.subject || null,
          estimated_duration: duration,
          priority: "medium",
          resource_id: resource.id,
          origin: "resource",
        }),
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Study from this">
      {success ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-10 h-10 text-[var(--accent)] mx-auto mb-3" />
          <p className="font-medium text-[var(--foreground)]">Added to your plan!</p>
          <p className="text-sm text-[var(--muted)] mt-1">Check your Study Planner to start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{resource?.title}</p>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">How long do you want to study?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mins: 20, label: "Quick review", sub: "20 min" },
                { mins: 30, label: "Practice", sub: "30 min" },
                { mins: 60, label: "Deep study", sub: "60 min" },
              ].map(opt => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setDuration(opt.mins)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    duration === opt.mins
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{opt.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={addToPlan} disabled={loading}>
              {loading ? <Spinner /> : "Add to plan"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Resource Card ────────────────────────────────────────────────────────── */
function ResourceCard({ resource, isSaved, onToggleSave, onStudy, isAdmin, onDelete, onEdit }) {
  const sessionLabel = resource.exam_session
    ? `${resource.exam_session === "may" ? "May" : "Nov"} ${resource.year || ""}`
    : resource.year ? `${resource.year}` : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative flex flex-col rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden"
    >
      {/* Top colour bar */}
      <div className={`h-1 ${getSubjectBgClass(resource.subject)}`} />

      <div className="flex-1 p-5">
        {/* Subject badge + source */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {resource.subject && (
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${getSubjectBadgeClasses(resource.subject)}`}>
                {resource.subject}{resource.level ? ` ${resource.level}` : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            {resource.source === "platform" ? "IB Nexus" : "My Library"}
          </span>
        </div>

        {/* Title */}
        <Link href={`/dashboard/resources/${resource.id}`} className="block">
          <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2">
            {resource.title}
          </h3>
        </Link>

        {/* Type + session */}
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted)]">
          <span>{typeLabel(resource.resource_type)}</span>
          {sessionLabel && (
            <>
              <span className="opacity-40">·</span>
              <span>{sessionLabel}</span>
            </>
          )}
          {resource.paper_number && (
            <>
              <span className="opacity-40">·</span>
              <span>{resource.paper_number}</span>
            </>
          )}
        </div>

        {resource.topic && (
          <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-1">{resource.topic}</p>
        )}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-4 py-3 border-t border-[var(--border)]/50">
        <Link
          href={`/dashboard/resources/${resource.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open
        </Link>
        <div className="flex-1" />
        {isAdmin && (
          <>
            <button
              onClick={() => onEdit(resource)}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--muted)] hover:text-blue-500 transition-colors mr-1"
              title="Rename resource (Admin)"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors mr-1"
              title="Delete resource (Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={() => onToggleSave(resource.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
          title={isSaved ? "Unsave" : "Save"}
        >
          {isSaved
            ? <BookmarkCheck className="w-4 h-4 text-[var(--accent)]" />
            : <Bookmark className="w-4 h-4 text-[var(--muted)]" />
          }
        </button>
        <button
          onClick={() => onStudy(resource)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
          title="Add to plan"
        >
          <CalendarDays className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Filter Panel ─────────────────────────────────────────────────────────── */
function FilterPanel({ filters, setFilters, subjects, userProgram, open }) {
  if (!open) return null;

  const levels = (filters.programme || userProgram) === "myp" ? LEVELS_MYP : LEVELS_DP;
  const years = Array.from({ length: 10 }, (_, i) => 2025 - i);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] mb-4">
        <div>
          <label className="text-xs font-medium text-[var(--muted)] mb-1 block">Programme</label>
          <select className="field w-full text-sm" value={filters.programme || ""} onChange={e => setFilters(f => ({ ...f, programme: e.target.value || null }))}>
            <option value="">All</option>
            <option value="dp">DP</option>
            <option value="myp">MYP</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted)] mb-1 block">Subject</label>
          <select className="field w-full text-sm" value={filters.subject || ""} onChange={e => setFilters(f => ({ ...f, subject: e.target.value || null }))}>
            <option value="">All</option>
              {subjects.map(s => {
                const label = typeof s === 'string' ? s : (s?.name || s?.subject || 'Unknown');
                return <option key={label} value={label}>{label}</option>;
              })}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted)] mb-1 block">Level</label>
          <select className="field w-full text-sm" value={filters.level || ""} onChange={e => setFilters(f => ({ ...f, level: e.target.value || null }))}>
            <option value="">All</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted)] mb-1 block">Type</label>
          <select className="field w-full text-sm" value={filters.resource_type || ""} onChange={e => setFilters(f => ({ ...f, resource_type: e.target.value || null }))}>
            <option value="">All</option>
            {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted)] mb-1 block">Year</label>
          <select className="field w-full text-sm" value={filters.year || ""} onChange={e => setFilters(f => ({ ...f, year: e.target.value || null }))}>
            <option value="">All</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </motion.div>
  );
}

const categoryIcon = (value, isActive) => {
  const props = { className: `w-4 h-4 mr-2 transition-colors duration-300 ${isActive ? 'text-white' : 'text-[var(--muted)] group-hover:text-[var(--accent)]'}` };
  switch(value) {
    case "past_paper": return <FileText {...props} />;
    case "markscheme": return <CheckCircle2 {...props} />;
    case "revision_guide": return <Book {...props} />;
    case "formula_sheet": return <Sigma {...props} />;
    case "ib_guide": return <Compass {...props} />;
    case "coursework_example": return <Layers {...props} />;
    case "ia_example": return <Beaker {...props} />;
    case "ee_example": return <BookOpen {...props} />;
    case "tok_resource": return <Lightbulb {...props} />;
    case "teacher_resource": return <PlayCircle {...props} />;
    case "study_guide": return <BookOpen {...props} />;
    case "worksheet": return <FileSpreadsheet {...props} />;
    case "my_library": return <Archive {...props} />;
    case "all": return <Sparkles {...props} />;
    default: return <FileText {...props} />;
  }
}

function ResourceSkeleton() {
  return (
    <div className="card p-5 animate-pulse flex flex-col h-[200px] border border-[var(--border)] rounded-2xl bg-[var(--surface)]/50">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-24 bg-[var(--border)] rounded-md"></div>
        <div className="h-6 w-6 bg-[var(--border)] rounded-full"></div>
      </div>
      <div className="h-6 w-3/4 bg-[var(--border)] rounded-md mb-2"></div>
      <div className="h-4 w-1/2 bg-[var(--border)] rounded-md mb-4"></div>
      <div className="mt-auto pt-4 border-t border-[var(--border)]/50 flex justify-between items-center">
        <div className="h-4 w-16 bg-[var(--border)] rounded-md"></div>
        <div className="h-8 w-20 bg-[var(--border)] rounded-md"></div>
      </div>
    </div>
  );
}

/* ── Main ResourcesClient ─────────────────────────────────────────────────── */
export default function ResourcesClient({ userProgram, isAdmin, userSubjects }) {
  const router = useRouter();

  // State
  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [tab, setTab] = useState("my_subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedResourceType, setSelectedResourceType] = useState(null);
  const [subjectStats, setSubjectStats] = useState({});

  useEffect(() => {
    setSelectedSubject(null);
    setSelectedResourceType(null);
  }, [tab]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [studyResource, setStudyResource] = useState(null);
  const searchTimer = useRef(null);
  const searchInputRef = useRef(null);

  // Enhanced search UI states
  const [placeholderText, setPlaceholderText] = useState("Search resources...");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    
    // Fetch subject stats
    fetch("/api/resources/stats")
      .then(r => r.json())
      .then(d => {
        if (!d.error) setSubjectStats(d);
      })
      .catch(e => console.error(e));

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Typing animation for placeholder
  useEffect(() => {
    const texts = [
      "Search 'Biology HL Past Papers'...",
      "Search by topic, e.g. 'Cell Respiration'...",
      "Search '2025 Markschemes'...",
      "Search your IB subjects..."
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

    const type = () => {
      const currentText = texts[textIndex];
      
      if (isDeleting) {
        setPlaceholderText(currentText.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholderText(currentText.substring(0, charIndex + 1));
        charIndex++;
      }

      let typeSpeed = isDeleting ? 20 : 60;

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2500; // pause at end
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typeSpeed = 500; // pause before typing next
      }

      timeout = setTimeout(type, typeSpeed);
    };

    type();
    return () => clearTimeout(timeout);
  }, []);

  // Programme-specific Course Catalog for All Subjects Discovery
  const programCatalog = userProgram === "myp" ? UPLOAD_MYP_GROUPS : UPLOAD_DP_GROUPS;
  const allSubjectsList = useMemo(() => {
    const names = programCatalog.flatMap(g => g.courses.map(c => c.name));
    return Array.from(new Set(names));
  }, [programCatalog]);
  const allSubjects = allSubjectsList;
  
  // User's enrolled subjects from profile
  const mySubjectNames = useMemo(() => {
    return (userSubjects || []).map(s => typeof s === 'string' ? s : s.name || s.subject || String(s));
  }, [userSubjects]);

  // Build query params from tab + filters + search
  const buildParams = useCallback((offset = 0) => {
    const p = new URLSearchParams();
    if (tab === "my_library") {
      p.set("source", "user");
    } else {
      p.set("source", "platform");
    }
    // Strict programme locking (MYP vs DP)
    p.set("programme", filters.programme || userProgram || "dp");
    if (filters.subject) p.set("subject", filters.subject);
    if (filters.level) p.set("level", filters.level);
    if (filters.resource_type) {
      p.set("resource_type", filters.resource_type);
    }
    if (filters.year) p.set("year", filters.year);
    if (search.trim()) p.set("search", search.trim());
    p.set("offset", String(offset));
    p.set("limit", "24");
    return p.toString();
  }, [tab, filters, search, userProgram]);

  // Load resources
  const loadResources = useCallback(async (append = false) => {
    const offset = append ? resources.length : 0;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await api(`/api/resources?${buildParams(offset)}`);
      if (append) {
        setResources(prev => [...prev, ...data.resources]);
      } else {
        setResources(data.resources);
      }
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load resources:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams, resources.length]);

  // Load saved IDs
  const loadSaved = useCallback(async () => {
    try {
      const ids = await api("/api/resources/save");
      setSavedIds(new Set(ids));
    } catch { /* ignore */ }
  }, []);

  // Load recently viewed
  const loadRecent = useCallback(async () => {
    try {
      const data = await api("/api/resources/views");
      setRecentlyViewed(data);
    } catch { /* ignore */ }
  }, []);

  // Load recommended
  const loadRecommended = useCallback(async () => {
    if (!userSubjects?.length) return;
    try {
      const params = new URLSearchParams();
      params.set("source", "platform");
      params.set("limit", "6");
      // Just fetch platform resources for user's subjects
      const data = await api(`/api/resources?${params.toString()}`);
      setRecommended(data.resources?.slice(0, 6) || []);
    } catch { /* ignore */ }
  }, [userSubjects]);

  // Initial load
  useEffect(() => {
    loadResources();
    loadSaved();
    loadRecent();
    loadRecommended();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when tab or filters change
  useEffect(() => {
    loadResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadResources();
    }, 350);
    return () => clearTimeout(searchTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggleSave = async (resourceId) => {
    const wasSaved = savedIds.has(resourceId);
    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      wasSaved ? next.delete(resourceId) : next.add(resourceId);
      return next;
    });
    try {
      await api("/api/resources/save", {
        method: "POST",
        body: JSON.stringify({ resource_id: resourceId, action: wasSaved ? "unsave" : "save" }),
      });
    } catch {
      // Revert
      setSavedIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(resourceId) : next.delete(resourceId);
        return next;
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this resource?")) return;
    try {
      await api(`/api/resources/${id}`, { method: "DELETE" });
      setResources(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev > 0 ? prev - 1 : 0);
    } catch (err) {
      console.error(err);
      alert("Failed to delete resource");
    }
  };

  const handleEdit = async (resource) => {
    const newTitle = prompt("Enter new title:", resource.title || resource.file_name);
    if (!newTitle || newTitle === (resource.title || resource.file_name)) return;
    try {
      const updated = await api(`/api/resources/${resource.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle }),
      });
      setResources(prev => prev.map(r => r.id === resource.id ? updated : r));
    } catch (err) {
      console.error(err);
      alert("Failed to update resource");
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const hasMore = resources.length < total;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold tracking-[0.2em] uppercase">
            <Library className="w-3.5 h-3.5" />
            <span>IB Nexus Library</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--foreground)] tracking-tight">
            Resources
          </h1>
          <p className="text-[var(--muted)] text-sm sm:text-base max-w-xl leading-relaxed">
            Your premium academic workspace. Find past papers, guides, and examples specifically curated for your IB journey.
          </p>
        </div>
      </div>

      {/* ── Search + Filters toggle ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 relative z-10">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" />
          </div>
          <input
            ref={searchInputRef}
            className="w-full bg-[var(--surface)]/60 backdrop-blur-md border border-[var(--border)] text-[var(--foreground)] text-base rounded-2xl pl-12 pr-24 py-3.5 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-300 shadow-sm"
            placeholder={placeholderText}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="p-1 rounded-full hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="hidden sm:flex items-center pointer-events-none">
              <kbd className="inline-flex items-center justify-center rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] shadow-sm">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => setShowFilters(v => !v)}
          className={`shrink-0 h-auto py-3.5 px-6 rounded-2xl border transition-all duration-300 shadow-sm ${
            showFilters || activeFilterCount 
              ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]" 
              : "border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-md hover:bg-[var(--surface)] hover:border-[var(--muted)]"
          }`}
        >
          <Filter className={`w-5 h-5 mr-2 ${showFilters || activeFilterCount ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white shadow-sm">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* ── Filter Panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel filters={filters} setFilters={setFilters} subjects={allSubjects} userProgram={userProgram} open={showFilters} />
        )}
      </AnimatePresence>

      {/* ── Active filter chips ─────────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(filters).filter(([,v]) => v).map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-1 rounded-full">
              {key === "resource_type" ? typeLabel(val) : val}
              <button onClick={() => setFilters(f => ({ ...f, [key]: null }))}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setFilters({})}>Clear all</button>
        </div>
      )}

      {/* ── Top Level Navigation ────────────────────────────────────────────── */}
      {!selectedSubject && !search && activeFilterCount === 0 && (
        <div className="mb-10 flex justify-center">
          <div className="inline-flex bg-[var(--surface)] p-1 rounded-full border border-[var(--border)] shadow-sm" role="tablist">
            {MAIN_TABS.map(t => {
              const isActive = tab === t.value;
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t.value)}
                  className={`group shrink-0 flex items-center relative px-5 py-2.5 text-[13px] font-semibold rounded-full transition-colors duration-300 outline-none ${
                    isActive
                      ? "text-[var(--foreground)]"
                      : "text-muted hover:text-[var(--foreground)]"
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-resource-tab"
                      className="absolute inset-0 bg-[var(--card)] border border-[var(--border)] rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center">
                    <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-[var(--accent)]' : 'text-muted group-hover:text-[var(--foreground)]'}`} strokeWidth={2.5} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main View Area ────────────────────────────────────────────────── */}
      {search || activeFilterCount > 0 || tab === "my_library" ? (
        // Grid View for Search, Filters, or My Library
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ResourceSkeleton key={i} />)}
            </div>
          ) : resources.length === 0 ? (
            <div className="card p-12 sm:p-20 text-center border border-[var(--border)] bg-[var(--surface)]/30 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--accent)] opacity-[0.03] blur-3xl rounded-full pointer-events-none"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--accent)] opacity-[0.03] blur-3xl rounded-full pointer-events-none"></div>
              
              {tab === "my_library" ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Archive className="w-8 h-8 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 tracking-tight">YOUR PERSONAL LIBRARY IS EMPTY</h3>
                  <p className="text-base text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed">
                    Save resources you want to return to, or upload your own study material to keep everything organized in one premium workspace.
                  </p>
                  <Button variant="primary" onClick={() => setUploadOpen(true)} className="shadow-lg shadow-[var(--accent)]/20 transition-all duration-300 hover:scale-105">
                    <Upload className="w-4 h-4 mr-2" /> <span className="font-medium">Upload Resource</span>
                  </Button>
                </motion.div>
              ) : search ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                  <div className="w-16 h-16 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-[var(--muted)]" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2 tracking-tight">No resources match your search</h3>
                  <p className="text-[var(--muted)] max-w-sm mx-auto">
                    Try using different keywords, checking your spelling, or adjusting your filters.
                  </p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] border border-[var(--border)] shadow-xl flex items-center justify-center mx-auto mb-8">
                    <Library className="w-10 h-10 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-[var(--foreground)] mb-4 tracking-tight">YOUR IB LIBRARY IS READY</h3>
                  <p className="text-base text-[var(--muted)] max-w-xl mx-auto mb-10 leading-relaxed">
                    The academic workspace is prepared. Once resources are added, you will find highly organized 
                    <span className="text-[var(--foreground)] font-medium"> Past Papers</span>, 
                    <span className="text-[var(--foreground)] font-medium"> Markschemes</span>, and 
                    <span className="text-[var(--foreground)] font-medium"> IB Guides</span> precisely matched to your subjects.
                  </p>
                  {isAdmin && (
                    <Button variant="primary" onClick={() => setUploadOpen(true)} className="shadow-xl shadow-[var(--accent)]/20 hover:scale-105 transition-all duration-300 h-12 px-8">
                      <Upload className="w-5 h-5 mr-2" /> <span className="font-bold">Upload First Resource</span>
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {resources.map(r => (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      isSaved={savedIds.has(r.id)}
                      onToggleSave={toggleSave}
                      onStudy={setStudyResource}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button variant="secondary" onClick={() => loadResources(true)} disabled={loadingMore}>
                    {loadingMore ? <Spinner /> : "Load more"}
                  </Button>
                </div>
              )}

              <p className="text-center text-xs text-[var(--muted)] mt-4">
                Showing {resources.length} of {total} resources
              </p>
            </>
          )}
        </>
      ) : (
        // Subject-First Architecture
        <div className="mt-4">
          {!selectedSubject ? (
            // Level 0: Subject Cards Grid
            <div className="space-y-6">
              {tab === "all_subjects" && (
                <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>Discovery Catalog — Exploring all official IB {userProgram ? userProgram.toUpperCase() : 'DP'} subjects. Browsing here does not modify your profile.</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                    {userProgram ? userProgram.toUpperCase() : 'DP'} Catalog
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(tab === "my_subjects" ? mySubjectNames : allSubjectsList).map(subj => {
                  const sName = typeof subj === 'string' ? subj : (subj?.name || subj?.subject);
                  const stats = subjectStats[sName] || { count: 0, types: [] };
                  
                  const theme = getSubjectColorTheme(sName);
                  const colorVar = theme === 'brand' ? 'var(--accent)' : `var(--subject-${theme})`;
                  
                  return (
                    <motion.button
                      key={sName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedSubject(sName)}
                      style={{ '--c': colorVar }}
                      className="group flex flex-col items-start p-6 rounded-3xl border border-[color:var(--c)]/30 bg-[color:var(--c)]/[0.02] hover:border-[color:var(--c)] hover:bg-[color:var(--c)]/10 hover:shadow-[0_0_25px_color-mix(in_srgb,var(--c)_20%,transparent)] transition-all duration-500 text-left overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--c)]/5 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-[color:var(--c)]/15 transition-colors pointer-events-none" />
                      
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-[0_4px_12px_color-mix(in_srgb,var(--c)_10%,transparent)] group-hover:scale-110 transition-transform duration-500 bg-[color:var(--c)]/10 text-[color:var(--c)] border border-[color:var(--c)]/20`}>
                        <BookOpen className="w-7 h-7" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2 group-hover:text-[color:var(--c)] transition-colors">{sName}</h3>
                      
                      <div className="flex flex-col gap-1 mt-auto pt-4 w-full">
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <Layers className="w-4 h-4" />
                          <span>{stats.types.length} resource categories</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <FileText className="w-4 h-4" />
                          <span>{stats.count} files available</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {tab === "my_subjects" && mySubjectNames.length === 0 && (
                  <div className="col-span-full text-center py-12 px-6 border border-[var(--border)] rounded-3xl bg-[var(--surface)]/30 backdrop-blur-sm">
                    <Bookmark className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">No Enrolled Subjects in Profile</h3>
                    <p className="text-[var(--muted)] max-w-sm mx-auto mb-6">
                      You haven't enrolled in any subjects for your {userProgram ? userProgram.toUpperCase() : 'DP'} profile yet. Select subjects in your onboarding/settings or explore the full catalog.
                    </p>
                    <Button variant="secondary" onClick={() => setTab("all_subjects")}>
                      Explore All Subjects Catalog
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : !selectedResourceType ? (
            // Level 1: Subject Page (Resource Types Grid)
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Subjects
              </button>
              
              <div className="flex items-center gap-4 border-b border-[var(--border)] pb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${getSubjectIconClasses(selectedSubject)}`}>
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
                    {selectedSubject}
                  </h2>
                  <p className="text-[var(--muted)] mt-1">Explore the resources available for {selectedSubject}.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {RESOURCE_TYPES.map(type => {
                  const typeExists = subjectStats[selectedSubject]?.types?.includes(type.value);
                  if (!typeExists && !isAdmin) return null; // Hide empty types unless admin

                  return (
                    <motion.button
                      key={type.value}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedResourceType(type.value)}
                      className="group flex flex-col items-center p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-lg transition-all duration-300 text-center relative overflow-hidden"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[var(--border)] group-hover:bg-[var(--accent)]/10 flex items-center justify-center mb-4 transition-colors">
                        {categoryIcon(type.value, false)}
                      </div>
                      <h4 className="font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{type.label}</h4>
                      {!typeExists && isAdmin && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mt-2">Empty (Admin View)</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            // Level 2: Resource Browser
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={`${selectedSubject}-${selectedResourceType}`}>
              <LayeredBrowser 
                resourceType={selectedResourceType} 
                initialSubject={selectedSubject}
                onBack={() => setSelectedResourceType(null)}
                userSubjects={mySubjectNames} 
                userProgram={userProgram}
                isAdmin={isAdmin}
              />
            </motion.div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(r) => {
          setResources(prev => [r, ...prev]);
          setTotal(prev => prev + 1);
          setUploadOpen(false);
        }}
        isAdmin={isAdmin}
        subjects={allSubjects}
        userProgram={userProgram}
        initialTab={tab}
      />

      <StudyFromModal
        open={!!studyResource}
        onClose={() => setStudyResource(null)}
        resource={studyResource}
      />
    </div>
  );
}
