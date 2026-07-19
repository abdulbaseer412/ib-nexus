import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { getDisplayName, isOnboardingComplete } from "@/lib/profile";
import HomeGuestActions from "@/components/HomeGuestActions";

export default async function Home() {
  const { user, profile } = await getAuthSession();
  const displayName = getDisplayName(user, profile);
  const onboardingComplete = isOnboardingComplete(profile);

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-black text-center px-4">
      {user && onboardingComplete ? (
        <>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8 text-lg">
            Pick up where you left off — your notes, flashcards, and study tools
            are ready.
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity"
          >
            Continue to Dashboard
          </Link>
        </>
      ) : user ? (
        <>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Almost there, {displayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8 text-lg">
            Complete your profile setup to unlock your personalised dashboard.
          </p>
          <Link
            href="/onboarding"
            className="px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity"
          >
            Complete Profile
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Welcome to IB Nexus
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8 text-lg">
            Your all-in-one platform for IB MYP &amp; DP — notes, flashcards,
            planning, and more.
          </p>
          <HomeGuestActions />
        </>
      )}
    </main>
  );
}
