"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

// ═══════════════════════════════════════════════════════════════
// DATABASE BOOTSTRAP — Creates AI tables if they don't exist
// ═══════════════════════════════════════════════════════════════

export async function bootstrapAiTables() {
  const supabase = createAdminClient();

  const sql = `
    -- AI Conversations table
    CREATE TABLE IF NOT EXISTS public.ai_conversations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      model_id TEXT DEFAULT 'gemini-3.6-flash',
      subject TEXT DEFAULT NULL,
      is_pinned BOOLEAN DEFAULT false,
      is_archived BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- AI Messages table
    CREATE TABLE IF NOT EXISTS public.ai_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL DEFAULT '',
      model_id TEXT DEFAULT NULL,
      model_display_name TEXT DEFAULT NULL,
      attachments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

    -- AI Knowledge Items table (Admin-managed)
    CREATE TABLE IF NOT EXISTS public.ai_knowledge_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      programme TEXT DEFAULT NULL,
      subject TEXT DEFAULT NULL,
      level TEXT DEFAULT NULL,
      topic TEXT DEFAULT NULL,
      knowledge_type TEXT DEFAULT 'study_material',
      source TEXT DEFAULT NULL,
      file_url TEXT DEFAULT NULL,
      status TEXT DEFAULT 'Ready',
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ready';
    ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;

    -- AI Model Configurations table (Admin-managed)
    CREATE TABLE IF NOT EXISTS public.ai_model_configs (
      model_id TEXT PRIMARY KEY,
      display_name TEXT,
      description TEXT,
      enabled BOOLEAN DEFAULT true,
      is_paused BOOLEAN DEFAULT false,
      is_hidden BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      allowed_roles TEXT DEFAULT 'all',
      max_tokens INTEGER DEFAULT 2048,
      temperature NUMERIC DEFAULT 0.7,
      fallback_model_id TEXT DEFAULT 'gemini-3.6-flash',
      sort_order INTEGER DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.ai_model_configs ADD COLUMN IF NOT EXISTS allowed_roles TEXT DEFAULT 'all';
    ALTER TABLE public.ai_model_configs ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048;
    ALTER TABLE public.ai_model_configs ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.7;
    ALTER TABLE public.ai_model_configs ADD COLUMN IF NOT EXISTS fallback_model_id TEXT DEFAULT 'gemini-3.6-flash';

    -- AI Training Queue
    CREATE TABLE IF NOT EXISTS public.ai_training_queue (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      source_type TEXT NOT NULL DEFAULT 'manual', -- manual, feedback, correction
      original_question TEXT,
      original_answer TEXT,
      suggested_improvement TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected, published
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- AI Instructions
    CREATE TABLE IF NOT EXISTS public.ai_instructions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- AI Evaluations
    CREATE TABLE IF NOT EXISTS public.ai_evaluations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      dataset_name TEXT NOT NULL,
      run_status TEXT DEFAULT 'pending',
      results JSONB DEFAULT '{}',
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    -- AI Feedback table
    CREATE TABLE IF NOT EXISTS public.ai_feedback (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
      message_id UUID REFERENCES public.ai_messages(id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
      category TEXT DEFAULT NULL,
      comment TEXT DEFAULT NULL,
      model_id TEXT DEFAULT NULL,
      admin_status TEXT DEFAULT 'reported',
      admin_note TEXT DEFAULT NULL,
      reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(user_id, message_id)
    );

    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS admin_status TEXT DEFAULT 'reported';
    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT NULL;
    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    ALTER TABLE public.ai_feedback ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    -- AI User Preferences (Feedback Learning Layer)
    CREATE TABLE IF NOT EXISTS public.ai_user_preferences (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      preferences JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON public.ai_conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active ON public.ai_knowledge_items(is_active);
    CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_training_queue_status ON public.ai_training_queue(status);

    -- Enable RLS
    ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_knowledge_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_user_preferences ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_training_queue ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_instructions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for new admin tables
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage training queue' AND tablename = 'ai_training_queue') THEN
        CREATE POLICY "Admin can manage training queue" ON public.ai_training_queue FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage instructions' AND tablename = 'ai_instructions') THEN
        CREATE POLICY "Admin can manage instructions" ON public.ai_instructions FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage evaluations' AND tablename = 'ai_evaluations') THEN
        CREATE POLICY "Admin can manage evaluations" ON public.ai_evaluations FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;

    -- RLS Policies for ai_conversations
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own conversations' AND tablename = 'ai_conversations') THEN
        CREATE POLICY "Users can view own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own conversations' AND tablename = 'ai_conversations') THEN
        CREATE POLICY "Users can insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own conversations' AND tablename = 'ai_conversations') THEN
        CREATE POLICY "Users can update own conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own conversations' AND tablename = 'ai_conversations') THEN
        CREATE POLICY "Users can delete own conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);
      END IF;
    END $$;

    -- RLS Policies for ai_messages (access through conversation ownership)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages in own conversations' AND tablename = 'ai_messages') THEN
        CREATE POLICY "Users can view messages in own conversations" ON public.ai_messages FOR SELECT
          USING (EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid()));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert messages in own conversations' AND tablename = 'ai_messages') THEN
        CREATE POLICY "Users can insert messages in own conversations" ON public.ai_messages FOR INSERT
          WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = auth.uid()));
      END IF;
    END $$;

    -- RLS Policies for ai_knowledge_items (everyone can read active, admin can write)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active knowledge' AND tablename = 'ai_knowledge_items') THEN
        CREATE POLICY "Anyone can view active knowledge" ON public.ai_knowledge_items FOR SELECT USING (is_active = true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages knowledge' AND tablename = 'ai_knowledge_items') THEN
        CREATE POLICY "Service role manages knowledge" ON public.ai_knowledge_items FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;

    -- RLS Policies for ai_feedback
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own feedback' AND tablename = 'ai_feedback') THEN
        CREATE POLICY "Users can manage own feedback" ON public.ai_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own preferences' AND tablename = 'ai_user_preferences') THEN
        CREATE POLICY "Users can manage own preferences" ON public.ai_user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      END IF;
    END $$;
  `;

  try {
    await supabase.rpc("exec_sql", { sql });
    return { success: true };
  } catch (err) {
    console.warn("[bootstrapAiTables] RPC warning:", err?.message);
    // Try individual table creation as fallback
    try {
      // Check if tables exist by querying them
      await supabase.from("ai_conversations").select("id").limit(0);
      return { success: true, note: "Tables already exist" };
    } catch (e2) {
      return { success: false, error: err?.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION CRUD
// ═══════════════════════════════════════════════════════════════

/** Create a new conversation */
export async function createConversation({ title = "New Chat", modelId = "gemini-3.6-flash", subject = null }) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  let { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      title,
      model_id: modelId,
      subject,
    })
    .select("*")
    .single();

  // Lazy initialization fallback
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    await bootstrapAiTables();
    const retry = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title,
        model_id: modelId,
        subject,
      })
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[createConversation]", error);
    throw new Error("Failed to create conversation");
  }

  return data;
}

