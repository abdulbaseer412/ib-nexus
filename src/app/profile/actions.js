"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { IB_PROGRAMS } from "@/lib/constants";
import { validateName } from "@/lib/validation";
import { revalidatePath } from "next/cache";

const isDev = process.env.NODE_ENV === "development";

function revalidateUserPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function updateProfile(formData) {
  const { user } = await requireCompleteProfile();

  const displayName = formData.get("display_name")?.toString().trim();
  const ibProgram = formData.get("ib_program")?.toString();
  const avatarUrl = formData.get("avatar_url")?.toString();

  const nameResult = validateName(displayName);
  if (!nameResult.valid) {
    return { error: nameResult.error };
  }

  const validPrograms = IB_PROGRAMS.map((p) => p.value);
  if (!validPrograms.includes(ibProgram)) {
    return { error: "Please select a valid IB programme." };
  }

  const updatePayload = {
    display_name: nameResult.value,
    ib_program: ibProgram,
  };

  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl || null;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select("id")
    .single();

  if (error) {
    if (isDev) {
      console.error("[updateProfile] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return { error: "Could not update your profile. Please try again." };
  }

  if (!data) {
    if (isDev) console.error("[updateProfile] Update matched zero rows for user:", user.id);
    return { error: "Could not update your profile. Please try again." };
  }

  revalidateUserPaths();
  return { success: "Profile updated successfully." };
}
