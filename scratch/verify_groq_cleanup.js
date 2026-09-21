import { getMergedModelRegistry, resolveModelForUserAsync } from "../src/lib/ai/models.js";

async function verifyGroqCleanup() {
  console.log("=================================================");
  console.log("GROQ MODEL CLEANUP VERIFICATION");
  console.log("=================================================\n");

  const registry = await getMergedModelRegistry();
  const groqModels = registry.filter((m) => m.provider === "groq");

  console.log(`Total Groq Models Registered: ${groqModels.length}`);
  console.table(
    groqModels.map((m) => ({
      "Model ID": m.id,
      "Display Name": m.displayName,
      "Description": m.description,
      "Capabilities": m.capabilities.join(", "),
      "Enabled": m.enabled ? "YES" : "NO",
    }))
  );

  const passTwoModels = groqModels.length === 2;
  const passGpt120b = groqModels.some((m) => m.id === "openai/gpt-oss-120b" && m.displayName === "GPT-OSS 120B");
  const passQwen27b = groqModels.some((m) => m.id === "qwen/qwen3.6-27b" && m.displayName === "Qwen 3.6 27B");
  const passNoOldModels = !groqModels.some((m) => m.id === "openai/gpt-oss-20b" || m.id === "mixtral-8x7b-32768");

  const resolved120b = await resolveModelForUserAsync("openai/gpt-oss-120b");
  const resolved27b = await resolveModelForUserAsync("qwen/qwen3.6-27b");

  const passResolution = resolved120b.id === "openai/gpt-oss-120b" && resolved27b.id === "qwen/qwen3.6-27b";

  console.log("\n=================================================");
  console.log("SUMMARY RESULTS:");
  console.log(`Exactly 2 Groq Models: ${passTwoModels ? "PASS" : "FAIL"}`);
  console.log(`GPT-OSS 120B Present: ${passGpt120b ? "PASS" : "FAIL"}`);
  console.log(`Qwen 3.6 27B Present: ${passQwen27b ? "PASS" : "FAIL"}`);
  console.log(`Old/Invented Models Removed: ${passNoOldModels ? "PASS" : "FAIL"}`);
  console.log(`Model Resolution: ${passResolution ? "PASS" : "FAIL"}`);
  console.log("=================================================");
}

verifyGroqCleanup().catch(console.error);