/** Get all conversations for the authenticated user */
export async function getConversations({ includeArchived = false } = {}) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  let query = supabase
    .from("ai_conversations")
    .select("id, title, model_id, subject, is_pinned, is_archived, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  let { data, error } = await query;

  // Lazy initialization fallback
  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    await bootstrapAiTables();
    
    // Re-create query after bootstrap
    let retryQuery = supabase
      .from("ai_conversations")
      .select("id, title, model_id, subject, is_pinned, is_archived, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    
    if (!includeArchived) {
      retryQuery = retryQuery.eq("is_archived", false);
    }
    
    const retry = await retryQuery;
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[getConversations]", error);
    return [];
  }

  return data || [];
}

/** Get messages for a specific conversation (paginated) */
export async function getConversationMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  // Verify ownership
  let { data: conv, error: convError } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (convError && (convError.code === '42P01' || convError.message?.includes('does not exist'))) {
    await bootstrapAiTables();
    const retry = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    conv = retry.data;
  }

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[getConversationMessages]", error);
    return [];
  }

  const rawMessages = data || [];
  
  // Deduplicate consecutive assistant messages (keep only the latest assistant response per prompt turn)
  const messages = [];
  const staleMessageIdsToDelete = [];

  for (let i = 0; i < rawMessages.length; i++) {
    const current = rawMessages[i];
    const next = rawMessages[i + 1];

    if (current.role === "assistant" && next && next.role === "assistant") {
      staleMessageIdsToDelete.push(current.id);
    } else {
      messages.push(current);
    }
  }

  if (staleMessageIdsToDelete.length > 0) {
    adminSupabase
      .from("ai_messages")
      .delete()
      .in("id", staleMessageIdsToDelete)
      .then(({ error: delErr }) => {
        if (delErr) console.error("[getConversationMessages] Cleanup stale responses error:", delErr);
      })
      .catch(() => {});
  }
  
  if (messages.length > 0) {
    // Fetch user feedback for these messages
    const { data: feedbackData, error: fbError } = await adminSupabase
      .from("ai_feedback")
      .select("message_id, rating")
      .eq("user_id", user.id)
      .in("message_id", messages.map(m => m.id));
      
    if (!fbError && feedbackData) {
      const feedbackMap = feedbackData.reduce((acc, curr) => {
        acc[curr.message_id] = curr.rating;
        return acc;
      }, {});
      
      return messages.map((m) => ({
        ...m,
        attachments: m.attachments || [],
        feedback: feedbackMap[m.id] || null
      }));
    }
  }

  return messages.map((m) => ({
    ...m,
    attachments: m.attachments || [],
  }));
}

