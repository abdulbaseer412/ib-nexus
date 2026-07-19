import { requireCompleteProfile } from "@/lib/auth";
import { getDisplayName, getProgramLabel, getAvatarUrl } from "@/lib/profile";

export const metadata = {
  title: "Dashboard — IB Nexus",
};

export default async function Dashboard() {
  const { user, profile } = await requireCompleteProfile();
  const displayName = getDisplayName(user, profile);
  const programLabel = getProgramLabel(profile.ib_program);
  const avatarUrl = getAvatarUrl(user, profile);
  const modules = [
    { name: "Notes", desc: "Your uploaded notes and revision guides", href: null },
    { name: "Flashcards", desc: "Create and review flashcard sets", href: null },
    { name: "Study Planner", desc: "Track tasks and deadlines", href: null },
    { name: "AI Tutor", desc: "Coming soon", href: null },
    { name: "Community", desc: "Coming soon", href: null },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 p-4 space-y-1 hidden sm:block">
        {modules.map((m) => (
          <div
            key={m.name}
            className="px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 cursor-default"
          >
            {m.name}
          </div>
        ))}
      </aside>

      <main className="flex-1 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 text-xl font-semibold text-gray-700 dark:text-gray-200 overflow-hidden shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {profile.display_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {programLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 mr-2">
                  {programLabel}
                </span>
              )}
              {user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div
              key={m.name}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
                {m.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{m.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
