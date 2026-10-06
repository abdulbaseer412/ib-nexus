"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateSettingsAction(data) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const updateData = { ...data };
  if (updateData.ib_program) {
    updateData.ib_program = updateData.ib_program.toLowerCase().includes("myp") ? "myp" : "dp";
  }

  if (updateData.subjects && !Array.isArray(updateData.subjects)) {
    updateData.subjects = [];
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: error.message || "Failed to update settings" };
  }

  try {
    revalidatePath("/settings/profile");
    revalidatePath("/dashboard/subjects");
    revalidatePath("/dashboard/resources");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
  } catch (_) {}

  return { success: true, message: "Settings and IB subjects updated successfully!" };
}
