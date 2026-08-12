"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { BookOpen, BrainCircuit, CalendarDays, FolderOpen, LayoutDashboard, Menu, MessageCircle, Settings, Users, X, ShieldAlert } from "lucide-react";

const items = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Notes", "/dashboard/notes", BookOpen],
  ["Flashcards", "/dashboard/flashcards", BrainCircuit],
  ["Study Planner", "/dashboard/planner", CalendarDays],
  ["Resources", "/dashboard/resources", FolderOpen],
  ["AI Tutor", "/dashboard/ai", MessageCircle],
  ["Nexus Network", "/dashboard/community", Users]
];

const NavItems = memo(function NavItems({ onNavigate, profile }) {
  const path = usePathname();
  
  return (
    <>
      {items.map(([label, href, Icon]) => (
        <Link 
          prefetch 
          key={href} 
          href={href} 
          onClick={onNavigate} 
          className={`dashboard-nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${path === href ? "dashboard-nav-active font-semibold" : "text-muted hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`}
        >
          <Icon size={18} className="shrink-0" />
          <span className="dashboard-nav-label whitespace-nowrap">{label}</span>
        </Link>
      ))}
      
      {profile?.is_admin && (
        <Link 
          prefetch 
          href="/dashboard/admin/moderation" 
          onClick={onNavigate} 
          className={`dashboard-nav-item mt-2 group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${path === "/dashboard/admin/moderation" ? "dashboard-nav-active bg-amber-500/10 text-amber-500 font-semibold" : "text-amber-500/70 hover:bg-[var(--surface)] hover:text-amber-500"}`}
        >
          <ShieldAlert size={18} className="shrink-0" />
          <span className="dashboard-nav-label whitespace-nowrap">Moderation</span>
        </Link>
      )}
    </>
  );
});

export default function DashboardSidebar({ profile }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const prefetch = () => [...items.map(([, href]) => href), "/settings", "/dashboard/admin/moderation"].forEach(href => router.prefetch(href));
    const idle = window.requestIdleCallback?.(prefetch, { timeout: 250 }) ?? window.setTimeout(prefetch, 0);
    return () => window.cancelIdleCallback?.(idle) ?? window.clearTimeout(idle);
  }, [router]);
  
  return (
    <>
      <button aria-label="Open workspace navigation" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-40 grid h-11 w-11 place-items-center rounded-xl border bg-[var(--card)] shadow-sm md:hidden">
        <Menu size={19} />
      </button>
      <aside className="dashboard-sidebar fixed bottom-0 left-0 top-[72px] z-30 hidden border-r bg-[var(--background)] p-3 md:flex md:w-[72px] md:hover:w-60 xl:w-60">
        <div className="flex min-w-[216px] flex-1 flex-col overflow-hidden">
          <p className="mb-3 px-3 pt-2 text-xs font-semibold uppercase tracking-[.16em] text-muted dashboard-nav-label">Workspace</p>
          <nav className="space-y-1">
            <NavItems profile={profile} />
          </nav>
          <div className="mt-auto border-t pt-3">
            <Link prefetch href="/settings" className="dashboard-nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
              <Settings size={18} />
              <span className="dashboard-nav-label">Settings</span>
            </Link>
          </div>
        </div>
      </aside>
      
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="animate-in absolute inset-y-0 left-0 w-[260px] bg-[var(--background)] p-4 shadow-xl">
            <div className="mb-5 flex justify-between">
              <span className="font-semibold">Workspace</span>
              <button onClick={() => setOpen(false)} aria-label="Close navigation">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              <NavItems onNavigate={() => setOpen(false)} profile={profile} />
            </nav>
            <Link prefetch onClick={() => setOpen(false)} href="/settings" className="absolute bottom-5 left-4 right-4 flex gap-3 border-t pt-3 text-sm text-muted">
              <Settings size={18} /> Settings
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
