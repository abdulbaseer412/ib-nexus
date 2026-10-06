import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="pt-12 pb-10 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <span>© {new Date().getFullYear()} IB Nexus. Designed for IB Diploma students worldwide.</span>
      </div>
      <div className="flex items-center gap-5">
        <Link href="/about" className="hover:text-[var(--foreground)] transition-colors">About</Link>
        <Link href="/contact" className="hover:text-[var(--foreground)] transition-colors">Contact</Link>
        <Link href="/help" className="hover:text-[var(--foreground)] transition-colors font-medium text-[var(--foreground)]">Help</Link>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
      </div>
    </footer>
  );
}
