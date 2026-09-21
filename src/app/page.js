import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, isCurrentUserAdmin } from "@/lib/auth/session";
import { getDisplayName, isOnboardingComplete } from "@/lib/profile";
import LandingPage from "@/components/LandingPage";
import NexusOpeningExperience from "@/components/NexusOpeningExperience";
import { getWebsiteLockSettings } from "@/lib/website-lock";
import { isUserApprovedForLockedSite } from "@/lib/website-access-allowlist";

export const metadata = { title: "IB Nexus — A New Era of IB Excellence" };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const { is_locked, lock_message } = await getWebsiteLockSettings();
  const { user, profile } = await getAuthSession();

  if (is_locked) {
    const isApproved = await isUserApprovedForLockedSite(user, profile);
    if (!isApproved) {
      return <NexusOpeningExperience lockMessage={lock_message} isLocked={true} isAuthenticated={!!user} />;
    }
  }

  if (!user) return <LandingPage />;

  redirect("/dashboard");
}
