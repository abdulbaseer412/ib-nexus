/**
 * Knowledge Retrieval Service for AI Tutor
 *
 * Retrieves relevant approved IB knowledge items from ai_knowledge_items
 * based on user context (programme, subject, level, topic).
 *
 * Uses metadata-based matching (not vector similarity) for V1.
 */

import { createServerClient } from "@/lib/supabase/server";

/**
 * Retrieve relevant knowledge items for the current AI request context.
 *
 * @param {Object} context
 * @param {string} context.programme - "DP" or "MYP"
 * @param {string} context.subject - Subject name
 * @param {string} context.level - "HL" or "SL" or null
 * @param {string} context.query - User's question for basic keyword matching
 * @param {number} context.limit - Max items to return
 * @returns {Array} Matching knowledge items
 */
export async function retrieveKnowledge({
  programme = null,
  subject = null,
  level = null,
  query = "",
  limit = 3,
} = {}) {
  try {
    const supabase = await createServerClient();

    let dbQuery = supabase
      .from("ai_knowledge_items")
      .select("id, title, content, programme, subject, level, topic, knowledge_type, source, file_url, status")
      .eq("status", "Ready")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by programme if provided
    if (programme) {
      dbQuery = dbQuery.or(`programme.eq.${programme.toLowerCase()},programme.is.null`);
    }

    // Filter by subject if provided
    if (subject) {
      dbQuery = dbQuery.or(`subject.ilike.%${subject}%,subject.is.null`);
    }

    // Filter by level if provided
    if (level) {
      dbQuery = dbQuery.or(`level.eq.${level.toUpperCase()},level.is.null`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("[retrieveKnowledge] Error:", error?.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Basic keyword relevance scoring
    if (query && query.trim().length > 0) {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      const scored = data.map((item) => {
        let score = 0;
        const searchable = `${item.title} ${item.topic || ""} ${item.content.substring(0, 500)}`.toLowerCase();

        for (const word of queryWords) {
          if (searchable.includes(word)) score++;
        }

        // Boost exact subject matches
        if (subject && item.subject?.toLowerCase().includes(subject.toLowerCase())) {
          score += 3;
        }

        // Boost exact level matches
        if (level && item.level?.toUpperCase() === level.toUpperCase()) {
          score += 2;
        }

        return { ...item, _score: score };
      });

      // Sort by relevance score and return top items
      scored.sort((a, b) => b._score - a._score);
      return scored.slice(0, limit).filter(item => item._score > 0);
    }

    return data;
  } catch (err) {
    console.error("[retrieveKnowledge] Unexpected error:", err?.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN KNOWLEDGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Admin: Add a knowledge item
 */
export async function addKnowledgeItem({
  title,
  content,
  programme = null,
  subject = null,
  level = null,
  topic = null,
  knowledgeType = "study_material",
  source = null,
  createdBy = null,
  ...payload
}) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_knowledge_items")
    .insert({
      title,
      content,
      programme: programme?.toLowerCase() || null,
      subject,
      level: level?.toUpperCase() || null,
      topic,
      knowledge_type: knowledgeType,
      source,
      file_url: payload.file_url || null,
      status: payload.status || 'Ready',
      created_by: createdBy,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[addKnowledgeItem]", error);
    throw new Error("Failed to add knowledge item");
  }

  return data;
}

/**
 * Admin: Edit a knowledge item
 */
export async function editKnowledgeItem(id, updates) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_knowledge_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[editKnowledgeItem]", error);
    throw new Error("Failed to edit knowledge item");
  }

  return data;
}

/**
 * Admin: Get all knowledge items
 */
export async function getAllKnowledgeItems({ includeInactive = false } = {}) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  let query = supabase
    .from("ai_knowledge_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.neq("status", "Disabled");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAllKnowledgeItems]", error);
    return [];
  }

  return data || [];
}

/**
 * Admin: Toggle knowledge item active status
 */
export async function toggleKnowledgeItem(id, isActive) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_knowledge_items")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[toggleKnowledgeItem]", error);
    throw new Error("Failed to toggle knowledge item");
  }

  return { success: true };
}

/**
 * Admin: Delete a knowledge item
 */
export async function deleteKnowledgeItem(id) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_knowledge_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteKnowledgeItem]", error);
    throw new Error("Failed to delete knowledge item");
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN FEEDBACK/METRICS RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * Admin: Get AI feedback items for review
 */
export async function getAiFeedback({ limit = 50 } = {}) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_feedback")
    .select("*, ai_messages(content, role), ai_conversations(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAiFeedback]", error);
    return [];
  }

  return data || [];
}

/**
 * Admin: Get AI metrics overview
 */
export async function getAiMetrics() {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  try {
    const [convRes, msgRes, posFb, negFb] = await Promise.all([
      supabase.from("ai_conversations").select("id", { count: "exact", head: true }),
      supabase.from("ai_messages").select("id", { count: "exact", head: true }).eq("role", "assistant"),
      supabase.from("ai_feedback").select("id", { count: "exact", head: true }).eq("rating", "positive"),
      supabase.from("ai_feedback").select("id", { count: "exact", head: true }).eq("rating", "negative"),
    ]);

    return {
      totalConversations: convRes.count || 0,
      totalAiResponses: msgRes.count || 0,
      positiveFeedback: posFb.count || 0,
      negativeFeedback: negFb.count || 0,
    };
  } catch (err) {
    console.error("[getAiMetrics]", err?.message);
    return {
      totalConversations: 0,
      totalAiResponses: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
    };
  }
}

/**
 * Admin: Get training queue
 */
export async function getTrainingQueue({ limit = 50, status = "all" } = {}) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  let query = supabase
    .from("ai_training_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getTrainingQueue]", error);
    return [];
  }
  return data || [];
}

/**
 * Admin: Add to training queue
 */
export async function addToTrainingQueue(payload) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_training_queue")
    .insert({
      source_type: payload.source_type || 'manual',
      original_question: payload.original_question,
      original_answer: payload.original_answer,
      suggested_improvement: payload.suggested_improvement,
      status: 'pending',
      created_by: payload.created_by || null,
    })
    .select("*")
    .single();

  if (error) throw new Error("Failed to add to queue");
  return data;
}

/**
 * Admin: Update queue status
 */
export async function updateQueueStatus(id, status) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_training_queue")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("Failed to update queue status");
  return { success: true };
}

/**
 * Admin: Get all AI instructions
 */
export async function getAiInstructions() {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_instructions")
    .select("*")
    .eq("is_active", true)
    .order("category");

  if (error) {
    console.error("[getAiInstructions]", error);
    return [];
  }
  return data || [];
}

/**
 * Admin: Save AI instruction
 */
export async function saveAiInstruction(category, content, updatedBy) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  // Upsert pattern
  const { data: existing } = await supabase
    .from("ai_instructions")
    .select("id")
    .eq("category", category)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("ai_instructions")
      .update({ content, updated_by: updatedBy, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error("Failed to update instruction");
    return data;
  } else {
    const { data, error } = await supabase
      .from("ai_instructions")
      .insert({ category, content, updated_by: updatedBy })
      .select("*")
      .single();
    if (error) throw new Error("Failed to insert instruction");
    return data;
  }
}
