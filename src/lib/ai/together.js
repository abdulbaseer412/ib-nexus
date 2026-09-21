import { buildSystemPrompt, formatMessagesForProvider } from "./system-prompt-builder.js";
import { sanitizeAiResponse } from "./response-sanitizer.js";


/**
 * Get Together API key securely from process.env on server side.
 * Returns null if key is missing, empty, or placeholder.
 */
export function getTogetherApiKey() {
  const key = (process.env.TOGETHER_API_KEY || "").trim();
  if (!key || key.includes("your-together-api-key") || key === "REAL_KEY") {
    return null;
  }
  return key;
}

/**
 * Check if Together AI mock mode is active.
 * MUST NEVER BE ACTIVE IN PRODUCTION.
 */
export function isTogetherMockMode() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.TOGETHER_MOCK_MODE === "true";
}

/**
 * Get Together provider health / configuration status.
 * Returns: "Available" | "Mock Mode" | "Not configured"
 */
export function getTogetherStatus() {
  const key = getTogetherApiKey();
  if (key) return "Available";
  if (isTogetherMockMode()) return "Mock Mode";
  return "Not configured";
}

// buildSystemInstruction is now handled by system-prompt-builder.js

/**
 * Provider adapter for Together AI (zai-org/GLM-5.3-Flash)
 */
export async function* streamTogetherChat({
  messages,
  userProfile,
  subjectFilter,
  modelId,
  knowledgeContext = [],
  masterRules = [],
}) {
  let actualModelId = modelId || "zai-org/GLM-5.3-Flash";
  let actualDisplayName = "GLM-5.3-Flash";

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


  const apiKey = getTogetherApiKey();
  const mockActive = isTogetherMockMode();

  // If key is empty and mock mode is off, throw TOGETHER_NOT_CONFIGURED error without making network call
  if (!apiKey && !mockActive) {
    throw new Error("AI_PROVIDER_ERROR: [TOGETHER_NOT_CONFIGURED] Together AI is not configured yet.");
  }

  // Handle Development Mock Mode (Local UI testing without API credits)
  if (!apiKey && mockActive) {
    yield {
      type: "metadata",
      modelId: actualModelId,
      modelDisplayName: actualDisplayName,
      provider: "together",
      mock: true,
    };

    const mockResponseText =
      "This is a development mock response for Together AI / GLM-5.3-Flash. The real API key has not been configured yet.";
    
    yield {
      type: "text",
      text: mockResponseText,
    };
    return;
  }

  // Real Together API call (when TOGETHER_API_KEY is supplied)
  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
    provider: "together",
    mock: false,
  };

  const systemInstruction = buildSystemPrompt({
    userProfile,
    subjectFilter,
    knowledgeContext,
    masterRules,
  });

  const formattedMessages = [
    { role: "system", content: systemInstruction },
    ...formatMessagesForProvider(messages),
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "IB-Nexus-Backend",
      },
      body: JSON.stringify({
        model: actualModelId,
        messages: formattedMessages,
        stream: true,
        temperature: resolvedModel?.temperature ?? 0.7,
        max_tokens: resolvedModel?.maxTokens ?? 4096,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === "AbortError") {
      throw new Error("AI_PROVIDER_ERROR: [TOGETHER_TIMEOUT] Together AI request timed out after 60 seconds.");
    }
    throw new Error(`AI_PROVIDER_ERROR: [TOGETHER_NETWORK_ERROR] Unable to connect to Together AI API (${fetchErr.message}).`);
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch {}

    if (response.status === 401 || response.status === 403) {
      throw new Error("AI_PROVIDER_ERROR: [TOGETHER_AUTH_ERROR] Together AI authentication failed. Please check your API key.");
    }
    if (response.status === 429) {
      throw new Error("AI_PROVIDER_ERROR: [TOGETHER_RATE_LIMIT] Together AI rate limit reached. Please wait a moment.");
    }
    if (response.status >= 500) {
      throw new Error(`AI_PROVIDER_ERROR: [TOGETHER_SERVER_ERROR] Together AI server returned HTTP status ${response.status}.`);
    }
    throw new Error(`AI_PROVIDER_ERROR: [TOGETHER_BAD_RESPONSE] Together AI request failed with status ${response.status}. Details: ${errBody.slice(0, 150)}`);
  }

  // Handle SSE streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const dataStr = trimmed.slice(6).trim();
      if (dataStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          const cleanText = sanitizeAiResponse(delta);
          if (cleanText) {
            yield {
              type: "text",
              text: cleanText,
            };
          }
        }
      } catch {}
    }
  }
}
