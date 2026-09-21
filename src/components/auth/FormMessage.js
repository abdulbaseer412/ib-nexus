"use client";

import { getAuthErrorDetails } from "@/lib/auth-errors";

function SuccessIcon() {
  return (
    <svg
      className="w-5 h-5 text-success shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="w-5 h-5 text-warning shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-5 h-5 text-danger shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="w-5 h-5 text-info shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const TYPE_CONFIG = {
  success: {
    styles:
      "border-success-strong bg-success-soft text-success-strong",
    icon: <SuccessIcon />,
    role: "status",
  },
  warning: {
    styles:
      "border-warning-strong bg-warning-soft text-warning-strong",
    icon: <WarningIcon />,
    role: "alert",
  },
  error: {
    styles:
      "border-danger-strong bg-danger-soft text-danger-strong",
    icon: <ErrorIcon />,
    role: "alert",
  },
  info: {
    styles:
      "border-info-strong bg-info-soft text-info-strong",
    icon: <InfoIcon />,
    role: "status",
  },
};

export function FormMessage({
  type = "error",
  title,
  message,
  action,
  actions,
  onDismiss,
  className = "",
}) {
  if (!message && !title) return null;

  let displayTitle = title;
  let displayMessage = message;
  let displayType = type;

  if (message && !title && (type === "error" || type === "warning")) {
    const details = getAuthErrorDetails(message);
    displayTitle = details.title;
    displayMessage = details.message;
    if (details.type === "rate_limit" || details.type === "warning") {
      displayType = "warning";
    } else if (details.type === "network" || details.type === "error") {
      displayType = "error";
    } else if (details.type === "info" || details.type === "email_unconfirmed") {
      displayType = "info";
    }
  }

  const config = TYPE_CONFIG[displayType] || TYPE_CONFIG.error;

  return (
    <div
      role={config.role}
      aria-live="polite"
      className={`animate-auth-appear relative w-full p-4 sm:p-5 rounded-2xl border text-center ${config.styles} ${className}`}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent"
          aria-label="Dismiss message"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="p-2 rounded-full bg-card shadow-sm border border-subtle">
          {config.icon}
        </div>

        {displayTitle && (
          <h3 className="font-semibold text-sm sm:text-base leading-snug">
            {displayTitle}
          </h3>
        )}

        {displayMessage && (
          <p className="text-xs sm:text-sm opacity-90 max-w-sm leading-relaxed">
            {displayMessage}
          </p>
        )}
      </div>

      {(action || actions) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {actions}
        </div>
      )}
    </div>
  );
}

export default FormMessage;
