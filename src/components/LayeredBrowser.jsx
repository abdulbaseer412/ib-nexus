"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Search, ArrowLeft, Layers, Bookmark, Clock, CheckCircle2, Sigma, Flame, FileText, Upload, X, FileUp, File as FileIcon, ExternalLink, Trash2, Pencil } from "lucide-react";
import Link from "next/link";

const TYPES_WITH_TOPICS = ["revision_guide", "study_guide", "worksheet", "teacher_resource", "other"];

// Predefined IB taxonomy
const TAXONOMY = {
  "Mathematics AA": { levels: ["HL", "SL"], topics: ["Algebra", "Functions", "Geometry", "Trigonometry", "Calculus", "Statistics", "Probability", "Vectors"], icon: Sigma, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" },
  "Mathematics AI": { levels: ["HL", "SL"], topics: ["Number & Algebra", "Functions", "Geometry & Trigonometry", "Statistics & Probability", "Calculus"], icon: Sigma, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" },
  "Mathematics AA (Analysis and Approaches)": { levels: ["HL", "SL"], topics: ["Algebra", "Functions", "Geometry", "Trigonometry", "Calculus", "Statistics", "Probability", "Vectors"], icon: Sigma, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" },
  "Mathematics AI (Applications and Interpretation)": { levels: ["HL", "SL"], topics: ["Number & Algebra", "Functions", "Geometry & Trigonometry", "Statistics & Probability", "Calculus"], icon: Sigma, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" },
  "Physics": { levels: ["HL", "SL"], topics: ["Space, time and motion", "The particulate nature of matter", "Wave behavior", "Fields", "Nuclear and quantum physics"], icon: Flame, color: "rgba(14,165,233,.1)", textColor: "#0ea5e9" },
  "Chemistry": { levels: ["HL", "SL"], topics: ["Structure 1", "Structure 2", "Structure 3", "Reactivity 1", "Reactivity 2", "Reactivity 3"], icon: BeakerIcon, color: "rgba(245,158,11,.1)", textColor: "#f59e0b" },
  "Biology": { levels: ["HL", "SL"], topics: ["Cell biology", "Molecular biology", "Genetics", "Ecology", "Evolution and biodiversity", "Human physiology"], icon: Layers, color: "rgba(16,185,129,.1)", textColor: "#10b981" },
  "Economics": { levels: ["HL", "SL"], topics: ["Microeconomics", "Macroeconomics", "Global economics"], icon: FileText, color: "rgba(139,92,246,.1)", textColor: "#8b5cf6" },
  "Business Management": { levels: ["HL", "SL"], topics: ["Business organization", "Human resource management", "Finance", "Marketing", "Operations management"], icon: FileText, color: "rgba(59,130,246,.1)", textColor: "#3b82f6" },
  "English A Lit": { levels: ["HL", "SL"], topics: ["Readers, writers and texts", "Time and space", "Intertextuality"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "English A Lang & Lit": { levels: ["HL", "SL"], topics: ["Readers, writers and texts", "Time and space", "Intertextuality"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "English A": { levels: ["HL", "SL"], topics: ["Readers, writers and texts", "Time and space", "Intertextuality"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "English B": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "Spanish B": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "French B": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "German B": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "Mandarin B": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "German ab initio": { levels: ["SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "Urdu": { levels: ["HL", "SL"], topics: ["Identities", "Experiences", "Human ingenuity", "Social organization", "Sharing the planet"], icon: FileText, color: "rgba(236,72,153,.1)", textColor: "#ec4899" },
  "History": { levels: ["HL", "SL"], topics: ["Prescribed subjects", "World history topics", "HL Depth studies"], icon: FileText, color: "rgba(168,85,247,.1)", textColor: "#a855f7" },
  "Psychology": { levels: ["HL", "SL"], topics: ["Biological approach", "Cognitive approach", "Sociocultural approach", "Abnormal psychology"], icon: FileText, color: "rgba(234,179,8,.1)", textColor: "#eab308" },
  "Geography": { levels: ["HL", "SL"], topics: ["Geographic themes", "Global change", "Global interactions"], icon: FileText, color: "rgba(34,197,94,.1)", textColor: "#22c55e" },
  "Global Politics": { levels: ["HL", "SL"], topics: ["Power, sovereignty and international relations", "Human rights", "Development", "Peace and conflict"], icon: FileText, color: "rgba(139,92,246,.1)", textColor: "#8b5cf6" },
  "Computer Science": { levels: ["HL", "SL"], topics: ["System fundamentals", "Computer organization", "Networks", "Computational thinking"], icon: FileText, color: "rgba(59,130,246,.1)", textColor: "#3b82f6" },
  "ESS": { levels: ["SL", "HL"], topics: ["Foundations of environmental systems", "Ecosystems and ecology", "Biodiversity and conservation", "Water and aquatic food systems", "Soil systems", "Atmospheric systems", "Climate change"], icon: Layers, color: "rgba(16,185,129,.1)", textColor: "#10b981" },
  "Theory of Knowledge": { levels: ["Core"], topics: ["Knowledge and the knower", "Optional themes", "Areas of knowledge", "The TOK essay", "The TOK exhibition"], icon: LightbulbIcon, color: "rgba(244,63,94,.1)", textColor: "#f43f5e" },
  "Extended Essay": { levels: ["Core"], topics: ["Research process", "Writing process", "Formatting", "Subject-specific guidance"], icon: BookOpenIcon, color: "rgba(168,85,247,.1)", textColor: "#a855f7" }
};

function getTaxonomy(name) {
  if (!name) return { levels: ["HL", "SL"], topics: ["General Topics", "Exam Practice"], icon: FileText, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" };
  if (TAXONOMY[name]) return TAXONOMY[name];
  const nameLower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(TAXONOMY)) {
    const kLower = k.toLowerCase().trim();
    if (kLower === nameLower || nameLower.startsWith(kLower) || kLower.startsWith(nameLower)) {
      return v;
    }
  }
  return { levels: ["HL", "SL"], topics: ["General Revision", "Unit 1", "Unit 2", "Exam Prep"], icon: FileText, color: "rgba(79,140,255,.1)", textColor: "#4f8cff" };
}

function BeakerIcon(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></svg>;
}
function LightbulbIcon(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
}
function BookOpenIcon(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}

export default function LayeredBrowser({ resourceType, initialSubject = null, onBack, onResourceSelect, userSubjects = [], userProgram, isAdmin, userProfile }) {
  // state: [subject, level, topic]
  const [subject, setSubject] = useState(initialSubject);
  const [level, setLevel] = useState(null);
  const [topic, setTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("all"); // 'all' | 'yours'
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [realUploadedFiles, setRealUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialSubject && !subject) {
      setSubject(initialSubject);
    }
  }, [initialSubject, subject]);

  useEffect(() => {
    // If we just got a subject and haven't auto-selected level yet, do it (except formula sheets)
    if (subject && !level && !topic) {
       if (resourceType === "formula_sheet" && subject !== "Economics") {
          setLevel(null);
       } else if (level === null) {
          const matchedUserSubject = userSubjects.find(s => s.startsWith(subject));
          const userLevel = matchedUserSubject ? matchedUserSubject.replace(subject, "").trim() : null;
          if (userLevel && getTaxonomy(subject).levels.includes(userLevel)) {
             setLevel(userLevel);
          }
       }
    }
  }, [subject, resourceType, userSubjects, level, topic]);

  useEffect(() => {
    if (!subject) return;
    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const params = new URLSearchParams({
          resource_type: resourceType,
          subject: subject,
        });
        if (level && !getTaxonomy(subject).levels.includes("Core") && (resourceType !== "formula_sheet" || subject === "Economics")) {
          params.append("level", level);
        }
        if (topic) {
          params.append("topic", topic);
        }
        
        const res = await fetch(`/api/resources?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          let files = data.resources || [];
          // Ensure strictly matched topic (e.g. formula sheets have null topic, API might return wildcard if not careful, though API handles it)
          if (!topic && !TYPES_WITH_TOPICS.includes(resourceType)) {
             files = files.filter(f => !f.topic);
          } else if (topic) {
             files = files.filter(f => f.topic === topic);
          }
          setRealUploadedFiles(files);
        }
      } catch (e) {
        console.error("Failed to load resources", e);
      }
      setLoadingFiles(false);
    };
    fetchFiles();
  }, [subject, level, topic, resourceType]);

  const handleRealUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      // 1. Upload to Supabase Storage
      const fd = new FormData();
      fd.append("file", selectedFile);
      if (isAdmin) fd.append("admin_upload", "true");

      const uploadRes = await fetch("/api/resources/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      // 2. Insert into Database
      const resourcePayload = {
        title: selectedFile.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
        file_url: uploadData.url,
        file_name: uploadData.name,
        file_size: uploadData.size,
        file_type: uploadData.type,
        resource_type: resourceType,
        programme: userProgram || "dp",
        subject: subject || null,
        level: level && !getTaxonomy(subject).levels.includes("Core") ? level : null,
        topic: topic ? topic.trim() : null,
        source: isAdmin ? "platform" : "user",
      };

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourcePayload),
      });
      if (!res.ok) {
         const d = await res.json();
         throw new Error(d.error || "Failed to save resource details");
      }
      
      const newResource = await res.json();
      setRealUploadedFiles(prev => [newResource, ...prev]);
      setUploadModalOpen(false);
      setSelectedFile(null);
    } catch (e) {
       setUploadError(e.message);
    } finally {
       setIsUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      // Fetch the file as a blob to force a download instead of opening in a new tab
      const response = await fetch(file.file_url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name || "resource";
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct download failed, falling back to open:", error);
      // Fallback to opening in new tab if the fetch fails (e.g. CORS)
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.file_name || "resource";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setRealUploadedFiles(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error("Error deleting:", e);
      alert("Failed to delete resource");
    }
  };

  const handleEdit = async (file) => {
    const newTitle = prompt("Enter new title:", file.title || file.file_name);
    if (!newTitle || newTitle === (file.title || file.file_name)) return;
    try {
      const res = await fetch(`/api/resources/${file.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setRealUploadedFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
    } catch (e) {
      console.error("Error updating:", e);
      alert("Failed to update resource");
    }
  };

  const handleSubjectClick = (subj) => {
    setSubject(subj);
    setTopic(null);
    if (resourceType === "formula_sheet" && subj !== "Economics") {
      setLevel(null);
    } else {
      // Auto-detect user's level if possible
      const matchedUserSubject = userSubjects.find(s => s.startsWith(subj));
      const userLevel = matchedUserSubject ? matchedUserSubject.replace(subj, "").trim() : null;
      setLevel(userLevel && getTaxonomy(subj).levels.includes(userLevel) ? userLevel : null);
    }
  };

  const handleTopicClick = (t) => {
    setTopic(t);
  };

  const handleBack = () => {
    if (topic) {
      setTopic(null);
    } else if (subject) {
      if (initialSubject && onBack) {
        onBack();
      } else {
        setSubject(null);
      }
    }
  };

  const renderFilesGrid = (matchedFiles) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
       {matchedFiles.map(file => (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={file.id} className="p-5 border border-[var(--border)] bg-[var(--surface)] rounded-2xl flex flex-col items-start gap-4 hover:border-[var(--accent)] hover:shadow-xl transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/5 rounded-full -translate-y-12 translate-x-12 blur-xl group-hover:bg-[var(--accent)]/10 transition-colors pointer-events-none" />
             <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shadow-sm">
               <FileIcon className="w-6 h-6" />
             </div>
             {(isAdmin || (file.user_id && userProfile?.id && file.user_id === userProfile.id)) && (
               <>
                 <button onClick={(e) => { e.stopPropagation(); handleEdit(file); }} className="absolute top-4 right-14 w-8 h-8 rounded-full bg-[var(--background)]/80 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-blue-500 hover:border-blue-500 transition-colors z-20 opacity-0 group-hover:opacity-100" title="Rename Resource">
                   <Pencil className="w-3.5 h-3.5" />
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--background)]/80 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-red-500 hover:border-red-500 transition-colors z-20 opacity-0 group-hover:opacity-100" title="Delete Resource">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </>
             )}
             <div className="w-full relative z-10">
               <h4 className="font-bold text-[var(--foreground)] truncate w-full pr-8" title={file.title || file.file_name}>{file.title || file.file_name}</h4>
               <p className="text-xs text-[var(--muted)] mt-1">{file.file_size ? (file.file_size / 1024 / 1024).toFixed(2) + " MB" : "Unknown Size"}</p>
             </div>
             <div className="flex w-full gap-2 mt-2 relative z-10">
               <button onClick={() => setPreviewFile(file)} className="flex-1 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-sm hover:shadow-md transition-all">Open</button>
               <button onClick={() => handleDownload(file)} className="flex-1 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm hover:border-[var(--muted)] hover:bg-[var(--background)] transition-all">Download</button>
             </div>
          </motion.div>
       ))}
       {isAdmin && (
         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 border-2 border-dashed border-[var(--border)] bg-transparent rounded-2xl flex flex-col items-center justify-center text-center hover:bg-[var(--surface)]/50 hover:border-[var(--accent)] transition-all cursor-pointer group min-h-[220px]" onClick={() => setUploadModalOpen(true)}>
           <div className="w-12 h-12 rounded-full bg-[var(--background)] flex items-center justify-center mb-3 shadow-sm border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors">
             <Upload className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
           </div>
           <span className="text-sm font-bold text-[var(--foreground)]">Upload Another</span>
         </motion.div>
       )}
    </div>
  );

  const renderSubjectList = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="text-center py-10 mb-6">
        <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-3">
          {resourceType === "formula_sheet" ? "Formula Library" : "Resource Library"}
        </h2>
        <p className="text-[var(--muted)] text-base max-w-lg mx-auto">
          Find exactly what you need without searching through every sheet.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto mb-10 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors" />
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${resourceType.replace("_", " ")}s (e.g. "quadratic roots")...`}
          className="field w-full pl-11 pr-4 py-4 text-base rounded-2xl border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-md shadow-sm focus:bg-[var(--background)] transition-all"
        />
      </div>

      <div className="flex items-center justify-between mb-4 ml-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Browse by Subject</h3>
        <div className="flex bg-[var(--surface)]/80 border border-[var(--border)] rounded-lg p-1">
          <button 
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "all" ? "bg-[var(--accent)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All Subjects
          </button>
          <button 
            onClick={() => setViewMode("yours")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "yours" ? "bg-[var(--accent)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Your Subjects
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(TAXONOMY)
          .map(([subjName, data]) => {
            const baseSubjName = subjName.split(" (")[0];
            const matchedUserSubject = userSubjects.find(s => s.startsWith(baseSubjName));
            const isYours = !!matchedUserSubject;
            const userLevel = isYours ? matchedUserSubject.replace(baseSubjName, "").trim() : "";
            return { subjName, data, isYours, userLevel };
          })
          .filter(({ isYours }) => viewMode === "all" || isYours || userSubjects.length === 0)
          .filter(({ subjName, data }) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            if (subjName.toLowerCase().includes(q)) return true;
            if (data.topics.some(t => t.toLowerCase().includes(q))) return true;
            return false;
          })
          .map(({ subjName, data, isYours, userLevel }) => {
            const Icon = data.icon;
            return (
              <button
                key={subjName}
                onClick={() => handleSubjectClick(subjName)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all group text-left ${
                  isYours 
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/5 hover:border-[var(--accent)] hover:shadow-md" 
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: data.color, color: data.textColor }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[var(--foreground)]">{subjName}</h4>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-colors ${
                  isYours ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--accent)]"
                }`} />
              </button>
            );
          })}
        </div>
    </motion.div>
  );

  const renderTopicList = () => {
    const data = getTaxonomy(subject);
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <button onClick={handleBack} className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to {initialSubject ? `${initialSubject} Resources` : `${resourceType.replace("_", " ")}s`}
        </button>

        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border)]">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: data.color, color: data.textColor }}>
            <data.icon className="w-6 h-6" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight uppercase">
                {subject} {level && !data.levels.includes("Core") && (resourceType !== "formula_sheet" || subject === "Economics") && <span className="text-[var(--accent)]">({level})</span>}
              </h2>
              <p className="text-sm text-[var(--muted)]">{data.topics.length} topics available</p>
            </div>
            
            {/* Inline Level Switcher if they already picked one or want to change */}
            {level && !data.levels.includes("Core") && data.levels.length > 1 && (resourceType !== "formula_sheet" || subject === "Economics") && (
              <div className="hidden sm:flex bg-[var(--surface)]/80 border border-[var(--border)] rounded-lg p-1">
                 {data.levels.map(lvl => (
                   <button
                     key={lvl}
                     onClick={() => setLevel(lvl)}
                     className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        level === lvl ? "bg-[var(--accent)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                     }`}
                   >
                     {lvl}
                   </button>
                 ))}
              </div>
            )}
          </div>
        </div>

        {!level && !data.levels.includes("Core") && (resourceType !== "formula_sheet" || subject === "Economics") ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-[var(--surface)]/30 rounded-2xl border border-[var(--border)]">
             <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6">
                <data.icon className="w-8 h-8 text-[var(--accent)]" />
             </div>
             <h3 className="text-xl font-extrabold text-[var(--foreground)] mb-8 tracking-tight">WHICH LEVEL ARE YOU STUDYING?</h3>
             <div className="flex justify-center gap-4">
                {data.levels.map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => setLevel(lvl)} 
                    className="px-8 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-lg hover:-translate-y-1 transition-all group font-bold text-lg"
                  >
                    {lvl}
                  </button>
                ))}
             </div>           </motion.div>
        ) : !TYPES_WITH_TOPICS.includes(resourceType) ? (
          loadingFiles ? (
             <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
          ) : realUploadedFiles.length > 0 ? (
            renderFilesGrid(realUploadedFiles)
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-16 text-center border border-[var(--border)] bg-[var(--surface)]/30 backdrop-blur-sm rounded-2xl shadow-sm">
               <div className="w-20 h-20 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6">
                 <FileUp className="w-10 h-10 text-[var(--accent)]" />
               </div>
               <h3 className="text-2xl font-bold text-[var(--foreground)] mb-3">
                 {isAdmin ? `Publish Official ${resourceType.replace("_", " ")}` : `No official ${resourceType.replace("_", " ")} published yet`}
               </h3>
               <p className="text-base text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed">
                 {isAdmin ? (
                   <>You have not published the official {resourceType.replace("_", " ")} for <strong className="text-[var(--foreground)]">{subject} {level && !data.levels.includes("Core") && (resourceType !== "formula_sheet" || subject === "Economics") ? `(${level})` : ""}</strong>. Upload it now to make it available to all students in the Nexus Library.</>
                 ) : (
                   <>The official {resourceType.replace("_", " ")} for <strong className="text-[var(--foreground)]">{subject} {level && !data.levels.includes("Core") && (resourceType !== "formula_sheet" || subject === "Economics") ? `(${level})` : ""}</strong> has not been published by your Admin yet. Check back later.</>
                 )}
               </p>
               {isAdmin && (
                 <button 
                   onClick={() => setUploadModalOpen(true)}
                   className="px-6 py-2.5 rounded-xl font-bold text-white bg-[var(--accent)] hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                 >
                   <Upload className="w-4 h-4" /> Upload {resourceType.replace("_", " ")}
                 </button>
               )}
            </motion.div>
          )
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative max-w-md mb-6">
              <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter topics..." 
                className="field w-full pl-9 py-2.5 text-sm rounded-xl border-[var(--border)] bg-[var(--surface)]/50 focus:bg-[var(--background)]" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.topics
                .filter(t => !searchQuery.trim() || t.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(t => (
                  <button
                    key={t}
                    onClick={() => handleTopicClick(t)}
                    className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 hover:bg-[var(--surface)] hover:border-[var(--accent)] transition-all group text-left"
                  >
                    <span className="font-medium text-[var(--foreground)]">{t}</span>
                    <div className="flex items-center gap-2 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              {data.topics.filter(t => !searchQuery.trim() || t.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-sm text-[var(--muted)] col-span-full py-4 text-center">No topics match your search.</p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const renderFormulaView = () => {
    const data = getTaxonomy(subject);
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <button onClick={() => setSubject(null)} className="hover:text-[var(--foreground)] transition-colors">{resourceType.replace("_", " ")}s</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => setTopic(null)} className="hover:text-[var(--foreground)] transition-colors">{subject}</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-[var(--foreground)]">{topic}</span>
          </div>

          {data.levels && data.levels.length > 0 && !data.levels.includes("Core") && (
            <div className="flex bg-[var(--surface)]/80 border border-[var(--border)] rounded-lg p-1 self-start sm:self-auto">
              {data.levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    level === lvl ? "bg-[var(--accent)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Quick Nav sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="sticky top-24 bg-[var(--surface)]/30 backdrop-blur border border-[var(--border)] p-4 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">{subject}</h4>
              <ul className="space-y-1">
                {data.topics.map(t => (
                  <li key={t}>
                    <button 
                      onClick={() => setTopic(t)} 
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        topic === t ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actual content area */}
          <div className="flex-1">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">{topic}</h2>
                <div className="relative w-48 hidden sm:block">
                  <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
                  <input placeholder="Filter formulas..." className="field w-full pl-9 py-2 text-sm rounded-xl" />
                </div>
             </div>
             
             {/* Stub for the actual resources logic to hook into */}
             {loadingFiles ? (
                <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
             ) : realUploadedFiles.length > 0 ? (
               renderFilesGrid(realUploadedFiles)
             ) : (
               <div className="card p-12 text-center border border-[var(--border)] bg-[var(--surface)]/30 backdrop-blur-sm rounded-2xl shadow-sm">
                  <Bookmark className="w-10 h-10 text-[var(--accent)] mx-auto mb-4 opacity-70" />
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    {isAdmin ? "Publish Official Resources" : "No official resources published yet"}
                  </h3>
                  <p className="text-sm text-[var(--muted)] max-w-sm mx-auto mb-6">
                    {isAdmin ? (
                      <>Upload official {resourceType.replace("_", " ")}s for <strong className="text-[var(--foreground)]">{subject} {level && !data.levels.includes("Core") ? `(${level})` : ""} - {topic}</strong> to make them available to all students.</>
                    ) : (
                      <>No official {resourceType.replace("_", " ")}s have been published by your Admin for <strong className="text-[var(--foreground)]">{subject} {level && !data.levels.includes("Core") ? `(${level})` : ""} - {topic}</strong> yet. Check back later.</>
                    )}
                  </p>
                  {isAdmin && (
                    <button 
                      onClick={() => setUploadModalOpen(true)}
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-[var(--accent)] hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <Upload className="w-4 h-4" /> Upload {resourceType.replace("_", " ")}
                    </button>
                  )}
               </div>
             )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!subject && !topic && renderSubjectList()}
        {subject && !topic && TYPES_WITH_TOPICS.includes(resourceType) && renderTopicList()}
        {subject && (topic || !TYPES_WITH_TOPICS.includes(resourceType)) && !topic ? renderTopicList() : null}
        {subject && (topic || !TYPES_WITH_TOPICS.includes(resourceType)) && topic ? renderFormulaView() : null}
      </AnimatePresence>

      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">Upload {resourceType.replace("_", " ")}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {subject} {level && !getTaxonomy(subject).levels.includes("Core") ? `(${level})` : ""} {topic ? `- ${topic}` : ""}
                  </p>
                </div>
                <button 
                  onClick={() => { setUploadModalOpen(false); setSelectedFile(null); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--background)] text-[var(--muted)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8">
                {selectedFile ? (
                  <div className="w-full p-6 border border-[var(--accent)] bg-[var(--accent)]/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--foreground)] truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</h4>
                        <p className="text-xs text-[var(--muted)] mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--background)] text-[var(--muted)] hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`w-full p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      dragActive ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/50"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { 
                      e.preventDefault(); 
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center mb-4 shadow-sm border border-[var(--border)]">
                      <FileUp className="w-8 h-8 text-[var(--accent)]" />
                    </div>
                    <h4 className="font-bold text-[var(--foreground)] text-lg mb-2">Drag and drop file here</h4>
                    <p className="text-sm text-[var(--muted)] mb-6">Or click to browse your computer (PDF, DOCX)</p>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-[var(--foreground)] text-[var(--background)] font-bold rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors"
                    >
                      Select File
                    </button>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="px-8 pb-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded-lg font-medium">
                    {uploadError}
                  </div>
                </div>
              )}

              <div className="p-4 bg-[var(--background)]/50 border-t border-[var(--border)] flex justify-end gap-3">
                <button 
                  onClick={() => { setUploadModalOpen(false); setSelectedFile(null); setUploadError(null); }} 
                  className="px-5 py-2 text-sm font-semibold rounded-lg hover:bg-[var(--surface)] transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button 
                  disabled={!selectedFile || isUploading}
                  onClick={handleRealUpload} 
                  className={`px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all flex items-center gap-2 ${
                    selectedFile && !isUploading ? "bg-[var(--accent)] hover:shadow hover:opacity-90" : "bg-[var(--accent)]/50 cursor-not-allowed"
                  }`}
                >
                  {isUploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                  ) : "Upload"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Document Preview Modal */}
      <AnimatePresence>
        {previewFile && (
           <motion.div 
             initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} 
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
           >
              <motion.div 
                initial={{scale: 0.95, y: 20}} animate={{scale: 1, y: 0}} exit={{scale: 0.95, y: 20}} 
                className="w-full max-w-5xl h-[85vh] bg-[var(--background)] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-[var(--border)]"
              >
                 <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div>
                       <h3 className="font-bold text-[var(--foreground)] text-lg">{previewFile.title || previewFile.file_name}</h3>
                       <p className="text-sm text-[var(--muted)] mt-0.5 capitalize">{(previewFile.resource_type || "Resource").replace("_", " ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => window.open(previewFile.file_url, "_blank")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors font-semibold text-sm">
                         <ExternalLink className="w-4 h-4"/> Open in new tab
                       </button>
                       <button onClick={() => setPreviewFile(null)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--background)] text-[var(--muted)] hover:text-red-500 transition-colors">
                         <X className="w-6 h-6"/>
                       </button>
                    </div>
                 </div>
                 <div className="flex-1 bg-white relative w-full h-full">
                    {/* The iframe lets the browser natively render PDFs and images, but Office docs need a web viewer */}
                    <iframe 
                      src={(() => {
                        const type = previewFile.file_type || "";
                        const name = (previewFile.file_name || "").toLowerCase();
                        const isOfficeDoc = type.includes("word") || type.includes("excel") || type.includes("powerpoint") || type.includes("officedocument") || name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".xls") || name.endsWith(".xlsx");
                        
                        if (isOfficeDoc) {
                          return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.file_url)}`;
                        }
                        return previewFile.file_url;
                      })()}
                      className="w-full h-full border-none" 
                      title="Document Preview" 
                    />
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
