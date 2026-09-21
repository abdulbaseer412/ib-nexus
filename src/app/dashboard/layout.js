import { getAuthSession, requireCompleteProfile } from "@/lib/auth/session";
import DashboardSidebar from "@/components/DashboardSidebar";
import GlobalSearch from "@/components/GlobalSearch";
import NexusOpeningExperience from "@/components/NexusOpeningExperience";
import { getWebsiteLockSettings } from "@/lib/website-lock";
import { isUserApprovedForLockedSite } from "@/lib/website-access-allowlist";

export default async function DashboardLayout({children}) { 
  const { is_locked, lock_message } = await getWebsiteLockSettings();

  if (is_locked) {
    const { user, profile } = await getAuthSession();
    const isApproved = await isUserApprovedForLockedSite(user, profile);
    if (!isApproved) {
      return <NexusOpeningExperience lockMessage={lock_message} isLocked={true} isAuthenticated={!!user} />;
    }
  }

  const { profile } = await requireCompleteProfile(); 
  return (
    <div className="dashboard-shell relative min-h-screen">
      {/* Ambient Lighting Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen dark:mix-blend-lighten hidden md:block">
        <div className="absolute top-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[var(--accent)] blur-[140px] opacity-15 dark:opacity-10" />
        <div className="absolute top-[40%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-[var(--info)] blur-[150px] opacity-10 dark:opacity-[0.08]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[var(--ai)] blur-[140px] opacity-10 dark:opacity-5" />
      </div>
      
      <DashboardSidebar profile={profile} />
      <div className="dashboard-content min-h-[calc(100vh-72px)] relative z-10 pt-[68px]">
        {children}
        <GlobalSearch />
      </div>
    </div>
  ); 
}

