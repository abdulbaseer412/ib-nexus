const { streamOllamaChat } = require("./src/lib/ai/ollama.js");

// Dummy resolveModel to mock models.js dependency
jest.mock("./src/lib/ai/models.js", () => ({
  resolveModel: () => ({
    id: "qwen3.5:2b",
    displayName: "Qwen 3.5 (2B)",
    temperature: 0.7,
  })
}));

async function runTest() {
  console.log("Testing Ollama adapter...");
  try {
    const generator = streamOllamaChat({
      messages: [{ role: "user", content: "Explain photosynthesis in simple Grade 10 language." }],
      userProfile: { display_name: "Test Student" },
      subjectFilter: "Biology",
      modelId: "qwen3.5:2b"
    });

    for await (const chunk of generator) {
      if (chunk.type === "metadata") {
        console.log("METADATA:", chunk);
      } else if (chunk.type === "text") {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n\nTest completed successfully.");
  } catch (error) {
    console.error("\nTEST FAILED:", error.message);
  }
}

runTest();
