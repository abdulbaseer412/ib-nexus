"use client";

import { useState } from "react";
import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Sparkles, BookOpen, Target, CalendarDays, GraduationCap } from "lucide-react";
import ProgramSelect from "@/components/ui/ProgramSelect";
import { inputClassName } from "@/components/auth/auth-styles";

const initialState = { error: "" };

/* ── Configuration Data ─────────────────────────────────────────────────── */
const EXAM_SESSIONS = ["Nov 2026", "May 2027", "Nov 2027", "May 2028", "Nov 2028"];
const STUDY_GOALS = [
  "Past paper practice", "Conceptual understanding", "Time management", 
  "IA & EE guidance", "Memorisation", "Exam technique"
];

// Subjects are now fetched dynamically via globalSubjects

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

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function OnboardingForm({
  defaults,
  needsDisplayName,
  needsProgram,
  completeOnboarding,
  globalSubjects = [],
}) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Form State
  const [name, setName] = useState(defaults.displayName || "");
  const [program, setProgram] = useState(defaults.ibProgram || "dp");
  const [examSession, setExamSession] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Compute DP and MYP subjects dynamically from globalSubjects
  const DP_SUBJECTS = Object.entries(
    globalSubjects
      .filter((s) => s.program === "dp")
      .reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr.name);
        return acc;
      }, {})
  ).map(([category, subjects]) => ({ category, subjects })).sort((a,b) => a.category.localeCompare(b.category));

  const MYP_SUBJECTS = Object.entries(
    globalSubjects
      .filter((s) => s.program === "myp")
      .reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr.name);
        return acc;
      }, {})
  ).map(([category, subjects]) => ({ category, subjects })).sort((a,b) => {
    const order = [
      "Language and Literature",
      "Language Acquisition",
      "Individuals and Societies",
      "Sciences",
      "Mathematics",
      "Arts",
      "Design",
      "Physical and Health Education"
    ];
    let aIdx = order.indexOf(a.category);
    let bIdx = order.indexOf(b.category);
    if (aIdx === -1) aIdx = 999;
    if (bIdx === -1) bIdx = 999;
    return aIdx - bIdx;
  });

  // Server Action
  const [state, formAction, pending] = useActionState(
    async (_prevState, formData) => {
      formData.set("display_name", name);
      formData.set("ib_program", program);
      formData.set("exam_session", examSession);
      formData.set("school_name", schoolName);
      formData.set("referral_source", referralSource);
      
      const validNames = new Set(
        (program === "dp" ? DP_SUBJECTS : MYP_SUBJECTS).flatMap(g => g.subjects)
      );
      const cleanedSubjects = selectedSubjects.filter(s => validNames.has(s.name));
      
      formData.set("subjects", JSON.stringify(cleanedSubjects));
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

  const toggleSubjectDP = (subjName, level) => {
    setSelectedSubjects(prev => {
      if (prev.some(s => s.name === subjName && s.level === level)) {
        return prev.filter(s => s.name !== subjName);
      }
      if (prev.some(s => s.name === subjName)) {
        return prev.map(s => s.name === subjName ? { name: subjName, level } : s);
      }
      return [...prev, { name: subjName, level }];
    });
  };

  const toggleSubjectMYP = (subjName) => {
    setSelectedSubjects(prev => {
      if (prev.some(s => s.name === subjName)) {
        return prev.filter(s => s.name !== subjName);
      }
      return [...prev, { name: subjName, level: "MYP" }];
    });
  };

  const nextStep = () => {
    if (step === 1 && name.length < 2) return;
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
    if (program !== "dp") return errors;

    if (selectedSubjects.length !== 6) {
      errors.push(`You must select exactly 6 subjects (Currently: ${selectedSubjects.length}).`);
    }

    if (hlCount < 3 || hlCount > 4) {
      errors.push(`You must select 3 or 4 HL subjects (Currently: ${hlCount}).`);
    }

    const groups = new Set();
    selectedSubjects.forEach(sel => {
      const gCode = DP_SUBJECTS.findIndex(g => g.subjects.includes(sel.name));
      if (gCode !== -1) groups.add(gCode + 1);
      if (sel.name === "ESS") {
        groups.add(3);
        groups.add(4);
      }
    });

    const g12Count = selectedSubjects.filter(s => DP_SUBJECTS[0].subjects.includes(s.name)).length;
    const g3Count = selectedSubjects.filter(s => DP_SUBJECTS[1].subjects.includes(s.name) || s.name === "ESS").length;
    const g4Count = selectedSubjects.filter(s => DP_SUBJECTS[2].subjects.includes(s.name) || s.name === "ESS").length;
    const g5Count = selectedSubjects.filter(s => DP_SUBJECTS[3].subjects.includes(s.name)).length;

    if (g12Count < 2) errors.push("You must select at least two languages (Group 1 & 2).");
    if (g3Count < 1) errors.push("You must select at least one Individuals & Societies subject (Group 3).");
    if (g4Count < 1) errors.push("You must select at least one Sciences subject (Group 4).");
    if (g5Count !== 1) errors.push("You must select exactly one Mathematics subject (Group 5).");

    return errors;
  };

  const validateMYP = () => {
    const errors = [];
    if (program !== "myp") return errors;

    const g1Count = selectedSubjects.filter(s => MYP_SUBJECTS[0].subjects.includes(s.name)).length;
    const g2Count = selectedSubjects.filter(s => MYP_SUBJECTS[1].subjects.includes(s.name)).length;
    const g3Count = selectedSubjects.filter(s => MYP_SUBJECTS[2].subjects.includes(s.name)).length;
    const g4Count = selectedSubjects.filter(s => MYP_SUBJECTS[3].subjects.includes(s.name)).length;
    const g5Count = selectedSubjects.filter(s => MYP_SUBJECTS[4].subjects.includes(s.name)).length;
    
    const artsCount = selectedSubjects.filter(s => MYP_SUBJECTS[5].subjects.includes(s.name)).length;
    const designCount = selectedSubjects.filter(s => MYP_SUBJECTS[6].subjects.includes(s.name)).length;
    const pheCount = selectedSubjects.filter(s => MYP_SUBJECTS[7].subjects.includes(s.name)).length;
    const flexCount = artsCount + designCount + pheCount;

    if (g1Count !== 1) errors.push(`You must select exactly one Language and Literature subject (Currently: ${g1Count}).`);
    if (g2Count !== 1) errors.push(`You must select exactly one Language Acquisition subject (Currently: ${g2Count}).`);
    if (g3Count < 1) errors.push("You must select at least one Individuals and Societies subject.");
    if (g4Count < 1) errors.push("You must select at least one Sciences subject.");
    if (g5Count !== 1) errors.push("You must select exactly one Mathematics subject.");
    if (flexCount < 1) errors.push("You must select at least one subject from Arts, Design, or Physical & Health Education.");

    const totalGroups = [g1Count, g2Count, g3Count, g4Count, g5Count, artsCount, designCount, pheCount].filter(c => c > 0).length;
    if (totalGroups < 6) errors.push(`You must study a minimum of 6 subject groups (Currently: ${totalGroups}).`);

    return errors;
  };

  const validationErrors = program === "dp" ? validateDP() : validateMYP();
  const isValid = validationErrors.length === 0;

  return (
    <div className="card w-full max-w-xl mx-auto overflow-hidden">
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-[var(--surface)]">
        <div 
          className="h-full bg-[var(--accent)] transition-all duration-500 ease-out" 
          style={{ width: `${(step / 3) * 100}%` }} 
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
            {/* ── STEP 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)]">
                    <GraduationCap className="text-accent" size={24} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">Welcome to IB Nexus</h2>
                  <p className="mt-2 text-sm text-muted">Let's personalize your learning experience.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">What should we call you?</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Alex"
                      className="input w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Which programme are you taking?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProgram("dp")}
                        className={`rounded-xl border p-4 text-center transition ${program === "dp" ? "border-accent bg-[var(--accent-soft)] text-accent font-semibold" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                      >
                        Diploma (DP)
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgram("myp")}
                        className={`rounded-xl border p-4 text-center transition ${program === "myp" ? "border-accent bg-[var(--accent-soft)] text-accent font-semibold" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                      >
                        Middle Years (MYP)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="schoolName" className="text-sm font-medium">School Name (Optional)</label>
                    <input
                      id="schoolName"
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g., International School of Geneva"
                      className="input w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="referralSource" className="text-sm font-medium">How did you hear about us?</label>
                    <select
                      id="referralSource"
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="input w-full bg-[var(--input)] text-[var(--foreground)]"
                    >
                      <option value="" disabled className="bg-[var(--surface-alt)]">Select an option</option>
                      <option value="tiktok" className="bg-[var(--surface-alt)]">TikTok</option>
                      <option value="instagram" className="bg-[var(--surface-alt)]">Instagram</option>
                      <option value="friend" className="bg-[var(--surface-alt)]">Friend or Classmate</option>
                      <option value="teacher" className="bg-[var(--surface-alt)]">Teacher</option>
                      <option value="google" className="bg-[var(--surface-alt)]">Google Search</option>
                      <option value="other" className="bg-[var(--surface-alt)]">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Timeline & Goals ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)]">
                    <Target className="text-accent" size={24} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">Your Goals</h2>
                  <p className="mt-2 text-sm text-muted">This helps the AI Tutor prioritize your study plan.</p>
                </div>

                <div className="space-y-6 mt-8">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-3">When are your final exams?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-[var(--border)] p-2 rounded-2xl bg-[var(--surface-alt)]">
                      {EXAM_SESSIONS.map(session => (
                        <button
                          key={session}
                          type="button"
                          onClick={() => setExamSession(session)}
                          className={`rounded-xl py-2 text-sm transition ${examSession === session ? "bg-[var(--card)] shadow-sm font-semibold text-primary" : "text-muted hover:text-primary"}`}
                        >
                          {session}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-3">What do you need the most help with?</label>
                    <div className="flex flex-wrap gap-2">
                      {STUDY_GOALS.map(goal => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${selectedGoals.includes(goal) ? "border-accent bg-accent text-white" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Subjects ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)]">
                    <BookOpen className="text-accent" size={24} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">Select your Subjects</h2>
                  <p className="mt-2 text-sm text-muted">
                    {program === "dp" ? "DP students typically pick 3 HLs and 3 SLs." : "Select the subjects you are taking for your MYP eAssessments."}
                  </p>
                </div>

                {program === "dp" && (
                  <div className="flex items-center justify-center gap-6 py-2 border-y border-[var(--divider)]">
                    <span className="text-sm"><b className={hlCount === 3 ? "text-success" : "text-primary"}>{hlCount}</b> / 3 HL</span>
                    <span className="text-sm"><b className={slCount === 3 ? "text-success" : "text-primary"}>{slCount}</b> / 3 SL</span>
                  </div>
                )}

                <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-6">
                  {(program === "dp" ? DP_SUBJECTS : MYP_SUBJECTS).map(group => (
                    <div key={group.category}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">{group.category}</h3>
                      <div className="grid gap-2">
                        {group.subjects.map(subj => {
                          if (program === "dp") {
                            const isHL = selectedSubjects.some(s => s.name === subj && s.level === "HL");
                            const isSL = selectedSubjects.some(s => s.name === subj && s.level === "SL");
                            return (
                              <div key={subj} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
                                <span className="text-sm font-medium">{subj}</span>
                                <div className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg">
                                  <button 
                                    type="button" 
                                    onClick={() => toggleSubjectDP(subj, "HL")}
                                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isHL ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:text-primary"}`}
                                  >
                                    HL
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => toggleSubjectDP(subj, "SL")}
                                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isSL ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:text-primary"}`}
                                  >
                                    SL
                                  </button>
                                </div>
                              </div>
                            );
                          } else {
                            const isSelected = selectedSubjects.some(s => s.name === subj);
                            return (
                              <button
                                key={subj}
                                type="button"
                                onClick={() => toggleSubjectMYP(subj)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)]"}`}
                              >
                                <span className={`text-sm font-medium ${isSelected ? "text-accent" : ""}`}>{subj}</span>
                                {isSelected && <Check size={16} className="text-accent" />}
                              </button>
                            );
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-4 border-t border-[var(--divider)] text-center">
                  <p className="text-sm text-muted">
                    Can't find your subject? Our platform is constantly growing.{" "}
                    <a href="/contact" target="_blank" className="text-accent hover:underline font-medium">
                      Kindly let us know
                    </a>
                    , and we will prioritize adding it!
                  </p>
                </div>

                {validationErrors.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-[rgba(244,63,94,.1)] border border-[rgba(244,63,94,.2)] text-danger">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
                      Invalid Subject Combination
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1 opacity-80">
                      {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {isValid && selectedSubjects.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-[rgba(16,185,129,.1)] border border-[rgba(16,185,129,.2)] text-success flex items-center gap-3">
                    <Check size={18} />
                    <p className="text-sm font-medium">Valid {program.toUpperCase()} Combination! You are ready to complete setup.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation Buttons ── */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-[var(--divider)]">
          {step > 1 ? (
            <button type="button" onClick={prevStep} className="btn btn-secondary border-none hover:bg-[var(--surface)] text-muted px-4 py-2">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div /> // Spacer
          )}

          {step < 3 ? (
            <button 
              type="button" 
              onClick={nextStep} 
              disabled={(step === 1 && name.length < 2) || (step === 2 && !examSession)}
              className="btn btn-primary px-6 py-2.5"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <form action={formAction}>
              <button 
                type="submit" 
                disabled={pending || !isValid}
                className="btn btn-brand px-6 py-2.5 shadow-accent-glow disabled:opacity-50"
              >
                {pending ? "Setting up..." : "Complete Setup"} <Check size={16} />
              </button>
            </form>
          )}
        </div>
        
        {state.error && (
          <p className="mt-4 text-center text-sm font-medium text-danger">{state.error}</p>
        )}
      </div>
    </div>
  );
}
