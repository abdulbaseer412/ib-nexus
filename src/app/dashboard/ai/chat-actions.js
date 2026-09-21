"use server";

import {
  getUserConversations,
  createConversation,
  saveMessage,
  getConversationMessages,
  deleteConversation,
  updateConversationTitle
} from "@/lib/ai/chat-persistence-service";

export async function fetchConversationsAction() {
  try {
    const convos = await getUserConversations();
    return { success: true, conversations: convos };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createConversationAction(title) {
  try {
    const convo = await createConversation(title);
    return { success: true, conversation: convo };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveMessageAction(conversationId, role, content) {
  try {
    await saveMessage(conversationId, role, content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchConversationMessagesAction(conversationId) {
  try {
    const messages = await getConversationMessages(conversationId);
    return { success: true, messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteConversationAction(conversationId) {
  try {
    await deleteConversation(conversationId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateConversationTitleAction(conversationId, title) {
  try {
    await updateConversationTitle(conversationId, title);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
