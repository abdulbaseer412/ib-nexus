"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, Box, UploadCloud, Database, Cog, CheckCircle2, Inbox } from "lucide-react";

/**
 * NexusLoadingState
 * A unified, global loading component for IB Nexus.
 *
 * @param {string} state - "loading" | "processing" | "thinking" | "saving" | "uploading" | "generating" | "empty" | "error"
 * @param {string} message - The contextual message to display.
 * @param {function} onRetry - Optional retry handler for error states.
 * @param {boolean} fullHeight - Whether to take up the full height of the parent container.
 */
export default function NexusLoadingState({
  state = "loading",
  message = "Loading...",
  onRetry = null,
  fullHeight = true,
  className = ""
}) {
  const containerClass = `flex flex-col items-center justify-center w-full ${fullHeight ? "h-full min-h-[200px] flex-1" : "py-8"} ${className}`;

  // Icon mapping
  const getIcon = () => {
    switch (state) {
      case "error":
        return <AlertCircle size={32} className="text-[var(--danger)]" />;
      case "empty":
        return <Inbox size={32} className="text-white/40 dark:text-white/30" />;
      case "processing":
      case "analyzing":
        return <Database size={28} className="text-[var(--ai)]" />;
      case "saving":
        return <CheckCircle2 size={28} className="text-[var(--success)]" />;
      case "uploading":
        return <UploadCloud size={28} className="text-[var(--info)]" />;
      case "thinking":
      case "generating":
        return <BrainAnimation />;
      case "loading":
      default:
        return <Loader2 size={28} className="animate-spin text-[var(--accent)]" />;
    }
  };

  return (
    <div className={containerClass}>
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center max-w-sm text-center"
        >
          {/* Icon Area */}
          <div className="mb-4 flex items-center justify-center h-12">
            {getIcon()}
          </div>

          {/* Text Area */}
          <h3 className={`text-base font-medium mb-2 ${state === "error" ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
            {message}
          </h3>

          {/* Optional Subtext */}
          {state === "error" && onRetry && (
            <p className="text-sm text-[var(--foreground)] opacity-70 mb-5">
              An unexpected issue occurred. Please try again.
            </p>
          )}

          {/* Action Area */}
          {state === "error" && onRetry && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--background-lighter)] hover:bg-[var(--sidebar-hover-bg)] text-[var(--foreground)] text-sm font-medium rounded-xl border border-[var(--border)] transition-colors shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Custom AI Thinking Animation component
function BrainAnimation() {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <motion.div
        className="absolute inset-0 rounded-full bg-[var(--ai)] opacity-20"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute rounded-full bg-[var(--ai)] w-3 h-3 shadow-[0_0_15px_var(--ai)]"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
