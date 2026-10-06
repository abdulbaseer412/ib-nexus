import { getAuthSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import AccessRestrictedExperience from "@/components/AccessRestrictedExperience";
import Link from "next/link";

export const metadata = {
  title: "Account Suspended | IB Nexus",
  description: "Official IB Nexus account suspension and data safety status page.",
};

export const dynamic = "force-dynamic";

export default async function SuspendedPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const paramEmail = (resolvedSearchParams?.email || "").trim().toLowerCase();
  
  let sessionUser = null;
  let sessionProfile = null;
  
  try {
    const session = await getAuthSession();
    sessionUser = session?.user || null;
    sessionProfile = session?.profile || null;
  } catch (e) {
    // Unauthenticated or banned session
  }

  let effectiveUser = sessionUser;
  let effectiveProfile = sessionProfile;

  if (!effectiveUser && paramEmail) {
    try {
      const admin = createAdminClient();
      const { data: dbProfile } = await admin
        .from("profiles")
        .select("id, email, display_name, full_name, preferences")
        .eq("email", paramEmail)
        .maybeSingle();

      effectiveUser = { email: paramEmail, id: dbProfile?.id || "suspended_user" };
      effectiveProfile = dbProfile || {
        email: paramEmail,
        display_name: paramEmail.split("@")[0],
      };
    } catch {
      effectiveUser = { email: paramEmail };
      effectiveProfile = { email: paramEmail, display_name: paramEmail.split("@")[0] };
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden text-slate-100 selection:bg-rose-500/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-rose-600/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/20 group-hover:scale-105 transition-transform">
            <span className="font-black text-white text-base">N</span>
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">IB Nexus</span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
        >
          Sign In
        </Link>
      </header>

      {/* Center Restricted Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <AccessRestrictedExperience
          user={effectiveUser}
          profile={effectiveProfile}
        />
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} IB Nexus. Secure Academic Environment. All data preserved.
      </footer>
    </main>
  );
}
