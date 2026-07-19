import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { getDisplayName, getAvatarUrl } from "@/lib/profile";
import GoogleButton from "@/components/auth/GoogleButton";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default async function Navbar() {
  const { user, profile } = await getAuthSession();
  const displayName = getDisplayName(user, profile);
  const avatarUrl = getAvatarUrl(user, profile);

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <Link
        href="/"
        className="text-xl font-semibold text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
      >
        IB Nexus
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {user ? (
          <UserMenu
            displayName={displayName}
            email={user.email}
            avatarUrl={avatarUrl}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <GoogleButton compact />
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors px-2 py-1"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex text-sm font-medium px-3 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
            >
              Create Account
            </Link>
          </>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
}
