"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Save, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { updateSubjectsAction } from "./actions";

const DP_SUBJECTS = [
  { category: "Group 1 & 2: Languages", subjects: ["English A Lit", "English A Lang & Lit", "Spanish B", "French B", "Mandarin B", "German B", "German ab initio"] },
  { category: "Group 3: Individuals & Societies", subjects: ["History", "Geography", "Economics", "Business Management", "Psychology", "Global Politics"] },
  { category: "Group 4: Sciences", subjects: ["Biology", "Chemistry", "Physics", "Computer Science", "ESS"] },
  { category: "Group 5: Mathematics", subjects: ["Mathematics AA", "Mathematics AI"] }
];

const MYP_SUBJECTS = [
  { category: "Language and Literature", subjects: ["English Lang & Lit", "Spanish Lang & Lit", "German Lang & Lit"] },
  { category: "Language Acquisition", subjects: ["French", "Spanish", "Mandarin", "German"] },
  { category: "Individuals and Societies", subjects: ["History", "Geography", "Integrated Humanities"] },
  { category: "Sciences", subjects: ["Biology", "Chemistry", "Physics", "Integrated Sciences"] },
  { category: "Mathematics", subjects: ["Mathematics (Standard)", "Mathematics (Extended)"] },
  { category: "Arts", subjects: ["Visual Arts", "Music", "Drama"] },
  { category: "Design", subjects: ["Design"] },
  { category: "Physical and Health Education", subjects: ["PHE"] }
];

