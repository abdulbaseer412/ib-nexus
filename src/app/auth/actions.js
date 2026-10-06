"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/validation";
import { isOAuthOnly, hasPasswordLogin } from "@/lib/auth-providers";
import { getAuthErrorDetails } from "@/lib/auth-errors";
async function getOrigin() {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || "http";
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Returns the auth providers linked to an email address.
 * Returns [] if the email does not exist in auth.users.
 * Safe to call from unauthenticated contexts (sign-in / sign-up pages).
 *
 * Requires the get_account_providers function to exist in Supabase.
 * Run supabase/migrations/20250719000001_get_account_providers_final.sql
 * in the Supabase SQL Editor if this returns [].
 */
export async function getEmailProviders(email) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_account_providers", {
    email_input: emailResult.value,
  });

  if (error) {
    console.error("[getEmailProviders] RPC error:", error.message, error.code);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * Resolves the correct error state after a failed signInWithPassword call.
 * Returns { type, title, message, providers } so the UI can render the right state.
 */
export async function resolveSignInError(email) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) {
    return { type: "validation", message: emailResult.error, providers: [] };
  }

  // Check if account is suspended or has disabled sign-in methods
  try {
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, preferences, is_restricted")
      .eq("email", emailResult.value)
      .maybeSingle();

    if (profile?.preferences?.is_suspended) {
      return {
        type: "suspended",
        title: "Account Access Suspended",
        message: "Your IB Nexus account access has been suspended by an administrator. All your notes and study data remain securely preserved.",
        providers: [],
      };
    }

    if (profile?.id) {
      const { data: authSettings } = await adminSupabase
        .from("user_auth_settings")
        .select("email_password_enabled, google_enabled")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (authSettings && authSettings.email_password_enabled === false) {
        return {
          type: "disabled_method",
          title: "Sign-In Method Disabled",
          message: "Email & password sign-in has been disabled for this account. Please sign in using Google.",
          providers: authSettings.google_enabled ? ["google"] : ["google"],
        };
      }
    }
  } catch (err) {
    console.error("[resolveSignInError] error checking profile/settings:", err);
  }

  const providers = await getEmailProviders(emailResult.value);

  if (providers.length === 0) {
    return {
      type: "no_account",
      title: "No account found",
      message: "We couldn't find an IB Nexus account associated with this email address.",
      providers: [],
    };
  }

  if (!hasPasswordLogin(providers)) {
    return {
      type: "oauth_only",
      title: "Different sign-in method required",
      message: "This account was created using a different sign-in method.",
      providers,
    };
  }

  return {
    type: "wrong_password",
    title: "Incorrect password",
    message: "The password you entered is incorrect.",
    providers,
  };
}

/**
 * Authoritatively verifies whether a user is allowed to sign in with a given method.
 * Runs with admin privileges to bypass RLS.
 */
