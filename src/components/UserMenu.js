"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase-browser";
import { Avatar } from "@/components/ui";

export default function UserMenu({ displayName, email, avatarUrl }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  const closeMenu = useCallback(() => setOpen(false), []);

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
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-secondary hover:bg-hover transition-colors"
      >
        <Avatar 
          url={avatarUrl} 
          name={displayName} 
          className="w-7 h-7 text-xs" 
        />
        <span className="hidden sm:inline max-w-[140px] truncate font-medium">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        role="menu"
        aria-label="Account menu"
        className={`bg-dropdown absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-subtle backdrop-blur-xl shadow-float transition-all duration-200 ease-out ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="px-4 py-3 border-b border-divider">
          <p className="text-sm font-semibold text-primary truncate">
            {displayName}
          </p>
          {email && (
            <p className="text-xs text-muted truncate mt-0.5">
              {email}
            </p>
          )}
        </div>

        <div className="py-1.5">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              role="menuitem"
              onClick={closeMenu}
              className="block px-4 py-2 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="py-1.5 border-t border-divider">
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Log Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
