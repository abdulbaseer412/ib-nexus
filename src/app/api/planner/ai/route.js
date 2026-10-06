import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { streamAIChat } from "@/lib/ai/router";
import { getProfile } from "@/lib/profile-service";

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { message, context } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const profile = await getProfile(user.id);
  const userName = profile?.full_name || profile?.name || profile?.display_name || "Student";

  const systemPrompt = `You are Nexus AI, a personal study planner for ${userName}.
You manage their IB study schedule. Be helpful, concise, and professional.

CURRENT PLANNER CONTEXT:
${JSON.stringify(context, null, 2)}

You must respond with a JSON object containing two fields:
1. "reply": A natural language response to the user. Use markdown.
2. "proposal": (Optional) An object specifying changes to their planner.
   Valid keys for proposal: "create_sessions", "update_sessions", "delete_sessions".
   Each takes an array of session objects.
   - For create_sessions: { "title": "...", "task_id": "...", "scheduled_start": "ISO", "scheduled_end": "ISO", "status": "scheduled" }
   - For update_sessions: { "id": "...", ...updates }
   - For delete_sessions: [ "id1", "id2" ]

CRITICAL RULES:
- If proposing new sessions, you MUST check the context to ensure the time slot is free and fits their preferences (e.g. daily max minutes, break minutes).
- Return ONLY valid JSON wrapped in a \`\`\`json code block. Do not include any other text outside the JSON block.

EXAMPLE OUTPUT:
\`\`\`json
{
  "reply": "I've scheduled Biology for 30 minutes tonight at 6 PM.",
  "proposal": {
    "create_sessions": [
      {
        "title": "Revise Cell Respiration",
        "task_id": "task-uuid-here",
        "scheduled_start": "2024-05-20T18:00:00Z",
        "scheduled_end": "2024-05-20T18:30:00Z",
        "status": "scheduled"
      }
    ]
  }
}
\`\`\``;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message }
  ];

  try {
    // We use the default gemini-1.5-pro model for planning
    const generator = streamAIChat({ messages, modelId: "gemini-1.5-pro" });
    let text = "";
    
    for await (const chunk of generator) {
      if (chunk.type === "text") text += chunk.text;
    }

    // Parse the JSON
    let parsedResult;
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[1].trim());
    } else {
      // Attempt to parse the whole string just in case
      try {
        parsedResult = JSON.parse(text.trim());
      } catch {
        // Fallback if the model failed to output valid JSON
        parsedResult = { reply: text.replace(/```json/g, '').replace(/```/g, '').trim() };
      }
    }

    return NextResponse.json(parsedResult);
  } catch (err) {
    console.error("Planner AI Error:", err);
    return NextResponse.json({ error: "Failed to generate AI plan." }, { status: 500 });
  }
}
