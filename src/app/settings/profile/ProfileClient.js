"use client";

import { useState, useTransition } from "react";
import { Save, User, CalendarDays, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSettingsAction } from "./actions";
import { AvatarPicker } from "@/components/ui";

const EXAM_SESSIONS = ["Nov 2026", "May 2027", "Nov 2027", "May 2028", "Nov 2028"];
const STUDY_GOALS = [
  "Past paper practice", "Conceptual understanding", "Time management", 
  "IA & EE guidance", "Memorisation", "Exam technique"
];

export default function ProfileClient({ profile = {} }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "fox");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(profile.avatar_url || "fox");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [schoolName, setSchoolName] = useState(profile.school_name || "");
  const [program, setProgram] = useState(profile.ib_program || "dp");
  const [examSession, setExamSession] = useState(profile.exam_session || "");
  const [selectedGoals, setSelectedGoals] = useState(Array.isArray(profile.study_goals) ? profile.study_goals : []);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      await updateSettingsAction({
        avatar_url: avatarUrl,
        display_name: displayName,
        school_name: schoolName,
        ib_program: program,
        exam_session: examSession,
        study_goals: selectedGoals,
      });
      setSavedAvatarUrl(avatarUrl);
      router.refresh();
      alert("Settings saved successfully!");
    });
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-1">
            Profile & Academic Details
          </h1>
          <p className="text-secondary text-sm">
            Manage your display name, school, IB programme, and study goals.
          </p>
        </div>

        {/* Profile Info */}
        <section className="card p-6">
          <div className="flex items-center gap-3 border-b border-[var(--divider)] pb-4 mb-6">
            <User className="text-accent" size={20} />
            <h2 className="text-lg font-semibold">Profile Settings</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Avatar</label>
              <AvatarPicker 
                value={avatarUrl} 
                onChange={setAvatarUrl} 
                onConfirm={avatarUrl !== savedAvatarUrl ? async () => {
                  await updateSettingsAction({ avatar_url: avatarUrl });
                  setSavedAvatarUrl(avatarUrl);
                  router.refresh();
                } : undefined}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input w-full bg-[var(--input)] text-[var(--foreground)]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">School Name</label>
              <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="input w-full bg-[var(--input)] text-[var(--foreground)]" />
            </div>
          </div>
        </section>

        {/* Academic Info */}
        <section className="card p-6">
          <div className="flex items-center gap-3 border-b border-[var(--divider)] pb-4 mb-6">
            <CalendarDays className="text-accent" size={20} />
            <h2 className="text-lg font-semibold">Academic Details</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">IB Programme</label>
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
            <div>
              <label className="block text-sm font-medium mb-3">Exam Session</label>
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
              <label className="block text-sm font-medium mb-3">Study Goals</label>
              <div className="flex flex-wrap gap-2">
                {STUDY_GOALS.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => {
                      setSelectedGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm transition ${selectedGoals.includes(goal) ? "border-accent bg-accent text-white" : "border-[var(--border)] hover:bg-[var(--surface)]"}`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end mt-6">
          <button 
            onClick={handleSave} 
            disabled={isPending}
            className="btn btn-primary shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            {isPending ? "Saving..." : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
    </main>
  );
}
