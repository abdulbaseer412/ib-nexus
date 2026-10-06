import { createServerClient } from "@/lib/supabase/server";
import { parseCoreInstructions } from "./nexus-compiler";

let activeCoreCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 60 seconds memory cache

export function invalidateNexusCoreCache() {
  activeCoreCache = null;
  cacheTimestamp = 0;
}

/**
 * Retrieves the active Nexus Core from the database.
 * Returns parsed admin-configured rules if they exist, otherwise returns null/empty
 * (the system-prompt-builder.js DEFAULT_NEXUS_CORE will be used as fallback).
 */
export async function getActiveNexusCore() {
  const now = Date.now();
  if (activeCoreCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return activeCoreCache;
  }

  try {
    const supabase = await createServerClient();

    // Query active Core version from ai_core_versions
    const { data, error } = await supabase
      .from("ai_core_versions")
      .select("id, version_number, core_instructions, is_active, created_at")
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data?.core_instructions) {
      const parsed = parseCoreInstructions(data.core_instructions);
      const result = [{
        category: "Nexus Identity & Behavior",
        rule_text: parsed.rawText,
        meta: parsed.meta,
        compiled_constitution: parsed.meta?.compiled_constitution || null,
        version_number: data.version_number,
        version_id: data.id,
      }];

      activeCoreCache = result;
      cacheTimestamp = now;
      return result;
    }

    // Fallback: try ai_instructions table (legacy rules if any)
    const { data: instructions, error: instrError } = await supabase
      .from("ai_instructions")
      .select("category, content")
      .eq("is_active", true);

    if (!instrError && instructions?.length > 0) {
      const legacyResult = instructions.map((i) => ({
        category: i.category,
        rule_text: i.content,
      }));
      activeCoreCache = legacyResult;
      cacheTimestamp = now;
      return legacyResult;
    }

    return [];
  } catch (error) {
    console.warn("[NexusCore] DB lookup failed, using built-in default:", error?.message);
    return [];
  }
}
