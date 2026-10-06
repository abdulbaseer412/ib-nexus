"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";

import { parseCoreInstructions, serializeCoreInstructions, compileConstitution } from "@/lib/ai/nexus-compiler";
import { invalidateNexusCoreCache } from "@/lib/ai/nexus-core";

export async function fetchAdminAiCoreVersionsAction() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .order("version_number", { ascending: false });

    if (error) throw error;

    const versions = (data || []).map(v => {
      const parsed = parseCoreInstructions(v.core_instructions);
      return {
        ...v,
        raw_instructions: parsed.rawText,
        meta: parsed.meta,
        compiled_constitution: parsed.meta?.compiled_constitution || null,
        summary: parsed.meta?.summary || `Version ${v.version_number}`,
        status: v.is_active ? 'active' : (parsed.meta?.status || 'archived'),
      };
    });

    return { success: true, versions };
  } catch (error) {
    console.error("[ai-actions] Fetch error:", error);
    return { success: false, error: error.message };
  }
}

export async function compileAdminAiCoreDraftAction({ core_instructions }) {
  try {
    const adminClient = createAdminClient();
    const { data: activeVersion } = await adminClient
      .from("ai_core_versions")
      .select("core_instructions")
      .eq("is_active", true)
      .maybeSingle();

    const activeText = activeVersion ? parseCoreInstructions(activeVersion.core_instructions).rawText : "";
    const compiled = compileConstitution(core_instructions, activeText);

    return { success: true, compiled };
  } catch (error) {
    console.error("[ai-actions] Compile draft error:", error);
    return { success: false, error: error.message };
  }
}

