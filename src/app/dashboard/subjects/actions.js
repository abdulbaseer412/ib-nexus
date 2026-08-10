"use server";

import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateSubjectsAction(subjects) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({ subjects })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update subjects:", error);
    throw new Error("Failed to update subjects");
  }

  revalidatePath("/", "layout");
  return { success: true };
}
