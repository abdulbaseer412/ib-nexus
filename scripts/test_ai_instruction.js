const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  const { data, error } = await supabase.from("ai_training_entries").insert({
    original_prompt: "Test Original Prompt",
    ai_instruction: "Test AI Instruction",
    category: "Identity",
    priority: "High",
    scope: "Global",
    status: "Pending Review"
  }).select("*");

  if (error) {
    console.error("ai_instruction error:", error.message);
  } else {
    console.log("ai_instruction column EXISTS!", data);
    await supabase.from("ai_training_entries").delete().eq("id", data[0].id);
  }
}

testColumns();
