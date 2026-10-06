"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ArrowLeft, Save, AlertTriangle, X, Plus, Edit3, Trash2,
  Search, Filter, Sparkles, BookOpen, Layers, GraduationCap, CheckCircle2,
  Globe, Sigma, ShieldCheck
} from "lucide-react";
import { 
  updateSubjectsAction, 
  addGlobalSubjectAction, 
  editGlobalSubjectAction, 
  deleteGlobalSubjectAction 
} from "./actions";
import { getSubjectColorTheme } from "@/lib/subject-colors";
import { 
  getSubjectSupportedLevels, 
  isSLOnlySubject, 
  hasSubjectLevels,
  getSubjectLevelNote,
  CANONICAL_DP_SUBJECTS,
  CANONICAL_MYP_SUBJECTS,
  groupSubjectsByCategory
} from "@/lib/subject-levels";
import { toast } from "@/components/ui/ToastProvider";

export default function SubjectsClient({ profile = {}, globalSubjects = [], isAdmin = false }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Academic program state (DP vs MYP)
  const initialProgram = useMemo(() => {
    if (profile?.ib_program) {
      return (profile.ib_program || "dp").toLowerCase().includes("myp") ? "myp" : "dp";
    }
    // Auto-detect from subjects if program not explicitly set
    if (Array.isArray(profile?.subjects) && profile.subjects.some(s => s.level === "HL" || s.level === "SL")) {
      return "dp";
    }
    return "dp";
  }, [profile?.ib_program, profile?.subjects]);

  const [program, setProgram] = useState(initialProgram);

  // Selected subjects state
  const initialSubjects = useMemo(() => {
    if (Array.isArray(profile?.subjects)) return profile.subjects;
    return [];
  }, [profile?.subjects]);

  const [selectedSubjects, setSelectedSubjects] = useState(initialSubjects);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Admin state
  const [adminModal, setAdminModal] = useState({ isOpen: false, type: "add", subject: null });
  const [adminFormData, setAdminFormData] = useState({ program: "dp", category: "Group 1 & 2: Languages", name: "" });

  // Keep state synchronized with incoming profile prop updates
  useEffect(() => {
    if (Array.isArray(profile?.subjects)) {
      setSelectedSubjects(profile.subjects);
    }
  }, [profile?.subjects]);

  useEffect(() => {
    if (profile?.ib_program) {
      setProgram((profile.ib_program || "dp").toLowerCase().includes("myp") ? "myp" : "dp");
    }
  }, [profile?.ib_program]);

  // Combine real database subjects with canonical catalog
  const effectiveGlobalSubjects = useMemo(() => {
    if (Array.isArray(globalSubjects) && globalSubjects.length > 0) {
      return globalSubjects;
    }
    return program === "dp" ? CANONICAL_DP_SUBJECTS : CANONICAL_MYP_SUBJECTS;
  }, [globalSubjects, program]);

  // Filter available subjects based on active program (DP vs MYP)
  const availableSubjectsForProgram = useMemo(() => {
    return effectiveGlobalSubjects.filter(
      (s) => (s.program || "dp").toLowerCase() === program
    );
  }, [effectiveGlobalSubjects, program]);

  // Group subjects by category using the authoritative IB category hierarchy
  const groupedCategories = useMemo(() => {
    return groupSubjectsByCategory(availableSubjectsForProgram, program);
  }, [availableSubjectsForProgram, program]);

  // Unique category names for filtering
  const allCategoryNames = useMemo(() => {
    return ["all", ...groupedCategories.map((g) => g.category)];
  }, [groupedCategories]);

  // Count of enrolled subjects per category
  const categoryEnrolledCounts = useMemo(() => {
    const counts = { all: selectedSubjects.length };
    groupedCategories.forEach((group) => {
      const count = group.subjects.filter((subj) =>
        selectedSubjects.some((s) => s.name === subj.name)
      ).length;
      counts[group.category] = count;
    });
    return counts;
  }, [groupedCategories, selectedSubjects]);

  // Filtered categories and subjects based on search & category tab
  const filteredCategories = useMemo(() => {
    let categories = groupedCategories;
    if (selectedCategoryFilter !== "all") {
      categories = categories.filter((g) => g.category === selectedCategoryFilter);
    }
    if (!subjectSearch.trim()) return categories;

    const query = subjectSearch.toLowerCase().trim();
    return categories
      .map((group) => ({
        ...group,
        subjects: group.subjects.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            group.category.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.subjects.length > 0);
  }, [groupedCategories, selectedCategoryFilter, subjectSearch]);

  // Subject toggling for DP (HL / SL)
  const handleToggleDP = (subjectName, level) => {
    setSelectedSubjects((prev) => {
      const existing = prev.find((s) => s.name === subjectName);
      if (existing) {
        if (existing.level === level) {
          return prev.filter((s) => s.name !== subjectName);
        } else {
          return prev.map((s) => (s.name === subjectName ? { name: subjectName, level } : s));
        }
      }
      return [...prev, { name: subjectName, level }];
    });
  };

  // Subject toggling for MYP
  const handleToggleMYP = (subjectName) => {
    setSelectedSubjects((prev) => {
      if (prev.some((s) => s.name === subjectName)) {
        return prev.filter((s) => s.name !== subjectName);
      }
      return [...prev, { name: subjectName, level: "MYP" }];
    });
  };

  const handleRemoveSubject = (subjectName) => {
    setSelectedSubjects((prev) => prev.filter((s) => s.name !== subjectName));
  };

  // Save handler with internal toast feedback
  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateSubjectsAction(selectedSubjects, program);
        toast.success("Enrolled IB subjects updated successfully!");
        router.refresh();
      } catch (e) {
        toast.error(e.message || "Failed to update subjects");
      }
    });
  };

  // Admin submit handler
  const handleAdminSubmit = () => {
    startTransition(async () => {
      try {
        if (adminModal.type === "add") {
          await addGlobalSubjectAction(adminFormData.program, adminFormData.category, adminFormData.name);
          toast.success(`Added ${adminFormData.name} to global catalog`);
        } else {
          await editGlobalSubjectAction(adminModal.subject.id, adminFormData.program, adminFormData.category, adminFormData.name);
          toast.success(`Updated ${adminFormData.name}`);
        }
        setAdminModal({ isOpen: false, type: "add", subject: null });
        router.refresh();
      } catch (e) {
        toast.error("Failed to save subject: " + e.message);
      }
    });
  };

  // Admin delete handler
  const handleDeleteGlobal = (id) => {
    if (!confirm("Are you sure you want to delete this global subject? This may affect users who have already selected it.")) return;
    startTransition(async () => {
      try {
        await deleteGlobalSubjectAction(id);
        toast.success("Global subject removed from catalog");
        router.refresh();
      } catch (e) {
        toast.error("Failed to delete subject: " + e.message);
      }
    });
  };

  const hlCount = selectedSubjects.filter((s) => s.level === "HL").length;
  const slCount = selectedSubjects.filter((s) => s.level === "SL").length;

  return (
    <main className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-8 relative">
      {/* Ambient Visual Glows */}
      <div className="absolute top-[-5%] left-[-5%] w-[45vw] h-[45vw] bg-[var(--accent)]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-5%] w-[35vw] h-[35vw] bg-[var(--ai)]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="space-y-8 relative z-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
              >
                <ArrowLeft size={14} /> Study Hub
              </Link>
              <span className="text-[var(--border-strong)]">•</span>
              <Link
                href="/settings/profile"
                className="hover:text-[var(--accent)] transition-colors"
              >
                Profile & Settings
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                Curriculum & Subjects Workspace
              </h1>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminFormData({
                      program: program,
                      category: program === "dp" ? "Group 1 & 2: Languages" : "Language and Literature",
                      name: "",
                    });
                    setAdminModal({ isOpen: true, type: "add", subject: null });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all shadow-sm"
                >
                  <Plus size={13} /> Add Global Subject
                </button>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Choose and configure your enrolled IB subjects with full flexibility. Changes here automatically synchronize across your entire workspace, settings, and dashboard.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Overview Metric Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--muted)] mb-1">
              <BookOpen size={15} className="text-[var(--accent)]" />
              <span>Enrolled Subjects</span>
            </div>
            <div className="text-2xl font-black text-[var(--foreground)]">
              {selectedSubjects.length}
            </div>
          </div>

          {program === "dp" ? (
            <>
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--muted)] mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Higher Level (HL)</span>
                </div>
                <div className="text-2xl font-black text-amber-500">
                  {hlCount}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--muted)] mb-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Standard Level (SL)</span>
                </div>
                <div className="text-2xl font-black text-sky-400">
                  {slCount}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] mb-1">
                  <Layers size={14} className="text-purple-400" />
                  <span>Middle Years Programme</span>
                </div>
                <div className="text-sm font-bold text-[var(--foreground)]">
                  Modular MYP Subject Evaluation
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Active
              </span>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--muted)] mb-1">
              <GraduationCap size={15} className="text-[var(--accent)]" />
              <span>Curriculum Mode</span>
            </div>
            <div className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
              {program === "dp" ? "IB Diploma (DP)" : "Middle Years (MYP)"}
            </div>
          </div>
        </div>

        {/* SECTION: ACADEMIC PROGRAM SWITCHER */}
        <section className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <GraduationCap size={18} className="text-[var(--accent)]" />
                Select Academic Pathway
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Toggle between the IB Diploma Programme (DP) and Middle Years Programme (MYP) catalog.
              </p>
            </div>

            {/* Segmented Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setProgram("dp")}
                className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  program === "dp"
                    ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Globe size={14} />
                <span>IB Diploma (DP)</span>
              </button>
              <button
                type="button"
                onClick={() => setProgram("myp")}
                className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  program === "myp"
                    ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Sigma size={14} />
                <span>Middle Years (MYP)</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION: YOUR ACTIVE CURRICULUM DECK */}
        <section className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[var(--accent)]" />
              Your Active Curriculum ({selectedSubjects.length})
            </h3>
            {selectedSubjects.length > 0 && (
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                Click <span className="font-bold text-rose-500">×</span> on any chip to remove
              </span>
            )}
          </div>

          {selectedSubjects.length === 0 ? (
            <div className="p-5 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)]/50">
              <p className="text-xs text-[var(--muted)]">
                No subjects enrolled yet. Click any subject or level below to add it to your curriculum.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <AnimatePresence>
                {selectedSubjects.map((subj) => {
                  const theme = getSubjectColorTheme(subj.name);
                  const colorVar =
                    theme === "brand" ? "var(--accent)" : `var(--subject-${theme})`;
                  return (
                    <motion.div
                      key={subj.name}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      style={{ "--c": colorVar }}
                      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[color:var(--c)]/30 bg-[color:var(--c)]/10 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[color:var(--c)] shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-[color:var(--c)] shadow-sm" />
                      <span className="font-semibold">{subj.name}</span>
                      {subj.level && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            subj.level === "HL"
                              ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                              : subj.level === "SL"
                              ? "bg-sky-400/20 text-sky-400 border border-sky-400/30"
                              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {subj.level}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(subj.name)}
                        className="opacity-50 hover:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
                        title={`Remove ${subj.name}`}
                      >
                        <X size={13} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* SECTION: SEARCH & CATEGORY NAVIGATOR */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
              />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects by name..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-sm"
              />
              {subjectSearch && (
                <button
                  type="button"
                  onClick={() => setSubjectSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Total Results Note */}
            <div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1.5 self-center">
              <span>Showing</span>
              <span className="font-bold text-[var(--foreground)]">
                {filteredCategories.reduce((acc, c) => acc + c.subjects.length, 0)}
              </span>
              <span>available subjects</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {allCategoryNames.map((cat) => {
              const count = categoryEnrolledCounts[cat] || 0;
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border ${
                    isSelected
                      ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[var(--accent)]/20"
                      : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="truncate max-w-[200px]">
                    {cat === "all" ? "All Categories" : cat}
                  </span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[var(--surface-alt)] text-[var(--accent)] border border-[var(--border)]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION: SUBJECTS GRID BY CATEGORY */}
        <section className="space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                No subjects found matching "{subjectSearch}"
              </p>
              <p className="text-xs text-[var(--muted)]">
                Try searching with another keyword or reset the category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubjectSearch("");
                  setSelectedCategoryFilter("all");
                }}
                className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface-alt)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredCategories.map((group) => (
              <div
                key={group.category}
                className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--foreground)]">
                      {group.category}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {group.subjects.length} courses
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.subjects.map((subj) => {
                    const sel = selectedSubjects.find((s) => s.name === subj.name);
                    const isSelected = !!sel;
                    const theme = getSubjectColorTheme(subj.name);
                    const colorVar =
                      theme === "brand" ? "var(--accent)" : `var(--subject-${theme})`;

                    if (program === "dp") {
                      const isHL = sel?.level === "HL";
                      const isSL = sel?.level === "SL";
                      const isSLOnly = isSLOnlySubject(subj.name, "dp");

                      return (
                        <div
                          key={subj.id || subj.name}
                          style={{ "--c": colorVar }}
                          className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 group/card ${
                            isSelected
                              ? "border-[color:var(--c)] bg-[color:var(--c)]/5 shadow-sm"
                              : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0 pr-1">
                              <h4
                                className={`text-sm font-bold truncate transition-colors ${
                                  isSelected
                                    ? "text-[color:var(--c)]"
                                    : "text-[var(--foreground)]"
                                }`}
                              >
                                {subj.name}
                              </h4>
                              {isSLOnly ? (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                                  Standard Level Only
                                </span>
                              ) : (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-[var(--muted)]">
                                  HL & SL Available
                                </span>
                              )}
                            </div>

                            {/* Active Status Dot */}
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-[color:var(--c)] shadow-sm shrink-0 mt-1" />
                            )}
                          </div>

                          {/* Level Action Area */}
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/50">
                            {isSLOnly ? (
                              <button
                                type="button"
                                onClick={() => handleToggleDP(subj.name, "SL")}
                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                                  isSL
                                    ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                                    : "bg-[var(--card)] text-[var(--muted)] hover:text-sky-400 border border-[var(--border)] hover:border-sky-400/40"
                                }`}
                              >
                                {isSL ? <Check size={13} strokeWidth={3} /> : null}
                                <span>{isSL ? "Enrolled (SL)" : "Enroll SL"}</span>
                              </button>
                            ) : (
                              <div className="w-full grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDP(subj.name, "HL")}
                                  className={`py-1 rounded-md text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1 ${
                                    isHL
                                      ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                                      : "text-[var(--muted)] hover:text-amber-500 hover:bg-[var(--surface-alt)]"
                                  }`}
                                >
                                  {isHL && <Check size={12} strokeWidth={3} />}
                                  <span>HL</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDP(subj.name, "SL")}
                                  className={`py-1 rounded-md text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1 ${
                                    isSL
                                      ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                                      : "text-[var(--muted)] hover:text-sky-400 hover:bg-[var(--surface-alt)]"
                                  }`}
                                >
                                  {isSL && <Check size={12} strokeWidth={3} />}
                                  <span>SL</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Admin Floating Options */}
                          {isAdmin && (
                            <div className="absolute top-2 right-2 hidden group-hover/card:flex items-center gap-1 bg-[var(--card)] shadow-md rounded-md p-1 border border-[var(--border)]">
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminFormData({
                                    program: subj.program || "dp",
                                    category: subj.category || group.category,
                                    name: subj.name,
                                  });
                                  setAdminModal({ isOpen: true, type: "edit", subject: subj });
                                }}
                                className="p-1 hover:text-indigo-400 text-[var(--muted)] transition-colors"
                                title="Edit global course"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGlobal(subj.id)}
                                className="p-1 hover:text-rose-500 text-[var(--muted)] transition-colors"
                                title="Delete global course"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // MYP Card
                      return (
                        <div
                          key={subj.id || subj.name}
                          style={{ "--c": colorVar }}
                          onClick={() => handleToggleMYP(subj.name)}
                          className={`relative flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group/card ${
                            isSelected
                              ? "border-[color:var(--c)] bg-[color:var(--c)]/5 shadow-sm"
                              : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <h4
                              className={`text-sm font-bold truncate transition-colors ${
                                isSelected
                                  ? "text-[color:var(--c)]"
                                  : "text-[var(--foreground)]"
                              }`}
                            >
                              {subj.name}
                            </h4>
                            <span className="text-[10px] font-semibold text-[var(--muted)]">
                              Middle Years Course
                            </span>
                          </div>

                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                              isSelected
                                ? "border-[color:var(--c)] bg-[color:var(--c)] text-white"
                                : "border-[var(--border-strong)] text-transparent group-hover/card:border-[var(--foreground)]"
                            }`}
                          >
                            <Check size={14} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
                          </div>

                          {/* Admin Floating Options */}
                          {isAdmin && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-9 hidden group-hover/card:flex items-center gap-1 bg-[var(--card)] shadow-md rounded-md p-1 border border-[var(--border)]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminFormData({
                                    program: subj.program || "myp",
                                    category: subj.category || group.category,
                                    name: subj.name,
                                  });
                                  setAdminModal({ isOpen: true, type: "edit", subject: subj });
                                }}
                                className="p-1 hover:text-indigo-400 text-[var(--muted)] transition-colors"
                                title="Edit global course"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGlobal(subj.id)}
                                className="p-1 hover:text-rose-500 text-[var(--muted)] transition-colors"
                                title="Delete global course"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {/* BOTTOM SAVE FOOTER BAR */}
        <div className="sticky bottom-6 z-20 p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {selectedSubjects.length} {selectedSubjects.length === 1 ? "Subject" : "Subjects"} Selected
              </p>
              <p className="text-xs text-[var(--muted)]">
                {program === "dp"
                  ? `${hlCount} Higher Level (HL) • ${slCount} Standard Level (SL)`
                  : "All enrolled courses are active for your Middle Years portfolio"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn-primary px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Add/Edit Global Subject Modal */}
      {adminModal.isOpen && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] p-6 rounded-2xl shadow-xl border border-[var(--border)] my-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-400" />
                {adminModal.type === "add" ? "Add Global Subject" : "Edit Global Subject"}
              </h3>
              <button
                onClick={() => setAdminModal({ isOpen: false, type: "add", subject: null })}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Program
                </label>
                <select
                  value={adminFormData.program}
                  onChange={(e) => {
                    const newProg = e.target.value;
                    const defaultCat =
                      newProg === "dp" ? "Group 1 & 2: Languages" : "Language and Literature";
                    setAdminFormData({
                      ...adminFormData,
                      program: newProg,
                      category: defaultCat,
                    });
                  }}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="dp">IB Diploma (DP)</option>
                  <option value="myp">Middle Years (MYP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Category / Group
                </label>
                <select
                  value={adminFormData.category}
                  onChange={(e) => setAdminFormData({ ...adminFormData, category: e.target.value })}
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--foreground)]"
                >
                  {adminFormData.program === "dp" ? (
                    <>
                      <option value="Group 1 & 2: Languages">Group 1 & 2: Languages</option>
                      <option value="Group 3: Individuals & Societies">Group 3: Individuals & Societies</option>
                      <option value="Group 4: Sciences">Group 4: Sciences</option>
                      <option value="Group 5: Mathematics">Group 5: Mathematics</option>
                      <option value="Group 6: Arts">Group 6: Arts</option>
                      <option value="Core Requirements">Core Requirements</option>
                    </>
                  ) : (
                    <>
                      <option value="Language and Literature">Language and Literature</option>
                      <option value="Language Acquisition">Language Acquisition</option>
                      <option value="Individuals and Societies">Individuals and Societies</option>
                      <option value="Sciences">Sciences</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Arts">Arts</option>
                      <option value="Design">Design</option>
                      <option value="Physical and Health Education">Physical and Health Education</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  placeholder="e.g. Environmental Systems and Societies"
                  className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setAdminModal({ isOpen: false, type: "add", subject: null })}
                className="px-4 py-2 text-xs font-bold bg-[var(--surface-alt)] hover:bg-[var(--border)] rounded-xl transition text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminSubmit}
                disabled={isPending || !adminFormData.name?.trim()}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {isPending ? "Saving..." : "Save Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
