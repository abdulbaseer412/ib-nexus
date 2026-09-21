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
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {}

import { getClientModelsWithHealth, resolveModelForUser } from "../src/lib/ai/models.js";
import { streamAIChat } from "../src/lib/ai/router.js";

async function runVerification() {
  console.log("==========================================");
  console.log("1. TESTING MODEL REGISTRY WITH HEALTH CHECK");
  console.log("==========================================");

  const models = await getClientModelsWithHealth();
  console.log(`Retrieved ${models.length} client models:`);
  models.forEach((m) => {
    console.log(` - [${m.provider.toUpperCase()}] ${m.id} (${m.displayName}) | Available: ${m.isAvailable} | Description: "${m.description}"`);
  });

  console.log("\n==========================================");
  console.log("2. TESTING GEMINI SELECTION & EXECUTION");
  console.log("==========================================");
  try {
    const geminiGen = streamAIChat({
      messages: [{ role: "user", content: "Reply with 'GEMINI_OK' only." }],
      modelId: "gemini-3.6-flash",
    });
    let geminiText = "";
    for await (const chunk of geminiGen) {
      if (chunk.type === "metadata") {
        console.log("Gemini Metadata:", chunk);
      } else if (chunk.type === "text") {
        geminiText += chunk.text;
      }
    }
    console.log("Gemini Output:", geminiText.trim());
  } catch (err) {
    console.error("Gemini Error:", err.message);
  }

  console.log("\n==========================================");
  console.log("3. TESTING GROQ SELECTION & EXECUTION");
  console.log("==========================================");
  try {
    const groqGen = streamAIChat({
      messages: [{ role: "user", content: "Reply with 'GROQ_OK' only." }],
      modelId: "openai/gpt-oss-20b",
    });
    let groqText = "";
    for await (const chunk of groqGen) {
      if (chunk.type === "metadata") {
        console.log("Groq Metadata:", chunk);
      } else if (chunk.type === "text") {
        groqText += chunk.text;
      }
    }
    console.log("Groq Output:", groqText.trim());
  } catch (err) {
    console.error("Groq Error:", err.message);
  }

  console.log("\n==========================================");
  console.log("4. TESTING REMOTE QWEN3-4B SELECTION & EXECUTION");
  console.log("==========================================");
  try {
    const qwenGen = streamAIChat({
      messages: [{ role: "user", content: "What is your name?" }],
      modelId: "qwen3-4b",
    });
    let qwenText = "";
    for await (const chunk of qwenGen) {
      if (chunk.type === "metadata") {
        console.log("Qwen Metadata:", chunk);
      } else if (chunk.type === "text") {
        qwenText += chunk.text;
      }
    }
    console.log("Qwen3-4B Output:", qwenText.trim());
  } catch (err) {
    console.error("Qwen Error:", err.message);
  }
}

runVerification();
