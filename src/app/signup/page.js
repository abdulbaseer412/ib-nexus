import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import SignUpForm from "./SignUpForm";

export const metadata = {
  title: "Create Account — IB Nexus",
  description: "Join IB Nexus and start your IB journey.",
};

function SignUpFallback() {
  return (
    <div className="w-full max-w-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto w-48" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

export default async function SignUpPage() {
  const { IS_APPLICATION_LOCKED } = await import("@/lib/constants");
  const { fetchDirectLockStatus } = await import("@/lib/website-lock");
  const lockStatus = await fetchDirectLockStatus();
  if (IS_APPLICATION_LOCKED || Boolean(lockStatus?.is_locked)) {
    redirect("/");
  }

  const { user, profile } = await getAuthSession();
  if (user) {
    if (profile?.is_suspended === true || profile?.is_restricted === true) {
      redirect("/login?error=account_suspended");
    }
    redirect("/dashboard");
  }

  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="card animate-in mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10">
        <Suspense fallback={<SignUpFallback />}>
          <SignUpForm />
        </Suspense>
      </div>
    </main>
  );
}
