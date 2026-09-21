"use client";

import { useState } from "react";
import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Check, Sparkles, BookOpen, Target, CalendarDays, 
  GraduationCap, ChevronLeft, ChevronRight, LogOut, AlertTriangle, ShieldCheck, Bookmark
} from "lucide-react";
import { inputClassName } from "@/components/auth/auth-styles";
import { PRESET_AVATARS } from "@/lib/avatars";
import { AvatarPicker } from "@/components/ui";

const initialState = { error: "" };

/* ── Configuration Data ─────────────────────────────────────────────────── */
const EXAM_SESSIONS = ["Nov 2026", "May 2027", "Nov 2027", "May 2028", "Nov 2028"];
const STUDY_GOALS = [
  "Past paper practice", "Conceptual understanding", "Time management", 
  "IA & EE guidance", "Memorisation", "Exam technique"
];

// Official DP Subject Catalog Framework
const DEFAULT_DP_CATALOG = [
  {
    category: "Group 1: Studies in Language & Literature",
    courses: [
      { name: "Language A: Literature", slOnly: false },
      { name: "Language A: Language & Literature", slOnly: false },
      { name: "Literature & Performance", slOnly: true }
    ]
  },
  {
    category: "Group 2: Language Acquisition",
    courses: [
      { name: "English B", slOnly: false },
      { name: "Spanish B", slOnly: false },
      { name: "French B", slOnly: false },
      { name: "German B", slOnly: false },
      { name: "Mandarin B", slOnly: false },
      { name: "Spanish ab initio", slOnly: true },
      { name: "French ab initio", slOnly: true },
      { name: "German ab initio", slOnly: true },
      { name: "Mandarin ab initio", slOnly: true },
      { name: "Classical Languages (Latin/Greek)", slOnly: false }
    ]
  },
  {
    category: "Group 3: Individuals & Societies",
    courses: [
      { name: "Business Management", slOnly: false },
      { name: "Digital Society", slOnly: false },
      { name: "Economics", slOnly: false },
      { name: "Geography", slOnly: false },
      { name: "Global Politics", slOnly: false },
      { name: "History", slOnly: false },
      { name: "Philosophy", slOnly: false },
      { name: "Psychology", slOnly: false },
      { name: "Social & Cultural Anthropology", slOnly: false },
      { name: "World Religions", slOnly: true }
    ]
  },
  {
    category: "Group 4: Sciences",
    courses: [
      { name: "Biology", slOnly: false },
      { name: "Chemistry", slOnly: false },
      { name: "Computer Science", slOnly: false },
      { name: "Design Technology", slOnly: false },
      { name: "Environmental Systems & Societies (ESS)", slOnly: false },
      { name: "Physics", slOnly: false },
      { name: "Sports, Exercise & Health Science", slOnly: false }
    ]
  },
  {
    category: "Group 5: Mathematics",
    courses: [
      { name: "Mathematics: Analysis & Approaches (AA)", slOnly: false },
      { name: "Mathematics: Applications & Interpretation (AI)", slOnly: false }
    ]
  },
  {
    category: "Group 6: The Arts",
    courses: [
      { name: "Visual Arts", slOnly: false },
      { name: "Music", slOnly: false },
      { name: "Theatre", slOnly: false },
      { name: "Film", slOnly: false },
      { name: "Dance", slOnly: false }
    ]
  }
];

// Official MYP Subject Catalog Framework (8 Subject Groups with rules)
const DEFAULT_MYP_CATALOG = [
  {
    category: "Language and Literature",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["English Language & Literature", "Spanish Language & Literature", "German Language & Literature", "French Language & Literature"]
  },
  {
    category: "Language Acquisition",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["English Language Acquisition", "Spanish Language Acquisition", "French Language Acquisition", "German Language Acquisition", "Mandarin Language Acquisition"]
  },
  {
    category: "Individuals and Societies",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["History", "Geography", "Economics", "Global Politics", "Integrated Humanities"]
  },
  {
    category: "Sciences",
    selectionMode: "multiple",
    maxSelections: 2,
    courses: ["Biology", "Chemistry", "Physics", "Integrated Sciences", "Environmental Sciences"]
  },
  {
    category: "Mathematics",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["Mathematics (Standard)", "Mathematics (Extended)"]
  },
  {
    category: "Arts",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["Visual Arts", "Music", "Drama/Theatre"]
  },
  {
    category: "Physical and Health Education",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["Physical and Health Education (PHE)"]
  },
  {
    category: "Design",
    selectionMode: "single",
    maxSelections: 1,
    courses: ["Design"]
  }
];

/* ── Framer Motion Variants ──────────────────────────────────────────────── */
const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? 30 : -30,
    opacity: 0
  })
};

