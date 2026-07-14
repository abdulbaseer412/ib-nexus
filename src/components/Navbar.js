"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
                IB Nexus
            </span>

            <div className="flex items-center gap-6">
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
                    Dashboard
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
                    Notes
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
                    Login
                </a>

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