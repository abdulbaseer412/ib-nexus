"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { destroyClient } from "@/utils/supabase-browser";
import { signOutAction } from "@/app/auth/actions";
import { Avatar } from "@/components/ui";

export default function UserMenu({ displayName, email, avatarUrl }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const closeMenu = useCallback(() => setOpen(false), []);

  // Close menu automatically whenever route pathname changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, closeMenu]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    closeMenu();
    try {
      await signOutAction().catch(() => {});
      await destroyClient().catch(() => {});
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("[UserMenu] Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  const menuItems = [
    { label: "Study Hub", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${displayName}`}
        className={`group flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all duration-200 shadow-sm ${
          open 
            ? "border-[var(--border-strong)] bg-[var(--elevated)]" 
            : "border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]"
        }`}
      >
        <Avatar 
          url={avatarUrl} 
          name={displayName} 
          className="w-7 h-7 text-[10px] ring-2 ring-[var(--background)] shadow-sm" 
        />
        <span className="hidden sm:inline max-w-[120px] truncate text-[13px] font-semibold text-[var(--foreground)]">
          {displayName?.split(' ')[0]}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${open ? "rotate-180 text-primary" : "group-hover:text-primary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-[1.25rem] border border-[var(--border-strong)] bg-[var(--dropdown)]/95 backdrop-blur-xl shadow-xl transition-all duration-200 ease-out z-50 animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-4 py-3.5 border-b border-[var(--divider)]">
            <p className="text-[13px] font-bold text-[var(--foreground)] truncate">
              {displayName}
            </p>
            {email && (
              <p className="text-[11px] font-medium text-muted truncate mt-0.5 opacity-80">
                {email}
              </p>
            )}
          </div>

          <div className="p-1.5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                role="menuitem"
                onClick={closeMenu}
                className="block px-3 py-2 rounded-lg text-[13px] font-medium text-secondary hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                window.dispatchEvent(new CustomEvent("nexus:open-scholar-intro"));
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-secondary hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>Scholar Orientation</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--accent)] border border-[var(--border)]">Tour</span>
            </button>
          </div>

          <div className="p-1.5 border-t border-[var(--divider)]">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-danger hover:bg-danger-soft hover:text-danger-strong transition-colors disabled:opacity-50 cursor-pointer"
            >
              {signingOut ? "Signing out…" : "Log Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

