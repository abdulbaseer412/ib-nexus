import { Suspense } from "react";
import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { getEmailProviders } from "@/app/auth/actions";
import SecurityClient from "./SecurityClient";

export const metadata = {
  title: "Security — IB Nexus",
  description: "Manage your sign-in methods and account security.",
};

function SecurityFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-surface-alt rounded-2xl" />
      <div className="h-40 bg-surface-alt rounded-2xl" />
    </div>
  );
}

export default async function SecurityPage() {
  const { user } = await requireCompleteProfile();

  console.log("SERVER FORENSIC LOG - user.identities:", user?.identities);

  // Fetch the live provider list server-side so the page renders correctly
  // on first load without a client-side fetch.
  const providers = await getEmailProviders(user.email);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </Link>
          <h1 className="text-2xl font-bold text-primary mb-1">
            Security
          </h1>
          <p className="text-secondary text-sm">
            Manage how you sign in to IB Nexus.
          </p>
        </div>

        <Suspense fallback={<SecurityFallback />}>
          <SecurityClient
            userEmail={user.email}
            initialProviders={providers}
          />
        </Suspense>
      </div>
    </main>
  );
}