export async function verifyUserAuthMethod(userId, method = "email") {
  if (!userId) return { allowed: false, error: "No user ID provided" };
  try {
    const admin = createAdminClient();
    const { data: settings, error } = await admin
      .from("user_auth_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !settings) {
      return { allowed: true };
    }

    if (method === "email" && settings.email_password_enabled === false) {
      return {
        allowed: false,
        type: "disabled_method",
        title: "Sign-In Method Disabled",
        message: "Email & password sign-in has been disabled for this account. Please sign in using Google.",
        providers: settings.google_enabled ? ["google"] : ["google"],
      };
    }

    if (method === "google" && settings.google_enabled === false) {
      return {
        allowed: false,
        type: "disabled_method",
        title: "Sign-In Method Disabled",
        message: "Google sign-in has been disabled for this account. Please use Email & Password.",
        providers: settings.email_password_enabled ? ["email"] : ["email"],
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("[verifyUserAuthMethod] error:", err);
    return { allowed: true };
  }
}

/**
 * Sign up with email and password.
 * Detects existing accounts and returns provider-aware error states.
 */
export async function signUpWithEmail(formData) {
  const name = formData.get("name")?.toString() ?? "";
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirm_password")?.toString() ?? "";

  const nameResult = validateName(name);
  if (!nameResult.valid) return { error: nameResult.error, type: "validation" };

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return { error: emailResult.error, type: "validation" };

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) return { error: passwordResult.error, type: "validation" };

  const matchResult = validatePasswordMatch(password, confirmPassword);
  if (!matchResult.valid) return { error: matchResult.error, type: "validation" };

  const providers = await getEmailProviders(emailResult.value);

  if (providers.length > 0) {
    return {
      type: "duplicate",
      providers,
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: emailResult.value,
    password,
    options: {
      data: { full_name: nameResult.value },
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    // Log raw error for debugging — never shown to users
    console.error("[signUpWithEmail] Supabase error:", error.message, error.code, error.status);

    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      const existingProviders = await getEmailProviders(emailResult.value);
      return {
        type: "duplicate",
        providers: existingProviders,
        error: "An account with this email already exists. Please sign in instead.",
      };
    }
    const details = getAuthErrorDetails(error);
    return { error: details.message, type: details.type, title: details.title, providers: [] };
  }

  if (data.user?.identities?.length === 0) {
    const existingProviders = await getEmailProviders(emailResult.value);
    return {
      type: "duplicate",
      providers: existingProviders,
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  if (data.session && data.user) {
    await ensureProfile(data.user);
    return {
      success: true,
      redirect: "/dashboard",
      session: true,
    };
  }

  return {
    success: true,
    redirect: `/check-email?email=${encodeURIComponent(emailResult.value)}`,
    confirmation: true,
    email: emailResult.value,
  };
}

/**
 * Resends a verification email to a given user email address.
 */
export async function resendVerificationEmail(email) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) return { error: emailResult.error, type: "validation" };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: emailResult.value,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    const details = getAuthErrorDetails(error);
    return { error: details.message, type: details.type, title: details.title };
  }

  return { success: "Verification email resent! Check your inbox." };
}

/**
 * Called after any successful client-side sign-in to sync the profile
 * and return the correct redirect destination.
 */
export async function resolvePostAuthRedirect(signInMethod = null) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  // Check user_auth_settings using admin client to bypass RLS reliably
  const admin = createAdminClient();
  const { data: settings, error: settingsError } = await admin
    .from("user_auth_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settingsError && settings) {
    const authMethod = signInMethod ?? user.app_metadata?.provider;

    if (authMethod === "email" && settings.email_password_enabled === false) {
      await supabase.auth.signOut();
      return `/login?error=${encodeURIComponent("Email & Password sign-in has been disabled for this account. Please sign in using Google.")}`;
    }

    if (authMethod === "google" && settings.google_enabled === false) {
      await supabase.auth.signOut();
      return `/login?error=${encodeURIComponent("Google sign-in has been disabled for this account. Please use Email & Password.")}`;
    }
  }

  const profile = await ensureProfile(user);
  revalidatePath("/", "layout");
  return getPostAuthRedirect(profile);
}

/**
 * Sends a password reset email.
 * Returns provider-aware error if the account is OAuth-only.
 */
export async function sendPasswordReset(formData) {
  const email = formData.get("email")?.toString() ?? "";

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return { error: emailResult.error, type: "validation" };

  const providers = await getEmailProviders(emailResult.value);

  if (providers.length === 0) {
    return {
      success: "If an account exists with this email, you'll receive a reset link shortly.",
      type: "sent",
    };
  }

  if (isOAuthOnly(providers)) {
    return {
      type: "oauth_only",
      providers,
      error: "This account uses a different sign-in method and doesn't have a password.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(emailResult.value, {
    redirectTo: `${await getOrigin()}/auth/reset-password`,
  });

  if (error) return { error: "Could not send reset email. Please try again.", type: "unknown" };

  return {
    success: "Password reset email sent. Check your inbox.",
    type: "sent",
  };
}

/**
 * Updates the password for the currently authenticated user.
 * Works for both email/password users (change password) and
 * OAuth-only users (create password for the first time).
 */
