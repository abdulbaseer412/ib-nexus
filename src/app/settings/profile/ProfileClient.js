"use client";

import { useState, useTransition } from "react";
import { Save, User, CalendarDays, ArrowLeft, GraduationCap, Building2, CheckCircle2, Sparkles, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { updateSettingsAction } from "./actions";
import { AvatarPicker } from "@/components/ui";

const EXAM_SESSIONS = ["Nov 2026", "May 2027", "Nov 2027", "May 2028", "Nov 2028"];

export default function ProfileClient({ profile = {} }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "fox");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(profile.avatar_url || "fox");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [schoolName, setSchoolName] = useState(profile.school_name || "");
  const [program, setProgram] = useState(profile.ib_program || "dp");
  const [examSession, setExamSession] = useState(profile.exam_session || "");
  
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
      });
      setSavedAvatarUrl(avatarUrl);
      router.refresh();
      // Optional: Add a nice toast instead of alert in the future
      alert("Settings saved successfully!");
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-10 sm:py-14 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[var(--accent)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[30vw] h-[30vw] bg-[var(--ai)]/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        className="max-w-4xl mx-auto space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-4 group font-medium">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Settings
            </Link>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3">
              Your Profile
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium max-w-lg leading-relaxed">
              Customize your identity and academic details to tailor the IB Nexus experience.
            </p>
          </div>
          
          <button 
            onClick={handleSave} 
            disabled={isPending}
            className="btn relative group overflow-hidden bg-gradient-to-r from-[var(--accent)] to-[var(--info)] text-white shadow-[0_8px_25px_color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:opacity-50 px-6 py-2.5 rounded-xl transition-all hover:scale-105 border-none"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2 font-bold text-sm tracking-wide">
              {isPending ? "Saving..." : <><Save size={16} strokeWidth={2.5} /> Save Changes</>}
            </span>
          </button>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Info */}
          <motion.section variants={itemVariants} className="relative group p-[1px] rounded-[2rem] bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full bg-[var(--card)] rounded-[calc(2rem-1px)] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--info)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20">
                  <UserCircle size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Identity</h2>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mt-1">Personal Details</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[var(--text-secondary)]">Avatar</label>
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
                
                <div className="space-y-5">
                  <div className="group/input">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Display Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors" />
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)} 
                        placeholder="What should we call you?"
                        className="w-full bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--foreground)] placeholder:text-[var(--muted)] font-medium rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-300 focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_15%,transparent)]" 
                      />
                    </div>
                  </div>

                  <div className="group/input">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">School Name</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within/input:text-[var(--accent)] transition-colors" />
                      <input 
                        type="text" 
                        value={schoolName} 
                        onChange={e => setSchoolName(e.target.value)} 
                        placeholder="Where do you study?"
                        className="w-full bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--foreground)] placeholder:text-[var(--muted)] font-medium rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-300 focus:border-[var(--accent)] focus:bg-[var(--card)] focus:shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_15%,transparent)]" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Academic Info */}
          <motion.section variants={itemVariants} className="relative group p-[1px] rounded-[2rem] bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-bl from-[var(--info)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full bg-[var(--card)] rounded-[calc(2rem-1px)] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--info)] to-[var(--ai)] flex items-center justify-center text-white shadow-lg shadow-[var(--info)]/20">
                  <GraduationCap size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Academics</h2>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mt-1">Curriculum Details</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 block">IB Programme</label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setProgram("dp")}
                      className={`relative flex items-center justify-center py-3.5 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${program === "dp" ? "text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                    >
                      {program === "dp" && (
                        <motion.div layoutId="program-bg" className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--info)] rounded-xl z-[-1]" />
                      )}
                      Diploma (DP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgram("myp")}
                      className={`relative flex items-center justify-center py-3.5 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${program === "myp" ? "text-white shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                    >
                      {program === "myp" && (
                        <motion.div layoutId="program-bg" className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--info)] rounded-xl z-[-1]" />
                      )}
                      Middle Years (MYP)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                    <span>Exam Session</span>
                    {examSession && <CheckCircle2 size={14} className="text-[var(--success)]" />}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXAM_SESSIONS.map(session => (
                      <button
                        key={session}
                        type="button"
                        onClick={() => setExamSession(session)}
                        className={`group relative overflow-hidden rounded-xl py-3 border transition-all duration-300 ${
                          examSession === session 
                            ? "bg-[var(--info)]/10 border-[var(--info)] shadow-[0_4px_15px_color-mix(in_srgb,var(--info)_15%,transparent)]" 
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--info)]/50 hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        <span className={`relative z-10 text-sm font-bold transition-colors ${examSession === session ? "text-[var(--info)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"}`}>
                          {session}
                        </span>
                        {examSession === session && (
                          <div className="absolute inset-0 bg-gradient-to-br from-[var(--info)]/5 to-transparent pointer-events-none" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </main>
  );
}
