"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronUp, Clock3, LifeBuoy, ShieldCheck } from "lucide-react";

export {
  LegalCallout,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalSection,
} from "./primitives";

function LegalFooter() {
  return (
    <footer className="mt-16 md:mt-24 border-t border-divider bg-surface-alt/50 pt-16 pb-8 text-sm text-secondary">
      <div className="grid gap-12 md:grid-cols-4 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs text-white">N</span> IB Nexus
          </div>
          <p className="max-w-xs leading-relaxed text-muted">A clear, focused study platform designed to respect students' attention and simplify IB revision.</p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-primary">Platform</h4>
          <div className="flex flex-col gap-3">
            <Link href="/subjects/dp" className="hover:text-accent-bright transition">Subjects</Link>
            <Link href="/features" className="hover:text-accent-bright transition">Features</Link>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-primary">Support</h4>
          <div className="flex flex-col gap-3">
            <Link href="/help" className="hover:text-accent-bright transition">Help Centre</Link>
            <Link href="/contact" className="hover:text-accent-bright transition">Contact</Link>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-primary">Legal</h4>
          <div className="flex flex-col gap-3">
            <Link href="/privacy" className="hover:text-accent-bright transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-accent-bright transition">Terms of Service</Link>
            <Link href="/accessibility" className="hover:text-accent-bright transition">Accessibility</Link>
          </div>
        </div>
      </div>
      <div className="mt-16 flex items-center justify-between border-t border-divider pt-8 text-muted">
        <span>© {new Date().getFullYear()} IB Nexus. All rights reserved.</span>
      </div>
    </footer>
  );
}

export default function LegalPageShell({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  readingTime,
  toc,
  supportText,
  children,
}) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [activeSection, setActiveSection] = useState(toc[0]?.id ?? "");

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? (scrollTop / height) * 100 : 0);
      setShowTop(scrollTop > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = toc
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0.1, 0.3] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [toc]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <main className="landing min-h-[calc(100vh-72px)] bg-background px-4 py-12 md:py-16 text-primary sm:px-6 lg:px-8">
      {/* Reading progress indicator */}
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-hover">
        <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <header>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 md:mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-secondary">{subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-subtle bg-card-secondary px-4 py-1.5 text-sm text-secondary">
              <ShieldCheck size={15} className="text-accent" />
              Last updated: <span className="font-semibold text-primary">{lastUpdated}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-subtle bg-card-secondary px-4 py-1.5 text-sm text-secondary">
              <Clock3 size={15} className="text-accent" />
              {readingTime}
            </span>
          </div>
        </header>

        {/* Mobile sticky chip nav */}
        <nav aria-label="On this page" className="sticky top-[72px] z-40 -mx-4 mt-10 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                  activeSection === item.id
                    ? "border-accent-strong bg-accent-soft font-semibold text-primary"
                    : "border-subtle text-secondary"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Body */}
        <div className="mt-14 grid gap-12 lg:grid-cols-[240px_1fr]">
          {/* Sticky sidebar TOC */}
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">On this page</p>
              <ul className="mt-4 border-l border-subtle">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block py-2 pl-4 text-sm transition-colors ${
                        activeSection === item.id
                          ? "border-l-2 border-accent font-semibold text-primary"
                          : "-ml-px border-l border-transparent text-secondary hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <article className="min-w-0 space-y-14">{children}</article>
        </div>

        {/* Need help? footer CTA */}
        <section className="mt-24 rounded-[24px] border border-accent-strong bg-accent-soft p-8 sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-xl font-bold">
                <LifeBuoy size={20} className="text-accent-bright" />
                Need help?
              </p>
              <p className="mt-2 max-w-xl leading-7 text-secondary">{supportText}</p>
            </div>
            <Link
              href="/contact"
              className="btn btn-brand inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 font-semibold shadow-accent-glow"
            >
              Contact Support
            </Link>
          </div>
        </section>

        <LegalFooter />
      </div>

      {/* Back to top */}
      {showTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-subtle bg-dropdown text-secondary shadow-float backdrop-blur-xl transition hover:border-accent/50 hover:text-primary"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </main>
  );
}
