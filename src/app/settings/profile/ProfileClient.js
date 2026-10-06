"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, User, ArrowLeft, GraduationCap, Building2,
  CheckCircle2, Sparkles, UserCircle, BookOpen, Layers,
  ArrowRight, ShieldCheck, ExternalLink, Sparkle
} from "lucide-react";
import { updateSettingsAction } from "./actions";
import { AvatarPicker } from "@/components/ui";
import { toast } from "@/components/ui/ToastProvider";
import { getSubjectColorTheme } from "@/lib/subject-colors";
import { isSLOnlySubject } from "@/lib/subject-levels";

const EXAM_SESSIONS = ["Nov 2026", "May 2027", "Nov 2027", "May 2028", "Nov 2028"];

export default function ProfileClient({ profile = {}, globalSubjects = [] }) {
  // Identity state
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "fox");
  const [uploadedAvatars, setUploadedAvatars] = useState(() => {
    const list = Array.isArray(profile?.preferences?.uploaded_avatars)
      ? [...profile.preferences.uploaded_avatars]
      : [];
    if (
      profile?.avatar_url &&
      (profile.avatar_url.startsWith("http") ||
        profile.avatar_url.startsWith("data:") ||
        profile.avatar_url.startsWith("/"))
    ) {
      if (!list.includes(profile.avatar_url)) {
        list.unshift(profile.avatar_url);
      }
    }
    return list;
  });
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [schoolName, setSchoolName] = useState(profile.school_name || "");
  
  // Academic state
  const [program, setProgram] = useState(
    (profile.ib_program || "dp").toLowerCase().includes("myp") ? "myp" : "dp"
  );
  const [examSession, setExamSession] = useState(profile.exam_session || "");

  // Subjects state (from profile.subjects)
  const initialSubjects = useMemo(() => {
    if (Array.isArray(profile.subjects)) return profile.subjects;
    return [];
  }, [profile.subjects]);

  const [selectedSubjects, setSelectedSubjects] = useState(initialSubjects);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  // DP Subject counts
  const dpStats = useMemo(() => {
    if (program !== "dp") return null;
    const count = selectedSubjects.length;
    const hlCount = selectedSubjects.filter((s) => s.level === "HL").length;
    const slCount = selectedSubjects.filter((s) => s.level === "SL").length;
    return { count, hlCount, slCount };
  }, [selectedSubjects, program]);

  // Save handler
  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await updateSettingsAction({
          avatar_url: avatarUrl,
          display_name: displayName.trim(),
          school_name: schoolName.trim(),
          ib_program: program,
          exam_session: examSession,
          subjects: selectedSubjects,
          preferences: {
            ...(profile?.preferences || {}),
            uploaded_avatars: uploadedAvatars,
          },
        });

        if (res?.success) {
          toast.success(res.message || "Profile and academic preferences saved successfully!");
          router.refresh();
        } else {
          toast.error(res?.error || "Failed to update profile settings.");
        }
      } catch (err) {
        toast.error(err.message || "An unexpected error occurred while saving.");
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <main className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-8 relative">
      {/* Ambient Visual Glows */}
      <div className="absolute top-[-5%] left-[-5%] w-[45vw] h-[45vw] bg-[var(--accent)]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-5%] w-[35vw] h-[35vw] bg-[var(--ai)]/10 blur-[140px] rounded-full pointer-events-none" />

      <motion.div
        className="max-w-6xl mx-auto space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Navigation & Header with Save Button */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-3 group font-medium"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Settings
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-black text-[var(--foreground)] tracking-tight">
                Profile & Academics
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 uppercase tracking-wider">
                {program.toUpperCase()}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5 font-medium max-w-2xl leading-relaxed">
              Manage your personal identity, avatar, curriculum pathway, and navigate to the dedicated subject hub.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="self-start md:self-center relative group overflow-hidden bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-[var(--info)] text-white shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_35%,transparent)] disabled:opacity-50 px-7 py-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--accent)_45%,transparent)] border-none shrink-0"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2.5 font-extrabold text-sm tracking-wide">
              {isPending ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={2.5} />
                  <span>Save Changes</span>
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* Quick Section Navigation */}
        <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <UserCircle size={14} />
            <span>Identity Details</span>
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('academics-card')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <GraduationCap size={14} />
            <span>Curriculum & Cohort</span>
          </button>
          <Link
            href="/dashboard/subjects"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)]/15 to-indigo-600/15 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] border border-[var(--accent)]/30 text-xs font-black transition-all flex items-center gap-2 shrink-0 shadow-sm"
          >
            <BookOpen size={14} />
            <span>Manage Subjects in Hub ({selectedSubjects.length} Enrolled)</span>
            <ArrowRight size={13} />
          </Link>
        </motion.div>

        {/* Top Grid: Section 1 (Identity) & Section 2 (Academics) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* SECTION 1: IDENTITY */}
          <motion.section
            variants={itemVariants}
            className="relative group p-[1px] rounded-[2rem] bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] overflow-hidden shadow-lg shadow-black/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative h-full bg-[var(--card)] rounded-[calc(2rem-1px)] p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border)]">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--info)] flex items-center justify-center text-white shadow-md shadow-[var(--accent)]/20">
                  <UserCircle size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--foreground)]">Identity & Profile</h2>
                  <p className="text-xs font-semibold text-[var(--muted)]">Personal Details & Avatar</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Your Profile Picture
                  </label>
                  <AvatarPicker
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    uploadedAvatars={uploadedAvatars}
                    onUploadedAvatarsChange={setUploadedAvatars}
                  />
                </div>

                <div className="space-y-4">
                  <div className="group/input">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
                      Display Name
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors"
                      />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="What should we call you?"
                        className="w-full bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--foreground)] placeholder:text-[var(--muted)] font-medium rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-300 focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_15%,transparent)] text-sm"
                      />
                    </div>
                  </div>

                  <div className="group/input">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
                      School / Institution
                    </label>
                    <div className="relative">
                      <Building2
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors"
                      />
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g. United World College, International School"
                        className="w-full bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--foreground)] placeholder:text-[var(--muted)] font-medium rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-300 focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_15%,transparent)] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 2: ACADEMICS & PROGRAMME */}
          <motion.section
            id="academics-card"
            variants={itemVariants}
            className="relative group p-[1px] rounded-[2rem] bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] overflow-hidden shadow-lg shadow-black/5"
          >
            <div className="absolute inset-0 bg-gradient-to-bl from-[var(--info)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative h-full bg-[var(--card)] rounded-[calc(2rem-1px)] p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--border)]">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[var(--info)] to-[var(--ai)] flex items-center justify-center text-white shadow-md shadow-[var(--info)]/20">
                  <GraduationCap size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--foreground)]">Curriculum & Cohort</h2>
                  <p className="text-xs font-semibold text-[var(--muted)]">Academic Track & Examination Session</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 block">
                    IB Programme
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setProgram("dp")}
                      className={`relative flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 z-10 ${
                        program === "dp"
                          ? "text-white shadow-lg"
                          : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {program === "dp" && (
                        <motion.div
                          layoutId="program-switch-bg"
                          className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-indigo-600 rounded-xl z-[-1]"
                        />
                      )}
                      <span>Diploma (DP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProgram("myp")}
                      className={`relative flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 z-10 ${
                        program === "myp"
                          ? "text-white shadow-lg"
                          : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {program === "myp" && (
                        <motion.div
                          layoutId="program-switch-bg"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl z-[-1]"
                        />
                      )}
                      <span>Middle Years (MYP)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Exam Session
                    </label>
                    {examSession && (
                      <span className="text-xs font-bold text-[var(--info)] flex items-center gap-1">
                        <CheckCircle2 size={13} /> Selected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXAM_SESSIONS.map((session) => (
                      <button
                        key={session}
                        type="button"
                        onClick={() => setExamSession(session)}
                        className={`group relative overflow-hidden rounded-xl py-2.5 px-3 border transition-all duration-300 text-center ${
                          examSession === session
                            ? "bg-[var(--info)]/15 border-[var(--info)] shadow-[0_4px_16px_color-mix(in_srgb,var(--info)_20%,transparent)]"
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--info)]/50 hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        <span
                          className={`relative z-10 text-xs font-extrabold transition-colors ${
                            examSession === session ? "text-[var(--info)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                          }`}
                        >
                          {session}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enrolled Courses Summary Pill */}
                <div className="pt-2">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <BookOpen size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[var(--foreground)] truncate">
                          {selectedSubjects.length} {selectedSubjects.length === 1 ? "Subject" : "Subjects"} Enrolled
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--muted)] truncate">
                          {program === "dp"
                            ? `${dpStats?.hlCount || 0} HL • ${dpStats?.slCount || 0} SL configured`
                            : "Middle Years subjects active"}
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/subjects"
                      className="px-3 py-1.5 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white border border-[var(--accent)]/30 text-xs font-black transition-all shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      <span>Manage</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* SECTION 3: SUBJECT SELECTION & CURRICULUM MANAGEMENT REDIRECTION */}
        <motion.section
          variants={itemVariants}
          className="relative group p-[1px] rounded-[2.5rem] bg-gradient-to-b from-[var(--border-strong)] via-[var(--border)] to-[var(--border)] overflow-hidden shadow-xl shadow-black/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="relative bg-[var(--card)] rounded-[calc(2.5rem-1px)] p-6 sm:p-10 space-y-8">
            
            {/* Subject Section Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                    <BookOpen size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                      Subject Selection & Curriculum Management
                    </h2>
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                      Dedicated Academic Subjects Workspace
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium max-w-2xl">
                  Enrolling in courses, selecting Higher Level (HL) vs Standard Level (SL) syllabi, and exploring the official IB catalog are centralized in the Academic Hub.
                </p>
              </div>

              {/* Status / Enrollment Pill */}
              <div className="flex items-center gap-3 bg-[var(--surface)] p-3 rounded-2xl border border-[var(--border)] shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Enrolled</div>
                  <div className="text-lg font-black text-[var(--foreground)]">
                    {selectedSubjects.length} {selectedSubjects.length === 1 ? "Subject" : "Subjects"}
                  </div>
                </div>

                {program === "dp" && dpStats && (
                  <div className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-400" />
                    <span>{dpStats.hlCount} HL • {dpStats.slCount} SL</span>
                  </div>
                )}
              </div>
            </div>

            {/* Currently Selected Subjects Bar (Active Course Deck) */}
            <div className="p-5 rounded-2xl bg-[var(--surface)]/70 border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                  <Layers size={14} className="text-[var(--accent)]" />
                  Your Active Enrolled Courses ({selectedSubjects.length})
                </span>
                <Link
                  href="/dashboard/subjects"
                  className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Edit in Hub <ArrowRight size={12} />
                </Link>
              </div>

              {selectedSubjects.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    No subjects selected yet for your {program.toUpperCase()} profile.
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Select your IB courses to personalize your dashboard, notes, resources, and planner.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {selectedSubjects.map((s) => {
                    const theme = getSubjectColorTheme(s.name);
                    const colorVar = theme === "brand" ? "var(--accent)" : `var(--subject-${theme})`;
                    const isSLOnly = isSLOnlySubject(s.name, program);

                    return (
                      <div
                        key={s.name}
                        style={{ "--c": colorVar }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[color:var(--c)] bg-[color:var(--c)]/10 text-[var(--foreground)] shadow-sm text-xs font-bold"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colorVar }}
                        />
                        <span className="font-extrabold">{s.name}</span>

                        {program === "dp" && s.level && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              s.level === "HL"
                                ? "bg-amber-500/25 text-amber-300 border border-amber-500/30"
                                : "bg-sky-500/25 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {s.level} {isSLOnly ? "• SL Only" : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Redirection Callout Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 via-indigo-600/10 to-transparent p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md shadow-[var(--accent)]/5">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--accent)]">
                  <Sparkles size={14} />
                  <span>Central Subject Selection Hub</span>
                </div>
                <h3 className="text-lg font-black text-[var(--foreground)]">
                  Manage your subjects, course levels, and custom additions
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                  To keep your curriculum consistent across all study tools, subject selection takes place in the dedicated Academic Hub where you can search the official IB course catalog, select Higher Level or Standard Level, and request custom additions.
                </p>
              </div>

              <Link
                href="/dashboard/subjects"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-[var(--info)] text-white font-extrabold text-sm shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_30%,transparent)] hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--accent)_45%,transparent)] hover:scale-105 transition-all shrink-0"
              >
                <BookOpen size={16} />
                <span>Open Subject Selection Hub</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Bottom Save Action Footer */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>Personal details, avatar, and academic cohort settings synchronize across all devices.</span>
              </div>

              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full sm:w-auto relative group overflow-hidden bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-[var(--info)] text-white shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_35%,transparent)] disabled:opacity-50 px-8 py-3 rounded-2xl transition-all duration-300 hover:scale-105 border-none font-extrabold text-sm tracking-wide"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <Sparkles size={16} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} strokeWidth={2.5} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
