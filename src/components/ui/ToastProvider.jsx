"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X, Sparkles } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return fallback that dispatches event if used outside provider
    return {
      showToast: (message, type = "success", duration = 4000) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ib-nexus-toast", {
              detail: { message, type, duration },
            })
          );
        }
      },
      toast: {
        success: (msg, d) => window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message: msg, type: "success", duration: d } })),
        error: (msg, d) => window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message: msg, type: "error", duration: d } })),
        info: (msg, d) => window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message: msg, type: "info", duration: d } })),
        warning: (msg, d) => window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message: msg, type: "warning", duration: d } })),
      },
    };
  }
  return context;
}

// Global programmatic helper for any function/file
export const toast = {
  success: (message, duration = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message, type: "success", duration } }));
    }
  },
  error: (message, duration = 4500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message, type: "error", duration } }));
    }
  },
  info: (message, duration = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message, type: "info", duration } }));
    }
  },
  warning: (message, duration = 4500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ib-nexus-toast", { detail: { message, type: "warning", duration } }));
    }
  },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    if (!message) return;
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    const newToast = { id, message, type, duration, createdAt: Date.now() };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep maximum 5 concurrent toasts
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Intercept window.alert and listen to custom toast events
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Listen to ib-nexus-toast custom events
    const handleCustomToast = (e) => {
      if (e?.detail?.message) {
        addToast(e.detail.message, e.detail.type || "success", e.detail.duration || 4000);
      }
    };
    window.addEventListener("ib-nexus-toast", handleCustomToast);

    // 2. Safely intercept window.alert so no button in the site ever opens an external dialog
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = typeof msg === "string" ? msg : String(msg || "");
      if (text.toLowerCase().includes("fail") || text.toLowerCase().includes("error") || text.toLowerCase().includes("cannot") || text.toLowerCase().includes("restricted")) {
        addToast(text, "error", 5000);
      } else if (text.toLowerCase().includes("success") || text.toLowerCase().includes("saved") || text.toLowerCase().includes("done")) {
        addToast(text, "success", 4000);
      } else {
        addToast(text, "info", 4500);
      }
    };

    return () => {
      window.removeEventListener("ib-nexus-toast", handleCustomToast);
      window.alert = originalAlert;
    };
  }, [addToast]);

  const value = {
    showToast: addToast,
    toast: {
      success: (msg, d) => addToast(msg, "success", d),
      error: (msg, d) => addToast(msg, "error", d),
      info: (msg, d) => addToast(msg, "info", d),
      warning: (msg, d) => addToast(msg, "warning", d),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating internal Toast Container */}
      <aside 
        aria-label="Notifications"
        className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[99999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-3 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || progress <= 0) return;

    const interval = 25; // 25ms tick
    const decrement = (interval / (toast.duration || 4000)) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - decrement));
    }, interval);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.duration, isPaused, progress <= 0]);

  // Dismiss outside of render/state-updater to avoid cross-component setState during render
  useEffect(() => {
    if (progress <= 0) onDismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress <= 0]);

  const CONFIGS = {
    success: {
      icon: CheckCircle2,
      title: "Success",
      borderGlow: "border-emerald-500/40 shadow-[0_12px_36px_rgba(16,185,129,0.22)]",
      badgeGradient: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
      accentText: "text-emerald-400",
      bgGradient: "bg-gradient-to-r from-emerald-950/90 via-zinc-950/95 to-zinc-950/95",
      progressBar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    },
    error: {
      icon: AlertTriangle,
      title: "Action Error",
      borderGlow: "border-rose-500/40 shadow-[0_12px_36px_rgba(244,63,94,0.22)]",
      badgeGradient: "from-rose-500 to-pink-600 shadow-rose-500/30",
      accentText: "text-rose-400",
      bgGradient: "bg-gradient-to-r from-rose-950/90 via-zinc-950/95 to-zinc-950/95",
      progressBar: "bg-gradient-to-r from-rose-500 to-pink-400",
    },
    info: {
      icon: Sparkles,
      title: "Notification",
      borderGlow: "border-indigo-500/40 shadow-[0_12px_36px_rgba(99,102,241,0.22)]",
      badgeGradient: "from-indigo-500 to-purple-600 shadow-indigo-500/30",
      accentText: "text-indigo-400",
      bgGradient: "bg-gradient-to-r from-indigo-950/90 via-zinc-950/95 to-zinc-950/95",
      progressBar: "bg-gradient-to-r from-indigo-500 to-purple-400",
    },
    warning: {
      icon: AlertCircle,
      title: "Attention",
      borderGlow: "border-amber-500/40 shadow-[0_12px_36px_rgba(245,158,11,0.22)]",
      badgeGradient: "from-amber-500 to-orange-600 shadow-amber-500/30",
      accentText: "text-amber-400",
      bgGradient: "bg-gradient-to-r from-amber-950/90 via-zinc-950/95 to-zinc-950/95",
      progressBar: "bg-gradient-to-r from-amber-500 to-orange-400",
    },
  };
  const config = CONFIGS[toast.type] || CONFIGS.info;

  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -16, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-2xl p-4 transition-all duration-300 ${config.bgGradient} ${config.borderGlow}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.badgeGradient} flex items-center justify-center text-white shrink-0 shadow-lg`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-[11px] font-black uppercase tracking-wider ${config.accentText}`}>
              {config.title}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">just now</span>
          </div>
          <p className="text-sm font-semibold text-zinc-100 leading-snug break-words">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>

      {/* Subtle Auto-Dismiss Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div
          className={`h-full transition-all duration-75 ${config.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
