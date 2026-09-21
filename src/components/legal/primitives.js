import Link from "next/link";
import { Check, Info } from "lucide-react";

/* Server-side content primitives. These render inside the RSC payload as
   children of LegalPageShell and never cross a client boundary as props. */

export function LegalLink({ href, children }) {
  return (
    <Link href={href} className="font-semibold text-accent underline-offset-4 hover:text-primary hover:underline">
      {children}
    </Link>
  );
}

export function LegalP({ children }) {
  return <p className="leading-8 text-secondary">{children}</p>;
}

export function LegalH3({ children }) {
  return <h3 className="pt-2 text-lg font-bold text-primary">{children}</h3>;
}

export function LegalList({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const [lead, rest] = Array.isArray(item) ? item : [null, item];
        return (
          <li key={index} className="flex gap-3 text-secondary">
            <Check size={18} className="mt-1 shrink-0 text-accent" />
            <span className="leading-7">
              {lead && <span className="font-semibold text-primary">{lead}</span>}
              {lead && rest && " "}
              {rest}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const calloutTones = {
  info: "border-accent-strong bg-accent-soft",
  warning: "border-warning-strong bg-warning-soft",
  success: "border-success-strong bg-success-soft",
};

export function LegalCallout({ icon: Icon = Info, title, children, tone = "info" }) {
  return (
    <aside className={`rounded-2xl border p-6 ${calloutTones[tone]}`}>
      <p className="flex items-center gap-2 font-bold text-primary">
        <Icon size={18} className="text-accent" />
        {title}
      </p>
      <div className="mt-3 space-y-3 text-sm leading-7 text-secondary">{children}</div>
    </aside>
  );
}

export function LegalSection({ id, category, title, intro, children }) {
  return (
    <section id={id} data-legal-section className="scroll-mt-28 border-t border-divider pt-14 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-accent">{category}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-[-.045em] sm:text-4xl">{title}</h2>
      {intro && <p className="mt-5 max-w-3xl text-lg leading-8 text-secondary">{intro}</p>}
      <div className="mt-8 max-w-3xl space-y-5">{children}</div>
    </section>
  );
}
