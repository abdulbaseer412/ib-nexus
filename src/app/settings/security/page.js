import { Suspense } from "react";
import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { getEmailProviders, getUserAuthSettings } from "@/app/auth/actions";
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
  const { user, profile } = await requireCompleteProfile();

  // Fetch both live provider list and auth settings server-side so the page
  // renders with accurate state instantly on first paint.
  const [providers, authSettingsResult] = await Promise.all([
    getEmailProviders(user.email),
    getUserAuthSettings(),
  ]);

  return (
    <main className="p-6 sm:p-10 max-w-2xl mx-auto space-y-8 relative">
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
            initialAuthSettings={authSettingsResult?.data || null}
            profile={profile}
          />
        </Suspense>
      </div>
    </main>
  );
}
