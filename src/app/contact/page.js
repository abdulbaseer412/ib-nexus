import Link from "next/link";
import { ArrowRight, Bug, Clock3, GraduationCap, HeartHandshake, Mail, MessageSquareText, Shield, Sparkles } from "lucide-react";
import ContactForm from "./ContactForm";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Contact Support & Inquiries — IB Nexus",
  description: "Get in touch with the IB Nexus team and founder Abdul Baseer. Fast, friendly support for students, educators, and schools worldwide.",
};

export default async function ContactPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-[88px] pb-16">
      {/* ── AMBIENT BACKGROUND GLOWS ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-[var(--accent)]/10 to-transparent blur-[120px] opacity-70" />
        <div className="absolute top-[40%] -left-32 w-[450px] h-[450px] bg-sky-500/10 blur-[130px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* ── HERO BANNER ────────────────────────────────────────────────────── */}
        <section className="text-center pt-8 sm:pt-12 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25 backdrop-blur-md shadow-xs">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span>Direct Support &amp; Enquiries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[var(--foreground)]">
            How Can We Assist Your <span className="bg-gradient-to-r from-[var(--accent)] to-sky-400 bg-clip-text text-transparent">IB Studies</span>?
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
            Whether you need help with your account, encountered a glitch, want to suggest an IB subject feature, or wish to connect about classroom usage — we are here for you.
          </p>
        </section>

        {/* ── MAIN INTERACTIVE GRID ─────────────────────────────────────────── */}
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] items-start">
          
          {/* Left: Interactive Form */}
          <ContactForm userEmail={userEmail} userName={userName} />

          {/* Right: Informational Glass Cards */}
          <div className="space-y-4">
            {[
              {
                icon: Mail,
                title: "Student & Study Support",
                desc: "Assistance with your profile, sign-in methods, notes sync, and revision flashcard decks.",
                color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
              },
              {
                icon: GraduationCap,
                title: "Schools & Educators",
                desc: "Inquiries regarding classroom deployment, curriculum alignment, or bulk educator accounts.",
                color: "text-purple-400 bg-purple-500/10 border-purple-500/20"
              },
              {
                icon: Bug,
                title: "Bug Reports & Feedback",
                desc: "Spotted an issue? Our engineering team reviews all technical reports directly.",
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              },
              {
                icon: Clock3,
                title: "Fast Response Turnaround",
                desc: "We read every message personally and aim to respond within 24–48 hours.",
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
              }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <article
                  key={idx}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:border-[var(--accent)]/30 hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.color}`}>
                      <Icon size={16} />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[var(--foreground)]">{card.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pl-11">
                    {card.desc}
                  </p>
                </article>
              );
            })}

            {/* Founder Note Card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                <HeartHandshake size={15} />
                <span>Founder Commitment</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                &ldquo;IB Nexus is built by an IB scholar for IB scholars. If something is not working for you or could be made simpler, reach out directly. Your feedback shapes the future of the platform.&rdquo;
              </p>
              <div className="text-xs font-bold text-[var(--foreground)]">
                — Abdul Baseer, Founder &amp; Chief Architect
              </div>
            </div>

            <div className="pt-2">
              <Link 
                href="/help" 
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--accent)] hover:underline"
              >
                <span>Browse the Common Help Topics &amp; FAQs</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── CLEAN STREAMLINED FOOTER ───────────────────────────────────────── */}
        <footer className="pt-10 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)] text-[10px] font-black text-white">IB</span>
            <span>IB Nexus &bull; Created by Abdul Baseer</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
            <Link href="/about" className="hover:text-[var(--foreground)] transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
          </div>
        </footer>

      </div>
    </main>
  );
}
