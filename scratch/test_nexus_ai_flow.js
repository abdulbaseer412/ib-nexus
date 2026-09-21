const { sanitizeAiResponse } = require("../src/lib/ai/response-sanitizer");
const { generateHeuristicTitle } = require("../src/lib/ai/title-generator");

console.log("=== RUNNING NEXUS AI VERIFICATION TESTS ===");

// Test 1: Sanitizer removes <think> and <analysis> tags
const rawInput = "<think>Calculating the answer...</think>The Krebs cycle produces 2 ATP per glucose molecule.";
const sanitized = sanitizeAiResponse(rawInput);
console.log("Sanitizer Test:", sanitized === "The Krebs cycle produces 2 ATP per glucose molecule." ? "PASS" : "FAIL");
console.log("  Output:", JSON.stringify(sanitized));

// Test 2: Heuristic title generation
const title1 = generateHeuristicTitle("Explain the Krebs cycle step by step");
console.log("Title Test 1:", title1 === "Krebs Cycle Step By Step" ? "PASS" : "FAIL (" + title1 + ")");

const title2 = generateHeuristicTitle("What is your name?");
console.log("Title Test 2:", title2 === "AI Identity" ? "PASS" : "FAIL (" + title2 + ")");

console.log("=== NEXUS AI VERIFICATION COMPLETE ===");
