import { buildSubjectContext } from "./subject-context.js";
import { sanitizeAiResponse } from "./response-sanitizer.js";
import { buildSystemPrompt } from "./system-prompt-builder.js";


/**
 * Get normalized remote Qwen endpoint URL.
 * Accepts OLLAMA_API_URL or REMOTE_QWEN_URL from environment.
 * Ensures target URL strictly ends with '/chat' without duplicating paths.
 */
export function getRemoteQwenEndpoint() {
  const rawUrl = (process.env.OLLAMA_API_URL || process.env.REMOTE_QWEN_URL || "").trim();
  if (!rawUrl) return null;

  let url = rawUrl.replace(/\/+$/, ""); // Remove trailing slashes
  if (url.endsWith("/api/chat")) {
    url = url.slice(0, -9);
  } else if (url.endsWith("/chat")) {
    url = url.slice(0, -5);
  }

  return `${url}/chat`;
}

/**
 * Check health / availability of remote Qwen server
 */
export async function checkRemoteQwenHealth() {
  const rawUrl = (process.env.OLLAMA_API_URL || process.env.REMOTE_QWEN_URL || "").trim();
  if (!rawUrl) return false;

  let baseUrl = rawUrl.replace(/\/+$/, "");
  if (baseUrl.endsWith("/api/chat")) baseUrl = baseUrl.slice(0, -9);
  if (baseUrl.endsWith("/chat")) baseUrl = baseUrl.slice(0, -5);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${baseUrl}/`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "69420",
        "User-Agent": "IB-Nexus-HealthCheck",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const text = await res.text();
    if (text.includes("ERR_NGROK") || text.includes("<!DOCTYPE")) return false;
    return text.includes("Qwen server is running") || res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Provider adapter for Remote Qwen FastAPI inference server.
 */
export async function* streamRemoteQwenChat({
  messages,
  userProfile,
  subjectFilter,
  modelId,
  knowledgeContext = [],
  masterRules = [],
}) {
  let actualModelId = modelId || "qwen3-4b";
  let actualDisplayName = "Qwen3-4B";

  try {
    const { resolveModelForUser } = await import("./models.js");
    const resolvedModel = resolveModelForUser(modelId);
    if (resolvedModel) {
      actualModelId = resolvedModel.id;
      actualDisplayName = resolvedModel.displayName;
    }
  } catch {
    // Fallback if models module cannot be loaded dynamically
  }


  // 1. Send model metadata to the frontend
  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
  };

  const endpointUrl = getRemoteQwenEndpoint();
  if (!endpointUrl) {
    const errorDetails = {
      provider: "remote_qwen",
      errorType: "REMOTE_URL_UNREACHABLE",
      message: "No environment variable found for OLLAMA_API_URL or REMOTE_QWEN_URL",
    };
    console.error("[Remote Qwen Failure]", errorDetails);
    throw new Error("AI_PROVIDER_ERROR: [REMOTE_URL_UNREACHABLE] Remote Qwen API URL is not configured in server environment.");
  }

  const systemInstruction = buildSystemPrompt({
    userProfile,
    subjectFilter,
    knowledgeContext,
    masterRules,
  });
  const recentMessages = messages.slice(-10);

  const formattedHistory = recentMessages
    .map((m) => {
      let content = m.content || "";
      const atts = m.attachments || (m.attachment ? [m.attachment] : []);
      atts.forEach((att) => {
        const isImage = att.type === "image" || att.mimeType?.startsWith("image/");
        const tag = att.indexName || (isImage ? "Image" : "Document");
        content += `\n[${tag}: ${att.name}]`;
      });
      return `${m.role === "user" ? "User" : "Assistant"}: ${content.trim()}`;
    })
    .join("\n\n");

  const fullPrompt = `${systemInstruction}\n\nCONVERSATION HISTORY:\n${formattedHistory}\n\nAssistant:`;

  const requestBody = {
    message: fullPrompt,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  const startTime = Date.now();
  let response;

  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420",
        "User-Agent": "IB-Nexus-Backend",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = fetchErr.name === "AbortError";
    const errorType = isTimeout ? "TIMEOUT" : "REMOTE_URL_UNREACHABLE";

    console.error("[Remote Qwen Failure]", {
      provider: "remote_qwen",
      url: endpointUrl,
      durationMs,
      errorType,
      message: fetchErr.message,
    });

    if (isTimeout) {
      throw new Error("AI_PROVIDER_ERROR: [TIMEOUT] Remote Qwen server timed out after 60 seconds.");
    }
    throw new Error(`AI_PROVIDER_ERROR: [${errorType}] Unable to reach remote Qwen server at ${endpointUrl}.`);
  }

  clearTimeout(timeoutId);
  const durationMs = Date.now() - startTime;
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  // Handle HTML response (e.g., ngrok warning page or ngrok error interstitial page)
  if (contentType.includes("text/html") || rawText.trim().startsWith("<!DOCTYPE") || rawText.includes("ngrok")) {
    const isNgrokError = rawText.includes("ERR_NGROK") || response.headers.has("ngrok-error-code");
    const errorType = isNgrokError ? "NGROK_ERROR" : (response.status === 404 ? "HTTP_404" : `HTTP_${response.status}`);

    console.error("[Remote Qwen Failure]", {
      provider: "remote_qwen",
      url: endpointUrl,
      status: response.status,
      durationMs,
      errorType,
      safeSnippet: rawText.slice(0, 200).replace(/[\r\n]+/g, " "),
    });

    if (rawText.includes("ERR_NGROK_3200") || (isNgrokError && response.status === 404)) {
      throw new Error("AI_PROVIDER_ERROR: [REMOTE_URL_UNREACHABLE] Remote Qwen endpoint is offline (ngrok ERR_NGROK_3200).");
    }
    throw new Error(`AI_PROVIDER_ERROR: [${errorType}] Remote Qwen returned HTML page instead of JSON (Status ${response.status}).`);
  }

  if (!response.ok) {
    const errorType = `HTTP_${response.status}`;
    console.error("[Remote Qwen Failure]", {
      provider: "remote_qwen",
      url: endpointUrl,
      status: response.status,
      durationMs,
      errorType,
      safeSnippet: rawText.slice(0, 200).replace(/[\r\n]+/g, " "),
    });
    throw new Error(`AI_PROVIDER_ERROR: [${errorType}] Remote Qwen server returned HTTP status ${response.status}.`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    console.error("[Remote Qwen Failure]", {
      provider: "remote_qwen",
      url: endpointUrl,
      status: response.status,
      durationMs,
      errorType: "RESPONSE_SCHEMA_ERROR",
      safeSnippet: rawText.slice(0, 200).replace(/[\r\n]+/g, " "),
    });
    throw new Error("AI_PROVIDER_ERROR: [RESPONSE_SCHEMA_ERROR] Could not parse JSON response from remote Qwen server.");
  }

  const answerText = data?.response || data?.output || (typeof data?.message === "string" ? data.message : null);

  if (!answerText) {
    console.error("[Remote Qwen Failure]", {
      provider: "remote_qwen",
      url: endpointUrl,
      status: response.status,
      durationMs,
      errorType: "RESPONSE_SCHEMA_ERROR",
      receivedKeys: Object.keys(data || {}),
    });
    throw new Error("AI_PROVIDER_ERROR: [RESPONSE_SCHEMA_ERROR] Remote Qwen response missing expected 'response' field.");
  }

  const cleanAnswer = sanitizeAiResponse(answerText);

  yield {
    type: "text",
    text: cleanAnswer,
  };
}
