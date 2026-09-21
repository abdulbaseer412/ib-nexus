import Link from "next/link";

export default function WelcomeBackCard() {
  return (
    <div className="rounded-2xl border border-subtle bg-card-secondary p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-surface-alt flex items-center justify-center text-xl">
        👋
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">
          Welcome Back!
        </h2>
        <p className="text-sm text-secondary leading-relaxed">
          It looks like you already have an IB Nexus account associated with
          this email. Please sign in instead to continue learning.
        </p>
      </div>
      <Link
        href="/login"
        className="btn btn-primary inline-flex w-full justify-center py-2.5 rounded-xl text-sm font-medium"
      >
        Sign In
      </Link>
    </div>
  );
}
