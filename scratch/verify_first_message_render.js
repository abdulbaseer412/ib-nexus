import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local into process.env
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFirstMessageRender() {
  console.log("=================================================");
  console.log("TESTING FIRST MESSAGE PERSISTENCE & INDEXING");
  console.log("=================================================\n");

  let convId = null;

  try {
    // Get a valid user ID or dummy test user ID
    const { data: users } = await supabase.auth.admin?.listUsers() || { data: { users: [] } };
    const userId = users?.users?.[0]?.id || "00000000-0000-0000-0000-000000000000";

    // 1. Create a conversation
    const { data: conv, error: convError } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        title: "First Message Test Chat",
        model_id: "gemini-3.6-flash",
      })
      .select()
      .single();

    if (convError) throw convError;
    convId = conv.id;
    console.log(`Created test conversation ID: ${convId}`);

    // 2. Add user's first message (Turn 0)
    const userMsgContent = "What are the main causes of cell division?";
    const { data: userMsg, error: userError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: convId,
        role: "user",
        content: userMsgContent,
      })
      .select()
      .single();

    if (userError) throw userError;
    console.log(`Added user message (Turn 0): "${userMsg.content}"`);

    // 3. Retrieve messages immediately (simulating initial fetch / refresh)
    const { data: messagesTurn0, error: getError0 } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (getError0) throw getError0;
    console.log(`Retrieved ${messagesTurn0.length} message(s) from Supabase DB.`);
    
    let passUserFirst = messagesTurn0.length === 1 && messagesTurn0[0].role === "user" && messagesTurn0[0].content === userMsgContent;
    console.log(`Index 0 is User Message: ${passUserFirst ? "PASS" : "FAIL"}`);

    // 4. Add AI response (Turn 1)
    const aiMsgContent = "Cell division occurs primarily for growth, repair, and reproduction...";
    const { error: aiError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: convId,
        role: "assistant",
        content: aiMsgContent,
        model_id: "gemini-3.6-flash",
        model_display_name: "Gemini 3.6 Flash",
      });

    if (aiError) throw aiError;
    console.log(`Added AI response (Turn 1)`);

    // 5. Retrieve full message history from Supabase DB
    const { data: messagesTurn1, error: getError1 } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (getError1) throw getError1;
    console.log(`Retrieved ${messagesTurn1.length} total message(s) after AI response.`);

    let passBothPresent = messagesTurn1.length === 2 && messagesTurn1[0].role === "user" && messagesTurn1[1].role === "assistant";
    console.log(`Turn 0 = User, Turn 1 = Assistant: ${passBothPresent ? "PASS" : "FAIL"}`);

    // 6. Cleanup test conversation
    if (convId) {
      await supabase.from("ai_messages").delete().eq("conversation_id", convId);
      await supabase.from("ai_conversations").delete().eq("id", convId);
      console.log(`Cleaned up test conversation ${convId}`);
    }

    console.log("\n=================================================");
    console.log("SUMMARY RESULTS:");
    console.log(`First User Message Persisted at Index 0: ${passUserFirst ? "PASS" : "FAIL"}`);
    console.log(`Full Conversation History Intact (User + AI): ${passBothPresent ? "PASS" : "FAIL"}`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test Error:", err);
    if (convId) {
      try {
        await supabase.from("ai_messages").delete().eq("conversation_id", convId);
        await supabase.from("ai_conversations").delete().eq("id", convId);
      } catch {}
    }
  }
}

testFirstMessageRender().catch(console.error);

