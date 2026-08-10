"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Menu, X, BookOpen, GraduationCap, FileText
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

const subjectsHierarchy = [
  {
    title: "Diploma Programme (DP)",
    short: "DP",
    icon: GraduationCap,
    groups: [
      {
        name: "Studies in language and literature",
        subjects: [
          ["Language A: literature", "/subjects/dp/language-a-literature"],
          ["Language A: language and literature", "/subjects/dp/language-a-language-and-literature"],
          ["Literature and performance", "/subjects/dp/literature-and-performance"]
        ]
      },
      {
        name: "Language acquisition",
        subjects: [
          ["Classical languages", "/subjects/dp/classical-languages"],
          ["Language Ab initio", "/subjects/dp/language-ab-initio"],
          ["Language B", "/subjects/dp/language-b"]
        ]
      },
      {
        name: "Individuals and societies",
        subjects: [
          ["Business management", "/subjects/dp/business-management"],
          ["Digital society", "/subjects/dp/digital-society"],
          ["Economics", "/subjects/dp/economics"],
          ["Geography", "/subjects/dp/geography"],
          ["Global politics", "/subjects/dp/global-politics"],
          ["History", "/subjects/dp/history"],
          ["Philosophy", "/subjects/dp/philosophy"],
          ["Psychology", "/subjects/dp/psychology"],
          ["Social and cultural anthropology", "/subjects/dp/social-and-cultural-anthropology"],
          ["World religions", "/subjects/dp/world-religions"]
        ]
      },
      {
        name: "Sciences",
        subjects: [
          ["Biology", "/subjects/dp/biology"],
          ["Chemistry", "/subjects/dp/chemistry"],
          ["Computer science", "/subjects/dp/computer-science"],
          ["Design technology", "/subjects/dp/design-technology"],
          ["Environmental systems and societies", "/subjects/dp/environmental-systems-and-societies"],
          ["Physics", "/subjects/dp/physics"],
          ["Sports, exercise and health science", "/subjects/dp/sports-exercise-and-health-science"]
        ]
      },
      {
        name: "Mathematics",
        subjects: [
          ["Analysis and approaches", "/subjects/dp/mathematics-analysis-and-approaches"],
          ["Applications and interpretation", "/subjects/dp/mathematics-applications-and-interpretation"]
        ]
      },
      {
        name: "Arts",
        subjects: [
          ["Dance", "/subjects/dp/dance"],
          ["Film", "/subjects/dp/film"],
          ["Music", "/subjects/dp/music"],
          ["Theatre", "/subjects/dp/theatre"],
          ["Visual arts", "/subjects/dp/visual-arts"]
        ]
      },
      {
        name: "DP core",
        subjects: [
          ["Creativity, activity, service", "/subjects/dp/cas"],
          ["The extended essay", "/subjects/dp/ee"],
          ["Theory of knowledge", "/subjects/dp/tok"]
        ]
      }
    ]
  },
  {
    title: "Middle Years Programme (MYP)",
    short: "MYP",
    icon: BookOpen,
    groups: [
      { name: "Language and literature", subjects: [] },
      { name: "Language acquisition", subjects: [] },
      { name: "Individuals and societies", subjects: [] },
      { name: "Sciences", subjects: [] },
      { name: "Mathematics", subjects: [] },
      { name: "Arts", subjects: [] },
      { name: "Physical and health education", subjects: [] },
      { name: "Design", subjects: [] }
    ]
  }
];

