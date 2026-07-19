import { createServerClient } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";
import { mapAuthError } from "@/lib/auth-errors";
import { NextResponse } from "next/server";
import { debugLogServer } from "@/utils/debug-log-server";

function safeJson(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return { __unserializable: true };
  }
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const rawError = searchParams.get("error");

  debugLogServer("oauth_callback.entry", {
    hasCode: !!code,
    next,
    rawError,
    origin,
  });


  if (rawError) {
    debugLogServer("oauth_callback.early_return.rawError", { rawError });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(mapAuthError({ message: rawError }))}`
    );
  }


  if (!code) {
    debugLogServer("oauth_callback.early_return.no_code");
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Sign in was interrupted. Please try again.")}`
    );
  }


  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  debugLogServer("oauth_callback.exchangeCodeForSession.result", {
    hasUser: !!data?.user,
    exchangeError: error ? String(error) : null,
    sessionPresent: !!data?.session,
    userId: data?.user?.id,
    app_metadata_provider: data?.user?.app_metadata?.provider,
  });


  if (error) {
    debugLogServer("oauth_callback.early_return.exchange_error", {
      error: safeJson(error),
    });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(mapAuthError(error))}`
    );
  }


  // Password recovery flow: Supabase sends type=recovery in the token.
  // The exchanged session is scoped to password reset only.
  // Redirect to the reset-password page instead of the normal post-auth flow.
  if (data.user?.recovery_sent_at || next === "reset-password") {
    debugLogServer("oauth_callback.password_recovery_branch", {
      recoverySentAt: data.user?.recovery_sent_at,
      next,
    });

    // Check if this is a recovery session by inspecting the AMR (auth methods reference)
    const amr = data.session?.user?.amr ?? [];
    const isRecovery = amr.some?.((entry) => entry.method === "recovery") ||
      next === "reset-password";

    if (isRecovery) {
      debugLogServer("oauth_callback.redirect.reset_password", {});
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

  }

  const profile = data.user ? await ensureProfile(data.user) : null;
  let destination = getPostAuthRedirect(profile);

  debugLogServer("oauth_callback.after_ensureProfile", {
    userId: data?.user?.id,
    destination,
    profileId: profile?.id,
    onboardingComplete: profile ? true : false,
  });


  // Check user_auth_settings
  if (data.user) {
    debugLogServer("oauth_callback.user_auth_settings.read.before", {
      userId: data.user.id,
    });

    const { data: settings, error: settingsError } = await supabase
      .from("user_auth_settings")
      .select("*")
      .eq("user_id", data.user.id)
      .maybeSingle();

    debugLogServer("oauth_callback.user_auth_settings.read.after", {
      userId: data.user.id,
      settingsError: settingsError ? String(settingsError) : null,
      settings: safeJson(settings),
    });


    if (!settingsError && settings) {
      const currentProvider = data.user.app_metadata?.provider;
      if (currentProvider === "google" && settings.google_enabled === false) {
        debugLogServer("oauth_callback.blocked.google_disabled", {
          currentProvider,
          google_enabled: settings.google_enabled,
        });
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent("Google sign-in has been disabled for this account.")}`
        );
      }

    }
  }

  // If onboarding is complete and a valid relative redirect path is provided, use it.
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    if (isOnboardingComplete(profile)) {
      destination = next;
      debugLogServer("oauth_callback.destination.overridden_by_next", { next, destination });
    }
  }

  debugLogServer("oauth_callback.redirect.final", { destination });


  return NextResponse.redirect(`${origin}${destination}`);
}