/** Add a message to a conversation */
export async function addMessage(conversationId, { role, content, modelId = null, modelDisplayName = null, attachments = [] }) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  // Verify ownership
  let { data: conv, error: convError } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (convError && (convError.code === '42P01' || convError.message?.includes('does not exist'))) {
    await bootstrapAiTables();
    const retry = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    conv = retry.data;
  }

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const adminSupabase = createAdminClient();
  const insertPayload = {
    conversation_id: conversationId,
    role,
    content: content || "",
    model_id: modelId,
    model_display_name: modelDisplayName,
  };

  if (Array.isArray(attachments) && attachments.length > 0) {
    insertPayload.attachments = attachments;
  }

  let { data, error } = await adminSupabase
    .from("ai_messages")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error && (error.code === "PGRST204" || error.message?.includes("attachments") || error.code === "42703")) {
    console.warn("[addMessage] Schema warning on attachments column, retrying insert without attachments column:", error.message);
    delete insertPayload.attachments;
    const retry = await adminSupabase
      .from("ai_messages")
      .insert(insertPayload)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[addMessage]", error);
    throw new Error("Failed to add message: " + JSON.stringify(error));
  }

  // Update conversation's updated_at
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

/** Pin/unpin a conversation */
export async function pinConversation(conversationId, isPinned) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("ai_conversations")
    .update({ is_pinned: isPinned })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[pinConversation]", error);
    throw new Error("Failed to update pin status");
  }

  return { success: true };
}

/** Rename a conversation */
export async function renameConversation(conversationId, newTitle) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: newTitle })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[renameConversation]", error);
    throw new Error("Failed to rename conversation");
  }

  return { success: true };
}

/** Archive a conversation */
export async function archiveConversation(conversationId, isArchived) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("ai_conversations")
    .update({ is_archived: isArchived })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[archiveConversation]", error);
    throw new Error("Failed to archive conversation");
  }

  return { success: true };
}

/** Delete a conversation (and its messages via CASCADE) */
export async function deleteConversation(conversationId) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteConversation]", error);
    throw new Error("Failed to delete conversation");
  }

  return { success: true };
}

/** Delete all conversations for the authenticated user */
export async function deleteAllConversations() {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteAllConversations]", error);
    throw new Error("Failed to clear conversations");
  }

  return { success: true };
}

/** Search conversations ONLY by title (Requirement 19) */
export async function searchConversations(query) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  if (!query || query.trim().length < 1) return [];

  const searchTerm = `%${query.trim()}%`;

  // Search conversation titles ONLY
  const { data: titleMatches } = await supabase
    .from("ai_conversations")
    .select("id, title, model_id, subject, is_pinned, is_archived, updated_at")
    .eq("user_id", user.id)
    .ilike("title", searchTerm)
    .order("updated_at", { ascending: false })
    .limit(50);

  return titleMatches || [];
}

/** Update conversation's model and subject */
export async function updateConversationContext(conversationId, { modelId, subject }) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const patch = {};
  if (modelId !== undefined) patch.model_id = modelId;
  if (subject !== undefined) patch.subject = subject;

  const { error } = await supabase
    .from("ai_conversations")
    .update(patch)
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateConversationContext]", error);
    throw new Error("Failed to update conversation context");
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════

/** Submit feedback for a message */
export async function submitFeedback({
  conversationId,
  messageId,
  rating,
  category = null,
  comment = null,
  modelId = null,
}) {
  const user = await requireAuth();

  // If temporary conversation or message, do not save feedback to database
  if (
    (typeof conversationId === "string" && conversationId.startsWith("temp_")) ||
    (typeof messageId === "string" && messageId.startsWith("temp_"))
  ) {
    return { id: "temp_fb_" + Date.now(), rating, category, comment, transient: true };
  }

  const supabase = createAdminClient();

  // Check if an existing feedback entry exists for this user and message/conversation
  let existing = null;
  if (messageId) {
    const { data: ex } = await supabase
      .from("ai_feedback")
      .select("id")
      .eq("user_id", user.id)
      .eq("message_id", messageId)
      .maybeSingle();
    existing = ex;
  } else if (conversationId) {
    const { data: ex } = await supabase
      .from("ai_feedback")
      .select("id")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .is("message_id", null)
      .maybeSingle();
    existing = ex;
  }

  let result;
  if (existing?.id) {
    result = await supabase
      .from("ai_feedback")
      .update({
        rating,
        category,
        comment,
        model_id: modelId,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
  } else {
    result = await supabase
      .from("ai_feedback")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        message_id: messageId,
        rating,
        category,
        comment,
        model_id: modelId,
      })
      .select("*")
      .single();
  }

  if (result.error) {
    console.error("[submitFeedback]", result.error);
    throw new Error("Failed to submit feedback: " + (result.error.message || result.error.details));
  }

  return result.data;
}