export default function OnboardingForm({
  defaults,
  needsDisplayName,
  needsProgram,
  completeOnboarding,
  globalSubjects = [],
}) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form State
  const [name, setName] = useState(defaults.displayName || "");
  const [track, setTrack] = useState(defaults.ibProgram?.toLowerCase().includes("myp") ? "MYP" : "DP"); // "MYP" | "DP"
  const [examSession, setExamSession] = useState("May 2027");
  const [schoolName, setSchoolName] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].id);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]); // [{ name, category, level, is_core? }]
  const [dpCore, setDpCore] = useState({ tok: true, ee: true, cas: true });

  const isMYP = track === "MYP";
  const isDP = track === "DP";

  // Build catalogs from globalSubjects or fallbacks
  const dpCatalog = DEFAULT_DP_CATALOG;
  const mypCatalog = DEFAULT_MYP_CATALOG;

  // Server Action
  const [state, formAction, pending] = useActionState(
    async (_prevState, formData) => {
      formData.set("display_name", name);
      formData.set("ib_program", track);
      formData.set("exam_session", examSession);
      formData.set("school_name", schoolName);
      formData.set("referral_source", referralSource);
      formData.set("avatar_url", avatarUrl);

      // Package DP Core into subjects list if DP
      let finalSubjects = [...selectedSubjects];
      if (isDP) {
        if (dpCore.tok) finalSubjects.push({ name: "Theory of Knowledge (TOK)", category: "DP Core", level: null, is_core: true });
        if (dpCore.ee) finalSubjects.push({ name: "Extended Essay (EE)", category: "DP Core", level: null, is_core: true });
        if (dpCore.cas) finalSubjects.push({ name: "Creativity, Activity, Service (CAS)", category: "DP Core", level: null, is_core: true });
      }

      formData.set("subjects", JSON.stringify(finalSubjects));
      formData.set("study_goals", JSON.stringify(selectedGoals));

      const result = await completeOnboarding(formData);
      return result ?? initialState;
    },
    initialState
  );

  const toggleGoal = (goal) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleSubjectDP = (courseName, category, level, slOnly = false) => {
    const targetLevel = slOnly ? "SL" : level;
    setSelectedSubjects(prev => {
      const exists = prev.find(s => s.name === courseName);
      if (exists && exists.level === targetLevel) {
        return prev.filter(s => s.name !== courseName);
      }
      if (exists) {
        return prev.map(s => s.name === courseName ? { ...s, level: targetLevel, category } : s);
      }
      return [...prev, { name: courseName, category, level: targetLevel }];
    });
  };

  const toggleSubjectMYP = (courseName, category, selectionMode = "single", maxSelections = 1) => {
    setSelectedSubjects(prev => {
      const exists = prev.some(s => s.name === courseName);
      if (exists) {
        return prev.filter(s => s.name !== courseName);
      }

      const inGroup = prev.filter(s => s.category === category);
      if (selectionMode === "single" || maxSelections === 1) {
        // Swap selection in this group seamlessly
        const withoutGroup = prev.filter(s => s.category !== category);
        return [...withoutGroup, { name: courseName, category, level: null }];
      }

      if (inGroup.length >= maxSelections) {
        // Replace oldest selection in multi group
        const firstInGroup = inGroup[0];
        const withoutFirst = prev.filter(s => s.name !== firstInGroup.name);
        return [...withoutFirst, { name: courseName, category, level: null }];
      }

      return [...prev, { name: courseName, category, level: null }];
    });
  };

  const nextStep = () => {
    if (step === 1 && (name.length < 2 || !avatarUrl)) return;
    if (step === 2 && !examSession) return;
    setDirection(1);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const hlCount = selectedSubjects.filter(s => s.level === "HL").length;
  const slCount = selectedSubjects.filter(s => s.level === "SL").length;

  const validateDP = () => {
    const errors = [];
    if (!isDP) return errors;

    if (selectedSubjects.length !== 6) {
      errors.push(`You should select exactly 6 DP subjects (Currently: ${selectedSubjects.length}).`);
    }
    if (hlCount < 3 || hlCount > 4) {
      errors.push(`Standard IB Diploma profiles require 3 or 4 Higher Level (HL) subjects (Currently: ${hlCount} HL).`);
    }
    return errors;
  };

  const validateMYP = () => {
    const errors = [];
    if (!isMYP) return errors;

    const uniqueGroups = new Set(selectedSubjects.map(s => s.category));
    if (uniqueGroups.size < 6) {
      errors.push(`MYP flexibility rules require selecting courses from at least 6 subject groups (Currently: ${uniqueGroups.size} of 8 groups).`);
    }
    if (selectedSubjects.length < 6) {
      errors.push(`Please select your enrolled MYP subjects (Currently: ${selectedSubjects.length}).`);
    }
    return errors;
  };

  const validationErrors = isDP ? validateDP() : validateMYP();
  const isValid = selectedSubjects.length > 0;

  return (
    <div className="card w-full max-w-2xl mx-auto overflow-hidden bg-[#121217] border border-white/10 shadow-2xl text-white">
      {/* Step Indicator Header */}
      <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-extrabold tracking-wider uppercase text-white/70">
            Step {step} of 4 — {step === 1 ? "Track & Profile" : step === 2 ? "Goals & Session" : step === 3 ? "Subject Catalog" : "Confirm Profile"}
          </span>
        </div>
        <span className="text-xs font-bold text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          {track}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 transition-all duration-500 ease-out" 
          style={{ width: `${(step / 4) * 100}%` }} 
        />
      </div>

      <div className="p-6 sm:p-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* ── STEP 1: Academic Track & Personal Info ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <GraduationCap size={24} />
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Select Your IB Academic Track</h2>
                  <p className="mt-1 text-sm text-white/60">Choose your current IB programme to personalize your curriculum & resources.</p>
                </div>
                
                {/* Academic Track Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTrack("MYP");
                      setSelectedSubjects([]);
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                      track === "MYP"
                        ? "bg-teal-500/15 border-teal-500 text-white shadow-lg shadow-teal-500/10"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        MIDDLE YEARS PROGRAMME
                      </span>
                      {track === "MYP" && <Check size={18} className="text-teal-400" />}
                    </div>
                    <h3 className="text-xl font-extrabold text-white">MYP</h3>
                    <p className="text-xs text-white/50 mt-1">IB Middle Years Programme (eAssessments & Personal Project track).</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrack("DP");
                      setSelectedSubjects([]);
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                      track === "DP"
                        ? "bg-indigo-500/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        DIPLOMA PROGRAMME
                      </span>
                      {track === "DP" && <Check size={18} className="text-indigo-400" />}
                    </div>
                    <h3 className="text-xl font-extrabold text-white">DP</h3>
                    <p className="text-xs text-white/50 mt-1">IB Diploma Programme (Final Exams, IAs, TOK, EE, CAS track).</p>
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Choose Profile Avatar</label>
                    <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-white/60">Display Name</label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Alex Baseer"
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="schoolName" className="text-xs font-bold uppercase tracking-wider text-white/60">School Name (Optional)</label>
                      <input
                        id="schoolName"
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g., Geneva International School"
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Timeline & Study Goals ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Target size={24} />
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Timeline & Learning Goals</h2>
                  <p className="mt-1 text-sm text-white/60">Helps customize study plan recommendations & exam countdowns.</p>
                </div>

                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Target Exam Session</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/40 p-2 rounded-2xl border border-white/10">
                      {EXAM_SESSIONS.map(session => (
                        <button
                          key={session}
                          type="button"
                          onClick={() => setExamSession(session)}
                          className={`rounded-xl py-2 text-xs font-bold transition-all ${
                            examSession === session 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {session}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">What do you want to focus on?</label>
                    <div className="flex flex-wrap gap-2">
                      {STUDY_GOALS.map(goal => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                            selectedGoals.includes(goal) 
                              ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10" 
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Track-Specific Subject Catalog ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                    {isDP ? "Select DP Subjects & Levels" : "Select MYP Subjects"}
                  </h2>
                  <p className="mt-1 text-sm text-white/60">
                    {isDP 
                      ? "Select your 6 Diploma subjects (3–4 HLs, remaining SLs) + DP Core." 
                      : "Select the subjects offered at your school across the MYP subject groups."}
                  </p>
                </div>

                {isDP && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-bold">
                    <div className="flex items-center gap-4">
                      <span>Total: <strong className="text-indigo-300">{selectedSubjects.length} / 6</strong></span>
                      <span>HL: <strong className={hlCount >= 3 && hlCount <= 4 ? "text-emerald-400" : "text-amber-400"}>{hlCount}</strong> (Req: 3–4)</span>
                      <span>SL: <strong className="text-teal-300">{slCount}</strong></span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-white/40">DP Curriculum</span>
                  </div>
                )}

                <div className="max-h-[42vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                  {(isDP ? dpCatalog : mypCatalog).map(group => {
                    const groupSelectedCount = isMYP 
                      ? selectedSubjects.filter(s => s.category === group.category).length 
                      : 0;
                    const maxSelections = group.maxSelections || 1;

                    return (
                      <div key={group.category} className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">{group.category}</h3>
                          {isMYP && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              groupSelectedCount > 0 
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/30" 
                                : "bg-white/5 text-white/40 border-white/10"
                            }`}>
                              {groupSelectedCount} of {maxSelections} selected
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2">
                          {group.courses.map(course => {
                            const courseName = typeof course === "string" ? course : course.name;
                            const slOnly = typeof course === "object" ? course.slOnly : false;

                            if (isDP) {
                              const selected = selectedSubjects.find(s => s.name === courseName);
                              const isHL = selected?.level === "HL";
                              const isSL = selected?.level === "SL";

                              return (
                                <div key={courseName} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-semibold text-white">{courseName}</span>
                                    {slOnly && <span className="block text-[10px] font-bold text-amber-400 uppercase">Standard Level Only</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                                    {!slOnly && (
                                      <button 
                                        type="button" 
                                        onClick={() => toggleSubjectDP(courseName, group.category, "HL", slOnly)}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                                          isHL ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-white/50 hover:text-white"
                                        }`}
                                      >
                                        HL
                                      </button>
                                    )}
                                    <button 
                                      type="button" 
                                      onClick={() => toggleSubjectDP(courseName, group.category, "SL", slOnly)}
                                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                                        isSL ? "bg-teal-600 text-white shadow-md shadow-teal-600/30" : "text-white/50 hover:text-white"
                                      }`}
                                    >
                                      SL
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              const isSelected = selectedSubjects.some(s => s.name === courseName);
                              const hasOtherInSingleGroup = group.selectionMode === "single" && groupSelectedCount > 0 && !isSelected;

                              return (
                                <button
                                  key={courseName}
                                  type="button"
                                  onClick={() => toggleSubjectMYP(courseName, group.category, group.selectionMode, group.maxSelections)}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                    isSelected 
                                      ? "border-teal-500 bg-teal-500/15 text-white" 
                                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/80"
                                  }`}
                                >
                                  <span className="text-sm font-semibold">{courseName}</span>
                                  <div className="flex items-center gap-2">
                                    {hasOtherInSingleGroup && (
                                      <span className="text-[10px] font-medium text-teal-400/80 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                        Change selection
                                      </span>
                                    )}
                                    {isSelected && <Check size={16} className="text-teal-400" />}
                                  </div>
                                </button>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* DP Core Options */}
                  {isDP && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 px-1">DP Core Components</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setDpCore(prev => ({ ...prev, tok: !prev.tok }))}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                            dpCore.tok ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-white/5 border-white/10 text-white/50"
                          }`}
                        >
                          <span>TOK</span>
                          {dpCore.tok && <Check size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDpCore(prev => ({ ...prev, ee: !prev.ee }))}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                            dpCore.ee ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-white/5 border-white/10 text-white/50"
                          }`}
                        >
                          <span>Extended Essay</span>
                          {dpCore.ee && <Check size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDpCore(prev => ({ ...prev, cas: !prev.cas }))}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                            dpCore.cas ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-white/5 border-white/10 text-white/50"
                          }`}
                        >
                          <span>CAS</span>
                          {dpCore.cas && <Check size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {validationErrors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                      <AlertTriangle size={15} /> Curriculum Guidance Warnings:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-white/70">
                      {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Profile Review & Confirmation ── */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Review Academic Profile</h2>
                  <p className="mt-1 text-sm text-white/60">Confirm your IB track & course enrollment to finish setup.</p>
                </div>

                <div className="p-6 rounded-3xl bg-black/50 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Academic Track</span>
                      <h3 className="text-xl font-extrabold text-white">{track}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Target Session</span>
                      <span className="text-sm font-bold text-indigo-300">{examSession}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white/60 block">Enrolled Subjects ({selectedSubjects.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedSubjects.map(s => (
                        <div key={s.name} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                          <span className="font-semibold text-white/90 truncate">{s.name}</span>
                          {s.level && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                              s.level === "HL" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            }`}>
                              {s.level}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isDP && (
                    <div className="pt-3 border-t border-white/10 space-y-1.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">DP Core Components</span>
                      <div className="flex flex-wrap gap-2 text-xs font-bold text-white/80">
                        {dpCore.tok && <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">TOK</span>}
                        {dpCore.ee && <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">Extended Essay</span>}
                        {dpCore.cas && <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">CAS</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Control Bar */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
          {step > 1 ? (
            <button 
              type="button" 
              onClick={prevStep} 
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button 
              type="button" 
              onClick={nextStep} 
              disabled={(step === 1 && name.length < 2) || (step === 2 && !examSession)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <form action={formAction}>
              <button 
                type="submit" 
                disabled={pending || !isValid}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {pending ? "Setting up Profile..." : "Confirm Subjects & Start"} <Check size={16} />
              </button>
            </form>
          )}
        </div>
        
        {state.error && (
          <p className="mt-4 text-center text-xs font-bold text-rose-400">{state.error}</p>
        )}
      </div>

      <div className="absolute top-6 right-6">
        <button 
          onClick={async () => {
            const { createClient } = await import("@/utils/supabase-browser");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );
}
