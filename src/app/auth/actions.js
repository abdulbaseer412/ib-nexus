"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/validation";
import { isOAuthOnly, hasPasswordLogin } from "@/lib/auth-providers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getOrigin() {
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

  if (error) return [];
  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * Resolves the correct error state after a failed signInWithPassword call.
 * Returns { type, message, providers } so the UI can render the right state.
 */
export async function resolveSignInError(email) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) {
    return { type: "validation", message: emailResult.error, providers: [] };
  }

  const providers = await getEmailProviders(emailResult.value);

  if (providers.length === 0) {
    return {
      type: "no_account",
      message: "No account found with this email address.",
      providers: [],
    };
  }

  if (!hasPasswordLogin(providers)) {
    return {
      type: "oauth_only",
      message: "This account was created using a different sign-in method.",
      providers,
    };
  }

  return {
    type: "wrong_password",
    message: "Incorrect password. Please try again.",
    providers,
  };
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
    return { type: "duplicate", providers, error: "duplicate" };
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
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      const existingProviders = await getEmailProviders(emailResult.value);
      return { type: "duplicate", providers: existingProviders, error: "duplicate" };
    }
    return { error: error.message, type: "unknown" };
  }

  if (data.user?.identities?.length === 0) {
    const existingProviders = await getEmailProviders(emailResult.value);
    return { type: "duplicate", providers: existingProviders, error: "duplicate" };
  }

  if (data.session && data.user) {
    const profile = await ensureProfile(data.user);
    revalidatePath("/", "layout");
    redirect(getPostAuthRedirect(profile));
  }

  return {
    success: "Account created! Check your email to confirm your address, then sign in.",
    type: "confirmation",
  };
}

/**
 * Called after any successful client-side sign-in to sync the profile
 * and return the correct redirect destination.
 */
export async function resolvePostAuthRedirect() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  // Check user_auth_settings
  const { data: settings, error: settingsError } = await supabase
    .from("user_auth_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settingsError && settings) {
    const currentProvider = user.app_metadata?.provider;

    if (currentProvider === "email" && settings.email_password_enabled === false) {
      await supabase.auth.signOut();
      return `/login?error=${encodeURIComponent("Email & Password sign-in has been disabled for this account. Please sign in using Google.")}`;
    }

    if (currentProvider === "google" && settings.google_enabled === false) {
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
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirm_password")?.toString() ?? "";

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) return { error: passwordResult.error };

  const matchResult = validatePasswordMatch(password, confirmPassword);
  if (!matchResult.valid) return { error: matchResult.error };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.message.toLowerCase().includes("same password")) {
      return { error: "New password must be different from your current password." };
    }
    return { error: "Could not update password. Please try again." };
  }

  revalidatePath("/settings/security");
  return { success: "Password updated successfully." };
}

/**
 * Fetches the user_auth_settings row for the current user.
 * If it doesn't exist, it creates one (self-healing backfill).
 */
export async function getUserAuthSettings() {
  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  // Fetch settings
  let { data, error } = await supabase
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
    const hasGoogle = providers.includes("google");
    const hasEmail = providers.includes("email");

    const { data: inserted, error: insertError } = await supabase
      .from("user_auth_settings")
      .insert({
        user_id: user.id,
        google_enabled: hasGoogle,
        email_password_enabled: hasEmail,
      })
      .select("*")
      .single();

    if (insertError) {
      return { error: insertError.message };
    }
    data = inserted;
  }

  return { data };
}

/**
 * Updates the user_auth_settings row for the current user.
 * Enforces server-side lockout prevention.
 */
export async function updateUserAuthSettings(googleEnabled, emailPasswordEnabled) {
  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  // Lockout Prevention: At least one method must be enabled
  if (!googleEnabled && !emailPasswordEnabled) {
    return { error: "You cannot disable your only remaining sign-in method." };
  }

  const { data, error } = await supabase
    .from("user_auth_settings")
    .update({
      google_enabled: googleEnabled,
      email_password_enabled: emailPasswordEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/security");
  return { success: "Settings updated successfully.", data };
}
