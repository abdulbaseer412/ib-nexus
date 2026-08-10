import Link from "next/link";
import { buttonClassName } from "@/components/auth/auth-styles";

export default function HomeGuestActions() {
  return (
    <div className="w-full max-w-sm space-y-3">
      <Link href="/signup" className={`${buttonClassName} block text-center`}>
        Create Account
      </Link>
      <Link
        href="/login"
        className="block w-full py-2.5 rounded-xl border border-subtle text-primary font-medium text-center hover:bg-hover transition-colors"
      >
        Sign In
      </Link>
    </div>
  );
}
