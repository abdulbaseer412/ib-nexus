"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Save, AlertTriangle, X, Plus, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { updateSubjectsAction, addGlobalSubjectAction, editGlobalSubjectAction, deleteGlobalSubjectAction } from "./actions";

export default function SubjectsClient({ profile, globalSubjects = [], isAdmin = false }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSubjects, setSelectedSubjects] = useState(Array.isArray(profile.subjects) ? profile.subjects : []);
  const [status, setStatus] = useState("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Admin state
  const [adminModal, setAdminModal] = useState({ isOpen: false, type: "add", subject: null });
  const [adminFormData, setAdminFormData] = useState({ program: "dp", category: "Group 1 & 2: Languages", name: "" });

  const isDP = profile?.ib_program?.toLowerCase() === "dp";

  // Compute DP and MYP subjects dynamically from globalSubjects
  const DP_SUBJECTS = Object.entries(
    globalSubjects
      .filter((s) => s.program === "dp")
      .reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
      }, {})
  ).map(([category, subjects]) => ({ category, subjects })).sort((a,b) => a.category.localeCompare(b.category));

  const MYP_SUBJECTS = Object.entries(
    globalSubjects
      .filter((s) => s.program === "myp")
      .reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
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
    const g12Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'dp' && (g.category.includes('Group 1') || g.category.includes('Group 2')))).length;
    const g3Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'dp' && g.category.includes('Group 3')) || s.name === "ESS").length;
    const g4Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'dp' && g.category.includes('Group 4')) || s.name === "ESS").length;
    const g5Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'dp' && g.category.includes('Group 5'))).length;

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

    const g1Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Language and Literature')).length;
    const g2Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Language Acquisition')).length;
    const g3Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Individuals and Societies')).length;
    const g4Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Sciences')).length;
    const g5Count = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Mathematics')).length;
    
    const artsCount = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Arts')).length;
    const designCount = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Design')).length;
    const pheCount = selectedSubjects.filter(s => globalSubjects.some(g => g.name === s.name && g.program === 'myp' && g.category === 'Physical and Health Education')).length;
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

  const handleAdminSubmit = () => {
    startTransition(async () => {
      try {
        if (adminModal.type === "add") {
          await addGlobalSubjectAction(adminFormData.program, adminFormData.category, adminFormData.name);
        } else {
          await editGlobalSubjectAction(adminModal.subject.id, adminFormData.program, adminFormData.category, adminFormData.name);
        }
        setAdminModal({ isOpen: false, type: "add", subject: null });
      } catch (e) {
        alert("Failed to save subject: " + e.message);
      }
    });
  };

  const handleDeleteGlobal = (id) => {
    if (!confirm("Are you sure you want to delete this global subject? This may affect users who have already selected it.")) return;
    startTransition(async () => {
      try {
        await deleteGlobalSubjectAction(id);
      } catch (e) {
        alert("Failed to delete subject: " + e.message);
      }
    });
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
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary">Manage Subjects</h1>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setAdminFormData({ program: isDP ? "dp" : "myp", category: isDP ? DP_SUBJECTS[0]?.category : MYP_SUBJECTS[0]?.category, name: "" });
                    setAdminModal({ isOpen: true, type: "add", subject: null });
                  }}
                  className="btn bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add Global Subject
                </button>
              )}
            </div>
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
                    const sel = selectedSubjects.find((s) => s.name === subj.name);
                    const isSelected = !!sel;
                    if (isDP) {
                      const isHL = sel?.level === "HL";
                      const isSL = sel?.level === "SL";
                      return (
                        <div key={subj.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)] transition-colors group/item relative">
                          <span className="text-sm font-medium">{subj.name}</span>
                          <div className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg">
                            <button 
                              type="button" 
                              onClick={() => toggleSubjectDP(subj.name, "HL")}
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isHL ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:text-primary"}`}
                            >
                              HL
                            </button>
                            <button 
                              type="button" 
                              onClick={() => toggleSubjectDP(subj.name, "SL")}
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${isSL ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:text-primary"}`}
                            >
                              SL
                            </button>
                          </div>
                          
                          {isAdmin && (
                            <div className="absolute -top-2 -right-2 hidden group-hover/item:flex items-center gap-1 bg-white dark:bg-zinc-800 shadow-md rounded-md p-1 border border-[var(--border)]">
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminFormData({ program: subj.program, category: subj.category, name: subj.name });
                                  setAdminModal({ isOpen: true, type: "edit", subject: subj });
                                }}
                                className="p-1 hover:text-indigo-600 transition"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGlobal(subj.id)}
                                className="p-1 hover:text-red-500 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div key={subj.id} className="relative group/item">
                          <button
                            type="button"
                            onClick={() => toggleSubjectMYP(subj.name)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition ${isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--border-strong)]"}`}
                          >
                            <span className="text-sm font-medium">{subj.name}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-strong)]"}`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          </button>
                          
                          {isAdmin && (
                            <div className="absolute -top-2 -right-2 hidden group-hover/item:flex items-center gap-1 bg-white dark:bg-zinc-800 shadow-md rounded-md p-1 border border-[var(--border)]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAdminFormData({ program: subj.program, category: subj.category, name: subj.name });
                                  setAdminModal({ isOpen: true, type: "edit", subject: subj });
                                }}
                                className="p-1 hover:text-indigo-600 transition"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGlobal(subj.id);
                                }}
                                className="p-1 hover:text-red-500 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
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
        
        {/* Admin Modal */}
        {adminModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--surface)] p-6 rounded-2xl shadow-xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">
                  {adminModal.type === "add" ? "Add Global Subject" : "Edit Global Subject"}
                </h3>
                <button onClick={() => setAdminModal({ isOpen: false, type: "add", subject: null })} className="text-muted hover:text-primary">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Program</label>
                  <select 
                    value={adminFormData.program}
                    onChange={(e) => {
                      const newProgram = e.target.value;
                      const defaultCategory = newProgram === "dp" ? "Group 1 & 2: Languages" : "Language and Literature";
                      setAdminFormData({ ...adminFormData, program: newProgram, category: defaultCategory });
                    }}
                    className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2"
                  >
                    <option value="dp">IB Diploma (DP)</option>
                    <option value="myp">MYP</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category / Group</label>
                  <select
                    value={adminFormData.category}
                    onChange={(e) => setAdminFormData({ ...adminFormData, category: e.target.value })}
                    className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2"
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
                  <label className="block text-sm font-medium mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                    placeholder="e.g. Biology"
                    className="w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-4 py-2"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={() => setAdminModal({ isOpen: false, type: "add", subject: null })}
                  className="px-4 py-2 text-sm font-medium bg-[var(--surface-alt)] hover:bg-[var(--border)] rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdminSubmit}
                  disabled={isPending || !adminFormData.name || !adminFormData.category}
                  className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Subject"}
                </button>
              </div>
            </div>
          </div>
        )}
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
