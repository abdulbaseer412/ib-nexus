import { requireCompleteProfile } from "@/lib/auth";
import Link from "next/link";
import { User, Shield, BookOpen, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Settings — IB Nexus",
};

export default async function SettingsPage() {
  await requireCompleteProfile();

  const sections = [
    {
      href: "/settings/profile",
      title: "Profile & Academic",
      description: "Manage your display name, school, IB programme, and study goals.",
      icon: <User size={42} className="text-accent mb-4" strokeWidth={1.5} />,
    },
    {
      href: "/settings/security",
      title: "Login, Recovery and Security",
      description: "Fix login issues and learn how to change or reset your password.",
      icon: <Shield size={42} className="text-secondary mb-4" strokeWidth={1.5} />,
    },
    {
      href: "/settings/help",
      title: "Help & Support",
      description: "Access the Help Center, contact support, and report issues.",
      icon: <HelpCircle size={42} className="text-primary mb-4" strokeWidth={1.5} />,
    },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Settings
          </h1>
          <p className="text-secondary">
            Manage your account preferences and academic details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--surface-alt)] hover:border-[var(--border-strong)] transition-all group shadow-sm hover:shadow-md"
            >
              {section.icon}
              <h2 className="text-lg font-semibold text-primary mb-2">
                {section.title}
              </h2>
              <p className="text-sm text-muted">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
