"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Search, Bell, Sparkles, BookOpen, Layers, ShieldCheck
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import UserNotificationBanner from "@/components/notifications/UserNotificationBanner";
import UserRequestsModal from "@/components/notifications/UserRequestsModal";
import { fetchUserNotificationsAction } from "@/app/dashboard/admin/actions";
import { createClient } from "@/utils/supabase-browser";
import { ScrollProgress, AnimatedBackground } from "@/components/motion-primitives";

export default function NavbarClient({ email, displayName, avatarUrl }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  
  // Mobile Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User Requests Modal & Notifications State
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const navRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!email) return;

    let channel = null;
    const supabase = createClient();

    const checkNotifs = async () => {
      try {
        const res = await fetchUserNotificationsAction();
        if (res.success && Array.isArray(res.notifications)) {
          const unread = res.notifications.filter(n => !n.is_read).length;
          setUnreadNotifs(unread);
        }
      } catch (e) {
        // Non-critical
      }
    };

    checkNotifs();

    // Fallback interval (15s)
    const interval = setInterval(checkNotifs, 15000);

    // Setup Supabase Realtime channel for live instant notification alerts
    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        channel = supabase
          .channel(`navbar-notifs-${user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
            () => {
              checkNotifs();
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "admin_requests" },
            () => {
              checkNotifs();
            }
          )
          .subscribe();
      } catch (e) {
        // Realtime fallback to polling
      }
    };

    setupRealtime();

    // Cross-component local event sync
    const handleLocalUpdate = () => checkNotifs();
    window.addEventListener("nexus:notifications-updated", handleLocalUpdate);

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("nexus:notifications-updated", handleLocalUpdate);
    };
  }, [email]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const homeHref = email ? "/dashboard" : "/";

  return (
    <>
      <ScrollProgress className="fixed top-0 inset-x-0 z-[60] h-[2.5px] bg-gradient-to-r from-indigo-500 via-[var(--accent)] to-sky-400" />
      <nav
        ref={navRef}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
          scrolled || mobileMenuOpen
            ? "border-b border-[var(--header-border)] bg-[var(--header-bg)]/85 shadow-sm backdrop-blur-xl"
            : "border-b border-transparent bg-[var(--header-bg)]/95 backdrop-blur-md"
        }`}
      >
        <div className="flex h-[68px] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href={homeHref} className="flex shrink-0 items-center py-2 pr-4" aria-label="IB Nexus home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/horizontal-logo-transparent.png"
              alt="IB Nexus"
              width="140"
              height="38"
              fetchPriority="high"
              className="logo h-9 w-auto object-contain invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0"
            />
          </Link>

          {/* Premium Center Search Bar (Logged In) */}
          {email && (
            <div className="relative flex-1 max-w-2xl mx-8 hidden md:block group z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-[var(--info)] to-[var(--ai)] rounded-2xl blur-xl opacity-0 group-focus-within:opacity-15 transition-opacity duration-700 pointer-events-none" />
              <div className="relative flex items-center bg-[var(--input)] border border-[var(--border-strong)] rounded-2xl transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--surface)] hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--accent)_20%,transparent)] cursor-pointer">
                <Search className="absolute left-4 w-4 h-4 text-[var(--muted)] transition-colors duration-300" strokeWidth={2.5} />
                <input
                  ref={searchInputRef}
                  type="text"
                  readOnly
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                  placeholder="Search IB Nexus..."
                  className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] text-[14px] font-medium rounded-2xl pl-12 pr-16 py-2.5 outline-none transition-all cursor-pointer"
                />
                <div className="absolute right-3 flex items-center gap-1 opacity-100 transition-opacity duration-300 pointer-events-none">
                  <kbd className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] shadow-sm">Ctrl</kbd>
                  <kbd className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] shadow-sm">K</kbd>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Navigation Links (Public / Before Login) */}
          {!email && (
            <div className="hidden items-center gap-1 text-sm text-[var(--muted)] md:flex">
              <AnimatedBackground
                enableHover
                className="rounded-xl bg-[var(--surface-hover)]"
                transition={{
                  type: "spring",
                  bounce: 0.15,
                  duration: 0.35,
                }}
              >
                <Link
                  data-id="features"
                  href="/#notes"
                  className="rounded-xl px-3 py-2 font-medium transition hover:text-[var(--foreground)]"
                >
                  Features
                </Link>
                <Link
                  data-id="resources"
                  href="/#resources"
                  className="rounded-xl px-3 py-2 font-medium transition hover:text-[var(--foreground)]"
                >
                  Resources
                </Link>
                <Link
                  data-id="about"
                  href="/about"
                  className="rounded-xl px-3 py-2 font-medium transition hover:text-[var(--foreground)]"
                >
                  About
                </Link>
                <Link
                  data-id="contact"
                  href="/contact"
                  className="rounded-xl px-3 py-2 font-medium transition hover:text-[var(--foreground)]"
                >
                  Contact
                </Link>
              </AnimatedBackground>
            </div>
          )}

          {/* Right End Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {!email ? (
              <>
                <Link prefetch href="/login" className="px-3.5 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition">
                  Sign In
                </Link>
                <Link prefetch href="/signup" className="btn btn-brand rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02]">
                  Get Started
                </Link>
                <ThemeToggle />
                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] md:hidden rounded-xl"
                  aria-label="Toggle mobile menu"
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              <>
                {/* Requests & Moderator Updates Bell Icon */}
                <button
                  type="button"
                  onClick={() => setRequestsModalOpen(true)}
                  className="relative p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-all shadow-sm"
                  aria-label="My Requests & Moderator Updates"
                  title="My Requests & Moderator Updates"
                >
                  <Bell size={18} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {unreadNotifs}
                    </span>
                  )}
                </button>

                <ThemeToggle />
                <UserMenu email={email} displayName={displayName} avatarUrl={avatarUrl} />
              </>
            )}
          </div>
        </div>

        {/* Mobile Drawer (Clean & Minimal) */}
        {mobileMenuOpen && !email && (
          <div className="border-b border-[var(--border)] bg-[var(--background)] px-5 pb-6 pt-4 md:hidden shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col space-y-2">
              <Link 
                href="/#notes" 
                onClick={() => setMobileMenuOpen(false)} 
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition"
              >
                Features
              </Link>
              <Link 
                href="/#resources" 
                onClick={() => setMobileMenuOpen(false)} 
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition"
              >
                Resources
              </Link>
              <Link 
                href="/about" 
                onClick={() => setMobileMenuOpen(false)} 
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition"
              >
                About IB Nexus
              </Link>
              <Link 
                href="/contact" 
                onClick={() => setMobileMenuOpen(false)} 
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition"
              >
                Contact
              </Link>
              <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
                <Link 
                  href="/login" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-center border border-[var(--border)] hover:bg-[var(--surface)] transition"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="btn btn-brand rounded-xl px-3.5 py-2.5 text-sm font-semibold text-center shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Global Notifications and Review Modal for Logged In Users */}
      {email && (
        <>
          <UserNotificationBanner onOpenRequestsModal={() => setRequestsModalOpen(true)} />
          <UserRequestsModal
            open={requestsModalOpen}
            onClose={() => setRequestsModalOpen(false)}
            onMarkAllRead={() => setUnreadNotifs(0)}
          />
        </>
      )}
    </>
  );
}
