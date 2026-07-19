import { requireAuth } from "@/lib/auth";
import { isOnboardingComplete, getOnboardingDefaults } from "@/lib/profile";
import { ensureProfile } from "@/lib/profile-service";
import { completeOnboarding } from "./actions";
import OnboardingForm from "./OnboardingForm";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Set Up Your Profile — IB Nexus",
};

export default async function OnboardingPage() {
  const user = await requireAuth();
  const profile = await ensureProfile(user);

  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

  const defaults = getOnboardingDefaults(user, profile);
  const needsDisplayName = !defaults.hasDisplayName;
  const needsProgram = !defaults.hasIbProgram;

  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {defaults.hasDisplayName
              ? `Welcome, ${defaults.displayName}`
              : "Welcome to IB Nexus"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {needsProgram && defaults.hasDisplayName
              ? "Just one more step — tell us your IB programme."
              : "Tell us a bit about yourself to personalize your experience."}
          </p>
        </div>

        <OnboardingForm
          defaults={defaults}
          needsDisplayName={needsDisplayName}
          needsProgram={needsProgram}
          completeOnboarding={completeOnboarding}
        />
      </div>
    </main>
  );
}
