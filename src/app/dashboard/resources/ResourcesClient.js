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
  Sigma, Compass, Lightbulb, Beaker, FileSpreadsheet, PlayCircle, Book, Archive, Layers,
  ShieldCheck, Users, Globe, Eye, AlertCircle, Info, Check, RefreshCw, XCircle, Send, CheckCheck
} from "lucide-react";
import { Button, Modal, Alert, Spinner } from "@/components/ui";
import LayeredBrowser from "@/components/LayeredBrowser";

import { getSubjectColorTheme, getSubjectIconClasses, getSubjectBadgeClasses, getSubjectBgClass } from "@/lib/subject-colors";
import { 
  getSubjectSupportedLevels, 
  CANONICAL_DP_SUBJECTS, 
  CANONICAL_MYP_SUBJECTS, 
  groupSubjectsByCategory 
} from "@/lib/subject-levels";

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
  { 
    value: "my_subjects",        
    label: "My Subjects",        
    icon: Bookmark,
    tooltipTitle: "My Subjects View",
    tooltipDesc: "Displays only the subjects enrolled in your student profile for focused, distraction-free study."
  },
  { 
    value: "all_subjects",       
    label: "All Subjects",       
    icon: Layers,
    tooltipTitle: "All Subjects Catalog",
    tooltipDesc: "Browse the complete IB curriculum catalog. Explore past papers and resources without altering your profile."
  },
  { 
    value: "nexus_library",      
    label: "IB Nexus Library",   
    icon: ShieldCheck,
    tooltipTitle: "IB Nexus Official Library",
    tooltipDesc: "Curated official past examination papers, syllabus guides, exam room rules, regulations, and verified exemplars published by IB Nexus."
  },
  { 
    value: "community_resources",
    label: "Community Resources",
    icon: Users,
    tooltipTitle: "IB Community Resources",
    tooltipDesc: "Peer-to-peer knowledge exchange. Student-shared revision notes, summaries, and coursework vetted and approved by IB Nexus moderators."
  },
  { 
    value: "my_library",         
    label: "My Library",         
    icon: BookOpen,
    tooltipTitle: "My Personal Library",
    tooltipDesc: "Your private study workspace for uploaded notes, personal drafts, and tracking the approval status of your community submissions."
  },
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

/* ── Upload Modal & Subject Groups ────────────────────────────────────────── */
const UPLOAD_DP_GROUPS = groupSubjectsByCategory(CANONICAL_DP_SUBJECTS, "dp").map(g => ({
  category: g.category,
  courses: g.subjects.map(s => ({
    name: s.name,
    levels: getSubjectSupportedLevels(s.name, "dp")
  }))
}));

const UPLOAD_MYP_GROUPS = groupSubjectsByCategory(CANONICAL_MYP_SUBJECTS, "myp").map(g => ({
  category: g.category,
  courses: g.subjects.map(s => ({
    name: s.name,
    levels: []
  }))
}));

const UPLOAD_BOTH_GROUPS = [
  ...UPLOAD_DP_GROUPS,
  ...UPLOAD_MYP_GROUPS.filter(mg => !UPLOAD_DP_GROUPS.some(dg => dg.category === mg.category))
].map(g => {
  const dpGroup = UPLOAD_DP_GROUPS.find(d => d.category === g.category);
  const mypGroup = UPLOAD_MYP_GROUPS.find(m => m.category === g.category);
  const coursesMap = new Map();
  dpGroup?.courses.forEach(c => coursesMap.set(c.name, c));
  mypGroup?.courses.forEach(c => {
    if (!coursesMap.has(c.name)) coursesMap.set(c.name, c);
  });
  return {
    category: g.category,
    courses: Array.from(coursesMap.values())
  };
});