export async function updatePassword(formData) {
  try {
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirm_password")?.toString() ?? "";

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) return { error: passwordResult.error };

    const matchResult = validatePasswordMatch(password, confirmPassword);
    if (!matchResult.valid) return { error: matchResult.error };

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Not authenticated. Please sign in again." };
    }

    let updateErr = null;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      updateErr = error;
    } catch (clientErr) {
      updateErr = clientErr;
    }

    // Fallback to service role admin client if client updateUser fails
    // (Crucial for OAuth-only users where GoTrue requires admin privileges to create password)
    if (updateErr) {
      console.warn("[updatePassword] Standard updateUser failed, attempting admin client:", updateErr.message);
      const admin = createAdminClient();
      const { error: adminErr } = await admin.auth.admin.updateUserById(user.id, { password });

      if (adminErr) {
        console.error("[updatePassword] Admin updateUserById also failed:", adminErr.message);
        const msg = adminErr.message.toLowerCase();
        if (
          msg.includes("same password") ||
          msg.includes("should be different") ||
          msg.includes("different from") ||
          msg.includes("must be different") ||
          msg.includes("same_password")
        ) {
          return { error: "Your new password must be different from your current password.", type: "warning" };
        }
        return { error: adminErr.message || "Could not update password. Please try again." };
      }
    }

    // Synchronize user_auth_settings with admin client so email_password_enabled is true
    const admin = createAdminClient();

    // Guarantee email identity and providers list in GoTrue for OAuth accounts
    try {
      await admin.rpc("ensure_email_identity", {
        p_user_id: user.id,
        p_email: user.email,
      });
    } catch (rpcErr) {
      console.warn("[updatePassword] ensure_email_identity warning:", rpcErr?.message);
    }

    await admin
      .from("user_auth_settings")
      .upsert(
        {
          user_id: user.id,
          email_password_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    revalidatePath("/settings/security");
    return { success: "Password updated successfully." };
  } catch (err) {
    console.error("[updatePassword] Unexpected exception:", err);
    return { error: err?.message || "An unexpected error occurred. Please try again." };
  }
}

/**
 * Fetches the user_auth_settings row for the current user.
 * If it doesn't exist, it creates one (self-healing backfill) using the admin client.
 */
export async function getUserAuthSettings() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Not authenticated" };
    }

    const admin = createAdminClient();

    // Fetch settings
    let { data, error } = await admin
      .from("user_auth_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    // Self-healing backfill if row is missing
    if (!data) {
      const providers = await getEmailProviders(user.email);
      const hasGoogle =
        providers.includes("google") ||
        user.app_metadata?.providers?.includes("google") ||
        (user.identities && user.identities.some((i) => i.provider === "google"));
      const hasEmail =
        providers.includes("email") ||
        user.app_metadata?.providers?.includes("email") ||
        (user.identities && user.identities.some((i) => i.provider === "email"));

      const { data: inserted, error: insertError } = await admin
        .from("user_auth_settings")
        .upsert(
          {
            user_id: user.id,
            google_enabled: Boolean(hasGoogle),
            email_password_enabled: Boolean(hasEmail),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select("*")
        .single();

      if (insertError) {
        return { error: insertError.message };
      }
      data = inserted;
    }

    return { data };
  } catch (err) {
    console.error("[getUserAuthSettings] error:", err);
    return { error: err?.message || "Failed to load authentication settings." };
  }
}

/**
 * Updates the user_auth_settings row for the current user.
 * Enforces server-side lockout prevention and uses admin upsert for reliability.
 */
export async function updateUserAuthSettings(googleEnabled, emailPasswordEnabled) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Not authenticated" };
    }

    // Lockout Prevention: At least one method must be enabled
    if (!googleEnabled && !emailPasswordEnabled) {
      return { error: "Security protection active: You must keep at least one secure sign-in method enabled to prevent account lockout." };
    }

    const providers = await getEmailProviders(user.email);
    const hasGoogle =
      providers.includes("google") ||
      user.app_metadata?.providers?.includes("google") ||
      (user.identities && user.identities.some((i) => i.provider === "google"));
    const hasEmail =
      providers.includes("email") ||
      user.app_metadata?.providers?.includes("email") ||
      (user.identities && user.identities.some((i) => i.provider === "email"));

    if (!googleEnabled && (!hasEmail || !emailPasswordEnabled)) {
      return { error: "You cannot disable Google sign-in without a password set up on your account." };
    }

    if (!emailPasswordEnabled && (!hasGoogle || !googleEnabled)) {
      return { error: "You cannot disable password sign-in without a connected Google account." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_auth_settings")
      .upsert(
        {
          user_id: user.id,
          google_enabled: Boolean(googleEnabled),
          email_password_enabled: Boolean(emailPasswordEnabled),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    try {
      revalidatePath("/settings/security");
    } catch (revErr) {
      console.warn("[updateUserAuthSettings] revalidatePath warning:", revErr?.message);
    }

    return { success: true, message: "Settings updated successfully.", data };
  } catch (err) {
    console.error("[updateUserAuthSettings] error:", err);
    return { error: err?.message || "Failed to update authentication settings." };
  }
}

/**
 * Signs out the current user session on the server side and invalidates auth cookies.
 */
export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

