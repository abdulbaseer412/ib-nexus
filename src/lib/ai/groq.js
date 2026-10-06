import Groq from "groq-sdk";
import { buildSystemPrompt } from "./system-prompt-builder.js";
import { createStreamSanitizer } from "./response-sanitizer.js";

function getApiKey() {
  let key = process.env.GROQ_API_KEY;
  if (!key || key.trim() === "" || key.includes("your-groq-api-key")) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/^GROQ_API_KEY=(.*)$/m);
        if (match && match[1]) {
          key = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }
    } catch {}
  }
  return key ? key.trim() : null;
}

// buildSystemInstruction is now handled by system-prompt-builder.js

export async function* streamGroqChat({
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
    throw new Error("AI_NOT_CONFIGURED: GROQ_API_KEY environment variable is not set.");
  }

  // Default to supported Groq models
  let actualModelId = modelId === "qwen/qwen3.6-27b" ? "qwen/qwen3.6-27b" : "openai/gpt-oss-120b";
  let actualDisplayName = actualModelId === "qwen/qwen3.6-27b" ? "Qwen 3.6 27B" : "GPT-OSS 120B";
  let targetModelObj = null;

  try {
    const { resolveModelForUser } = await import("./models.js");
    const resolvedModel = resolveModelForUser(modelId);
    if (resolvedModel && resolvedModel.provider === "groq") {
      actualModelId = resolvedModel.id;
      actualDisplayName = resolvedModel.displayName;
      targetModelObj = resolvedModel;
    }
  } catch {
    // Fallback if models module cannot be loaded
  }

  const isMultimodalModel = actualModelId === "qwen/qwen3.6-27b";
  const systemInstruction = buildSystemPrompt({
    userProfile,
    subjectFilter,
    knowledgeContext,
    masterRules,
    userPreferences,
    isTemporary,
  });
  const recentMessages = messages.slice(-20);

  const groqMessages = [
    { role: "system", content: systemInstruction },
    ...recentMessages.map((m) => {
      const isUser = m.role === "user";
      const atts = m.attachments || (m.attachment ? [m.attachment] : []);
      let contentText = m.content || "";
      const imageUrls = [];

      atts.forEach((att) => {
        const isImage =
          att.type === "image" ||
          att.mimeType?.startsWith("image/") ||
          (typeof att.url === "string" && att.url.startsWith("data:image/"));
        if (isImage && isMultimodalModel && (att.url || att.dataUrl)) {
          imageUrls.push(att.url || att.dataUrl);
        } else if (isImage && !isMultimodalModel) {
          contentText += `\n[Image attached: ${att.name || "Attachment"}. Note: ${actualDisplayName} is a text-only model. Image analysis is skipped.]`;
        } else {
          const tag = att.indexName || "Document";
          contentText += `\n[${tag}: ${att.name || "File"}]`;
        }
      });

      if (isUser && isMultimodalModel && imageUrls.length > 0) {
        const contentParts = [{ type: "text", text: contentText.trim() || "Analyze the attached image." }];
        imageUrls.forEach((url) => {
          contentParts.push({ type: "image_url", image_url: { url } });
        });
        return { role: "user", content: contentParts };
      }

      return {
        role: isUser ? "user" : "assistant",
        content: contentText.trim() || " ",
      };
    }),
  ];

  const groq = new Groq({ apiKey });

  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
  };

  const streamSanitizer = createStreamSanitizer();

  try {
    const stream = await groq.chat.completions.create({
      model: actualModelId,
      messages: groqMessages,
      temperature: targetModelObj?.temperature || 0.7,
      max_tokens: targetModelObj?.maxTokens || 8192,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        const filteredText = streamSanitizer.processChunk(content);
        if (filteredText) {
          yield { type: "text", text: filteredText };
        }
      }
    }

    const flushedText = streamSanitizer.flush();
    if (flushedText) {
      yield { type: "text", text: flushedText };
    }
  } catch (error) {
    console.error("[Groq API] Error:", error);
    if (error.status === 401 || error.status === 403) {
      throw new Error("AI_AUTH_ERROR: Invalid or unauthorized Groq API key.");
    } else if (error.status === 429) {
      throw new Error(`AI_RATE_LIMIT: Groq rate limit reached for model ${actualDisplayName}. Please try again shortly or switch models.`);
    } else if (error.status >= 500) {
      throw new Error("AI_PROVIDER_ERROR: Groq service is temporarily unavailable.");
    }
    throw new Error(`AI_PROVIDER_ERROR: Groq error - ${error.message}`);
  }
}
