"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, BookOpen, BrainCircuit, CalendarDays, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { STATIC_PAGES, STATIC_ACTIONS, performFuzzyMatch } from "@/lib/search-registry";
import { useTheme } from "@/components/ThemeProvider";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getInitialResults = () => {
    // Show some top static actions as default "Recent" or "Suggested"
    const topPages = STATIC_PAGES.slice(0, 4);
    const topActions = STATIC_ACTIONS.slice(0, 3);
    return [
      { group: "Pages", items: topPages },
      { group: "Quick Actions", items: topActions },
    ];
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setDebouncedQuery("");
      setResults(getInitialResults());
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(getInitialResults());
      setSelectedIndex(0);
      return;
    }

    startTransition(async () => {
      const q = debouncedQuery.toLowerCase();
      
      // 1. Static matches
      const matchedPages = STATIC_PAGES.filter(p => performFuzzyMatch(q, p));
      const matchedActions = STATIC_ACTIONS.filter(a => performFuzzyMatch(q, a));

      // 2. Dynamic DB matches
      let dbResults = [];
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          dbResults = data.results || [];
        }
      } catch (err) {
        console.error("Search fetch failed", err);
      }

      // Grouping
      const newGroups = [];
      if (matchedPages.length > 0) newGroups.push({ group: "Pages", items: matchedPages });
      if (matchedActions.length > 0) newGroups.push({ group: "Actions", items: matchedActions });
      if (dbResults.length > 0) newGroups.push({ group: "Content", items: dbResults });

      setResults(newGroups);
      setSelectedIndex(0);
    });
  }, [debouncedQuery]);

  const flattenedResults = results.flatMap(g => g.items);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flattenedResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flattenedResults.length) % flattenedResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flattenedResults[selectedIndex]) {
        executeAction(flattenedResults[selectedIndex]);
      }
    }
  };

  const executeAction = (item) => {
    setIsOpen(false);
    if (item.href) {
      router.push(item.href);
    } else if (item.clientAction) {
      switch (item.clientAction) {
        case "toggle-dark-mode":
          setTheme("dark");
          break;
        case "toggle-light-mode":
          setTheme("light");
          break;
        case "sign-out":
          // Sign out action
          router.push("/login");
          break;
      }
    }
  };

  // Icon mapping for dynamic results
  const renderIcon = (item) => {
    if (item.icon && typeof item.icon === 'object') {
      const IconCmp = item.icon;
      return <IconCmp size={18} className="text-[var(--accent)]" />;
    }
    switch (item.icon) {
      case "BookOpen": return <BookOpen size={18} className="text-[var(--accent)]" />;
      case "BrainCircuit": return <BrainCircuit size={18} className="text-[var(--ai)]" />;
      case "CalendarDays": return <CalendarDays size={18} className="text-[var(--info)]" />;
      case "FolderOpen": return <FolderOpen size={18} className="text-[var(--warning)]" />;
      default: return <Search size={18} className="text-[var(--muted)]" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--card)] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-[var(--border-strong)] flex flex-col mx-4"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 bg-[var(--surface-alt)]">
              {isPending ? (
                <Loader2 size={20} className="text-[var(--accent)] animate-spin shrink-0" />
              ) : (
                <Search size={20} className="text-[var(--accent)] shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search everything in IB Nexus..."
                className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] text-lg font-medium outline-none"
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-[var(--muted)] border border-[var(--border)] px-2 py-1 rounded-md bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                ESC
              </button>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
              {flattenedResults.length === 0 && !isPending && (
                <div className="py-14 text-center">
                  <p className="text-[var(--foreground)] font-semibold text-lg">No exact match found.</p>
                  <p className="text-[var(--muted)] text-sm mt-1 mb-4">Try adjusting your search terms.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <button onClick={() => executeAction({href: '/dashboard/notes'})} className="btn btn-secondary px-4 py-2 text-sm bg-[var(--surface)]">Open Notes</button>
                    <button onClick={() => executeAction({href: '/dashboard/resources'})} className="btn btn-secondary px-4 py-2 text-sm bg-[var(--surface)]">Browse Resources</button>
                  </div>
                </div>
              )}

              {results.map((group, groupIndex) => (
                <div key={group.group} className="mb-4 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)] opacity-80">
                    {group.group}
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => {
                      const absoluteIndex = results
                        .slice(0, groupIndex)
                        .reduce((acc, g) => acc + g.items.length, 0) + group.items.indexOf(item);
                      const isSelected = absoluteIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                          onClick={() => executeAction(item)}
                          className={`flex items-center justify-between w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${
                            isSelected 
                              ? "bg-[var(--accent)]/10 border-l-[3px] border-[var(--accent)] pl-[9px]" 
                              : "bg-transparent border-l-[3px] border-transparent hover:bg-[var(--surface)]"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${isSelected ? "bg-[var(--accent)]/20" : "bg-[var(--surface-alt)]"}`}>
                              {renderIcon(item)}
                            </div>
                            <div>
                              <p className={`text-[14px] font-bold ${isSelected ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                                {item.title}
                              </p>
                              {(item.subtitle || item.type) && (
                                <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">
                                  {item.subtitle || item.type}
                                </p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[var(--accent)] text-xs font-semibold mr-2 animate-in fade-in">
                              Enter ↵
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
