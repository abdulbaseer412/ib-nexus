import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign In — IB Nexus",
  description: "Sign in to your IB Nexus account.",
};

function SignInFallback() {
  return (
    <div className="w-full max-w-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto w-48" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const errorParam = sp?.error;

  if (errorParam !== "account_suspended") {
    const user = await getAuthUser();
    if (user) {
      const profile = await getProfile(user.id);
      if (profile?.is_restricted !== true && profile?.is_suspended !== true) {
        const { IS_APPLICATION_LOCKED } = await import("@/lib/constants");
        const { fetchDirectLockStatus } = await import("@/lib/website-lock");
        const { isUserApprovedForLockedSite } = await import("@/lib/website-access-allowlist");
        
        const lockStatus = await fetchDirectLockStatus();
        const isLocked = IS_APPLICATION_LOCKED || Boolean(lockStatus.is_locked);

        if (isLocked) {
          const isApproved = await isUserApprovedForLockedSite(user, profile);
          if (isApproved) {
            redirect("/dashboard");
          }
          // When website is locked and user is NOT approved:
          // Do NOT call redirect() here! That caused a recursive loop on /login.
          // Let it render <SignInForm /> so the user can see their status and switch accounts.
        } else {
          redirect("/dashboard");
        }
      }
    }
  }

  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="card animate-in mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10">
        <Suspense fallback={<SignInFallback />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
