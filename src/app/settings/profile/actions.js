"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateSettingsAction(data) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update settings:", error);
    throw new Error("Failed to update settings");
  }

  revalidatePath("/", "layout");
  return { success: true };
}
