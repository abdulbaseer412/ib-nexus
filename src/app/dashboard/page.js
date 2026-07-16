import { createServerClient } from "@/utils/supabase-server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const modules = [
    { name: "Notes", desc: "Your uploaded notes and revision guides" },
    { name: "Flashcards", desc: "Create and review flashcard sets" },
    { name: "Study Planner", desc: "Track tasks and deadlines" },
    { name: "AI Tutor", desc: "Coming soon" },
    { name: "Community", desc: "Coming soon" },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 p-4 space-y-2">
        {modules.map((m) => (
          <div
            key={m.name}
            className="px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
          >
            {m.name}
          </div>
        ))}
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Welcome back
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">{user.email}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div
              key={m.name}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-800"
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