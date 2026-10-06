import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile-service";
import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign In — IB Nexus",
  description: "Sign in to your IB Nexus account.",
};

function SignInFallback() {
  return (
    <div className="w-full max-w-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto w-48" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const { IS_APPLICATION_LOCKED } = await import("@/lib/constants");
  const { fetchDirectLockStatus } = await import("@/lib/website-lock");
  const lockStatus = await fetchDirectLockStatus();
  const isLocked = IS_APPLICATION_LOCKED || Boolean(lockStatus.is_locked);

  if (isLocked) {
    const params = new URLSearchParams();
    const errMsg = sp?.lock_error || sp?.error;
    if (errMsg) params.set("lock_error", errMsg);
    if (sp?.rejected_email) params.set("rejected_email", sp.rejected_email);
    const qs = params.toString() ? `?${params.toString()}` : "";
    redirect(`/${qs}`);
  }

  const user = await getAuthUser();
  if (user) {
    // If the request arrived with an explicit error, disabled_method flag, or logout intent,
    // do NOT redirect to /dashboard — invalidate active session so user sees the login form
    if (sp?.error || sp?.disabled_method || sp?.logout === "true" || sp?.switch === "true") {
      const { createServerClient } = await import("@/lib/supabase/server");
      const serverSupabase = await createServerClient();
      await serverSupabase.auth.signOut();
    } else {
      // Check if user's current session method has been disabled in user_auth_settings
      const { createAdminClient, createServerClient } = await import("@/lib/supabase/server");
      const admin = createAdminClient();
      const { data: settings } = await admin
        .from("user_auth_settings")
        .select("email_password_enabled, google_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      const provider = user.app_metadata?.provider;
      const isEmailSession = provider === "email" || (!provider && !user.app_metadata?.providers?.includes("google"));

      if (settings && isEmailSession && settings.email_password_enabled === false) {
        const serverSupabase = await createServerClient();
        await serverSupabase.auth.signOut();
        redirect("/login?error=" + encodeURIComponent("Email & password sign-in has been disabled for this account. Please sign in using Google."));
      }

      redirect("/dashboard");
    }
  }

  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="card animate-in mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10">
        <Suspense fallback={<SignInFallback />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
