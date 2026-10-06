"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, BellRing, Sparkles, X,
  ArrowRight, ShieldCheck, Clock, MessageSquare, ExternalLink
} from "lucide-react";
import Link from "next/link";
import {
  fetchUserNotificationsAction,
  dismissUserNotificationAction,
  markAllNotificationsReadAction
} from "@/app/dashboard/admin/actions";

export default function UserNotificationBanner({ onOpenRequestsModal }) {
  const [notifications, setNotifications] = useState([]);
  const [activeNotif, setActiveNotif] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchUserNotificationsAction();
      if (res.success && Array.isArray(res.notifications)) {
        const undismissed = res.notifications.filter(n => !n.is_popup_dismissed);
        setNotifications(undismissed);
        if (undismissed.length > 0) {
          setActiveNotif(undismissed[0]);
        }
      }
    } catch (e) {
      // Non-critical background fetch
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Subtle polling every 45s for live updates while user is on site
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleDismiss = async (id) => {
    setActiveNotif(null);
    try {
      await dismissUserNotificationAction(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Show next notification if multiple exist
      const remaining = notifications.filter(n => n.id !== id);
      if (remaining.length > 0) {
        setTimeout(() => setActiveNotif(remaining[0]), 600);
      }
    } catch (e) {
      // Ignore
    }
  };

  if (!activeNotif) return null;

  const isApproved = activeNotif.type === "approved" || activeNotif.type === "success";
  const isRejected = activeNotif.type === "rejected" || activeNotif.type === "error";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full mx-4 sm:mx-0 shadow-2xl rounded-3xl overflow-hidden border backdrop-blur-xl pointer-events-auto"
        style={{
          backgroundColor: isApproved
            ? "color-mix(in srgb, var(--card) 92%, #10b981 8%)"
            : isRejected
            ? "color-mix(in srgb, var(--card) 92%, #f43f5e 8%)"
            : "color-mix(in srgb, var(--card) 94%, var(--accent) 6%)",
          borderColor: isApproved
            ? "rgba(16, 185, 129, 0.3)"
            : isRejected
            ? "rgba(244, 63, 94, 0.3)"
            : "var(--border)",
        }}
      >
        {/* Accent top stripe */}
        <div
          className={`h-1 w-full ${
            isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-[var(--accent)]"
          }`}
        />

        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isApproved
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                    : isRejected
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                    : "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25"
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                ) : isRejected ? (
                  <XCircle size={18} strokeWidth={2.5} />
                ) : (
                  <BellRing size={18} strokeWidth={2.5} />
                )}
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
                  Moderation Update
                </span>
                <h4 className="text-sm font-bold text-[var(--foreground)] leading-tight">
                  {activeNotif.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(activeNotif.id)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-xl hover:bg-[var(--surface)] transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-0.5">
            {activeNotif.message}
          </p>

          <div className="flex items-center justify-between pt-1 text-xs">
            {onOpenRequestsModal ? (
              <button
                type="button"
                onClick={() => {
                  handleDismiss(activeNotif.id);
                  onOpenRequestsModal();
                }}
                className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] underline decoration-dotted"
              >
                View all requests
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              {activeNotif.target_url && (
                <Link
                  href={activeNotif.target_url}
                  onClick={() => handleDismiss(activeNotif.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-transform active:scale-95 shadow-sm ${
                    isApproved
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : isRejected
                      ? "bg-rose-600 hover:bg-rose-500"
                      : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                  }`}
                >
                  <span>Open</span>
                  <ArrowRight size={13} />
                </Link>
              )}
              <button
                onClick={() => handleDismiss(activeNotif.id)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
