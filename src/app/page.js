import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, isCurrentUserAdmin } from "@/lib/auth/session";
import { getDisplayName, isOnboardingComplete } from "@/lib/profile";
import LandingPage from "@/components/LandingPage";
import NexusOpeningExperience from "@/components/NexusOpeningExperience";
import AccessRestrictedExperience from "@/components/AccessRestrictedExperience";
import { getWebsiteLockSettings } from "@/lib/website-lock";
import { isUserApprovedForLockedSite } from "@/lib/website-access-allowlist";

export const metadata = { title: "IB Nexus — A New Era of IB Excellence" };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const { is_locked, lock_message } = await getWebsiteLockSettings();
  const { user, profile } = await getAuthSession();

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user?.email?.trim().toLowerCase();
  const isSuperAdmin = Boolean(superAdminEmail && userEmail === superAdminEmail);

  if (user && !isSuperAdmin) {
    const isSuspended = Boolean(
      (profile?.preferences?.is_suspended === true) ||
      (profile?.preferences?.is_suspended !== false && user.user_metadata?.is_suspended === true) ||
      (user.banned_until && new Date(user.banned_until).getTime() > Date.now())
    );

    if (isSuspended) {
      return (
        <AccessRestrictedExperience
          user={user}
          profile={profile}
          lockMessage="Your account access has been temporarily suspended by an administrator. All your notes, planner items, and study materials remain securely preserved."
        />
      );
    }
  }

  if (is_locked) {
    const isApproved = await isUserApprovedForLockedSite(user, profile);

    if (isApproved && sp?.enter === "1") {
      redirect("/dashboard");
    }

    return (
      <NexusOpeningExperience
        lockMessage={lock_message}
        isLocked={true}
        isAuthenticated={Boolean(user)}
        isApproved={isApproved}
        isSuperAdmin={isSuperAdmin}
        userEmail={user?.email || null}
        initialLockError={sp?.lock_error || sp?.error || null}
        initialRejectedEmail={sp?.rejected_email || (!isApproved ? user?.email : null)}
      />
    );
  }

  if (!user) return <LandingPage />;

  redirect("/dashboard");
}
