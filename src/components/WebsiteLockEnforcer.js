"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";

/**
 * WebsiteLockEnforcer
 * 
 * Global, real-time security guardian running across every page of IB Nexus.
 * Listens via Supabase WebSockets (Realtime Postgres Changes + Broadcast)
 * and a high-frequency fallback heartbeat (every 2.5s).
 * 
 * The moment the website is locked, it INSTANTLY logs out and kicks out
 * any unauthorized user or regular admin, wiping client storage, terminating
 * server sessions, and redirecting them immediately to the 3D Book Lock Screen.
 */
export default function WebsiteLockEnforcer() {
  const pathname = usePathname();
  const isKickingOutRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const executeImmediateLockout = async () => {
      if (isKickingOutRef.current) return;
      isKickingOutRef.current = true;

      try {
        // 1. Wipe client storage
        if (typeof window !== "undefined") {
          try {
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith("sb-") || key.startsWith("supabase")) {
                localStorage.removeItem(key);
              }
            });
            Object.keys(sessionStorage).forEach((key) => {
              if (key.startsWith("sb-") || key.startsWith("supabase")) {
                sessionStorage.removeItem(key);
              }
            });
          } catch {
            // Storage access blocked or restricted
          }
        }

        // 2. Local client sign out
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});

        // 3. Server-side cookie destruction
        await fetch("/api/auth/force-logout", {
          method: "POST",
          headers: { "Cache-Control": "no-store" },
        }).catch(() => {});
      } finally {
        // 4. Instant hard redirect to root lock screen
        if (pathname === "/") {
          // If already on root, reload so the locked book experience mounts
          window.location.reload();
        } else {
          window.location.replace("/");
        }
      }
    };

    const verifyLockStatus = async () => {
      if (isKickingOutRef.current || !isMounted) return;

      try {
        const res = await fetch("/api/auth/lock-status", {
          cache: "no-store",
          headers: { "x-lock-heartbeat": "1" },
        });

        if (!res.ok) return;
        const data = await res.json();

        if (data.isLocked) {
          // If the user has Super Admin skeleton key or is on the approved allowlist, allow access
          if (data.isSuperAdmin || data.isApproved) {
            return;
          }

          // If the user is unapproved or has an active session, kick out immediately!
          if (data.isAuthenticated || pathname !== "/") {
            await executeImmediateLockout();
          }
        }
      } catch (err) {
        // Network failure; do not kick out on transient glitch
      }
    };

    // 1. Realtime Supabase Channel Subscription (instant < 200ms latency)
    const channel = supabase
      .channel("website-lock-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "website_settings" },
        (payload) => {
          if (payload.new && payload.new.is_locked) {
            verifyLockStatus();
          }
        }
      )
      .on("broadcast", { event: "LOCK_UPDATED" }, (payload) => {
        if (payload?.payload?.is_locked) {
          verifyLockStatus();
        }
      })
      .subscribe();

    // 2. High-frequency heartbeat poll (every 2.5s) for bulletproof reliability
    const intervalId = setInterval(verifyLockStatus, 2500);

    // 3. Check immediately on window focus and visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyLockStatus();
      }
    };
    window.addEventListener("focus", verifyLockStatus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", verifyLockStatus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [pathname]);

  return null;
}
