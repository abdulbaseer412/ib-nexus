import { streamAIChat } from "./router.js";
import { getUserPreferences, updateUserPreferences } from "./db-conversations.js";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Asynchronously analyze recent feedback and update the user's AI preferences.
 * This should NOT block the main response.
 */
export async function learnFromFeedbackAsync(userId) {
  try {
    const supabase = await createServerClient();

    // 1. Fetch the last 10 feedback items for this user (both positive and negative)
    const { data: recentFeedback, error } = await supabase
      .from("ai_feedback")
      .select("rating, category, comment, message_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !recentFeedback || recentFeedback.length < 3) {
      // Not enough feedback to learn a pattern yet
      return;
    }

    // We need to fetch the actual prompts and responses for these feedbacks to learn from them
    const messageIds = recentFeedback.map(f => f.message_id).filter(Boolean);
    if (messageIds.length === 0) return;
    const { data: messages } = await supabase
      .from("ai_messages")
      .select("id, content, conversation_id, created_at")
      .in("id", messageIds);

    if (!messages) return;
    
    // 2. Format feedback for the LLM
    const feedbackList = recentFeedback.map(fb => {
      const msg = messages.find(m => m.id === fb.message_id);
      return `Feedback: ${fb.rating.toUpperCase()}
Reason: ${fb.category || "None"}
Comment: ${fb.comment || "None"}
AI Response snippet: ${msg ? msg.content.substring(0, 200) + "..." : "Unknown"}`;
    }).join("\n\n---\n\n");

    // 3. Fetch current preferences
    const currentPrefs = await getUserPreferences(userId);

    const prompt = `You are the Nexus Feedback Learning Layer.
Your job is to analyze recent user feedback on AI responses and deduce their structural/stylistic preferences.

CURRENT PREFERENCES:
${JSON.stringify(currentPrefs, null, 2)}

RECENT FEEDBACK:
${feedbackList}

INSTRUCTIONS:
1. Identify any recurring patterns (e.g. if they dislike long responses, or like step-by-step explanations).
2. Do NOT overfit to a single feedback unless it is an explicit comment.
3. Keep the preferences concise, actionable, and focused on style, format, and detail level.
4. Output ONLY a valid JSON object matching this schema, with no markdown formatting or backticks:
{
  "response_style": "Concise and direct...",
  "detail_level": "Moderate...",
  "formatting_preference": "Bullet points preferred...",
  "recurring_positive_patterns": ["Step-by-step math", "Simple definitions"],
  "recurring_negative_patterns": ["Overly long essays", "Unnecessary disclaimers"]
}
`;

    // We use the default/fallback model for internal reasoning (Gemini Flash is fast and cheap)
    const titleMessages = [{ role: "user", content: prompt }];
    const stream = streamAIChat({
      messages: titleMessages,
      modelId: "gemini-3.6-flash",
      userProfile: { id: userId }, // Need ID to pass validation
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
      // Clean up markdown if any
      const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        const newPrefs = JSON.parse(cleanedText);
        await updateUserPreferences(userId, newPrefs);
      } catch (parseErr) {
        console.warn("[learnFromFeedbackAsync] Failed to parse JSON:", cleanedText);
      }
    }

  } catch (err) {
    console.warn("[learnFromFeedbackAsync] Error:", err.message);
  }
}
