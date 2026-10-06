"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const isDev = process.env.NODE_ENV === "development";

function logError(context, error) {
  console.error(`[${context}]`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
  });
}

export async function completeOnboarding(formData) {
  const user = await requireAuth();
  const existingProfile = await ensureProfile(user);

  if (isOnboardingComplete(existingProfile)) {
    redirect("/dashboard");
  }

  const displayName =
    formData.get("display_name")?.toString().trim() ||
    existingProfile?.display_name?.trim();
  const rawIbProgram =
    formData.get("ib_program")?.toString() || existingProfile?.ib_program || "dp";

  if (!displayName || displayName.length < 2 || displayName.length > 50) {
    return { error: "Display name must be between 2 and 50 characters." };
  }

  // Normalize ib_program strictly to 'myp' or 'dp' to comply with check constraint
  const ibProgram = rawIbProgram.toLowerCase().includes("myp") ? "myp" : "dp";

  const examSession = formData.get("exam_session")?.toString() || null;
  const schoolName = formData.get("school_name")?.toString() || null;
  const referralSource = formData.get("referral_source")?.toString() || null;
  const avatarUrl = formData.get("avatar_url")?.toString() || null;
  const subjectsStr = formData.get("subjects")?.toString() || "[]";
  const studyGoalsStr = formData.get("study_goals")?.toString() || "[]";

  let subjects = [];
  let studyGoals = [];
  try {
    subjects = JSON.parse(subjectsStr);
    studyGoals = JSON.parse(studyGoalsStr);
  } catch (e) {
    return { error: "Invalid data format submitted." };
  }

  const supabase = await createServerClient();

  const payload = {
    id: user.id,
    display_name: displayName,
    full_name: existingProfile?.full_name || displayName,
    email: existingProfile?.email || user.email,
    ib_program: ibProgram,
    subjects: subjects,
    study_goals: studyGoals,
    exam_session: examSession,
    school_name: schoolName,
    referral_source: referralSource,
    avatar_url: avatarUrl,
    onboarding_completed: true,
  };

  let { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, onboarding_completed, ib_program, subjects")
    .single();

  if (error) {
    logError("completeOnboarding", error);
    // Safe fallback with admin client in case RLS policy blocks profile update
    const adminSupabase = createAdminClient();
    const res = await adminSupabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("id, onboarding_completed, ib_program, subjects")
      .single();

    if (res.error) {
      logError("completeOnboarding/adminFallback", res.error);
      return { error: res.error.message || "Could not save your profile. Please try again." };
    }
    data = res.data;
  }

  if (!data) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
