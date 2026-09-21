"use client";

import { createClient } from "@/utils/supabase-browser";
import { createPendingGoogleSignup } from "@/app/auth/signup-actions";
import { useState } from "react";
import { getProviderConfig } from "@/lib/auth-providers";
import { secondaryButtonClassName } from "./auth-styles";

export default function OAuthButton({
  provider = "google",
  disabled = false,
  onError,
  compact = false,
  label,
  intent = "signin",
  flowSource = "unknown",
  // For signup intent: the email the user typed in the sign-up form.
  // Required when intent === "signup" so the pending authorization
  // is scoped to the correct email address.
  signupEmail = "",
}) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const config = getProviderConfig(provider);

  const getVerifierCookies = () =>
    document.cookie
      .split("; ")
      .filter(Boolean)
      .map((entry) => entry.split("="))
      .filter(([name]) => name.includes("code-verifier"))
      .map(([name, value]) => ({ name, exists: Boolean(value), valueLength: value?.length ?? 0 }));

  const writeTrace = async (event) => {
    try {
      await fetch("/api/auth/oauth-trace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("[OAUTH:CLIENT:TRACE:FAILED]", error);
    }
  };

  const handleLogin = async () => {
    if (loading || disabled) return;
    setLoading(true);

    if (intent === "signup" && provider === "google") {
      const result = await createPendingGoogleSignup();
      if (result?.error) {
        onError?.(result.error);
        setLoading(false);
        return;
      }
    }

    // This URL is constructed for every click.  In particular, it never
    // inherits the prior sign-up redirect URL or callback query parameters.
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    const traceId = crypto.randomUUID();
    callbackUrl.searchParams.set("provider", provider);
    callbackUrl.searchParams.set("intent", intent);
    callbackUrl.searchParams.set("trace", traceId);

    const oauthOptions = {
      redirectTo: callbackUrl.toString(),
    };

    // Pass the email as a login hint so Google pre-selects the right account.
    if (intent === "signup" && signupEmail) {
      oauthOptions.queryParams = { login_hint: signupEmail };
    }

    await writeTrace({
      event: "before-signInWithOAuth",
      traceId,
      flowSource,
      provider,
      intent,
      redirectTo: callbackUrl.toString(),
      pkceVerifierCookies: getVerifierCookies(),
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { ...oauthOptions, skipBrowserRedirect: true },
    });

    if (error) {
      await writeTrace({
        event: "signInWithOAuth-failed",
        traceId,
        flowSource,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        fullErrorObject: JSON.stringify(error),
      });
      onError?.(error.message);
      setLoading(false);
      return;
    }

    if (!data?.url) {
      const missingUrlError = new Error("Supabase did not return an OAuth authorization URL.");
      await writeTrace({
        event: "signInWithOAuth-missing-url",
        traceId,
        flowSource,
        errorName: missingUrlError.name,
        errorMessage: missingUrlError.message,
        errorStack: missingUrlError.stack,
      });
      onError?.(missingUrlError.message);
      setLoading(false);
      return;
    }

    const authorizationUrl = new URL(data.url);
    await writeTrace({
      event: "after-signInWithOAuth",
      traceId,
      flowSource,
      provider,
      intent,
      authorizationUrl: authorizationUrl.toString(),
      redirectTo: callbackUrl.toString(),
      redirectUri: authorizationUrl.searchParams.get("redirect_uri"),
      state: authorizationUrl.searchParams.get("state"),
      pkceVerifierCookies: getVerifierCookies(),
    });
    window.location.assign(data.url);
  };

  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  const icon =
    config.paths?.length > 0 ? (
      <svg className={iconSize} viewBox="0 0 24 24" aria-hidden="true">
        {config.paths.map((d, i) => (
          <path key={i} fill="currentColor" d={d} />
        ))}
      </svg>
    ) : null;

  const buttonLabel =
    label ||
    (loading
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
          ? "px-3 py-1.5 rounded-full text-sm font-medium border border-subtle text-secondary hover:bg-hover hover:text-primary transition-colors flex items-center gap-1.5 disabled:opacity-50"
          : `${secondaryButtonClassName} flex items-center justify-center gap-2`
      }
    >
      {icon}
      {buttonLabel}
    </button>
  );
}
