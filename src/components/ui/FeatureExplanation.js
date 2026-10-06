import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Target, ListTodo, Clock, TrendingUp, Sparkles, CalendarDays, ArrowRight, MousePointerClick, BrainCircuit } from "lucide-react";

const DICTIONARY = {
  goal: {
    name: "GOALS",
    desc: "What you're working toward, such as an exam, IA, or major academic target.",
    why: "Keeps your study work focused on an outcome instead of isolated tasks.",
    connects: "Your tasks and deadlines help turn this goal into a realistic study plan.",
    icon: <Target className="w-4 h-4 text-[var(--accent)]" />,
    flow: ["Goal", "Tasks", "Sessions", "Progress"]
  },
  task: {
    name: "STUDY TASK",
    desc: "What you need to get done, such as revising a topic or completing an assignment.",
    why: "Breaks a large academic goal into manageable pieces.",
    connects: "Tasks become study sessions in your daily plan.",
    icon: <ListTodo className="w-4 h-4 text-[var(--accent)]" />,
    flow: ["Goal", "Tasks", "Sessions", "Progress"]
  },
  session: {
    name: "STUDY SESSION",
    desc: "The time you set aside to actually work on something.",
    why: "Turns an intention into a specific time you can act on.",
    connects: "A task can become a session, and completed sessions contribute to your progress.",
    icon: <Clock className="w-4 h-4 text-[var(--accent)]" />,
    flow: ["Goal", "Tasks", "Sessions", "Progress"]
  },
  progress: {
    name: "PROGRESS",
    desc: "A measure of the study sessions you have successfully completed today.",
    why: "Gives you a clear sense of achievement and momentum.",
    connects: "Completing sessions drives your daily progress and moves you closer to your goals.",
    icon: <TrendingUp className="w-4 h-4 text-[var(--accent)]" />,
    flow: ["Goal", "Tasks", "Sessions", "Progress"]
  },
  deadline: {
    name: "DEADLINE",
    desc: "A date or time when something must be finished.",
    why: "Helps IB Nexus decide what needs attention first.",
    connects: "Deadlines influence your daily plan and what the Planner recommends next.",
    icon: <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
  },
  nba: {
    name: "WHAT TO DO NEXT",
    desc: "The most useful study action for you right now.",
    why: "Removes the need to decide what to study when you're unsure.",
    connects: "It uses your tasks, deadlines, study plan and relevant learning activity.",
    icon: <MousePointerClick className="w-4 h-4 text-[var(--accent)]" />
  },
  build: {
    name: "PLAN MY DAY",
    desc: "Creates a realistic study schedule from the work you need to complete.",
    why: "Saves you from manually deciding what to study and when.",
    connects: "It uses your tasks, deadlines and available time to build today's sessions.",
    icon: <Sparkles className="w-4 h-4 text-[var(--accent)]" />
  },
  ai: {
    name: "AI PLANNER",
    desc: "Tell IB Nexus what you need in normal language and let it help organize your study plan.",
    why: "You can describe what you want instead of manually adjusting everything.",
    connects: "AI works with your existing Planner data rather than creating a separate planning system.",
    icon: <BrainCircuit className="w-4 h-4 text-[var(--accent)]" />
  }
};

export function FeatureExplanation({ featureKey, children, iconOnly = false, position = "top" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  const content = DICTIONARY[featureKey];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!content) return <>{children}</>;

  // Positions
  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
  };

  return (
    <div 
      className={`relative inline-flex items-center ${iconOnly ? "" : "cursor-help"}`}
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        // Only toggle on click if it's the icon trigger, or if children themselves don't have interactive elements
        // For safety, let's just toggle state if it's mobile/tap
        e.stopPropagation();
        setOpen(v => !v);
      }}
      tabIndex={0}
      aria-expanded={open}
    >
      {iconOnly ? (
        <button 
          type="button"
          className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1 -ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          aria-label={`Explain ${content.name}`}
        >
          <Info className="w-4 h-4" />
        </button>
      ) : (
        children
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 5 : position === "bottom" ? -5 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === "top" ? 5 : position === "bottom" ? -5 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 w-72 sm:w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden pointer-events-auto ${posClasses[position]}`}
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            role="tooltip"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]/50">
              {content.icon}
              <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--foreground)] m-0">{content.name}</h4>
            </div>
            
            {/* Body */}
            <div className="p-4 space-y-4 text-left">
              <p className="text-sm font-medium text-[var(--foreground)] leading-relaxed m-0">
                {content.desc}
              </p>
              
              <div className="space-y-3 pt-3 border-t border-[var(--border)]/50">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Why it helps</h5>
                  <p className="text-xs text-[var(--foreground)]/80 leading-relaxed m-0">{content.why}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">How it connects</h5>
                  <p className="text-xs text-[var(--foreground)]/80 leading-relaxed m-0">{content.connects}</p>
                </div>
              </div>

              {content.flow && (
                <div className="pt-3 border-t border-[var(--border)]/50">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">How it fits</h5>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    {content.flow.map((step, idx) => (
                      <React.Fragment key={step}>
                        <span className={step.toUpperCase() === content.name ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                          {step}
                        </span>
                        {idx < content.flow.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-[var(--border)]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
