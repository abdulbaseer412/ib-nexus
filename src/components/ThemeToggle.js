"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Avoid lint error about setState in effect body.
    // We only need to wait for client mount.
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);


  if (!mounted) {
    return (
      <div className="w-[72px] h-[30px] rounded-full border border-gray-300 dark:border-gray-700" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
