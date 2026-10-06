import { streamAIChat } from "./router.js";

function cleanTitle(raw) {
  if (!raw || typeof raw !== "string") return "";
  let title = raw
    .replace(/^(here(?:'s| is) a (?:suggested )?(?:title|name).*?:)/i, "")
    .replace(/^(suggested )?title:\s*/i, "")
    .replace(/^["'*#\s]+|["'*#\s]+$/g, "")
    .replace(/[.?!]+$/, "") // Strip trailing punctuation
    .replace(/[\r\n]+/g, " ") // Remove line breaks
    .replace(/\s{2,}/g, " ") // Collapse whitespace
    .trim();
  return title;
}

function isValidTitle(title, originalPrompt) {
  if (!title || title.length === 0) return false;
  
  const wordCount = title.split(/\s+/).length;
  if (wordCount > 6) return false;
  if (title.length > 45) return false;
  
  // Reject if it's identical to or just a substring of the prompt
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normPrompt = originalPrompt.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normPrompt.includes(normTitle) && wordCount > 4) return false;

  const badPhrases = ["the user wants", "the user asks", "can you", "please explain", "i want you", "help me"];
  if (badPhrases.some(phrase => title.toLowerCase().includes(phrase))) return false;

  return true;
}

/**
 * Instant heuristic title generator (zero latency)
 */
export function generateHeuristicTitle(firstUserMessage) {
  if (!firstUserMessage || typeof firstUserMessage !== "string") return "New Conversation";

  let text = firstUserMessage.trim();

  // Identity / greeting questions and common typos
  if (/^(what'?s? your nam[ew]|who are you|identify yourself|what is your name)/i.test(text)) {
    return "AI Identity";
  }
  if (/^(what'?s? my nam[ew])/i.test(text)) {
    return "What's My Name";
  }
  if (/^(hi|hello|hey|greetings)/i.test(text) && text.length < 15) {
    return "Hello";
  }

  // Topic pattern matchers for instant high precision
  if (/photosynthesis/i.test(text)) return "Photosynthesis Reactions";
  if (/krebs\s*cycle/i.test(text)) return "Krebs Cycle";
  if (/world\s*war\s*[1i]/i.test(text) || /ww[1i]/i.test(text)) return "World War I Causes";
  if (/\btok\b|theory of knowledge/i.test(text)) return "TOK Essay Structure";
  if (/chemistry\s*diagram/i.test(text)) return "Chemistry Diagram";
  if (/electrolysis/i.test(text)) return "Electrolysis";
  if (/great\s*depression/i.test(text)) return "Great Depression";

  // Strip conversational fluff
  text = text.replace(
    /^(hey|hi|hello|greetings|please|can you|could you|help me|explain|what's|whats|what is|what are|how to|how do|tell me about|i need help with|why does|why do|describe|analyze|summarize|compare)[\s,]+/gi,
    ""
  );
  text = text.replace(/\?+$/, "").trim();

  if (!text) {
     if (/^(hi|hello|hey|greetings)/i.test(firstUserMessage.trim())) {
         return "Hello";
     }
     return "New Conversation";
  }

  const words = text.split(/\s+/);
  const formatted = words
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return cleanTitle(formatted);
}

/**
 * Smart Title Generator
 * Generates a concise 2–5 word topic title from the conversation context.
 */
export async function generateSmartTitle({ conversationId, messages, modelId, userProfile, currentTitle = "New Conversation" }) {
  if (!messages || messages.length === 0) return currentTitle;

  // Find the FIRST user message ONLY
  const userMsgs = messages.filter((m) => m.role === "user");
  const firstUserMsg = userMsgs[0]?.content || "";
  const heuristicTitle = generateHeuristicTitle(firstUserMsg);

  let finalTitle = heuristicTitle;

  try {
    if (firstUserMsg && modelId) {
      const prompt = `You generate concise conversation titles.

Use ONLY the user's first prompt provided below.
Create ONE natural title that represents the main topic or intent.

Rules:
- 2–5 words preferred.
- Maximum 6 words.
- Maximum about 40 characters.
- Do not write a sentence.
- Do not ask a question.
- Do not copy the user's wording.
- Remove conversational filler ("please", "can you", "help me").
- Use meaningful topic words.
- Rephrase naturally.
- No explanations.
- No quotation marks.
- No markdown.
- Return ONLY the title. No other text.

User's first prompt:
"${firstUserMsg.substring(0, 1000)}"`;

      const titleMessages = [{ role: "user", content: prompt }];

      const stream = streamAIChat({
        messages: titleMessages,
        modelId,
        userProfile,
        subjectFilter: "All subjects",
        knowledgeContext: [],
        masterRules: []
      });

      let rawText = "";
      for await (const chunk of stream) {
        if (chunk.type === "text") {
          rawText += chunk.text;
        }
      }

      if (rawText) {
        const aiTitle = cleanTitle(rawText);
        if (isValidTitle(aiTitle, firstUserMsg)) {
          finalTitle = aiTitle;
        }
      }
    }
  } catch (err) {
    console.warn("[generateSmartTitle] AI title generation notice:", err?.message);
  }

  // We explicitly DO NOT update the database here.
  // The caller (route.js) is responsible for safely updating the DB using the authenticated user.
  
  return finalTitle;
}
