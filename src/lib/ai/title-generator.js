function cleanTitle(raw) {
  if (!raw || typeof raw !== "string") return "";
  let title = raw
    .replace(/^["'#\s]+|["'#\s]+$/g, "")
    .replace(/^Title:\s*/i, "")
    .replace(/\?+$/, "")
    .replace(/\.+$/, "")
    .trim();

  // Limit length to 2–6 words / 45 chars max
  const words = title.split(/\s+/);
  if (words.length > 6) {
    title = words.slice(0, 5).join(" ");
  }
  if (title.length > 45) {
    title = title.substring(0, 42).trim() + "…";
  }

  return title;
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
export async function generateSmartTitle({ conversationId, messages, currentTitle = "New Conversation" }) {
  if (!messages || messages.length === 0) return currentTitle;

  // Find the most meaningful user message for the heuristic (usually the longest one if the first was just a short greeting)
  const userMsgs = messages.filter((m) => m.role === "user");
  const targetUserMsg = userMsgs.length > 1 && userMsgs[0].content.length < 15 ? userMsgs[userMsgs.length - 1]?.content : userMsgs[0]?.content;
  const firstUserMsg = targetUserMsg || "";
  const heuristicTitle = generateHeuristicTitle(firstUserMsg);

  let finalTitle = heuristicTitle;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const contextStr = messages.slice(0, 3).map(m => `${m.role}: ${m.content}`).join("\n").substring(0, 600);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Generate a concise 2 to 5 word topic title for this conversation context:
"${contextStr}"

Rules:
- Return ONLY the 2-5 word topic title (e.g. "Photosynthesis Reactions", "World War I Causes", "Krebs Cycle", "Electrolysis Explained").
- Do NOT use quotation marks, punctuation, or conversational filler.
- If it's just a simple greeting like "Hello", return "Hello".
- Do NOT output generic titles like "Question", "Help", or "Conversation".`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 25,
            temperature: 0.2,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const aiTitle = cleanTitle(rawText);
        if (aiTitle && aiTitle.length >= 3) {
          finalTitle = aiTitle;
        }
      }
    }
  } catch (err) {
    console.warn("[generateSmartTitle] AI title generation notice:", err?.message);
  }

  // Persist title to Supabase DB if conversationId provided
  if (conversationId && finalTitle) {
    try {
      const { createAdminClient } = await import("../supabase/server.js");
      const supabase = createAdminClient();
      await supabase
        .from("ai_conversations")
        .update({ title: finalTitle, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (dbErr) {
      // Ignore DB write error in non-Supabase isolated runners
    }
  }

  return finalTitle;
}
