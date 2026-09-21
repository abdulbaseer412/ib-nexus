import { getMergedModelRegistry, resolveModelForUserAsync } from "../src/lib/ai/models.js";
import { bootstrapAiTables } from "../src/lib/ai/db-conversations.js";

async function testAdminModelControl() {
  console.log("=== Testing Admin Model Control & Registry ===");

  try {
    // 1. Bootstrap tables
    await bootstrapAiTables();
    console.log("✓ Bootstrapped AI tables successfully.");

    // 2. Fetch merged registry
    const registry = await getMergedModelRegistry();
    console.log(`✓ Fetched merged model registry (${registry.length} models):`);
    registry.forEach(m => {
      console.log(` - ID: ${m.id} | Name: "${m.displayName}" | Default: ${m.isDefault} | Paused: ${m.isPaused} | Hidden: ${m.isHidden} | Enabled: ${m.enabled}`);
    });

    // 3. Resolve default model for user
    const resolvedDefault = await resolveModelForUserAsync(null);
    console.log(`\n✓ Resolved default model for new user:`, resolvedDefault.displayName, `(ID: ${resolvedDefault.id})`);

    // 4. Resolve specific model
    const resolvedGemini = await resolveModelForUserAsync("gemini-2.5-flash");
    console.log(`✓ Resolved specific Gemini model:`, resolvedGemini.displayName, `(ID: ${resolvedGemini.id})`);

    console.log("\n=== ALL REGISTRY & RESOLUTION TESTS PASSED ===");
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

testAdminModelControl();
