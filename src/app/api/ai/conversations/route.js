import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createConversation,
  getConversations,
  getConversationMessages,
  pinConversation,
  renameConversation,
  archiveConversation,
  deleteConversation,
  deleteAllConversations,
  searchConversations,
  addMessage,
  updateConversationContext,
  submitFeedback,
} from "@/lib/ai/db-conversations";
import { bootstrapAiTables } from "@/lib/ai/db-conversations";
import { getClientModelsWithHealth } from "@/lib/ai/models";

/**
 * GET /api/ai/conversations
 */
export async function GET(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        const includeArchived = searchParams.get("archived") === "true";
        const conversations = await getConversations({ includeArchived });
        return NextResponse.json({ conversations });
      }

      case "messages": {
        const id = searchParams.get("id");
        if (!id) {
          return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
        }
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
        const messages = await getConversationMessages(id, { limit, offset });
        return NextResponse.json({ messages });
      }

      case "search": {
        const q = searchParams.get("q") || "";
        const results = await searchConversations(q);
        return NextResponse.json({ conversations: results });
      }

      case "models": {
        const models = await getClientModelsWithHealth();
        return NextResponse.json({ models });
      }

      case "bootstrap": {
        const result = await bootstrapAiTables();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    console.error("[api/ai/conversations] GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/ai/conversations
 */
export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const conv = await createConversation({
          title: body.title || "New Chat",
          modelId: body.modelId || "gemini-3.6-flash",
          subject: body.subject || null,
        });
        return NextResponse.json({ conversation: conv });
      }

      case "addMessage": {
        if (!body.conversationId || !body.role || body.content === undefined) {
          return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }
        const msg = await addMessage(body.conversationId, {
          role: body.role,
          content: body.content,
          modelId: body.modelId || null,
          modelDisplayName: body.modelDisplayName || null,
          attachments: body.attachments || [],
        });
        return NextResponse.json({ message: msg });
      }

      case "pin": {
        if (!body.conversationId) {
          return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
        }
        await pinConversation(body.conversationId, body.isPinned !== false);
        return NextResponse.json({ success: true });
      }

      case "rename": {
        if (!body.conversationId || !body.title) {
          return NextResponse.json({ error: "Conversation ID and title required." }, { status: 400 });
        }
        await renameConversation(body.conversationId, body.title);
        return NextResponse.json({ success: true });
      }

      case "archive": {
        if (!body.conversationId) {
          return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
        }
        await archiveConversation(body.conversationId, body.isArchived !== false);
        return NextResponse.json({ success: true });
      }

      case "delete": {
        if (!body.conversationId) {
          return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
        }
        await deleteConversation(body.conversationId);
        return NextResponse.json({ success: true });
      }

      case "clearAll": {
        await deleteAllConversations();
        return NextResponse.json({ success: true });
      }

      case "updateContext": {
        if (!body.conversationId) {
          return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
        }
        await updateConversationContext(body.conversationId, {
          modelId: body.modelId,
          subject: body.subject,
        });
        return NextResponse.json({ success: true });
      }

      case "feedback": {
        if (!body.rating) {
          return NextResponse.json({ error: "Rating required." }, { status: 400 });
        }
        const fb = await submitFeedback({
          conversationId: body.conversationId,
          messageId: body.messageId,
          rating: body.rating,
          category: body.category || null,
          comment: body.comment || null,
          modelId: body.modelId || null,
        });
        return NextResponse.json({ feedback: fb });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    console.error("[api/ai/conversations] POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
