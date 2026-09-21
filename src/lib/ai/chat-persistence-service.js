import { createServerClient } from "@/lib/supabase/server";

export async function getUserConversations() {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createConversation(title) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert([{ user_id: user.id, title: title || "New Conversation" }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMessage(conversationId, role, content) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ai_messages")
    .insert([{ conversation_id: conversationId, role, content }]);

  if (error) throw error;

  // Update conversation updated_at
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function getConversationMessages(conversationId) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function deleteConversation(conversationId) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw error;
}

export async function updateConversationTitle(conversationId, title) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw error;
}
