import { resolveModelForUserAsync } from "./models.js";
import { streamGeminiChat } from "./gemini.js";
import { streamOpenAIChat } from "./openai.js";
import { streamGroqChat } from "./groq.js";
import { streamOllamaChat } from "./ollama.js";
import { streamRemoteQwenChat } from "./remote_qwen.js";
import { streamTogetherChat } from "./together.js";

const MAX_FALLBACK_DEPTH = 1;

/**
 * Unified AI Router
 * Handles routing the chat request to the correct provider adapter,
 * managing fallback logic, and normalizing the response stream.
 * 
 * @param {Object} options
 * @param {Array} options.messages - The conversation messages
 * @param {Object} options.userProfile - The user's profile context
 * @param {string} options.subjectFilter - The selected subject filter
 * @param {string} options.modelId - The requested model ID
 * @param {Array} options.knowledgeContext - Retrieved RAG context
 * @param {Array} options.masterRules - Admin master training instructions
 * @param {number} [depth=0] - Current fallback depth (internal)
 */
export async function* streamAIChat(options, depth = 0) {
  const resolvedModel = await resolveModelForUserAsync(options.modelId);
  const actualModelId = resolvedModel.id;
  const provider = resolvedModel.provider;

  try {
    let generator;
    
    // Pass along the resolved actual model ID so the adapter uses it precisely
    const providerOptions = { ...options, modelId: actualModelId };

    switch (provider) {
      case "google":
        generator = streamGeminiChat(providerOptions);
        break;
      case "openai":
        generator = streamOpenAIChat(providerOptions);
        break;
      case "groq":
        generator = streamGroqChat(providerOptions);
        break;
      case "ollama":
        generator = streamOllamaChat(providerOptions);
        break;
      case "remote_qwen":
        generator = streamRemoteQwenChat(providerOptions);
        break;
      case "together":
        generator = streamTogetherChat(providerOptions);
        break;
      default:
        throw new Error(`AI_UNSUPPORTED_PROVIDER: Provider ${provider} is not supported.`);
    }

    // Yield back the chunks. The adapters are responsible for yielding 
    // metadata first (with the actual model ID and display name), 
    // then the text chunks, and throwing specific errors if they fail.
    for await (const chunk of generator) {
      yield chunk;
    }

  } catch (error) {
    console.warn(`[AI Router] Model ${actualModelId} failed. Error:`, error.message);
    
    // Check if we should fallback
    if (depth < MAX_FALLBACK_DEPTH && resolvedModel.fallback) {
      console.log(`[AI Router] Falling back to ${resolvedModel.fallback}...`);
      
      // Retry with the fallback model
      const fallbackOptions = { ...options, modelId: resolvedModel.fallback };
      const fallbackGenerator = streamAIChat(fallbackOptions, depth + 1);
      
      for await (const chunk of fallbackGenerator) {
        yield chunk;
      }
    } else {
      // Re-throw if max depth reached or no fallback available
      throw error;
    }
  }
}
