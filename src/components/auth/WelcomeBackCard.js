import Link from "next/link";

export default function WelcomeBackCard() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xl">
        👋
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Welcome Back!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          It looks like you already have an IB Nexus account associated with
          this email. Please sign in instead to continue learning.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex w-full justify-center py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sign In
      </Link>
    </div>
  );
}
