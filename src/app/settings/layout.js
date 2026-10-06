import { redirect } from "next/navigation";
import { getAuthSession, requireCompleteProfile } from "@/lib/auth/session";
import DashboardSidebar from "@/components/DashboardSidebar";
import GlobalSearch from "@/components/GlobalSearch";
import AccessRestrictedExperience from "@/components/AccessRestrictedExperience";
import { getWebsiteAccessState, ACCESS_STATES } from "@/lib/website-access";

export default async function SettingsLayout({ children }) { 
  const { user, profile } = await getAuthSession();

  await requireCompleteProfile(); 

  const accessState = await getWebsiteAccessState(user, profile);

  if (accessState.state === ACCESS_STATES.RESTRICTED) {
    if (accessState.reason === "site_locked") {
      redirect("/");
    }
    return <AccessRestrictedExperience user={user} profile={profile} lockMessage={accessState.lockMessage} />;
  }

  return (
    <div className="dashboard-shell relative min-h-screen" suppressHydrationWarning>
      {/* Ambient Lighting Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen dark:mix-blend-lighten hidden md:block" suppressHydrationWarning>
        <div className="absolute top-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[var(--accent)] blur-[140px] opacity-15 dark:opacity-10" />
        <div className="absolute top-[40%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-[var(--info)] blur-[150px] opacity-10 dark:opacity-[0.08]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[var(--ai)] blur-[140px] opacity-10 dark:opacity-5" />
      </div>
      
      <DashboardSidebar profile={profile} />
      <div className="dashboard-content min-h-[calc(100vh-72px)] relative pt-[68px]" suppressHydrationWarning>
        {children}
        <GlobalSearch />
      </div>
    </div>
  ); 
}
