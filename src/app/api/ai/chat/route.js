import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { streamAIChat } from "@/lib/ai/router";
import { resolveModelForUserAsync } from "@/lib/ai/models";
import { retrieveKnowledgeLens } from "@/lib/ai/knowledge-lens";
import { getUserProgramme, getUserSubjects } from "@/lib/ai/subject-context";
import { createStreamSanitizer } from "@/lib/ai/response-sanitizer";
import { generateSmartTitle } from "@/lib/ai/title-generator";
import { renameConversation } from "@/lib/ai/db-conversations";

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

// In-memory locks to prevent race condition between manual rename and auto-title
const manualRenameLocks = new Set();

function extractRenameIntent(prompt) {
  if (!prompt || typeof prompt !== 'string' || prompt.length > 100) return null;
  const p = prompt.trim();
  if (p.toLowerCase().startsWith('explain ') || p.toLowerCase().startsWith('why ') || p.toLowerCase().startsWith('what ')) {
    return null;
  }
  
  const prefix = /^(?:please\s+|can you\s+|could you\s+)?/i;
  const verb = /(?:rename|change|save|set|make|call|name)\s+/i;
  const object = /(?:this|the|my)\s+(?:chat|conversation|chat name|name|title)\s+/i;
  const extra = /(?:(?:name|title|to be|to|as|called)\s+)?/i;
  const nameCapture = /["'`]?(.+?)["'`]?[\.\!\?]*$/i;

  const fullRegex = new RegExp(prefix.source + verb.source + object.source + extra.source + nameCapture.source, 'i');
  
  const match = p.match(fullRegex);
  if (match && match[1]) {
    let result = match[1].trim();
    result = result.replace(/^(?:to|as|called)\s+/i, '');
    return result.trim();
  }
  return null;
}

function checkRateLimit(userId) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to use Nexus AI." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messages, subjectFilter, modelId, conversationId, isTemporary: bodyIsTemp } = body || {};
    const isTemporary = bodyIsTemp === true || (typeof conversationId === "string" && conversationId.startsWith("temp_"));

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload. Messages array is required." },
        { status: 400 }
      );
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content || typeof latestMessage.content !== "string") {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------------
    // EXPLICIT RENAME COMMAND INTERCEPTION (Bypassed for temporary chats)
    // ----------------------------------------------------------------------
    const renameIntentTitle = extractRenameIntent(latestMessage.content);
    if (!isTemporary && renameIntentTitle && conversationId) {
      manualRenameLocks.add(conversationId);

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            await renameConversation(conversationId, renameIntentTitle);
            
            // Release the lock after 10 seconds (beats any in-flight auto-title)
            setTimeout(() => manualRenameLocks.delete(conversationId), 10000);

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "title", title: renameIntentTitle })}\n\n`)
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: `Chat name updated to **${renameIntentTitle}**.` })}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("[api/ai/chat] Explicit rename failed:", e);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Failed to rename chat. Please try again." })}\n\n`)
            );
            controller.close();
          }
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
    // ----------------------------------------------------------------------

    // Fetch user profile for context, role, and Admin authorization
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, full_name, email, role, programme, ib_program, exam_session, subjects")
      .eq("id", user.id)
      .maybeSingle();

    const authName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
    const finalProfile = {
      ...profile,
      display_name: profile?.display_name || profile?.full_name || authName
    };

    const isAdmin = profile?.role === "admin" || (user?.email && user.email.endsWith("@ibnexus.com"));
    const userRole = isAdmin ? "admin" : (profile?.role || "student");

    // Rate limiting check (Bypassed for Admins)
    if (!isAdmin && !checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending more messages." },
        { status: 429 }
      );
    }

    // Prompt length check (Bypassed for Admins)
    if (!isAdmin && latestMessage.content.trim().length > 4000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed length (4,000 characters)." },
        { status: 400 }
      );
    }

    // Resolve which model to actually use based on user eligibility & admin DB settings
    const resolvedModel = await resolveModelForUserAsync(modelId, userRole);

    // Retrieve relevant knowledge based on context
    const programme = getUserProgramme(finalProfile);
    const userSubjects = getUserSubjects(finalProfile);

    // Find the selected subject's full info
    let subjectForRAG = subjectFilter;
    let levelForRAG = null;
    if (subjectFilter && subjectFilter !== "All subjects") {
      const matchedSubject = userSubjects.find(
        (s) =>
          s.name.toLowerCase() === subjectFilter.toLowerCase() ||
          s.displayName.toLowerCase() === subjectFilter.toLowerCase()
      );
      if (matchedSubject) {
        subjectForRAG = matchedSubject.name;
        levelForRAG = matchedSubject.level;
      }
    }

    let knowledgeContext = [];
    let masterRules = [];
    try {
      const { getActiveNexusCore } = await import("@/lib/ai/nexus-core");
      const [ragCtx, coreRules] = await Promise.all([
        retrieveKnowledgeLens({
          userId: user.id,
          query: latestMessage.content,
          limit: 5,
          matchThreshold: 0.25, // Lowered slightly to capture more context
        }),
        getActiveNexusCore()
      ]);
      knowledgeContext = ragCtx;
      masterRules = coreRules;
    } catch (ragErr) {
      console.warn("[api/ai/chat] Knowledge Lens or Core warning:", ragErr?.message);
    }

    // Parallel Title Generation right at request start (Bypassed for temporary chats)
    const userMessagesCount = Array.isArray(messages) ? messages.filter((m) => m.role === "user").length : 0;
    const shouldGenerateTitle = !isTemporary && conversationId && (userMessagesCount === 1 || (userMessagesCount === 2 && messages[0]?.content?.length < 10));
    
    const titlePromise = shouldGenerateTitle
      ? generateSmartTitle({ 
          conversationId, 
          messages, 
          modelId: resolvedModel.id, 
          userProfile: finalProfile 
        })
      : null;

    // Stream generator via unified AI Router
    const generator = streamAIChat({
      messages,
      userProfile: finalProfile,
      subjectFilter,
      modelId: resolvedModel.id,
      knowledgeContext,
      masterRules,
      isTemporary,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sanitizer = createStreamSanitizer();

          // Push title event immediately when ready (in parallel with token stream)
          let titleStreamPromise = null;
          if (titlePromise) {
            titleStreamPromise = titlePromise
              .then(async (smartTitle) => {
                if (smartTitle && !manualRenameLocks.has(conversationId)) {
                  try {
                    await renameConversation(conversationId, smartTitle);
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "title", title: smartTitle })}\n\n`)
                    );
                  } catch (e) {
                    console.error("[api/ai/chat] Failed to save title", e?.message);
                  }
                }
              })
              .catch((err) => {
                console.warn("[api/ai/chat] Title stream notice:", err?.message);
              });
          }

          for await (const chunk of generator) {
            if (chunk.type === "metadata") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "metadata",
                    modelId: chunk.modelId,
                    modelDisplayName: chunk.modelDisplayName,
                    requestedModelId: resolvedModel.id,
                    provider: chunk.provider || resolvedModel.provider,
                    mock: !!chunk.mock,
                    sourcesUsed: knowledgeContext.map(k => ({
                      title: k.title,
                      type: k.sourceType,
                      id: k.sourceId,
                      label: k.typeLabel
                    }))
                  })}\n\n`
                )
              );
            } else if (chunk.type === "text") {
              const cleanText = sanitizer.processChunk(chunk.text);
              if (cleanText) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`)
                );
              }
            }
          }

          const flushedText = sanitizer.flush();
          if (flushedText) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: flushedText })}\n\n`)
            );
          }

          // Await title if it hasn't completed yet before ending stream
          if (titleStreamPromise) {
            try {
              await titleStreamPromise;
            } catch {}
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[api/ai/chat] Streaming error:", err?.message);
          let safeMsg = "AI service is temporarily unavailable. Please try again.";

          if (err?.message?.includes("AI_PROVIDER_ERROR")) {
            safeMsg = err.message.replace(/^AI_PROVIDER_ERROR:\s*/, "");
          } else if (err?.message?.includes("AI_NOT_CONFIGURED")) {
            safeMsg = "AI service is not configured. Please contact the administrator.";
          } else if (err?.message?.includes("AI_AUTH_ERROR")) {
            safeMsg = "AI service authentication error. Please verify server setup.";
          } else if (err?.message?.includes("AI_RATE_LIMIT")) {
            safeMsg = "AI rate limit reached. Please wait a moment.";
          } else if (err?.message?.includes("AI_NETWORK_ERROR")) {
            safeMsg = "Unable to reach AI service. Check your network connection.";
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: safeMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[api/ai/chat] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
