"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  BookOpen, BrainCircuit, CalendarDays, FolderOpen, 
  LayoutDashboard, Menu, MessageCircle, Settings, 
  Users, X, ShieldAlert, ChevronLeft, ChevronRight, 
  Sun, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import MultiAccountSwitcher from "./MultiAccountSwitcher";

const GROUPS = [
  {
    name: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, color: "var(--accent)" },
      { label: "Notes", href: "/dashboard/notes", icon: BookOpen, color: "var(--info)" },
      { label: "Flashcards", href: "/dashboard/flashcards", icon: BrainCircuit, color: "var(--ai)" },
      { label: "Planner", href: "/dashboard/planner", icon: CalendarDays, color: "var(--accent)" },
      { label: "Resources", href: "/dashboard/resources", icon: FolderOpen, color: "var(--warning)" },
    ]
  },
  {
    name: "Connect",
    items: [
      { label: "Community", href: "/dashboard/community", icon: Users, color: "var(--success)" },
      { label: "Nexus AI", href: "/dashboard/ai", icon: MessageCircle, color: "var(--ai)" },
    ]
  }
];

const NavItem = ({ label, href, icon: Icon, color = "var(--accent)", isActive, isCollapsed, onNavigate }) => {
  return (
    <div className="relative group">
      <Link 
        prefetch 
        href={href} 
        onClick={onNavigate} 
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-150 outline-none interactive-press ${
          isActive 
            ? "text-[var(--sidebar-active-text)]" 
            : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-hover-bg)]"
        }`}
      >
        {/* Subtle active background */}
        {isActive && (
           <motion.div 
           layoutId="sidebar-active-bg" 
           className="absolute inset-0 rounded-xl bg-[var(--sidebar-active-bg)]" 
           transition={{ type: "spring", stiffness: 300, damping: 30 }}
         />
        )}
        


        {/* Animated line indicator */}
        {isActive && (
          <motion.div 
            layoutId="sidebar-active-indicator" 
            className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full shadow-lg"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        
        <div className="relative z-10 flex items-center justify-center w-5 h-5 shrink-0">
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="transition-all duration-150" style={{ color: isActive ? color : undefined }} />
        </div>
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="relative z-10 whitespace-nowrap overflow-hidden tracking-wide"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-lg translate-x-[-4px] group-hover:translate-x-0">
          {label}
        </div>
      )}
    </div>
  );
};

export default function DashboardSidebar({ profile }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const path = usePathname();
  
  const isAdmin = profile?.is_admin === true;
  const groupsToRender = isAdmin
    ? [
        ...GROUPS,
        {
          name: "Admin",
          items: [
            { label: "Admin Control", href: "/dashboard/admin", icon: ShieldAlert, color: "#f43f5e" }
          ]
        }
      ]
    : GROUPS;

  // Prefetch
  useEffect(() => {
    const prefetch = () => {
      groupsToRender.flatMap(g => g.items).forEach(i => router.prefetch(i.href));
      router.prefetch("/settings");
    };
    const idle = window.requestIdleCallback?.(prefetch, { timeout: 250 }) ?? window.setTimeout(prefetch, 0);
    return () => window.cancelIdleCallback?.(idle) ?? window.clearTimeout(idle);
  }, [router, groupsToRender]);

  // Sync collapsed state with body class for main content margin
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [isCollapsed]);
  
  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        aria-label="Open workspace navigation" 
        onClick={() => setIsMobileOpen(true)} 
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] md:hidden hover:scale-105 transition-transform"
      >
        <Menu size={24} />
      </button>

      {/* Desktop Sidebar (Floating Rail Style) */}
      <motion.aside 
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        className="dashboard-sidebar fixed bottom-0 left-0 top-[68px] z-[45] hidden md:flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        {/* Floating Edge Collapse Toggle */}
        <div className="absolute -right-[14px] top-8 z-50 flex items-center justify-center w-8 h-8">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="group relative flex items-center justify-center w-[26px] h-[26px] bg-[var(--card)] border border-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_0_12px_var(--accent-soft)] transition-all duration-300 outline-none before:absolute before:inset-[-12px] before:content-['']"
            aria-label={isCollapsed ? "Open navigation" : "Collapse navigation"}
          >
            {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-0.5" /> : <ChevronLeft size={14} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-x-0.5" />}
            
            {/* Tooltip */}
            <span className="absolute left-[calc(100%+16px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[var(--foreground)] text-[var(--background)] text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg pointer-events-none">
              {isCollapsed ? "Open navigation" : "Collapse navigation"}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar py-6 px-4 flex flex-col gap-8">
          
          {groupsToRender.map((group, i) => (
            <div key={group.name} className="flex flex-col gap-1.5">
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-4 mb-1"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] opacity-60">
                      {group.name}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {group.items.map(item => {
                const isActive = item.href === '/dashboard' 
                  ? path === '/dashboard' 
                  : path.startsWith(item.href);
                  
                return (
                  <NavItem 
                    key={item.href}
                    {...item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                  />
                );
              })}
            </div>
          ))}

          {/* Other / Personal Section */}
          <div className="flex flex-col gap-1.5 mt-2">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 mb-1"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] opacity-60">
                    Other
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <NavItem 
              label="Settings"
              href="/settings"
              icon={Settings}
              isActive={path === "/settings" || path.startsWith("/settings/")}
              isCollapsed={isCollapsed}
            />
            
            {/* Theme Toggle in Sidebar */}
            <div className="relative group">
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-300 outline-none w-full text-left"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="absolute inset-0 rounded-xl bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                {/* Fixed the icon size to match NavItem precisely */}
                <span className="relative z-10 flex items-center justify-center w-5 h-5 shrink-0">
                  {theme === 'dark' ? <Sun size={18} className="group-hover:text-amber-400 transition-colors" /> : <Moon size={18} className="group-hover:text-indigo-400 transition-colors" />}
                </span>
                
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="relative z-10 whitespace-nowrap overflow-hidden tracking-wide"
                    >
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-lg translate-x-[-4px] group-hover:translate-x-0">
                  {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Personal/Settings Section */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)] relative shrink-0">
          {/* Account Profile Block */}
          {profile && (
            <div className="pt-3 border-t border-[var(--border)]">
              <MultiAccountSwitcher profile={profile} isCollapsed={isCollapsed} />
            </div>
          )}
        </div>
      </motion.aside>
      
      {/* Mobile Drawer Navigation (Bottom-Up Sheet) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex items-end">
            <motion.button 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              aria-label="Close navigation" 
              onClick={() => setIsMobileOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" 
            />
            <motion.aside 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", bounce: 0, duration: 0.4 }} 
              className="relative w-full bg-[var(--card)] rounded-t-[2rem] flex flex-col max-h-[85vh] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-[var(--border)]"
            >
              <div className="flex justify-center p-3">
                <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
              </div>
              <div className="px-6 pb-2 flex justify-between items-center">
                <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">IB Nexus Workspace</span>
                <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 mt-4 hide-scrollbar">
                {groupsToRender.map(group => (
                  <div key={group.name}>
                    <p className="px-4 mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] opacity-60">{group.name}</p>
                    <div className="bg-[var(--surface)] rounded-[1.25rem] border border-[var(--border)] overflow-hidden">
                      {group.items.map((item, idx) => {
                        const isActive = item.href === '/dashboard' 
                          ? path === '/dashboard' 
                          : path.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center gap-3 px-5 py-4 text-[15px] font-medium transition-colors ${
                              isActive ? "text-[var(--accent)] bg-[var(--accent)]/5" : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                            } ${idx !== group.items.length - 1 ? "border-b border-[var(--border)]/50" : ""}`}
                          >
                            <item.icon size={20} className={isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Personal Section Mobile */}
                <div>
                  <p className="px-4 mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] opacity-60">Other</p>
                  <div className="bg-[var(--surface)] rounded-[1.25rem] border border-[var(--border)] overflow-hidden">
                    <Link
                      href="/settings"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-5 py-4 text-[15px] font-medium border-b border-[var(--border)]/50 transition-colors ${path === '/settings' || path.startsWith('/settings/') ? "text-[var(--accent)] bg-[var(--accent)]/5" : "text-[var(--foreground)]"}`}
                    >
                      <Settings size={20} className={path === '/settings' || path.startsWith('/settings/') ? "text-[var(--accent)]" : "text-[var(--muted)]"} /> Settings
                    </Link>
                    <button
                      onClick={() => {
                        setTheme(theme === "dark" ? "light" : "dark");
                        // Don't close mobile menu when toggling theme so they can see the change!
                      }}
                      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                      className="w-full flex items-center gap-3 px-5 py-4 text-[15px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                    >
                      {theme === 'dark' ? <Sun size={20} className="text-[var(--muted)]" /> : <Moon size={20} className="text-[var(--muted)]" />} 
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Account Switcher Footer */}
              {profile && (
                <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-alt)]/30 mt-auto shrink-0">
                  <MultiAccountSwitcher profile={profile} isCollapsed={false} />
                </div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
