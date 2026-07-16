"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <span className="text-xl font-semibold text-gray-900 dark:text-white">
        IB Nexus
      </span>

      <div className="flex items-center gap-6">
        <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
          Dashboard
        </a>
        <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
          Notes
        </a>

        {mounted && user ? (
          <button
            onClick={handleLogout}
            className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
          >
            Logout
          </button>
        ) : (
          <a href="/login" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
            Login
          </a>
        )}

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-sm"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        )}
      </div>
    </nav>
  );
}