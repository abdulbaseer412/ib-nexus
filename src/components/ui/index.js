"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { PRESET_AVATARS } from "@/lib/avatars";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export const Button = ({ variant="primary", className="", isLoading, loadingText, children, disabled, ...props }) => {
  const isSubtle = ["secondary", "ghost", "icon"].includes(variant);
  const pressClass = isSubtle ? "interactive-press-subtle" : "interactive-press";
  
  return (
    <button 
      className={`btn btn-${variant} interactive-hover ${pressClass} relative overflow-hidden ${isLoading ? "pointer-events-none opacity-90" : ""} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      <span className={`flex items-center justify-center gap-2 transition-opacity duration-150 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {children}
      </span>
      <AnimatePresence>
        {isLoading && (
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
export const Card = ({ className="", ...props }) => <section className={`card interactive-hover ${className}`} {...props} />;
export const Input = ({ className="", ...props }) => <input className={`field ${className}`} {...props} />;
export const Textarea = ({ className="", ...props }) => <textarea className={`field min-h-28 resize-y ${className}`} {...props} />;
export const Badge = ({ children, className="" }) => <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
export const Avatar = ({ name="", src, url, className="", size="md" }) => {
  const avatarUrl = src || url;
  const [imgErr, setImgErr] = useState(false);
  const sizeClasses = { 
    xs: "h-5 w-5 text-[10px]",
    sm: "h-6 w-6 text-xs", 
    md: "h-9 w-9 text-base", 
    lg: "h-12 w-12 text-2xl", 
    xl: "h-16 w-16 text-3xl" 
  };
  const sClass = sizeClasses[size] || sizeClasses.md;
  const shapeClass = className.includes("rounded-") ? "" : "rounded-full";
  const preset = PRESET_AVATARS.find(a => a.id === avatarUrl);
  if (preset) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${shapeClass} bg-gradient-to-br ${preset.color} ${sClass} ${className}`} title={name}>
        <span className="leading-none select-none">{preset.emoji}</span>
      </span>
    );
  }
  const isValidUrl = avatarUrl && !imgErr && (avatarUrl.startsWith("http") || avatarUrl.startsWith("/") || avatarUrl.startsWith("data:"));
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${shapeClass} bg-[var(--surface)] font-semibold border border-white/5 ${sClass} ${className}`} title={name}>
      {isValidUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */ 
        <img src={avatarUrl} referrerPolicy="no-referrer" alt={name || "Avatar"} onError={() => setImgErr(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="leading-none font-bold uppercase select-none">{name.slice(0, 1) || "?"}</span>
      )}
    </span>
  );
};
export { AvatarPicker } from "./AvatarPicker";
export const Alert = ({ title, children, variant="info" }) => <div role="alert" className={`rounded-xl border p-4 shadow-sm flex items-start gap-3 ${variant === "error" ? "bg-[var(--danger)]/5 border-[var(--danger)]/20 text-[var(--danger)]" : variant === "success" ? "bg-[var(--success)]/5 border-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--accent)]/5 border-[var(--accent)]/20 text-[var(--accent)]"}`}><div><p className="font-semibold text-[14px]">{title}</p>{children && <p className="mt-1 text-[13px] opacity-80">{children}</p>}</div></div>;
export const Checkbox = (props) => <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" {...props} />;
export const Radio = (props) => <input type="radio" className="h-4 w-4 accent-[var(--accent)]" {...props} />;
export const Progress = ({ value=0, variant="accent" }) => <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-alt)] shadow-inner" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100"><div className={`h-full rounded-full bg-[var(--${variant})] transition-all duration-500`} style={{width:`${value}%`}} /></div>;
export const Spinner = () => <span aria-label="Loading" className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />;
export const Skeleton = ({ className="" }) => <div className={`animate-pulse rounded bg-[var(--surface)] ${className}`} />;
export const EmptyState = ({ title="Nothing here yet", children }) => <div className="rounded-[1.25rem] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center flex flex-col items-center justify-center shadow-sm"><h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight">{title}</h3>{children && <p className="mt-2 text-[14px] text-muted max-w-sm">{children}</p>}</div>;
export const StatCard = ({ label, value, detail }) => <Card className="p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>{detail && <p className="mt-2 text-xs text-accent">{detail}</p>}</Card>;
export const FeatureCard = ({ icon, title, children }) => <Card className="p-6"><div className="text-accent">{icon}</div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{children}</p></Card>;

export const Tooltip = ({ label, children }) => {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50 shadow-md">
        {label}
      </span>
    </span>
  );
};

export const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain grid place-items-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-sm" 
            onMouseDown={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-[var(--dropdown)] border border-[var(--border-strong)] rounded-[1.5rem] shadow-2xl w-full max-w-md p-6 overflow-hidden relative z-10" 
            onMouseDown={e=>e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--surface)] text-muted hover:text-[var(--foreground)] transition-colors" aria-label="Close dialog">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ToastContext = createContext(() => {}); 
export const ToastProvider = ({children}) => {
  const [toasts, setToasts] = useState([]); 
  const show = (message, variant="info") => {
    const id = Date.now();
    setToasts(t => [...t, {id, message, variant}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2 flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="pointer-events-auto shadow-float"
            >
              <Alert title={t.message} variant={t.variant}/>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}; 
export const useToast = () => useContext(ToastContext);

export const Tabs = ({tabs, active, onChange}) => {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl border p-1 bg-[var(--surface)] shadow-sm">
      {tabs.map(t => {
        const isActive = active === t.value;
        return (
          <button 
            role="tab" 
            aria-selected={isActive} 
            key={t.value} 
            onClick={() => onChange(t.value)} 
            className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 outline-none ${isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`}
          >
            {isActive && (
              <motion.div 
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-[var(--accent-soft)] shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        )
      })}
    </div>
  );
};

export const Accordion = ({items}) => {
  return (
    <div className="space-y-2">
      {items.map(i => (
        <details key={i.title} className="card p-4 group">
          <summary className="cursor-pointer font-semibold list-none flex items-center justify-between">
            {i.title}
            <span className="transition-transform duration-200 group-open:rotate-180 text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </summary>
          <p className="mt-3 text-sm text-muted animate-in fade-in slide-in-from-top-2 duration-200">{i.content}</p>
        </details>
      ))}
    </div>
  );
};

export const Dropdown = ({label, children}) => {
  const [open, setOpen] = useState(false);
  
  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button className="btn btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>{label}</button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="card absolute right-0 z-30 mt-2 min-w-40 p-1 shadow-float"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { FeatureExplanation } from "./FeatureExplanation";
export { default as ToastProvider, useToast, toast } from "./ToastProvider";