async function directDownload(resource) {
  if (!resource?.file_url) return;
  try {
    const res = await fetch(resource.file_url);
    if (!res.ok) throw new Error("Network error");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resource.file_name || resource.title || "resource";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch {
    const link = document.createElement("a");
    link.href = resource.file_url;
    link.download = resource.file_name || resource.title || "resource";
    link.target = "_self";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function UploadModal({ open, onClose, onSuccess, isAdmin, userProfile, subjects, userProgram, initialTab, selectedSubject }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("other");
  const [programme, setProgramme] = useState(userProgram || "dp");
  const [isGeneral, setIsGeneral] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [examSession, setExamSession] = useState("");
  const [paperNumber, setPaperNumber] = useState("");
  const [destination, setDestination] = useState("community"); // 'community' | 'nexus' | 'my_library'
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (initialTab && !["all", "nexus_library", "my_library", "community_library", "community_resources", "my_subjects", "all_subjects"].includes(initialTab)) {
        setResourceType(initialTab);
      } else {
        setResourceType("other");
      }
      setFile(null);
      setTitle("");
      setDescription("");
      setProgramme(userProgram || "dp");
      setTopic("");
      setYear("");
      setExamSession("");
      setPaperNumber("");
      
      // Context-aware upload destination:
      if (initialTab === "nexus_library" && isAdmin) {
        setDestination("nexus");
      } else if (initialTab === "community_resources" || initialTab === "community_library") {
        setDestination("community");
      } else {
        // my_library, my_subjects, all_subjects, or course view
        setDestination("my_library");
      }

      // Pre-fill subject if user opened upload while inside a specific course/subject
      if (selectedSubject) {
        setIsGeneral(false);
        setSubject(selectedSubject);
        setSelectedGroup("");
        const levels = getSubjectSupportedLevels(selectedSubject, userProgram || "dp");
        if (!levels || levels.length === 0 || userProgram === "myp") {
          setLevel("");
        } else if (levels.length === 1) {
          setLevel(levels[0]);
        } else {
          setLevel("SL");
        }
      } else {
        setIsGeneral(false);
        setSelectedGroup("");
        setSubject("");
        setLevel("");
      }

      setErr(null);
    }
  }, [open, userProgram, initialTab, isAdmin, selectedSubject]);

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

  const currentCatalog = useMemo(() => {
    if (programme === "myp") return UPLOAD_MYP_GROUPS;
    if (programme === "both") return UPLOAD_BOTH_GROUPS;
    return UPLOAD_DP_GROUPS;
  }, [programme]);

  const currentGroupObj = currentCatalog.find(g => g.category === selectedGroup);
  const availableCourses = currentGroupObj ? currentGroupObj.courses : currentCatalog.flatMap(g => g.courses);

  const selectedCourseObj = availableCourses.find(c => c.name === subject);
  const availableLevels = useMemo(() => {
    if (!subject || isGeneral) return null;
    const curriculumLevels = getSubjectSupportedLevels(subject, programme === "myp" ? "myp" : "dp");
    if (curriculumLevels && curriculumLevels.length > 0) return curriculumLevels;
    return selectedCourseObj?.levels || null;
  }, [subject, programme, selectedCourseObj, isGeneral]);

  const handleSubjectChange = (subjectName) => {
    setSubject(subjectName);
    const levels = getSubjectSupportedLevels(subjectName, programme === "myp" ? "myp" : "dp");
    if (!levels || levels.length === 0 || programme === "myp") {
      setLevel("");
    } else if (levels.length === 1) {
      setLevel(levels[0]);
    } else {
      setLevel("SL");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setErr("Please select a file.");
    if (!title.trim()) return setErr("Please enter a title.");
    if (!isGeneral && !subject) return setErr("Please select a course or select 'General / All Subjects'.");
    setLoading(true); setErr(null);

    try {
      // 1. Upload file
      const fd = new FormData();
      fd.append("file", file);
      if (isAdmin && destination === "nexus") fd.append("admin_upload", "true");

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
          programme: isGeneral ? "all" : programme,
          subject: isGeneral ? null : (subject || null),
          level: isGeneral ? null : (level || null),
          topic: topic.trim() || null,
          year: year ? parseInt(year) : null,
          exam_session: examSession || null,
          paper_number: paperNumber || null,
          destination,
          source: destination === "nexus" ? "platform" : "user",
        }),
      });

      onSuccess(resource, destination);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = useMemo(() => {
    let types = RESOURCE_TYPES;
    if (!isAdmin && destination !== "community") {
      // Regular users uploading personal notes
      types = types.filter(t => ["study_guide", "worksheet", "coursework_example", "other"].includes(t.value));
    } else if (userProgram === "myp" && !isGeneral) {
      types = types.filter(t => !["ia_example", "ee_example", "tok_resource"].includes(t.value));
    }
    return types;
  }, [userProgram, isAdmin, isGeneral, destination]);

  const modalTitle = destination === "nexus" 
    ? "Upload to IB Nexus Library" 
    : destination === "community" 
      ? (isAdmin ? "Publish to Community Resources" : "Submit Resource to Community")
      : "Upload to My Library";

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={modalTitle}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {err && <Alert variant="error" title={err} />}

        {/* Context-Aware Destination Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)] font-medium">Destination:</span>
            <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              {destination === "nexus" ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>IB Nexus Official Library</span>
                </>
              ) : destination === "community" ? (
                <>
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>IB Community Library</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>My Personal Library</span>
                </>
              )}
            </span>
            {subject && (
              <span className="text-[var(--accent)] font-semibold">· {subject}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {destination !== "nexus" && (
              <button
                type="button"
                onClick={() => setDestination(d => d === "community" ? "my_library" : "community")}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                {destination === "community" ? "Save to My Library instead" : "Share to Community Library"}
              </button>
            )}
          </div>
        </div>

        {/* Short & Subtle Community Review Hint */}
        {destination === "community" && !isAdmin && (
          <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Community submissions are reviewed by moderators before appearing publicly.</span>
          </div>
        )}

        {/* Scope Selector: General vs Subject-Specific */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Resource Scope & Applicability *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setIsGeneral(true); setSubject(""); setLevel(""); setSelectedGroup(""); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isGeneral
                  ? "border-indigo-500 bg-indigo-500/10 text-[var(--foreground)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-400">
                <Globe className="w-4 h-4" /> General / All Subjects
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1">Exam room rules, calculators, regulations, templates</p>
            </button>
            <button
              type="button"
              onClick={() => setIsGeneral(false)}
              className={`p-3 rounded-xl border text-left transition-all ${
                !isGeneral
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-[var(--accent)]">
                <BookOpen className="w-4 h-4" /> Subject-Specific
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1">Tied to a specific course (e.g. Biology, Math AA)</p>
            </button>
          </div>
        </div>

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
          <input 
            className="field w-full" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder={isGeneral ? "e.g. Official May 2025 Exam Regulations & Room Conduct" : "e.g. Biology HL May 2025 Paper 2 Question Pack"} 
          />
        </div>

        {/* Highlighted Details & Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>{destination === "nexus" ? "Official Details & Student Highlights" : "Material Details & Summary"}</span>
            </label>
            <span className="text-[11px] text-[var(--accent)] font-medium">Highlighted in library</span>
          </div>
          <textarea
            className="field w-full min-h-[85px] text-sm resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={
              isGeneral
                ? "Describe the rules, allowed calculator models, time allowances, and candidate conduct guidelines..."
                : "Describe key takeaways, unit concepts covered, model answer annotations, or exam tips..."
            }
            rows={3}
          />
        </div>

        {/* Row: Type + Programme */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Category *</label>
            <select 
              className="field w-full" 
              value={resourceType} 
              onChange={e => setResourceType(e.target.value)}
            >
              {filteredTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Target Programme *</label>
            {isGeneral ? (
              <div className="field w-full text-xs flex items-center justify-between bg-[var(--surface-muted)] px-3 py-2.5 rounded-xl border border-[var(--border)] text-indigo-400 font-semibold">
                <span>General (All IB Programmes)</span>
                <Globe className="w-4 h-4" />
              </div>
            ) : (
              <select className="field w-full" value={programme} onChange={e => handleProgrammeChange(e.target.value)}>
                <option value="dp">DP (Diploma Programme)</option>
                <option value="myp">MYP (Middle Years Programme)</option>
                <option value="both">Both (MYP + DP)</option>
              </select>
            )}
          </div>
        </div>

        {/* Subject Controls (Disabled/Hidden if General) */}
        {!isGeneral ? (
          <>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Subject Group</label>
              <select className="field w-full" value={selectedGroup} onChange={e => handleGroupChange(e.target.value)}>
                <option value="">— All Subject Groups —</option>
                {currentCatalog.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
              </select>
            </div>

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
                {programme === "myp" || !availableLevels || availableLevels.length === 0 ? (
                  <div className="field w-full opacity-60 text-xs flex items-center justify-center bg-[var(--surface-muted)] cursor-not-allowed">
                    N/A (Group Level / Core)
                  </div>
                ) : availableLevels.length === 1 ? (
                  <div className="field w-full opacity-90 text-xs flex items-center justify-between bg-[var(--surface-muted)] px-3 py-2 rounded-xl border border-[var(--border)]">
                    <span className="font-bold text-[var(--foreground)]">{availableLevels[0] === "SL" ? "Standard Level (SL)" : availableLevels[0]}</span>
                    <span className="text-[10px] font-black uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">SL Only</span>
                  </div>
                ) : (
                  <select className="field w-full" value={level} onChange={e => setLevel(e.target.value)}>
                    <option value="SL">Standard Level (SL)</option>
                    <option value="HL">Higher Level (HL)</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Topic / Unit (Optional)</label>
              <input className="field w-full" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cell Respiration / Option B" />
            </div>
          </>
        ) : (
          <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-300 flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>This upload is marked <strong>General</strong>. It will be prominently highlighted in the library as applicable across all candidate subjects without restricting to a single course.</span>
          </div>
        )}

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

        <div className="flex gap-2 pt-2">
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner /> : "Upload to Library"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Edit Resource Details Modal ─────────────────────────────────────────── */
function EditResourceModal({ open, onClose, resource, onSaved, isAdmin }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [resourceType, setResourceType] = useState("other");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (resource && open) {
      setTitle(resource.title || resource.file_name || "");
      setDescription(resource.description || "");
      setSubject(resource.subject || "");
      setLevel(resource.level || "");
      setTopic(resource.topic || "");
      setResourceType(resource.resource_type || "other");
      setErr(null);
    }
  }, [resource, open]);

  const handleUpdate = async (overrideVisibility = null) => {
    if (!title.trim()) return setErr("Title is required");
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        subject: subject || null,
        level: level || null,
        topic: topic.trim() || null,
        resource_type: resourceType,
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
      if (!res.ok) throw new Error(data.error || "Failed to update");
      onSaved(data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !resource) return null;

  const isPending = resource.visibility === "pending_approval";

  return (
    <Modal open={open} onClose={onClose} title={isPending && isAdmin ? "Moderate & Edit Submission" : "Edit Resource Details"}>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {err && <Alert variant="error" title={err} />}

        {isPending && isAdmin && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-200">Moderation Review Mode</p>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                You can correct or refine the resource name, subject, level, or summary notes before approving. Clicking <strong>Approve & Publish</strong> will immediately release it to the IB Community Resources section.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Title *</label>
          <input className="field w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology HL Paper 2 Comprehensive Notes" />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Subject</label>
              <input className="field w-full text-xs" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology (or blank for General)" />
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
        )}

        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Topic / Unit</label>
              <input className="field w-full text-xs" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cell Respiration" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">Resource Category</label>
              <select className="field w-full text-xs" value={resourceType} onChange={e => setResourceType(e.target.value)}>
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Description & Contributor Notes</span>
            </label>
            <span className="text-[11px] text-[var(--accent)] font-medium">Highlighted in Library</span>
          </div>
          <textarea
            className="field w-full min-h-[90px] text-sm resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Key highlights, exam tips, syllabus notes..."
            rows={3}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
          {isPending && isAdmin ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => handleUpdate("rejected")}
                disabled={loading}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Submission
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleUpdate("approved")}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20"
              >
                {loading ? <Spinner /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Publish</>}
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? <Spinner /> : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ── Publisher & Resource Details Modal ──────────────────────────────────── */
function PublisherDetailsModal({ open, resource, onClose, onPreview, onStudy, directDownload }) {
  if (!open || !resource) return null;

  const isPlatform = resource.source === "platform";
  const pub = resource.publisher || {};
  const pubName = isPlatform ? "IB Nexus Academic Board" : (pub.name || "Community Scholar");
  const pubRole = isPlatform ? "Official Curriculum Board" : (pub.role || "Verified Student Contributor");
  const pubSchool = isPlatform ? "IB Nexus Global Academy" : (pub.school_name || "IB World School Candidate");
  const pubAvatar = pub.avatar_url;
  const isApproved = resource.visibility === "approved" || resource.visibility === "public" || isPlatform;
  const isPending = resource.visibility === "pending_approval";
  const isRejected = resource.visibility === "rejected";

  return (
    <Modal open={open} onClose={onClose} title="Resource & Contributor Overview">
      <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
        {/* Contributor Profile Card */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3 flex items-center justify-between">
            <span>Publisher Profile</span>
            {isApproved ? (
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" /> {isPlatform ? "Official Curriculum" : "Vetted & Approved"}
              </span>
            ) : isPending ? (
              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <Clock className="w-3 h-3" /> Under Review
              </span>
            ) : isRejected ? (
              <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <XCircle className="w-3 h-3" /> Rejected
              </span>
            ) : (
              <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <BookOpen className="w-3 h-3" /> Personal Upload
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            {pubAvatar ? (
              <img src={pubAvatar} alt={pubName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[var(--accent)]/30 shadow-md" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                {pubName[0] || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-base text-[var(--foreground)] truncate">{pubName}</h4>
                {isPlatform ? (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">Official</span>
                ) : (
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30">Contributor</span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] truncate mt-0.5">{pubRole} · {pubSchool}</p>
              <p className="text-[11px] text-[var(--muted)]/80 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--muted)]" />
                <span>Uploaded {fmtDate(resource.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Academic & Syllabus Specifications */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Academic Specifications</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Subject</span>
              <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block truncate">
                {resource.subject ? `${resource.subject}${resource.level ? ` (${resource.level})` : ""}` : "General (All Subjects)"}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Category</span>
              <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block truncate">
                {typeLabel(resource.resource_type)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Programme</span>
              <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block uppercase">
                {resource.programme || "DP"}
              </span>
            </div>
            {resource.topic && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:col-span-2">
                <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Unit / Topic</span>
                <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block truncate">
                  {resource.topic}
                </span>
              </div>
            )}
            {resource.year && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">Session / Year</span>
                <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block truncate">
                  {resource.exam_session ? `${resource.exam_session.toUpperCase()} ` : ""}{resource.year}
                </span>
              </div>
            )}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[10px] text-[var(--muted)] uppercase font-semibold block">File Size</span>
              <span className="text-xs font-bold text-[var(--foreground)] mt-0.5 block">
                {fmtSize(resource.file_size) || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Highlighted Notes / Contributor Guidance */}
        {resource.description && (
          <div className="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Contributor Notes & Key Highlights</span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--foreground)]/90 leading-relaxed whitespace-pre-line">
              {resource.description}
            </p>
          </div>
        )}

        {/* Moderation Verification Note */}
        <div className="p-3 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)] text-[11px] text-[var(--muted)] flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isPlatform
              ? "Official platform resource published and vetted directly by IB Nexus curriculum directors."
              : "Quality & Academic Integrity: Community submissions are manually checked and approved by IB Nexus moderators before appearing here."}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="primary"
            onClick={() => { onClose(); onPreview && onPreview(resource); }}
            className="flex-1"
          >
            <BookOpen className="w-4 h-4 mr-2" /> Open in Viewer
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => directDownload(resource)}
            className="shrink-0"
          >
            <Download className="w-4 h-4 mr-1.5" /> Download
          </Button>
          {onStudy && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => { onClose(); onStudy(resource); }}
              className="shrink-0"
              title="Add to study plan"
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Admin Moderation Review Queue Modal ─────────────────────────────────── */
function AdminModerationQueueModal({ open, onClose, onRefreshResources, onPreview, onEdit }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [err, setErr] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/resources?visibility=pending_approval&limit=50");
      if (!res.ok) throw new Error("Failed to load moderation queue");
      const d = await res.json();
      setPendingItems(d.resources || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPending();
    }
  }, [open, fetchPending]);

  const handleApprove = async (resource) => {
    setActionId(resource.id);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve resource");
      setPendingItems(prev => prev.filter(r => r.id !== resource.id));
      onRefreshResources();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (resource) => {
    if (!confirm(`Are you sure you want to reject "${resource.title}"?`)) return;
    setActionId(resource.id);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject resource");
      setPendingItems(prev => prev.filter(r => r.id !== resource.id));
      onRefreshResources();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Admin Moderation Queue · Community Submissions">
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {err && <Alert variant="error" title={err} />}

        {/* Queue header strip */}
        <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Pending Community Review</span>
            </h4>
            <p className="text-xs text-[var(--muted)]">
              Inspect uploaded documents, polish titles and metadata, then approve for instant publication.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPending}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Spinner className="w-8 h-8 mx-auto text-[var(--accent)] mb-3" />
            <p className="text-xs text-[var(--muted)]">Loading pending community uploads...</p>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="py-16 text-center border border-[var(--border)] rounded-2xl bg-[var(--surface)]/40 p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="font-bold text-base text-[var(--foreground)] mb-1">Queue is Completely Clear!</h4>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              All community member uploads have been moderated and published. New submissions will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((r) => {
              const pub = r.publisher || {};
              const pubName = pub.name || "Community Member";
              const isWorking = actionId === r.id;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all space-y-3"
                >
                  {/* Top: submitter info */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {pub.avatar_url ? (
                        <img src={pub.avatar_url} alt={pubName} className="w-8 h-8 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {pubName[0] || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--foreground)] truncate">{pubName}</span>
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase">
                            Pending Review
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--muted)]">{pub.school_name || "IB Student"} · Submitted {fmtDate(r.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)]">
                        {r.subject || "General"}
                      </span>
                      {r.level && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {r.level}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & metadata */}
                  <div>
                    <h5 className="font-bold text-sm text-[var(--foreground)] leading-snug">{r.title}</h5>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1 flex-wrap">
                      <span>{typeLabel(r.resource_type)}</span>
                      {r.topic && <span>· Unit: {r.topic}</span>}
                      {r.file_size && <span>· {fmtSize(r.file_size)}</span>}
                    </div>
                  </div>

                  {/* Submitter notes */}
                  {r.description && (
                    <div className="p-2.5 rounded-xl bg-[var(--surface-hover)]/70 border border-[var(--border)]/70 text-xs text-[var(--foreground)]/90">
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider block mb-0.5">Author's Notes:</span>
                      {r.description}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/50">
                    <button
                      type="button"
                      onClick={() => onPreview && onPreview(r)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-hover)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[var(--accent)]" /> Inspect File
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(r)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Details
                    </button>

                    <div className="flex-1" />

                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleReject(r)}
                      disabled={isWorking}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs py-1.5 px-3"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleApprove(r)}
                      disabled={isWorking}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 shadow-md shadow-emerald-500/20"
                    >
                      {isWorking ? <Spinner className="w-3.5 h-3.5" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Publish</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

/* ── In-Website Document Viewer Modal ────────────────────────────────────── */
function InWebsiteViewerModal({ open, resource, onClose, onStudy, isSaved, onToggleSave, isAdmin, userProfile }) {
  if (!open || !resource) return null;

  const type = (resource.file_type || "").toLowerCase();
  const name = (resource.file_name || "").toLowerCase();
  const isImage = type.startsWith("image/") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
  const isOfficeDoc = type.includes("word") || type.includes("excel") || type.includes("powerpoint") || type.includes("officedocument") || name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".xls") || name.endsWith(".xlsx");

  const embedUrl = isOfficeDoc
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.file_url)}`
    : resource.file_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="w-full max-w-6xl h-[92vh] bg-[var(--background)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[var(--border)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[var(--foreground)] text-sm sm:text-base truncate max-w-md">
                    {resource.title || resource.file_name}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    resource.source === "platform" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {resource.source === "platform" ? <><ShieldCheck className="w-3 h-3" /> IB Nexus Library</> : <><BookOpen className="w-3 h-3" /> My Library</>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5 flex-wrap">
                  {resource.subject ? (
                    <span>{resource.subject}{resource.level ? ` (${resource.level})` : ""}</span>
                  ) : (
                    <span className="text-indigo-400 font-semibold flex items-center gap-1"><Globe className="w-3 h-3" /> General · All Subjects</span>
                  )}
                  {resource.resource_type && <span>· {typeLabel(resource.resource_type)}</span>}
                  {resource.file_size && <span>· {fmtSize(resource.file_size)}</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => directDownload(resource)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:shadow-lg transition-all"
                title="Download directly to your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              {onStudy && (
                <button
                  type="button"
                  onClick={() => onStudy(resource)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold hover:border-[var(--accent)] transition-all"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="hidden sm:inline">Add to Plan</span>
                </button>
              )}

              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(resource.id)}
                  className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
                  title={isSaved ? "Saved" : "Save"}
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-[var(--accent)]" /> : <Bookmark className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-red-500 transition-colors"
                title="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Highlighted Details Strip */}
          {resource.description && (
            <div className="px-4 sm:px-6 py-2.5 bg-[var(--surface-hover)] border-b border-[var(--border)] flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[var(--accent)] mr-1.5 uppercase text-[10px] tracking-wider">
                  {resource.source === "platform" ? "Official Guidance & Notes:" : "Notes & Details:"}
                </span>
                <span className="text-[var(--foreground)]">{resource.description}</span>
              </div>
            </div>
          )}

          {/* Embedded Viewer */}
          <div className="flex-1 bg-neutral-900/90 relative w-full h-full overflow-hidden flex items-center justify-center">
            {isImage ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={resource.file_url}
                  alt={resource.title || "Resource preview"}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            ) : (
              <iframe
                src={`${embedUrl}#toolbar=1`}
                className="w-full h-full border-none bg-white"
                title="Document Viewer"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Resource Card ────────────────────────────────────────────────────────── */
function ResourceCard({ resource, isSaved, onToggleSave, onStudy, isAdmin, onDelete, onEdit, onPreview, onShowPublisherDetails, userProfile }) {
  const [hoverPub, setHoverPub] = useState(false);
  const sessionLabel = resource.exam_session
    ? `${resource.exam_session === "may" ? "May" : "Nov"} ${resource.year || ""}`
    : resource.year ? `${resource.year}` : null;

  const canEditOrDelete = isAdmin || (resource.user_id && userProfile?.id && resource.user_id === userProfile.id);
  const isGeneral = !resource.subject;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative flex flex-col rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all duration-300"
    >
      {/* Top colour bar */}
      <div className={`h-1.5 rounded-t-[1.25rem] ${isGeneral ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" : getSubjectBgClass(resource.subject)}`} />

      <div className="flex-1 p-5">
        {/* Subject badge + source / status */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isGeneral ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <Globe className="w-3 h-3" /> General • All Subjects
              </span>
            ) : (
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${getSubjectBadgeClasses(resource.subject)}`}>
                {resource.subject}{resource.level ? ` ${resource.level}` : ""}
              </span>
            )}
          </div>

          {resource.source === "platform" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> IB Nexus Library
            </span>
          ) : resource.visibility === "pending_approval" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-3 h-3" /> Under Review
            </span>
          ) : resource.visibility === "approved" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-3 h-3" /> Community
            </span>
          ) : resource.visibility === "rejected" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-3 h-3" /> Needs Revision
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BookOpen className="w-3 h-3" /> My Library
            </span>
          )}
        </div>

        {/* Title: clicking triggers in-website preview without redirecting */}
        <button
          type="button"
          onClick={() => onPreview && onPreview(resource)}
          className="text-left w-full block group/title cursor-pointer"
        >
          <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug group-hover/title:text-[var(--accent)] transition-colors line-clamp-2">
            {resource.title}
          </h3>
        </button>

        {/* Type + session */}
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted)] flex-wrap">
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
          {resource.file_size && (
            <>
              <span className="opacity-40">·</span>
              <span>{fmtSize(resource.file_size)}</span>
            </>
          )}
        </div>

        {resource.topic && (
          <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-1">{resource.topic}</p>
        )}

        {/* Publisher attribution card (Click or hover for contributor overview & material specs) */}
        <div className="relative mt-3.5">
          <button
            type="button"
            onClick={() => onShowPublisherDetails && onShowPublisherDetails(resource)}
            onMouseEnter={() => setHoverPub(true)}
            onMouseLeave={() => setHoverPub(false)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-hover)]/70 hover:bg-[var(--surface-hover)] border border-[var(--border)] text-left transition-all group/pub cursor-pointer"
            title="Click to view contributor profile and material details"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {resource.publisher?.avatar_url ? (
                <img src={resource.publisher.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[var(--accent)]/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(resource.publisher?.name || (resource.source === "platform" ? "N" : "C"))[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover/pub:text-[var(--accent)] transition-colors">
                  {resource.publisher?.name || (resource.source === "platform" ? "IB Nexus Academic Board" : "Community Member")}
                </p>
                <p className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                  <span>{fmtDate(resource.created_at)}</span>
                  {resource.publisher?.school_name && <span>· {resource.publisher.school_name}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] shrink-0 ml-2 group-hover/pub:translate-x-0.5 transition-transform">
              <span>Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Quick Hover Preview Popover */}
          <AnimatePresence>
            {hoverPub && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 bottom-full mb-2 p-3 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-[var(--border)] shadow-2xl z-40 text-left pointer-events-none space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Contributor Details
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {fmtDate(resource.created_at)}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--foreground)]">
                  {resource.publisher?.name || (resource.source === "platform" ? "IB Nexus Academic Board" : "Community Contributor")}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {resource.publisher?.school_name || "IB World School Candidate"}
                </div>
                {resource.subject && (
                  <div className="text-[10px] text-[var(--muted)]">
                    Subject: <strong className="text-[var(--foreground)]">{resource.subject}{resource.level ? ` (${resource.level})` : ""}</strong>
                  </div>
                )}
                <div className="pt-1 border-t border-[var(--border)]/60 text-[10px] text-[var(--accent)] font-semibold flex items-center gap-1">
                  <span>Click card to open full specifications & notes</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlighted Details & Notes added by user or admin */}
        {resource.description && (
          <div className="mt-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group-hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>{resource.source === "platform" ? "Official Notes & Guidance" : "Item Details"}</span>
            </div>
            <p className="text-xs text-[var(--foreground)]/90 leading-relaxed line-clamp-2">
              {resource.description}
            </p>
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-[var(--border)]/50">
        <button
          type="button"
          onClick={() => onPreview && onPreview(resource)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          title="Open in-website preview"
        >
          <BookOpen className="w-3.5 h-3.5" /> Open
        </button>

        <button
          type="button"
          onClick={() => directDownload(resource)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface)] cursor-pointer"
          title="Download file directly"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>

        <button
          type="button"
          onClick={() => onShowPublisherDetails && onShowPublisherDetails(resource)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface)] cursor-pointer"
          title="View publisher & material info"
        >
          <Info className="w-3.5 h-3.5 text-[var(--muted)]" /> Details
        </button>

        <div className="flex-1" />

        {canEditOrDelete && (
          <>
            <button
              onClick={() => onEdit(resource)}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--muted)] hover:text-blue-500 transition-colors"
              title="Edit title & details"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors"
              title="Delete resource"
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

export default function ResourcesClient({ userProfile, userProgram, isAdmin, userSubjects, globalSubjects = [] }) {
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
  const [libraryScopeFilter, setLibraryScopeFilter] = useState("all"); // 'all' | 'general' | 'subject'
  const [previewResource, setPreviewResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [detailsResource, setDetailsResource] = useState(null);
  const [adminQueueOpen, setAdminQueueOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showSectionInfo, setShowSectionInfo] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedResourceType, setSelectedResourceType] = useState(null);
  const [subjectStats, setSubjectStats] = useState({});

  useEffect(() => {
    setSelectedSubject(null);
    setSelectedResourceType(null);
    setLibraryScopeFilter("all");
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

  // Fetch pending review count for admins
  const fetchPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/resources?pending_count=true");
      if (res.ok) {
        const d = await res.json();
        setPendingCount(d.pending_count || 0);
      }
    } catch (e) {
      console.error("Failed to load pending count", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

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

  // Programme-specific Canonical Course Catalog from the database
  const effectiveGlobalSubjects = useMemo(() => {
    if (Array.isArray(globalSubjects) && globalSubjects.length > 0) {
      const filtered = globalSubjects.filter(
        (s) => (s.program || "dp").toLowerCase() === (userProgram || "dp").toLowerCase()
      );
      if (filtered.length > 0) return filtered;
    }
    return userProgram === "myp" ? CANONICAL_MYP_SUBJECTS : CANONICAL_DP_SUBJECTS;
  }, [globalSubjects, userProgram]);

  const allSubjectsList = useMemo(() => {
    return Array.from(new Set(effectiveGlobalSubjects.map((s) => s.name)));
  }, [effectiveGlobalSubjects]);
  const allSubjects = allSubjectsList;
  
  // User's enrolled subjects from profile: strictly only the selected subjects
  const mySubjectNames = useMemo(() => {
    return (userSubjects || [])
      .map(s => typeof s === 'string' ? s : (s?.name || s?.subject || ''))
      .filter(Boolean);
  }, [userSubjects]);

  // Build query params from tab + filters + search
  const buildParams = useCallback((offset = 0) => {
    const p = new URLSearchParams();
    if (tab === "nexus_library") {
      p.set("source", "platform");
    } else if (tab === "community_resources") {
      p.set("source", "community");
    } else if (tab === "my_library" || tab === "community_library") {
      p.set("source", "user");
      p.set("scope", "mine");
    } else {
      p.set("source", "all");
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

  // Filtered resources for active tab and libraryScopeFilter
  const displayedResources = useMemo(() => {
    if (tab !== "nexus_library" && tab !== "my_library" && tab !== "community_library" && tab !== "community_resources") return resources;
    if (libraryScopeFilter === "general") {
      return resources.filter(r => !r.subject);
    }
    if (libraryScopeFilter === "subject") {
      return resources.filter(r => !!r.subject);
    }
    return resources;
  }, [resources, tab, libraryScopeFilter]);

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

  const handleEdit = (resource) => {
    setEditingResource(resource);
  };

  const handleResourceUpdated = (updated) => {
    setResources(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
    if (previewResource && previewResource.id === updated.id) {
      setPreviewResource(prev => ({ ...prev, ...updated }));
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
          <div className="inline-flex bg-[var(--surface)] p-1.5 rounded-full border border-[var(--border)] shadow-sm flex-wrap justify-center gap-1" role="tablist">
            {MAIN_TABS.map(t => {
              const isActive = tab === t.value;
              const Icon = t.icon;
              return (
                <div
                  key={t.value}
                  className="relative"
                  onMouseEnter={() => setHoveredTab(t.value)}
                  onMouseLeave={() => setHoveredTab(null)}
                >
                  <button
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(t.value)}
                    className={`group shrink-0 flex items-center relative px-4 sm:px-5 py-2.5 text-[13px] font-semibold rounded-full transition-colors duration-300 outline-none ${
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
                      {t.value === "community_resources" && isAdmin && pendingCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-black leading-none animate-pulse">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Hover Information Tooltip */}
                  <AnimatePresence>
                    {hoveredTab === t.value && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-[var(--border)] shadow-2xl z-50 pointer-events-none text-left"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--foreground)] mb-1">
                          <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>{t.tooltipTitle}</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                          {t.tooltipDesc}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Submission Notice Toast Banner ─────────────────────────────────── */}
      <AnimatePresence>
        {uploadNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
              <span>{uploadNotice}</span>
            </div>
            <button onClick={() => setUploadNotice(null)} className="text-purple-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main View Area ────────────────────────────────────────────────── */}
      {search || activeFilterCount > 0 || tab === "nexus_library" || tab === "my_library" || tab === "community_library" || tab === "community_resources" ? (
        // Grid View for Search, Filters, IB Nexus Library, Community Resources, or My Library
        <>
          {/* Header for IB Nexus Library */}
          {tab === "nexus_library" && !search && activeFilterCount === 0 && (
            <div className="p-6 mb-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                  <span>IB Nexus Repository</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                  IB Nexus Library
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
                  Curated official past examination papers, syllabus guides, exam room rules, regulations, and verified exemplars published directly by IB Nexus.
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="primary"
                  onClick={() => setUploadOpen(true)}
                  className="shrink-0 shadow-lg shadow-emerald-500/10"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload to IB Nexus Library
                </Button>
              )}
            </div>
          )}

          {/* Header for Community Resources */}
          {tab === "community_resources" && !search && activeFilterCount === 0 && (
            <div className="p-6 mb-6 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.08] via-purple-500/[0.02] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    <Users className="w-4 h-4" />
                    <span>Peer Knowledge Exchange</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Moderator Approved
                  </span>

                  {/* Section Hover Detail Popover */}
                  <div 
                    className="relative inline-block"
                    onMouseEnter={() => setShowSectionInfo(true)}
                    onMouseLeave={() => setShowSectionInfo(false)}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/20 transition-colors cursor-pointer"
                    >
                      <Info className="w-3 h-3" />
                      <span>About this section</span>
                    </button>
                    <AnimatePresence>
                      {showSectionInfo && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-[var(--border)] shadow-2xl z-50 text-left space-y-2 pointer-events-none"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span>About IB Community Resources</span>
                          </div>
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            • <strong>Peer-to-Peer Knowledge:</strong> Student-contributed revision notes, formula sheets, summaries, and exam strategies.
                          </p>
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            • <strong>Admin Verification:</strong> Every student submission is verified and approved by an administrator before appearing publicly.
                          </p>
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            • <strong>Attribution & Transparency:</strong> Publisher identity, school, upload date, and curriculum notes are clearly displayed on every resource card.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                  IB Community Resources
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
                  Peer-to-peer revision packs, student notes, and verified exemplars. Every community upload is checked and approved by an IB Nexus administrator before being published.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {isAdmin && (
                  <Button
                    variant="secondary"
                    onClick={() => setAdminQueueOpen(true)}
                    className={`shrink-0 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 shadow-sm relative ${
                      pendingCount > 0 ? "ring-2 ring-amber-500/50" : ""
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-1.5 text-amber-400" />
                    <span>Review Queue</span>
                    {pendingCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                )}

                <Button
                  variant="primary"
                  onClick={() => setUploadOpen(true)}
                  className="shrink-0 shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-500"
                >
                  <Upload className="w-4 h-4 mr-2" /> Submit Resource
                </Button>
              </div>
            </div>
          )}

          {/* Header for My Library */}
          {(tab === "my_library" || tab === "community_library") && !search && activeFilterCount === 0 && (
            <div className="p-6 mb-6 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.08] via-blue-500/[0.02] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  <BookOpen className="w-4 h-4" />
                  <span>Personal Study Repository</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                  My Library
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
                  Your private workspace for uploaded revision guides, notes, summaries, coursework drafts, and study materials.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setUploadOpen(true)}
                className="shrink-0 shadow-lg shadow-blue-500/10"
              >
                <Upload className="w-4 h-4 mr-2" /> Upload to My Library
              </Button>
            </div>
          )}

          {/* Scope Filter Pills for Libraries */}
          {(tab === "nexus_library" || tab === "my_library" || tab === "community_library" || tab === "community_resources") && !search && activeFilterCount === 0 && resources.length > 0 && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs font-semibold text-[var(--muted)] mr-1">Scope:</span>
              <button
                type="button"
                onClick={() => setLibraryScopeFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  libraryScopeFilter === "all"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                All Items ({resources.length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryScopeFilter("general")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  libraryScopeFilter === "general"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                General / All Subjects ({resources.filter(r => !r.subject).length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryScopeFilter("subject")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  libraryScopeFilter === "subject"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Subject-Specific ({resources.filter(r => !!r.subject).length})
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ResourceSkeleton key={i} />)}
            </div>
          ) : displayedResources.length === 0 ? (
            <div className="card p-12 sm:p-20 text-center border border-[var(--border)] bg-[var(--surface)]/30 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--accent)] opacity-[0.03] blur-3xl rounded-full pointer-events-none"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--accent)] opacity-[0.03] blur-3xl rounded-full pointer-events-none"></div>
              
              {tab === "nexus_library" ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 shadow-inner text-emerald-400">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 tracking-tight">IB NEXUS LIBRARY IS EMPTY</h3>
                  <p className="text-base text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed">
                    No official resources or exam regulations have been published yet. They will appear here dynamically as soon as an Admin uploads them.
                  </p>
                  {isAdmin && (
                    <Button variant="primary" onClick={() => setUploadOpen(true)} className="shadow-lg shadow-emerald-500/20">
                      <Upload className="w-4 h-4 mr-2" /> <span className="font-medium">Upload to IB Nexus Library</span>
                    </Button>
                  )}
                </motion.div>
              ) : tab === "community_resources" ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6 shadow-inner text-purple-400">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
                    COMMUNITY REPOSITORY IS READY
                  </h3>
                  <p className="text-base text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed">
                    No peer study packs or notes have been approved for this section yet. Click below to submit your study guide or summary to be verified by a moderator!
                  </p>
                  <Button variant="primary" onClick={() => setUploadOpen(true)} className="shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-500">
                    <Upload className="w-4 h-4 mr-2" /> <span className="font-medium">Submit Community Resource</span>
                  </Button>
                </motion.div>
              ) : (tab === "my_library" || tab === "community_library") ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6 shadow-inner text-blue-400">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
                    YOUR LIBRARY IS EMPTY
                  </h3>
                  <p className="text-base text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed">
                    You haven't uploaded any study materials or notes yet. Click below to add your first document and build your personal academic library.
                  </p>
                  <Button variant="primary" onClick={() => setUploadOpen(true)} className="shadow-lg shadow-blue-500/20">
                    <Upload className="w-4 h-4 mr-2" /> <span className="font-medium">Upload to My Library</span>
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
                  {displayedResources.map(r => (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      isSaved={savedIds.has(r.id)}
                      onToggleSave={toggleSave}
                      onStudy={setStudyResource}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onPreview={setPreviewResource}
                      onShowPublisherDetails={setDetailsResource}
                      userProfile={userProfile}
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
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${getSubjectIconClasses(selectedSubject)}`}>
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
                      {selectedSubject}
                    </h2>
                    <p className="text-[var(--muted)] mt-1">Explore and contribute resources for {selectedSubject}.</p>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  onClick={() => setUploadOpen(true)}
                  className="shrink-0 flex items-center gap-2 self-start sm:self-auto shadow-md"
                >
                  <Upload className="w-4 h-4" /> Upload Document
                </Button>
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
                userProfile={userProfile}
              />
            </motion.div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(r, dest) => {
          if (dest === "community" && !isAdmin) {
            setUploadNotice("Your resource has been submitted for review! An IB Nexus administrator will verify it before it appears in Community Resources.");
            setTimeout(() => setUploadNotice(null), 8000);
          } else {
            setResources(prev => [r, ...prev]);
            setTotal(prev => prev + 1);
          }
          setUploadOpen(false);
          fetchPendingCount();
          loadResources();
        }}
        isAdmin={isAdmin}
        userProfile={userProfile}
        subjects={allSubjects}
        userProgram={userProgram}
        initialTab={tab}
        selectedSubject={selectedSubject}
      />

      <StudyFromModal
        open={!!studyResource}
        onClose={() => setStudyResource(null)}
        resource={studyResource}
      />

      <InWebsiteViewerModal
        open={!!previewResource}
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
        onStudy={setStudyResource}
        isSaved={previewResource ? savedIds.has(previewResource.id) : false}
        onToggleSave={toggleSave}
        isAdmin={isAdmin}
        userProfile={userProfile}
      />

      <EditResourceModal
        open={!!editingResource}
        resource={editingResource}
        onClose={() => setEditingResource(null)}
        onSaved={handleResourceUpdated}
        isAdmin={isAdmin}
      />

      <PublisherDetailsModal
        open={!!detailsResource}
        resource={detailsResource}
        onClose={() => setDetailsResource(null)}
        onPreview={setPreviewResource}
        onStudy={setStudyResource}
        directDownload={directDownload}
      />

      {isAdmin && (
        <AdminModerationQueueModal
          open={adminQueueOpen}
          onClose={() => { setAdminQueueOpen(false); fetchPendingCount(); }}
          onRefreshResources={() => { loadResources(); fetchPendingCount(); }}
          onPreview={setPreviewResource}
          onEdit={(r) => { setEditingResource(r); setAdminQueueOpen(false); }}
        />
      )}
    </div>
  );
}
