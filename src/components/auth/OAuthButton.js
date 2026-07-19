"use client";

import { createClient } from "@/utils/supabase-browser";
import { useState } from "react";
import { getProviderConfig } from "@/lib/auth-providers";
import { secondaryButtonClassName } from "./auth-styles";

export default function OAuthButton({ provider = "google", disabled = false, onError, compact = false, label }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const config = getProviderConfig(provider);

  const handleLogin = async () => {
    if (loading || disabled) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      onError?.(error.message);
      setLoading(false);
    }
  };

  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  const icon = config.paths?.length > 0 ? (
    <svg className={iconSize} viewBox="0 0 24 24" aria-hidden="true">
      {config.paths.map((d, i) => (
        <path key={i} fill="currentColor" d={d} />
      ))}
    </svg>
  ) : null;

  const buttonLabel = label || (loading
    ? "Redirecting…"
    : compact
    ? config.label
    : `Continue with ${config.label}`);

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading || disabled}
      className={
        compact
          ? "px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          : `${secondaryButtonClassName} flex items-center justify-center gap-2`
      }
    >
      {icon}
      {buttonLabel}
    </button>
  );
}