export default function SubjectsClient({ profile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSubjects, setSelectedSubjects] = useState(Array.isArray(profile.subjects) ? profile.subjects : []);
  const [status, setStatus] = useState("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const isDP = profile?.ib_program?.toLowerCase() === "dp";

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

  const getDPRules = () => {
    if (!isDP) return [];

    const hlCount = selectedSubjects.filter(s => s.level === "HL").length;
    const g12Count = selectedSubjects.filter(s => DP_SUBJECTS[0].subjects.includes(s.name)).length;
    const g3Count = selectedSubjects.filter(s => DP_SUBJECTS[1].subjects.includes(s.name) || s.name === "ESS").length;
    const g4Count = selectedSubjects.filter(s => DP_SUBJECTS[2].subjects.includes(s.name) || s.name === "ESS").length;
    const g5Count = selectedSubjects.filter(s => DP_SUBJECTS[3].subjects.includes(s.name)).length;

    return [
      { rule: `Exactly 6 subjects (Currently: ${selectedSubjects.length})`, isMet: selectedSubjects.length === 6 },
      { rule: `3 or 4 HL subjects (Currently: ${hlCount})`, isMet: hlCount === 3 || hlCount === 4 },
      { rule: "At least two Languages (Group 1 & 2)", isMet: g12Count >= 2 },
      { rule: "At least one Individuals & Societies subject (Group 3)", isMet: g3Count >= 1 },
      { rule: "At least one Sciences subject (Group 4)", isMet: g4Count >= 1 },
      { rule: "Exactly one Mathematics subject (Group 5)", isMet: g5Count === 1 }
    ];
  };

  const getMYPRules = () => {
    if (isDP) return [];

    const g1Count = selectedSubjects.filter(s => MYP_SUBJECTS[0].subjects.includes(s.name)).length;
    const g2Count = selectedSubjects.filter(s => MYP_SUBJECTS[1].subjects.includes(s.name)).length;
    const g3Count = selectedSubjects.filter(s => MYP_SUBJECTS[2].subjects.includes(s.name)).length;
    const g4Count = selectedSubjects.filter(s => MYP_SUBJECTS[3].subjects.includes(s.name)).length;
    const g5Count = selectedSubjects.filter(s => MYP_SUBJECTS[4].subjects.includes(s.name)).length;
    
    const artsCount = selectedSubjects.filter(s => MYP_SUBJECTS[5].subjects.includes(s.name)).length;
    const designCount = selectedSubjects.filter(s => MYP_SUBJECTS[6].subjects.includes(s.name)).length;
    const pheCount = selectedSubjects.filter(s => MYP_SUBJECTS[7].subjects.includes(s.name)).length;
    const flexCount = artsCount + designCount + pheCount;
    const totalGroups = [g1Count, g2Count, g3Count, g4Count, g5Count, artsCount, designCount, pheCount].filter(c => c > 0).length;

    return [
      { rule: `Minimum of 6 subject groups studied (Currently: ${totalGroups})`, isMet: totalGroups >= 6 },
      { rule: `Exactly one Language and Literature (Currently: ${g1Count})`, isMet: g1Count === 1 },
      { rule: `Exactly one Language Acquisition (Currently: ${g2Count})`, isMet: g2Count === 1 },
      { rule: "At least one Individuals and Societies", isMet: g3Count >= 1 },
      { rule: "At least one Sciences", isMet: g4Count >= 1 },
      { rule: "Exactly one Mathematics", isMet: g5Count === 1 },
      { rule: "At least one from Arts, Design, or PHE", isMet: flexCount >= 1 }
    ];
  };

  const validationRules = isDP ? getDPRules() : getMYPRules();
  const hasErrors = validationRules.some(r => !r.isMet);

  const handleSave = async () => {
    setStatus("saving");
    try {
      await updateSubjectsAction(selectedSubjects);
      setStatus("success");
      setShowConfirm(false);
      setTimeout(() => setStatus("idle"), 3000);
      
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition mb-4">
              <ArrowLeft size={16} /> Back to Study Hub
            </Link>
            <h1 className="text-2xl font-bold text-primary">Manage Subjects</h1>
            <p className="text-secondary text-sm mt-1">Select your {isDP ? "IB Diploma" : "MYP"} subjects below.</p>
          </div>
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={status === "saving" || isPending || hasErrors}
            className="btn btn-primary self-start sm:self-auto min-w-[140px] justify-center"
          >
            {status === "saving" || isPending ? "Saving..." : status === "success" ? "Saved!" : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </header>

        <div className="card p-4 sm:p-6">
          <div className="space-y-6">
            {(isDP ? DP_SUBJECTS : MYP_SUBJECTS).map((group) => (
              <div key={group.category}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {group.category}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.subjects.map((subj) => {
                    const sel = selectedSubjects.find((s) => s.name === subj);
                    const isSelected = !!sel;
                    if (isDP) {
                      const isHL = sel?.level === "HL";
                      const isSL = sel?.level === "SL";
                      return (
                        <div key={subj} className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)] transition-colors">
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
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => toggleSubjectMYP(subj)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition ${isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)]"}`}
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

          <div className="mt-6 p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
            <h3 className="font-semibold text-sm mb-3 text-primary">Subject Requirements</h3>
            <ul className="grid sm:grid-cols-2 gap-2 text-xs">
              {validationRules.map((r, i) => (
                <li key={i} className={`flex items-start gap-3 text-sm transition-colors ${r.isMet ? "text-success" : "text-secondary"}`}>
                  {r.isMet ? (
                    <div className="mt-0.5 rounded-full bg-success/20 p-0.5 text-success shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="mt-0.5 rounded-full bg-danger/10 p-0.5 text-danger shrink-0">
                      <X size={14} strokeWidth={3} />
                    </div>
                  )}
                  <span className={r.isMet ? "opacity-100" : "opacity-80"}>{r.rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </main>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0 mt-1">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Confirm Subject Changes</h3>
                <p className="text-sm text-secondary mt-2 leading-relaxed">
                  Are you sure you want to change your subjects? If you remove any existing subjects, <strong>all study progress, notes, and flashcards</strong> tied to them will be permanently erased.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition"
                disabled={status === "saving" || isPending}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:opacity-50"
                disabled={status === "saving" || isPending}
              >
                {status === "saving" || isPending ? "Saving..." : "Confirm Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
