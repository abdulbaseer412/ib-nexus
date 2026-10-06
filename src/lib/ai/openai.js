import OpenAI from "openai";
import { buildSystemPrompt } from "./system-prompt-builder.js";


function getApiKey() {
  let key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === "" || key.includes("your-openai-api-key")) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/^OPENAI_API_KEY=(.*)$/m);
        if (match && match[1]) {
          key = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }
    } catch {}
  }
  return key ? key.trim() : null;
}

// buildSystemInstruction is now handled by system-prompt-builder.js

export async function* streamOpenAIChat({
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
    throw new Error("AI_NOT_CONFIGURED: OPENAI_API_KEY environment variable is not set.");
  }

  let actualModelId = modelId || "gpt-4o";
  let actualDisplayName = "GPT-4o";

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
  
  // Keep recent messages
  const recentMessages = messages.slice(-20);
  
  const openaiMessages = [
    { role: "system", content: systemInstruction },
    ...recentMessages.map(m => {
      const atts = m.attachments || (m.attachment ? [m.attachment] : []);
      if (atts.length > 0) {
        const contentParts = [];
        let textContent = m.content || "";

        atts.forEach(att => {
          const isImage = att.type === "image" || att.mimeType?.startsWith("image/");
          const tag = att.indexName || (isImage ? "Image" : "Document");
          if (isImage && att.data && att.mimeType) {
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${att.mimeType};base64,${att.data}` }
            });
            textContent += `\n[${tag}: ${att.name}]`;
          } else {
            textContent += `\n[${tag}: ${att.name} (${att.formattedSize || att.size || 'file'})]`;
          }
        });

        contentParts.unshift({ type: "text", text: textContent.trim() || " " });

        return {
          role: m.role === "user" ? "user" : "assistant",
          content: contentParts
        };
      }
      return {
        role: m.role === "user" ? "user" : "assistant",
        content: m.content || " "
      };
    })
  ];

  const openai = new OpenAI({ apiKey });

  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
  };

  try {
    const stream = await openai.chat.completions.create({
      model: actualModelId,
      messages: openaiMessages,
      temperature: resolvedModel.temperature || 0.7,
      max_tokens: resolvedModel.maxTokens || 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: "text", text: content };
      }
    }
  } catch (error) {
    console.error("[OpenAI API] Error:", error);
    if (error.status === 401 || error.status === 403) {
      throw new Error("AI_AUTH_ERROR: Invalid or unauthorized OpenAI API key.");
    } else if (error.status === 429) {
      throw new Error("AI_RATE_LIMIT: OpenAI API quota exceeded or rate limited.");
    } else if (error.status >= 500) {
      throw new Error("AI_PROVIDER_ERROR: OpenAI service is temporarily unavailable.");
    } else if (error.message.includes("does not support image")) {
      throw new Error("AI_UNSUPPORTED_ATTACHMENT: This model does not support image attachments.");
    }
    throw new Error(`AI_PROVIDER_ERROR: OpenAI error - ${error.message}`);
  }
}
