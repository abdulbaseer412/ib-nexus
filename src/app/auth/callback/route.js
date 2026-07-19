import { createServerClient } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";
import { mapAuthError } from "@/lib/auth-errors";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const rawError = searchParams.get("error");

  if (rawError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(mapAuthError({ message: rawError }))}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Sign in was interrupted. Please try again.")}`
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(mapAuthError(error))}`
    );
  }

  // Password recovery flow: Supabase sends type=recovery in the token.
  // The exchanged session is scoped to password reset only.
  // Redirect to the reset-password page instead of the normal post-auth flow.
  if (data.user?.recovery_sent_at || next === "reset-password") {
    // Check if this is a recovery session by inspecting the AMR (auth methods reference)
    const amr = data.session?.user?.amr ?? [];
    const isRecovery = amr.some?.((entry) => entry.method === "recovery") ||
      next === "reset-password";

    if (isRecovery) {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  const profile = data.user ? await ensureProfile(data.user) : null;
  let destination = getPostAuthRedirect(profile);

  // Check user_auth_settings
  if (data.user) {
    const { data: settings, error: settingsError } = await supabase
      .from("user_auth_settings")
      .select("*")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!settingsError && settings) {
      const currentProvider = data.user.app_metadata?.provider;
      if (currentProvider === "google" && settings.google_enabled === false) {
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
    }
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