export default function NavbarClient({ email, displayName, avatarUrl }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  
  // Desktop Menu States
  const [openMenu, setOpenMenu] = useState(null); // e.g., 'Subjects'
  const [activeProg, setActiveProg] = useState(null); // 'DP' or 'MYP'
  const [activeGroup, setActiveGroup] = useState(null); // e.g., 'Sciences'

  // Mobile Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProg, setMobileProg] = useState(null);
  const [mobileGroup, setMobileGroup] = useState(null);

  const navRef = useRef(null);
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const onPointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenMenu(null);
        setActiveProg(null);
        setActiveGroup(null);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const homeHref = email ? "/dashboard" : "/";

  // Desktop Hover Handlers
  const handleNavLeave = () => {
    setOpenMenu(null);
    setActiveProg(null);
    setActiveGroup(null);
  };

  const handleProgEnter = (progShort) => {
    setActiveProg(progShort);
    setActiveGroup(null);
  };

  const handleGroupEnter = (groupName) => {
    setActiveGroup(groupName);
  };

  // Mobile Accordion Handlers
  const toggleMobileProg = (progShort) => {
    if (mobileProg === progShort) {
      setMobileProg(null);
      setMobileGroup(null);
    } else {
      setMobileProg(progShort);
      setMobileGroup(null);
    }
  };

  const toggleMobileGroup = (groupName) => {
    setMobileGroup(mobileGroup === groupName ? null : groupName);
  };

  return (
    <nav
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled || mobileMenuOpen
          ? "border-b border-subtle bg-background/85 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-background/95 backdrop-blur-md"
      }`}
      onMouseLeave={handleNavLeave}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href={homeHref} className="flex shrink-0 items-center py-2 pr-4" aria-label="IB Nexus home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/horizontal-logo-transparent.png"
            alt="IB Nexus"
            width="140"
            height="38"
            fetchPriority="high"
            className="logo h-9 w-auto object-contain invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0"
          />
        </Link>

        {/* Desktop Navigation Links */}
        {!email && (
          <div className="hidden items-center gap-1 text-sm text-secondary md:flex">
            {/* Subjects Nested Dropdown */}
            <div 
              className="relative" 
              onMouseEnter={() => setOpenMenu("Subjects")}
            >
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-3 py-2 font-medium transition hover:text-primary"
              >
                Subjects <ChevronDown size={14} className={`transition ${openMenu === "Subjects" ? "rotate-180" : ""}`} />
              </button>
              
              {openMenu === "Subjects" && (
                <div className="absolute left-0 top-full mt-1.5 flex gap-1.5 items-start">
                  {/* Level 1: Programmes */}
                  <div className="w-72 bg-dropdown backdrop-blur-xl border border-subtle rounded-2xl shadow-float p-2 animate-in fade-in slide-in-from-top-2">
                    {subjectsHierarchy.map(prog => (
                      <div 
                        key={prog.short}
                        onMouseEnter={() => handleProgEnter(prog.short)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-default transition ${activeProg === prog.short ? "bg-hover text-primary" : "text-secondary hover:bg-hover hover:text-primary"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <prog.icon size={17} className={activeProg === prog.short ? "text-accent-bright" : ""} />
                          <span className="font-semibold">{prog.title}</span>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </div>
                    ))}
                  </div>

                  {/* Level 2: Groups */}
                  {activeProg && (() => {
                    const activeProgObj = subjectsHierarchy.find(p => p.short === activeProg);
                    return (
                      <div className="w-80 bg-dropdown backdrop-blur-xl border border-subtle rounded-2xl shadow-float p-2 animate-in fade-in slide-in-from-left-2">
                        {activeProgObj.groups.map(group => {
                          const hasSubjects = group.subjects.length > 0;
                          const isHovered = activeGroup === group.name;
                          
                          return (
                            <div key={group.name}>
                              {hasSubjects ? (
                                <div 
                                  onMouseEnter={() => handleGroupEnter(group.name)}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-default transition ${isHovered ? "bg-hover text-primary font-medium" : "text-secondary hover:bg-hover hover:text-primary"}`}
                                >
                                  {group.name}
                                  <ChevronRight size={16} className="text-muted" />
                                </div>
                              ) : (
                                <Link 
                                  href={activeProgObj.baseRoute ? `${activeProgObj.baseRoute}/${group.name.toLowerCase().replaceAll(" ", "-")}` : `/subjects/${activeProg.toLowerCase()}/${group.name.toLowerCase().replaceAll(" ", "-")}`}
                                  onMouseEnter={() => handleGroupEnter(group.name)}
                                  onClick={() => setOpenMenu(null)}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${isHovered ? "bg-hover text-primary font-medium" : "text-secondary hover:bg-hover hover:text-primary"}`}
                                >
                                  {group.name}
                                </Link>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Level 3: Individual Subjects */}
                  {activeProg && activeGroup && subjectsHierarchy.find(p => p.short === activeProg)?.groups.find(g => g.name === activeGroup)?.subjects.length > 0 && (
                    <div className="w-80 bg-dropdown backdrop-blur-xl border border-subtle rounded-2xl shadow-float p-2 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-left-2 custom-scrollbar">
                      <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                        {activeGroup}
                      </p>
                      {subjectsHierarchy.find(p => p.short === activeProg).groups.find(g => g.name === activeGroup).subjects.map(([name, href]) => (
                        <Link 
                          key={name} 
                          href={href}
                          onClick={() => setOpenMenu(null)}
                          className="block px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition"
                        >
                          {name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direct Links */}
            <Link href="/about" className="rounded-lg px-3 py-2 font-medium transition hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="rounded-lg px-3 py-2 font-medium transition hover:text-primary">
              Contact
            </Link>
          </div>
        )}

        {/* Right End Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {email ? (
            <UserMenu displayName={displayName} email={email} avatarUrl={avatarUrl} />
          ) : (
            <>
              <Link prefetch href="/login" className="px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary transition">
                Sign In
              </Link>
              <Link prefetch href="/signup" className="btn btn-brand rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02]">
                Get Started
              </Link>
            </>
          )}
          <ThemeToggle />

          {/* Mobile Menu Button */}
          {!email && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-secondary hover:text-primary md:hidden"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Accordion Style) */}
      {mobileMenuOpen && !email && (
        <div className="border-b border-subtle bg-background px-4 pb-6 pt-3 md:hidden max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-bold px-2 py-2">Subjects</p>
            
            {subjectsHierarchy.map(prog => (
              <div key={prog.short} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleMobileProg(prog.short)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition ${mobileProg === prog.short ? "bg-hover text-primary" : "text-secondary hover:bg-hover hover:text-primary"}`}
                >
                  <span className="flex items-center gap-2"><prog.icon size={16}/> {prog.title}</span>
                  <ChevronDown size={16} className={`transition ${mobileProg === prog.short ? "rotate-180" : ""}`} />
                </button>
                
                {mobileProg === prog.short && (
                  <div className="mt-1 ml-3 border-l-2 border-subtle pl-2 space-y-1">
                    {prog.groups.map(group => {
                      const hasSubs = group.subjects.length > 0;
                      return (
                        <div key={group.name}>
                          {hasSubs ? (
                            <button
                              type="button"
                              onClick={() => toggleMobileGroup(group.name)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${mobileGroup === group.name ? "text-primary font-medium bg-hover" : "text-secondary hover:text-primary"}`}
                            >
                              {group.name}
                              <ChevronDown size={14} className={`transition ${mobileGroup === group.name ? "rotate-180" : ""}`} />
                            </button>
                          ) : (
                            <Link
                              href={prog.baseRoute ? `${prog.baseRoute}/${group.name.toLowerCase().replaceAll(" ", "-")}` : `/subjects/${prog.short.toLowerCase()}/${group.name.toLowerCase().replaceAll(" ", "-")}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full rounded-lg px-3 py-2.5 text-sm text-secondary hover:text-primary hover:bg-hover transition"
                            >
                              {group.name}
                            </Link>
                          )}

                          {hasSubs && mobileGroup === group.name && (
                            <div className="mt-1 ml-2 space-y-1 bg-surface/50 rounded-xl p-1">
                              {group.subjects.map(([name, href]) => (
                                <Link
                                  key={name}
                                  href={href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block w-full rounded-md px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition"
                                >
                                  {name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <div className="h-px bg-divider my-4" />
            
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-secondary hover:bg-hover hover:text-primary">
              About
            </Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-secondary hover:bg-hover hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
