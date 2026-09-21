import fs from "fs";
import path from "path";

// Load .env.local into process.env
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
} catch {}

import { getClientModelsWithHealth, resolveModelForUser, AI_MODELS } from "../src/lib/ai/models.js";
import { streamAIChat } from "../src/lib/ai/router.js";
import { streamTogetherChat, isTogetherMockMode, getTogetherStatus } from "../src/lib/ai/together.js";

async function runTogetherTests() {
  console.log("==========================================");
  console.log("TOGETHER AI INTEGRATION VERIFICATION SUITE");
  console.log("==========================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Model Registration in AI_MODELS
  // ----------------------------------------------------
  const togetherModel = AI_MODELS.find((m) => m.id === "zai-org/GLM-5.3-Flash");
  assert(!!togetherModel, "GLM-5.3-Flash model registered in AI_MODELS");
  assert(togetherModel?.provider === "together", "Provider is correctly set to 'together'");
  assert(togetherModel?.displayName === "GLM-5.3-Flash", "Display name is 'GLM-5.3-Flash'");
  assert(togetherModel?.description === "Fast multimodal model for long-context academic work.", "Description matches specification");
  assert(
    JSON.stringify(togetherModel?.capabilities) === JSON.stringify(["text", "image", "long-context", "tool-calling", "json"]),
    "Capabilities match specification"
  );

  // ----------------------------------------------------
  // TEST 2: Model Registry & Client Health Output
  // ----------------------------------------------------
  const clientModels = await getClientModelsWithHealth();
  const togetherClientModel = clientModels.find((m) => m.id === "zai-org/GLM-5.3-Flash");
  assert(!!togetherClientModel, "GLM-5.3-Flash present in client models registry");
  console.log("Together Client Model Health Status:", {
    id: togetherClientModel?.id,
    displayName: togetherClientModel?.displayName,
    provider: togetherClientModel?.provider,
    isAvailable: togetherClientModel?.isAvailable,
    status: togetherClientModel?.status,
    description: togetherClientModel?.description,
  });

  // ----------------------------------------------------
  // TEST 3: Development Mock Mode Execution
  // ----------------------------------------------------
  process.env.TOGETHER_API_KEY = "";
  process.env.TOGETHER_MOCK_MODE = "true";

  let mockMetadata = null;
  let mockText = "";
  try {
    const gen = streamAIChat({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      modelId: "zai-org/GLM-5.3-Flash",
    });

    for await (const chunk of gen) {
      if (chunk.type === "metadata") {
        mockMetadata = chunk;
      } else if (chunk.type === "text") {
        mockText += chunk.text;
      }
    }
  } catch (err) {
    console.error("Mock mode execution error:", err);
  }

  assert(mockMetadata?.provider === "together", "Mock metadata includes provider='together'");
  assert(mockMetadata?.modelId === "zai-org/GLM-5.3-Flash", "Mock metadata includes exact modelId");
  assert(mockMetadata?.mock === true, "Mock metadata explicitly specifies mock=true");
  assert(
    mockText === "This is a development mock response for Together AI / GLM-5.3-Flash. The real API key has not been configured yet.",
    "Deterministic dev mock response text returned"
  );

  // ----------------------------------------------------
  // TEST 4: Missing Key & Mock Off Behavior
  // ----------------------------------------------------
  process.env.TOGETHER_API_KEY = "";
  process.env.TOGETHER_MOCK_MODE = "false";

  let missingKeyErr = null;
  try {
    const gen = streamTogetherChat({
      messages: [{ role: "user", content: "Hello" }],
      modelId: "zai-org/GLM-5.3-Flash",
    });

    for await (const chunk of gen) {}
  } catch (err) {
    missingKeyErr = err.message;
  }

  assert(
    missingKeyErr?.includes("[TOGETHER_NOT_CONFIGURED]"),
    "Empty key with mock off throws structured TOGETHER_NOT_CONFIGURED error"
  );

  // ----------------------------------------------------
  // TEST 5: Production Safety (Mock Force Off in Production)
  // ----------------------------------------------------
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.TOGETHER_MOCK_MODE = "true";

  assert(isTogetherMockMode() === false, "Mock mode is FORCED OFF in production environment");

  process.env.NODE_ENV = prevEnv; // Restore
  process.env.TOGETHER_MOCK_MODE = "true";

  // ----------------------------------------------------
  // TEST 6: Notes & Resources RAG Context Assembly
  // ----------------------------------------------------
  const sampleKnowledge = [
    { title: "Photosynthesis Notes", programme: "DP", subject: "Biology", level: "HL", content: "Light-dependent reactions occur in thylakoids." }
  ];

  let ragMockText = "";
  try {
    const gen = streamTogetherChat({
      messages: [{ role: "user", content: "Where do light-dependent reactions occur?" }],
      modelId: "zai-org/GLM-5.3-Flash",
      knowledgeContext: sampleKnowledge,
    });

    for await (const chunk of gen) {
      if (chunk.type === "text") ragMockText += chunk.text;
    }
  } catch (err) {
    console.error("RAG Context test error:", err);
  }

  assert(ragMockText.length > 0, "RAG Knowledge context passed successfully without error");

  // ----------------------------------------------------
  // SUMMARY RESULTS
  // ----------------------------------------------------
  console.log("\n==========================================");
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("==========================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTogetherTests();
