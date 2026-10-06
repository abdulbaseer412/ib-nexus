/**
 * Response Sanitizer — Removes internal thinking, reasoning tags, and control artifacts
 * while preserving legitimate code blocks, HTML/XML examples, and math notation.
 */

export function sanitizeAiResponse(text) {
  if (!text || typeof text !== "string") return "";

  // Split by code blocks (fenced ```code``` or inline `code`) to protect code contents
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const parts = text.split(codeBlockRegex);

  const cleanedParts = parts.map((part, index) => {
    // If it's inside a code block (odd index), preserve untouched
    if (index % 2 === 1) return part;

    // Clean internal tags from non-code text
    let cleaned = part
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
      .replace(/<internal>[\s\S]*?<\/internal>/gi, "")
      .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, "")
      // Remove unclosed opening tags at the end of output
      .replace(/<think>[\s\S]*$/gi, "")
      .replace(/<analysis>[\s\S]*$/gi, "")
      .replace(/<internal>[\s\S]*$/gi, "")
      .replace(/<scratchpad>[\s\S]*$/gi, "");

    return cleaned;
  });

  return cleanedParts.join("").trim();
}

/**
 * Creates a real-time streaming state machine filter to remove <think>...</think> tags on the fly.
 */
export function createStreamSanitizer() {
  let insideThink = false;
  let buffer = "";

  return {
    processChunk(chunkText) {
      if (!chunkText) return "";

      buffer += chunkText;
      let output = "";

      while (buffer.length > 0) {
        if (insideThink) {
          const endIdx = buffer.search(/<\/think>|<\/analysis>|<\/internal>/i);
          if (endIdx !== -1) {
            insideThink = false;
            const matchTag = buffer.match(/<\/think>|<\/analysis>|<\/internal>/i)[0];
            buffer = buffer.slice(endIdx + matchTag.length);
          } else {
            // Retain last 12 chars in case closing tag is split across chunks
            if (buffer.length > 12) {
              buffer = buffer.slice(-12);
            }
            break;
          }
        } else {
          const startMatch = buffer.match(/<think>|<analysis>|<internal>/i);
          if (startMatch) {
            const startIdx = startMatch.index;
            output += buffer.slice(0, startIdx);
            insideThink = true;
            buffer = buffer.slice(startIdx + startMatch[0].length);
          } else {
            // Check for partial opening tag at end of buffer
            const tags = ["<think>", "<analysis>", "<internal>"];
            let partialLength = 0;

            for (const tag of tags) {
              for (let i = 1; i < tag.length; i++) {
                if (buffer.toLowerCase().endsWith(tag.slice(0, i).toLowerCase())) {
                  partialLength = Math.max(partialLength, i);
                }
              }
            }

            if (partialLength > 0) {
              output += buffer.slice(0, buffer.length - partialLength);
              buffer = buffer.slice(buffer.length - partialLength);
              break;
            } else {
              output += buffer;
              buffer = "";
            }
          }
        }
      }

      return output;
    },

    flush() {
      if (insideThink) return "";
      const remaining = buffer;
      buffer = "";
      return remaining;
    },
  };
}
