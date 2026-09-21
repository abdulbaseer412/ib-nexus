"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function fetchAdminAiCoreVersionsAction() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, versions: data || [] };
  } catch (error) {
    console.error("[ai-actions] Fetch error:", error);
    return { success: false, error: error.message };
  }
}

export async function createAdminAiCoreVersionAction({ core_instructions }) {
  try {
    const adminClient = createAdminClient();
    
    // Get the highest version number
    const { data: latest } = await adminClient
      .from("ai_core_versions")
      .select("version_number")
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
      
    const nextVersion = latest ? latest.version_number + 1 : 1;

    const { data, error } = await adminClient
      .from("ai_core_versions")
      .insert({
        version_number: nextVersion,
        core_instructions,
        is_active: false
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, version: data };
  } catch (error) {
    console.error("[ai-actions] Create error:", error);
    return { success: false, error: error.message };
  }
}

export async function activateAdminAiCoreVersionAction(versionId) {
  try {
    const adminClient = createAdminClient();
    
    // Start by deactivating all
    await adminClient
      .from("ai_core_versions")
      .update({ is_active: false })
      .neq("id", versionId); // update all others
      
    // Activate the requested one
    const { data, error } = await adminClient
      .from("ai_core_versions")
      .update({ is_active: true })
      .eq("id", versionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, version: data };
  } catch (error) {
    console.error("[ai-actions] Activate error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAdminAiCoreVersionAction(versionId, { core_instructions }) {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("ai_core_versions")
      .update({ core_instructions })
      .eq("id", versionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, version: data };
  } catch (error) {
    console.error("[ai-actions] Update error:", error);
    return { success: false, error: error.message };
  }
}
