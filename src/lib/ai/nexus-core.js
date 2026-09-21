import { createServerClient } from "@/lib/supabase/server";

/**
 * Retrieves the active Nexus Core from the database.
 * Returns admin-configured rules if they exist, otherwise returns empty
 * (the system-prompt-builder.js DEFAULT_NEXUS_CORE will be used as fallback).
 */
export async function getActiveNexusCore() {
  try {
    const supabase = await createServerClient();

    // Try ai_core_versions first (versioned core)
    const { data, error } = await supabase
      .from("ai_core_versions")
      .select("core_instructions")
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data?.core_instructions) {
      return [{ category: "Nexus Identity & Behavior", rule_text: data.core_instructions }];
    }

    // Fallback: try ai_instructions table (admin-managed rules)
    const { data: instructions, error: instrError } = await supabase
      .from("ai_instructions")
      .select("category, content")
      .eq("is_active", true);

    if (!instrError && instructions?.length > 0) {
      return instructions.map((i) => ({
        category: i.category,
        rule_text: i.content,
      }));
    }

    // Return empty — system-prompt-builder.js will use DEFAULT_NEXUS_CORE
    return [];
  } catch (error) {
    // Graceful degradation — system-prompt-builder.js default will apply
    console.warn("[NexusCore] DB lookup failed, using built-in default:", error?.message);
    return [];
  }
}