export async function createAdminAiCoreVersionAction({ core_instructions, publish = false }) {
  try {
    const adminClient = createAdminClient();
    const { data: activeVersion } = await adminClient
      .from("ai_core_versions")
      .select("core_instructions")
      .eq("is_active", true)
      .maybeSingle();

    const activeText = activeVersion ? parseCoreInstructions(activeVersion.core_instructions).rawText : "";
    const compiled = compileConstitution(core_instructions, activeText);

    const meta = {
      summary: compiled.summary,
      status: publish ? "active" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      compiled_constitution: compiled,
      conflicts: compiled.conflicts,
    };

    const serialized = serializeCoreInstructions(core_instructions, meta);

    const { data: latest } = await adminClient
      .from("ai_core_versions")
      .select("version_number")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const nextVersion = latest ? latest.version_number + 1 : 1;

    if (publish) {
      await adminClient.from("ai_core_versions").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { data, error } = await adminClient
      .from("ai_core_versions")
      .insert({
        version_number: nextVersion,
        core_instructions: serialized,
        is_active: publish
      })
      .select()
      .single();

    if (error) throw error;
    invalidateNexusCoreCache();

    const parsed = parseCoreInstructions(data.core_instructions);
    const enrichedVersion = {
      ...data,
      raw_instructions: parsed.rawText,
      meta: parsed.meta,
      compiled_constitution: parsed.meta?.compiled_constitution || null,
      summary: parsed.meta?.summary || `Version ${data.version_number}`,
      status: publish ? 'active' : 'draft',
    };

    return { success: true, version: enrichedVersion };
  } catch (error) {
    console.error("[ai-actions] Create error:", error);
    return { success: false, error: error.message };
  }
}

export async function activateAdminAiCoreVersionAction(versionId) {
  try {
    const adminClient = createAdminClient();
    
    await adminClient
      .from("ai_core_versions")
      .update({ is_active: false })
      .neq("id", versionId);
      
    const { data, error } = await adminClient
      .from("ai_core_versions")
      .update({ is_active: true })
      .eq("id", versionId)
      .select()
      .single();

    if (error) throw error;
    invalidateNexusCoreCache();

    const parsed = parseCoreInstructions(data.core_instructions);
    const enrichedVersion = {
      ...data,
      raw_instructions: parsed.rawText,
      meta: parsed.meta,
      compiled_constitution: parsed.meta?.compiled_constitution || null,
      summary: parsed.meta?.summary || `Version ${data.version_number}`,
      status: 'active',
    };

    return { success: true, version: enrichedVersion };
  } catch (error) {
    console.error("[ai-actions] Activate error:", error);
    return { success: false, error: error.message };
  }
}

export async function rollbackAdminAiCoreVersionAction(baseVersionId) {
  try {
    const adminClient = createAdminClient();

    const { data: baseVer, error: baseErr } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .eq("id", baseVersionId)
      .single();

    if (baseErr || !baseVer) throw new Error("Base version not found for rollback");

    const parsedBase = parseCoreInstructions(baseVer.core_instructions);
    const rawText = parsedBase.rawText;

    const res = await createAdminAiCoreVersionAction({
      core_instructions: rawText,
      publish: true
    });

    if (!res.success) throw new Error(res.error);
    return res;
  } catch (error) {
    console.error("[ai-actions] Rollback error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAdminAiCoreRuleAction({ ruleText }) {
  try {
    const { user: adminUser } = await requireAdmin();
    const adminClient = createAdminClient();

    if (!ruleText || !ruleText.trim()) {
      return { success: false, error: "Rule text is required for deletion." };
    }

    const { data: activeVersion, error: fetchError } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (fetchError || !activeVersion) {
      return { success: false, error: "No active Core Constitution found to delete rule from." };
    }

    const parsed = parseCoreInstructions(activeVersion.core_instructions);
    const rawText = parsed.rawText || "";

    const targetRuleClean = ruleText.trim().toLowerCase();
    const lines = rawText.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    const remainingLines = lines.filter((line) => {
      const cleanLine = line.toLowerCase().replace(/^[-*•\d+.]\s*/, "");
      return cleanLine !== targetRuleClean && !cleanLine.includes(targetRuleClean) && !targetRuleClean.includes(cleanLine);
    });

    const updatedInstructions = remainingLines.join("\n").trim();

    // Create and activate new version with rule removed
    const newVerRes = await createAdminAiCoreVersionAction({
      core_instructions: updatedInstructions,
      publish: true,
    });

    if (!newVerRes.success) {
      throw new Error(newVerRes.error || "Failed to create new Core version after rule deletion.");
    }

    // Insert Activity Audit Log
    try {
      await adminClient.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "DELETE_NEXUS_CORE_RULE",
        target_type: "ai_core_rule",
        target_id: String(newVerRes.version?.version_number || "new"),
        details: `Deleted custom AI Core rule: "${ruleText.trim()}". Published & activated Version ${newVerRes.version?.version_number}.`,
      });
    } catch (logErr) {
      console.warn("[ai-actions] Failed to log activity audit for rule deletion:", logErr);
    }

    return {
      success: true,
      version: newVerRes.version,
      message: `Rule deleted successfully. Published Version ${newVerRes.version?.version_number}.`,
    };
  } catch (error) {
    console.error("[ai-actions] Delete rule error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAdminAiCoreVersionAction(versionId) {
  try {
    const { user: adminUser } = await requireAdmin();
    const adminClient = createAdminClient();

    const { data: targetVersion, error: fetchErr } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (fetchErr || !targetVersion) {
      return { success: false, error: "Version not found." };
    }

    const wasActive = targetVersion.is_active;

    const { error: deleteErr } = await adminClient
      .from("ai_core_versions")
      .delete()
      .eq("id", versionId);

    if (deleteErr) throw deleteErr;

    if (wasActive) {
      const { data: latestRemaining } = await adminClient
        .from("ai_core_versions")
        .select("*")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRemaining) {
        await adminClient
          .from("ai_core_versions")
          .update({ is_active: true })
          .eq("id", latestRemaining.id);
      }
    }

    invalidateNexusCoreCache();

    // Re-fetch remaining versions list
    const { data: remainingData } = await adminClient
      .from("ai_core_versions")
      .select("*")
      .order("version_number", { ascending: false });

    const versions = (remainingData || []).map((v) => {
      const parsed = parseCoreInstructions(v.core_instructions);
      return {
        ...v,
        raw_instructions: parsed.rawText,
        meta: parsed.meta,
        compiled_constitution: parsed.meta?.compiled_constitution || null,
        summary: parsed.meta?.summary || `Version ${v.version_number}`,
        status: v.is_active ? "active" : parsed.meta?.status || "archived",
      };
    });

    try {
      await adminClient.from("admin_activity_logs").insert({
        actor_id: adminUser.id,
        actor_email: adminUser.email || "admin@ibnexus.com",
        action: "DELETE_NEXUS_CORE_VERSION",
        target_type: "ai_core_version",
        target_id: String(targetVersion.version_number),
        details: `Deleted AI Core Version ${targetVersion.version_number}.${wasActive ? " Reverted active version or system defaults." : ""}`,
      });
    } catch (logErr) {
      console.warn("[ai-actions] Audit log error:", logErr);
    }

    return {
      success: true,
      versions,
      message: `Version ${targetVersion.version_number} deleted successfully.`,
    };
  } catch (error) {
    console.error("[ai-actions] Delete version error:", error);
    return { success: false, error: error.message };
  }
}


export async function testAdminAiCoreDraftAction({ draft_instructions, prompt, model_id }) {
  try {
    const { streamAIChat } = await import("@/lib/ai/router");
    const { getActiveNexusCore } = await import("@/lib/ai/nexus-core");

    const activeRules = await getActiveNexusCore();
    
    const activeOptions = {
      modelId: model_id || "gemini-3.6-flash",
      messages: [{ role: "user", content: prompt }],
      userProfile: { display_name: "Admin Tester", ib_program: "DP", exam_session: "May 2026" },
      masterRules: activeRules,
    };

    const draftCompiled = compileConstitution(draft_instructions, activeRules?.[0]?.rule_text || "");
    const draftMasterRules = [{
      category: "Nexus Identity & Behavior",
      rule_text: draft_instructions,
      compiled_constitution: draftCompiled,
      version_number: "Draft Preview"
    }];

    const draftOptions = {
      modelId: model_id || "gemini-3.6-flash",
      messages: [{ role: "user", content: prompt }],
      userProfile: { display_name: "Admin Tester", ib_program: "DP", exam_session: "May 2026" },
      masterRules: draftMasterRules,
    };

    let activeOutput = "";
    try {
      for await (const chunk of streamAIChat(activeOptions)) {
        activeOutput += chunk;
      }
    } catch (e) {
      activeOutput = `[Active Model Output Error]: ${e.message}`;
    }

    let draftOutput = "";
    try {
      for await (const chunk of streamAIChat(draftOptions)) {
        draftOutput += chunk;
      }
    } catch (e) {
      draftOutput = `[Draft Model Output Error]: ${e.message}`;
    }

    return {
      success: true,
      activeOutput: activeOutput.trim() || "No response received",
      draftOutput: draftOutput.trim() || "No response received",
    };
  } catch (error) {
    console.error("[ai-actions] Test draft error:", error);
    return { success: false, error: error.message };
  }
}

// ─── ADMIN AI FEEDBACK ACTIONS ──────────────────────────────────────────────

export async function fetchAdminAiFeedbackAction(params = {}) {
  try {
    const adminClient = createAdminClient();
    
    let query = adminClient
      .from("ai_feedback")
      .select(`
        *,
        ai_messages(
          id, role, content, model_id, model_display_name, created_at, conversation_id
        )
      `);

    const filters = params.filters || {};

    // 1. Rating
    if (filters.rating && filters.rating !== "all") {
      if (filters.rating === "positive") query = query.gte("rating", 4);
      else if (filters.rating === "negative") query = query.lte("rating", 3);
    }

    // 2. Dates
    if (filters.dateFrom) query = query.gte("created_at", new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.lte("created_at", toDate.toISOString());
    }

    // 3. Status & Reason (Negative only)
    if (filters.negativeStatus && filters.negativeStatus !== "all") {
      if (filters.negativeStatus === "reported") {
        query = query.in("admin_status", ["new", "reported", null]);
      } else {
        query = query.eq("admin_status", filters.negativeStatus);
      }
    }
    
    if (filters.negativeReason && filters.negativeReason !== "all") {
      query = query.ilike("category", `%${filters.negativeReason}%`);
    }

    // 4. Model & Provider
    if (filters.modelId && filters.modelId !== "all") {
      query = query.eq("model_id", filters.modelId);
    }
    
    if (filters.provider && filters.provider !== "all") {
      query = query.ilike("model_id", `${filters.provider.toLowerCase()}-%`);
    }

    // 5. User Email/Name -> Profile Join
    let matchingUserIds = null;
    if (filters.email || filters.name) {
      let pQuery = adminClient.from("profiles").select("id");
      if (filters.email) pQuery = pQuery.ilike("email", `%${filters.email}%`);
      if (filters.name) pQuery = pQuery.or(`full_name.ilike.%${filters.name}%,display_name.ilike.%${filters.name}%`);
      const { data: pData } = await pQuery;
      if (!pData || pData.length === 0) return { success: true, feedback: [], count: 0 };
      matchingUserIds = pData.map(p => p.id);
      query = query.in("user_id", matchingUserIds);
    }

    // 6. Message Content Filters
    // Note: If issueKeywords is provided, it should search across feedback comment, reason (category), AND message content.
    // To handle this properly in Supabase without complex OR subqueries:
    // We fetch conversation IDs that match the message-specific filters.
    
    let cIdsSets = [];
    let hasMessageFilters = false;

    if (filters.userPrompt) {
      hasMessageFilters = true;
      const { data: d1 } = await adminClient.from("ai_messages").select("conversation_id").eq("role", "user").ilike("content", `%${filters.userPrompt}%`);
      cIdsSets.push((d1 || []).map(m => m.conversation_id));
    }
    if (filters.aiResponse) {
      hasMessageFilters = true;
      const { data: d2 } = await adminClient.from("ai_messages").select("conversation_id").in("role", ["assistant", "model"]).ilike("content", `%${filters.aiResponse}%`);
      cIdsSets.push((d2 || []).map(m => m.conversation_id));
    }
    if (filters.topic) {
      hasMessageFilters = true;
      const { data: d3 } = await adminClient.from("ai_messages").select("conversation_id").ilike("content", `%${filters.topic}%`);
      cIdsSets.push((d3 || []).map(m => m.conversation_id));
    }
    
    let kwCids = null;
    if (filters.issueKeywords) {
      const { data: d4 } = await adminClient.from("ai_messages").select("conversation_id").ilike("content", `%${filters.issueKeywords}%`);
      kwCids = (d4 || []).map(m => m.conversation_id);
    }

    if (hasMessageFilters) {
      let intersection = cIdsSets[0];
      for (let i = 1; i < cIdsSets.length; i++) {
        intersection = intersection.filter(id => cIdsSets[i].includes(id));
      }
      
      // If issueKeywords is also provided, we just intersect it with the message results?
      // Wait, issueKeywords can match comment OR messages.
      // So if there are other message filters, we must intersect them first.
      
      if (intersection.length === 0) return { success: true, feedback: [], count: 0 };
      
      if (filters.issueKeywords) {
         // It must match the intersection AND (msgKeyword OR comment Keyword)
         query = query.in("conversation_id", intersection);
         query = query.or(`comment.ilike.%${filters.issueKeywords}%,category.ilike.%${filters.issueKeywords}%,conversation_id.in.(${kwCids.join(',') || 'none'})`);
      } else {
         query = query.in("conversation_id", intersection);
      }
    } else if (filters.issueKeywords) {
      // No other message filters, just issueKeywords
      query = query.or(`comment.ilike.%${filters.issueKeywords}%,category.ilike.%${filters.issueKeywords}%,conversation_id.in.(${kwCids.join(',') || 'none'})`);
    }

    query = query.order("created_at", { ascending: false }).limit(params.limit || 100);
    const { data: feedbackData, error: feedbackError } = await query;

    if (feedbackError) throw feedbackError;

    const userIds = Array.from(new Set((feedbackData || []).map(fb => fb.user_id).filter(Boolean)));
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, display_name, email, avatar_url, ib_program, exam_session")
        .in("id", userIds);
      if (profiles) {
        profiles.forEach(p => {
          profilesMap[p.id] = p;
        });
      }
    }

    const enrichedData = await Promise.all((feedbackData || []).map(async (fb) => {
      let promptContent = "Prompt unavailable";
      let aiResponseContent = fb.ai_messages?.content || null;
      let modelId = fb.model_id || fb.ai_messages?.model_id || null;
      let modelDisplayName = fb.ai_messages?.model_display_name || null;

      // If ai_messages is missing or message_id is set, fetch exact message from ai_messages by message_id
      if (!aiResponseContent && fb.message_id) {
        const { data: msg } = await adminClient
          .from("ai_messages")
          .select("content, role, created_at, conversation_id, model_id, model_display_name")
          .eq("id", fb.message_id)
          .single();
        if (msg) {
          aiResponseContent = msg.content;
          modelId = modelId || msg.model_id;
          modelDisplayName = modelDisplayName || msg.model_display_name;
          fb.ai_messages = msg;
        }
      }

      const convId = fb.conversation_id || fb.ai_messages?.conversation_id;
      const aiTime = fb.ai_messages?.created_at || fb.created_at;

      if (convId) {
        const { data: promptList } = await adminClient
          .from("ai_messages")
          .select("content")
          .eq("conversation_id", convId)
          .eq("role", "user")
          .lte("created_at", aiTime)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (promptList && promptList.length > 0) {
          promptContent = promptList[0].content;
        } else {
          const { data: anyPrompt } = await adminClient
            .from("ai_messages")
            .select("content")
            .eq("conversation_id", convId)
            .eq("role", "user")
            .order("created_at", { ascending: true })
            .limit(1);
          if (anyPrompt && anyPrompt.length > 0) {
            promptContent = anyPrompt[0].content;
          }
        }
      }
      
      const profile = profilesMap[fb.user_id] || {};
      const normalizedStatus = (!fb.admin_status || fb.admin_status === "new") ? "reported" : fb.admin_status;
      const displayName = profile.display_name || profile.full_name || (profile.email ? profile.email.split('@')[0] : "User");
      const ibProg = profile.ib_program ? profile.ib_program.toUpperCase() : null;
      const examSession = profile.exam_session || null;

      return {
        ...fb,
        model_id: modelId,
        model_display_name: modelDisplayName,
        admin_status: normalizedStatus,
        users: {
          id: fb.user_id,
          email: profile.email || "Unknown user",
          raw_user_meta_data: {
            full_name: profile.full_name || displayName,
            display_name: displayName,
            avatar_url: profile.avatar_url || null,
            ib_program: ibProg,
            exam_session: examSession,
          },
        },
        prompt: promptContent,
        ai_response: aiResponseContent || "AI response unavailable",
      };
    }));

    return { success: true, feedback: enrichedData, count: enrichedData.length };
  } catch (err) {
    console.error("[ai-actions] fetchAdminAiFeedbackAction error:", err);
    return { success: false, error: err.message || err.details || "Unknown error" };
  }
}

export async function updateAdminAiFeedbackStatusAction(feedbackId, status) {
  try {
    const { user: adminUser } = await requireAdmin();
    const ALLOWED_STATUSES = ["reported", "under_review", "resolved"];
    
    if (!ALLOWED_STATUSES.includes(status)) {
      return { success: false, error: "Invalid status value. Allowed: reported, under_review, resolved." };
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();
    const updatePayload = {
      admin_status: status,
    };

    if (status === "under_review") {
      updatePayload.reviewed_at = now;
      updatePayload.reviewed_by = adminUser.id;
    } else if (status === "resolved") {
      updatePayload.resolved_at = now;
      updatePayload.resolved_by = adminUser.id;
    }
    
    const { data, error } = await adminClient
      .from("ai_feedback")
      .update(updatePayload)
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, feedback: data };
  } catch (error) {
    console.error("[ai-actions] updateAdminAiFeedbackStatusAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAdminAiFeedbackNoteAction(feedbackId, note) {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("ai_feedback")
      .update({ admin_note: note })
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, feedback: data };
  } catch (error) {
    console.error("[ai-actions] updateAdminAiFeedbackNoteAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAdminAiFeedbackAction(feedbackId) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("ai_feedback")
      .delete()
      .eq("id", feedbackId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[ai-actions] deleteAdminAiFeedbackAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAllAdminNegativeFeedbackAction() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("ai_feedback")
      .delete()
      .eq("rating", "negative");

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[ai-actions] deleteAllAdminNegativeFeedbackAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAllAdminPositiveFeedbackAction() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("ai_feedback")
      .delete()
      .eq("rating", "positive");

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[ai-actions] deleteAllAdminPositiveFeedbackAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMultipleAdminAiFeedbackAction(ids) {
  try {
    await requireAdmin();
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "No feedback IDs provided for deletion." };
    }
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("ai_feedback")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return { success: true, count: ids.length };
  } catch (error) {
    console.error("[ai-actions] deleteMultipleAdminAiFeedbackAction error:", error);
    return { success: false, error: error.message };
  }
}