// ═══════════════════════════════════════════════════════════════
// PREFERENCES & EDITING
// ═══════════════════════════════════════════════════════════════

/** Get user AI preferences */
export async function getUserPreferences(userId) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("ai_user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .single();
  return data?.preferences || {};
}

/** Update user AI preferences */
export async function updateUserPreferences(userId, newPreferences) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ai_user_preferences")
    .upsert(
      {
        user_id: userId,
        preferences: newPreferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (error) console.error("[updateUserPreferences]", error);
}

/** Edit a message and truncate the conversation from that point */
export async function editMessageAndTruncate(conversationId, messageId, newContent) {
  const user = await requireAuth();
  const supabase = await createServerClient();

  // 1. Get the target message to find its timestamp
  const { data: targetMsg, error: getErr } = await supabase
    .from("ai_messages")
    .select("created_at, role")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (getErr || !targetMsg) throw new Error("Message not found");
  if (targetMsg.role !== "user") throw new Error("Can only edit user messages");

  // 2. Delete all messages in the conversation strictly AFTER this message's created_at
  const { error: delErr } = await supabase
    .from("ai_messages")
    .delete()
    .eq("conversation_id", conversationId)
    .gt("created_at", targetMsg.created_at);
    
  if (delErr) console.error("[editMessageAndTruncate] Delete downstream error:", delErr);

  // 3. Update the target message content
  const { data: updatedMsg, error: updateErr } = await supabase
    .from("ai_messages")
    .update({ content: newContent })
    .eq("id", messageId)
    .select("*")
    .single();

  return updatedMsg;
}

/** Truncate all messages after a given message or timestamp in a conversation */
export async function truncateAfterMessage(conversationId, messageId = null, createdAt = null) {
  const user = await requireAuth();
  const supabase = await createServerClient();
  const adminSupabase = createAdminClient();

  // 1. Verify ownership
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) {
    console.error("[truncateAfterMessage] Conversation not found or access denied:", conversationId);
    return false;
  }

  let targetCreatedAt = createdAt;
  let isAssistantTarget = false;

  if (messageId) {
    const { data: targetMsg } = await adminSupabase
      .from("ai_messages")
      .select("created_at, role")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (targetMsg) {
      targetCreatedAt = targetMsg.created_at;
      if (targetMsg.role === "assistant") {
        isAssistantTarget = true;
      }
    }
  }

  if (!targetCreatedAt) {
    const { data: userMsgs } = await adminSupabase
      .from("ai_messages")
      .select("created_at")
      .eq("conversation_id", conversationId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1);

    if (userMsgs && userMsgs.length > 0) {
      targetCreatedAt = userMsgs[0].created_at;
    }
  }

  if (targetCreatedAt) {
    const { error: delErr } = isAssistantTarget
      ? await adminSupabase.from("ai_messages").delete().eq("conversation_id", conversationId).gte("created_at", targetCreatedAt)
      : await adminSupabase.from("ai_messages").delete().eq("conversation_id", conversationId).gt("created_at", targetCreatedAt);

    if (delErr) console.error("[truncateAfterMessage] Delete downstream error:", delErr);
  } else {
    // Fallback: Delete all assistant messages in this conversation if no timestamp found
    const { error: delErr } = await adminSupabase
      .from("ai_messages")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("role", "assistant");

    if (delErr) console.error("[truncateAfterMessage] Fallback delete assistant error:", delErr);
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
// AUTO TITLE GENERATION
// ═══════════════════════════════════════════════════════════════

/** Generate a concise chat title from the first user message */
export async function generateChatTitle(firstMessage) {
  if (!firstMessage) return "New Chat";

  const text = firstMessage.trim();

  // Remove question marks and trim
  const cleaned = text.replace(/\?+$/, "").trim();

  // If short enough, use as-is
  if (cleaned.length <= 40) return cleaned;

  // Take first ~40 chars at a word boundary
  const truncated = cleaned.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20 ? truncated.substring(0, lastSpace) + "…" : truncated + "…";
}
