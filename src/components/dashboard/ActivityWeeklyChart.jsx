"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActivityWeeklyChart({ days = [], totalTimeStr = "0 hrs" }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // If no days passed, provide the 7 days of the week as baseline
  const chartDays = days.length > 0 ? days : [
    { label: "M", dateStr: "Mon", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "T", dateStr: "Tue", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "W", dateStr: "Wed", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "T", dateStr: "Thu", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "F", dateStr: "Fri", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "S", dateStr: "Sat", isToday: false, actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
    { label: "S", dateStr: "Sun", isToday: true,  actionCount: 0, durationMinutes: 0, heightPercent: 8, breakdown: "No activity" },
  ];

  return (
    <div suppressHydrationWarning className="relative pt-2">
      {/* Chart Bars */}
      <div suppressHydrationWarning className="flex items-end justify-between gap-2 sm:gap-3" style={{ height: 120 }}>
        {chartDays.map((d, i) => {
          const hasActivity = d.actionCount > 0;
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-2 group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on Hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: -4, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-12 z-30 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-strong)] text-[11px] font-bold shadow-xl pointer-events-none text-[var(--foreground)]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--accent)] font-black">{d.dateStr}:</span>
                      <span>
                        {hasActivity
                          ? `${d.actionCount} ${d.actionCount === 1 ? 'action' : 'actions'} • ${d.durationMinutes > 0 ? `${d.durationMinutes}m` : '< 5m'}`
                          : 'No study activity'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bar Container */}
              <div className="relative w-full h-[85px] flex items-end justify-center rounded-lg bg-[var(--surface)]/50 p-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(10, Math.min(100, d.heightPercent))}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                  className={`w-full rounded-md transition-all duration-300 ${
                    hasActivity
                      ? d.isToday
                        ? "bg-gradient-to-t from-[var(--accent)] to-indigo-500 shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                        : "bg-gradient-to-t from-[var(--info)] to-[var(--accent)]/80 group-hover:from-[var(--accent)] group-hover:to-indigo-500"
                      : "bg-[var(--border)]/40 group-hover:bg-[var(--border)]/70"
                  }`}
                />
              </div>

              {/* Day Label with Today Pill */}
              <div className="flex flex-col items-center">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    d.isToday
                      ? "text-[var(--accent)] font-black"
                      : hasActivity
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {d.label}
                </span>
                {d.isToday && (
                  <span className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
