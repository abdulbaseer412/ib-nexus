/**
 * Server-side Gemini API provider module.
 *
 * Communicates with Google Gemini API strictly on the server.
 * The API key is NEVER exposed to the browser.
 *
 * Supports dynamic model selection via the model registry.
 */

import { buildSystemPrompt } from "./system-prompt-builder.js";


const FALLBACK_MODEL = "gemini-3.6-flash";

function getApiKey() {
  let key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "" || key.includes("your-gemini-api-key")) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
        if (match && match[1]) {
          key = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }
    } catch {}
  }
  if (!key || key.trim() === "" || key.includes("your-gemini-api-key")) {
    return null;
  }
  return key.trim();
}

// buildSystemInstruction is now handled by system-prompt-builder.js

/**
 * Formats conversation history into Gemini API contents payload format.
 */
function formatContents(messages) {
  // Keep recent 20 messages for context window efficiency
  const recentMessages = messages.slice(-20);

  return recentMessages.map((msg) => {
    const parts = [];
    const atts = msg.attachments || (msg.attachment ? [msg.attachment] : []);

    let textContent = msg.content || "";

    atts.forEach((att) => {
      const isImage = att.type === "image" || att.mimeType?.startsWith("image/");
      const tag = att.indexName || (isImage ? "Image" : "Document");
      if (isImage && att.mimeType && att.data) {
        parts.push({
          inline_data: {
            mime_type: att.mimeType,
            data: att.data
          }
        });
        textContent += `\n[${tag}: ${att.name}]`;
      } else {
        textContent += `\n[${tag}: ${att.name} (${att.formattedSize || att.size || 'file'})]`;
      }
    });

    if (textContent.trim()) {
      parts.unshift({ text: textContent.trim() });
    }

    return {
      role: msg.role === "user" ? "user" : "model",
      parts: parts.length > 0 ? parts : [{ text: " " }]
    };
  });
}

/**
 * Generates a streaming response from Gemini API.
 * Yields objects: { text: string } for content chunks, and returns metadata.
 *
 * @param {Object} options
 * @param {Array} options.messages - Conversation messages
 * @param {Object} options.userProfile - User profile data
 * @param {string} options.subjectFilter - Selected subject filter
 * @param {string} options.modelId - Requested model ID
 * @param {Array} options.knowledgeContext - RAG knowledge items
 * @returns {AsyncGenerator} yields { text, modelUsed, modelDisplayName }
 */
export async function* streamGeminiChat({
  messages,
  userProfile,
  subjectFilter,
  modelId,
  knowledgeContext = [],
  masterRules = [],
  userPreferences = {},
  isTemporary = false,
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "AI_NOT_CONFIGURED: GEMINI_API_KEY environment variable is not set on the server."
    );
  }

  let actualModelId = modelId || FALLBACK_MODEL;
  let actualDisplayName = "Gemini 3.6 Flash";

  try {
    const { resolveModelForUser } = await import("./models.js");
    const resolvedModel = resolveModelForUser(modelId);
    if (resolvedModel) {
      actualModelId = resolvedModel.id;
      actualDisplayName = resolvedModel.displayName;
    }
  } catch {
    // Fallback if models module cannot be loaded
  }


  const systemInstruction = buildSystemPrompt({
    userProfile,
    subjectFilter,
    knowledgeContext,
    masterRules,
    userPreferences,
    isTemporary,
  });
  const contents = formatContents(messages);

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: resolvedModel.temperature || 0.7,
      maxOutputTokens: resolvedModel.maxTokens || 8192,
    },
  };

  let url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModelId}:streamGenerateContent?key=${apiKey}&alt=sse`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    console.error("[Gemini API] Network fetch error:", netErr?.message);
    throw new Error("AI_NETWORK_ERROR: Unable to reach Gemini API server.");
  }

  // If model returns 404 (deprecated/unavailable), try fallback
  if (
    !response.ok &&
    response.status === 404 &&
    actualModelId !== FALLBACK_MODEL
  ) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch {}
    console.warn(
      `[Gemini API] Model ${actualModelId} returned 404, falling back to ${FALLBACK_MODEL}:`,
      errBody
    );
    actualModelId = FALLBACK_MODEL;
    url = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`;
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch {}
    console.error(
      `[Gemini API] Error HTTP ${response.status}:`,
      errBody
    );

    if (response.status === 400 || response.status === 403) {
      throw new Error(
        "AI_AUTH_ERROR: Invalid or unauthorized Gemini API key."
      );
    } else if (response.status === 429) {
      throw new Error(
        "AI_RATE_LIMIT: Gemini API quota exceeded or rate limited."
      );
    } else {
      throw new Error(
        `AI_PROVIDER_ERROR: Gemini service returned status ${response.status}.`
      );
    }
  }

  if (!response.body) {
    throw new Error("AI_EMPTY_RESPONSE: Response body stream is empty.");
  }

  // Yield metadata first so consumers know which model is actually being used
  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.substring(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const candidate = parsed.candidates?.[0];
            const partText = candidate?.content?.parts?.[0]?.text;
            if (partText) {
              yield { type: "text", text: partText };
            }
          } catch (e) {
            // Ignore partial SSE chunk parse errors
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      const jsonStr = buffer.trim().substring(6).trim();
      if (jsonStr !== "[DONE]") {
        try {
          const parsed = JSON.parse(jsonStr);
          const partText =
            parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (partText) {
            yield { type: "text", text: partText };
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}
