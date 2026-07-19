import { requireCompleteProfile } from "@/lib/auth";
import Link from "next/link";

export const metadata = {
  title: "Settings — IB Nexus",
};

export default async function SettingsPage() {
  await requireCompleteProfile();

  const sections = [
    {
      href: "/settings/security",
      title: "Security",
      description: "Manage sign-in methods, password, and linked accounts.",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage your account preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {section.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {section.description}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            More settings — notifications, privacy, and preferences — coming soon.
          </p>
        </div>
      </div>
    </main>
  );
}
