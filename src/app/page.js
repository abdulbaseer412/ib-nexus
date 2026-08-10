import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { getDisplayName, isOnboardingComplete } from "@/lib/profile";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const { user, profile } = await getAuthSession();
  const displayName = getDisplayName(user, profile);
  const onboardingComplete = isOnboardingComplete(profile);

  if (!user) return <LandingPage />;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 text-center text-primary">
      {onboardingComplete ? (
        <>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary sm:text-5xl">Welcome back, {displayName}</h1>
          <p className="mb-8 max-w-md text-lg text-secondary">Pick up where you left off — your notes, flashcards, and study tools are ready.</p>
          <Link href="/dashboard" className="btn btn-brand rounded-xl px-6 py-3 font-semibold">Continue to Study Hub</Link>
        </>
      ) : (
        <>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary sm:text-5xl">Almost there, {displayName}</h1>
          <p className="mb-8 max-w-md text-lg text-secondary">Complete your profile setup to unlock your personalised Study Hub.</p>
          <Link href="/onboarding" className="btn btn-brand rounded-xl px-6 py-3 font-semibold">Complete Profile</Link>
        </>
      )}
    </main>
  );
}
