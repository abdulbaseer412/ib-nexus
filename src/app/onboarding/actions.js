"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";
import { IB_PROGRAMS } from "@/lib/constants";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const isDev = process.env.NODE_ENV === "development";

function logError(context, error) {
  if (!isDev) return;
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
  const ibProgram =
    formData.get("ib_program")?.toString() || existingProfile?.ib_program;

  if (!displayName || displayName.length < 2 || displayName.length > 50) {
    return { error: "Display name must be between 2 and 50 characters." };
  }

  const validPrograms = IB_PROGRAMS.map((p) => p.value);
  if (!validPrograms.includes(ibProgram)) {
    return { error: "Please select a valid IB programme." };
  }

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

  // Use upsert so this works whether the profile row exists or not.
  // .select() ensures we can verify the row was actually written.
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        full_name: existingProfile?.full_name || displayName,
        email: existingProfile?.email || user.email,
        ib_program: ibProgram,
        exam_session: examSession,
        subjects: subjects,
        study_goals: studyGoals,
        school_name: schoolName,
        referral_source: referralSource,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    )
    .select("id, onboarding_completed")
    .single();

  if (error) {
    logError("completeOnboarding", error);
    return { error: "Could not save your profile. Please try again." };
  }

  if (!data) {
    if (isDev) console.error("[completeOnboarding] upsert returned no data for user:", user.id);
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/profile");
  redirect("/dashboard");
}
