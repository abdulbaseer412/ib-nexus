import { buildSystemPrompt } from "./system-prompt-builder.js";

function getOllamaUrl() {
  if (process.env.OLLAMA_API_URL) return process.env.OLLAMA_API_URL;
  if (process.env.NODE_ENV === "production") return ""; // Should be blocked by models.js anyway
  return "http://127.0.0.1:11434/api/chat";
}

export async function* streamOllamaChat({
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
    // Fallback if models module cannot be loaded
  }


  const systemInstruction = buildSystemPrompt({
    userProfile,
    subjectFilter,
    knowledgeContext,
    masterRules,
  });
  const recentMessages = messages.slice(-20);
  
  const ollamaMessages = [
    { role: "system", content: systemInstruction },
    ...recentMessages.map(m => {
      if (m.attachment && m.attachment.data) {
        throw new Error("AI_UNSUPPORTED_ATTACHMENT: Local Ollama models currently do not support image/file attachments.");
      }
      return {
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      };
    })
  ];

  const isFastAPI = actualModelId === "qwen3-4b";

  let requestBody;
  let requestUrl = getOllamaUrl();

  if (isFastAPI) {
    // Format messages into a single prompt string for the FastAPI endpoint
    const promptString = ollamaMessages.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n") + "\n\nASSISTANT:\n";
    
    // Ensure URL points to /chat for the FastAPI server
    if (requestUrl.endsWith('/api/chat')) {
      requestUrl = requestUrl.replace('/api/chat', '/chat');
    }

    requestBody = {
      model: actualModelId,
      message: promptString,
      stream: false // FastAPI endpoint does not support chunked streaming yet
    };
  } else {
    // Standard Ollama format
    requestBody = {
      model: actualModelId,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: resolvedModel.temperature || 0.7,
      },
    };
  }

  yield {
    type: "metadata",
    modelId: actualModelId,
    modelDisplayName: actualDisplayName,
  };

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (process.env.OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.OLLAMA_API_KEY}`;
    }

    const response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`AI_PROVIDER_ERROR: Ollama model '${actualModelId}' not found. Please pull it locally.`);
      }
      throw new Error(`AI_PROVIDER_ERROR: HTTP error ${response.status} from Ollama/Qwen server.`);
    }

    if (isFastAPI || !requestBody.stream) {
      // Handle static JSON response (FastAPI format)
      const data = await response.json();
      if (data.response) {
        yield { type: "text", text: data.response };
      } else if (data.message && data.message.content) {
        yield { type: "text", text: data.message.content };
      } else {
        throw new Error("AI_PROVIDER_ERROR: Unexpected response format from Kaggle server.");
      }
      return;
    }

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
        if (!line.trim()) continue;
        
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield { type: "text", text: parsed.message.content };
          }
          if (parsed.error) {
            throw new Error(`AI_PROVIDER_ERROR: Ollama error - ${parsed.error}`);
          }
        } catch (e) {
          if (e.message.startsWith("AI_PROVIDER_ERROR")) throw e;
          // Ignore invalid JSON chunks
        }
      }
    }
  } catch (error) {
    console.error("[Ollama API] Error:", error);
    
    // Distinguish between fetch failures (offline) and other errors
    if (error.cause && error.cause.code === 'ECONNREFUSED' || error.message.includes('fetch failed') || error.message.includes('Network request failed') || error.message.includes('ECONNREFUSED')) {
      throw new Error("AI_PROVIDER_ERROR: Local AI is currently unavailable.");
    }
    
    // Bubble up specifically thrown errors
    if (error.message.startsWith("AI_") || error.message.startsWith("AI_PROVIDER_ERROR")) {
      throw error;
    }
    
    throw new Error("AI_PROVIDER_ERROR: Local AI is currently unavailable.");
  }
}
