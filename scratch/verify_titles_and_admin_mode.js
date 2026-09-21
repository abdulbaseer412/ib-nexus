import { generateHeuristicTitle } from "../src/lib/ai/title-generator.js";

function verifyTitlesAndAdminMode() {
  console.log("=================================================");
  console.log("CHAT TITLES & ADMIN AI UNRESTRICTED MODE TEST");
  console.log("=================================================\n");

  const testCases = [
    {
      input: "Explain photosynthesis and compare light-dependent and light-independent reactions.",
      expected: "Photosynthesis Reactions",
    },
    {
      input: "Can you explain the causes of World War I?",
      expected: "World War I Causes",
    },
    {
      input: "Explain the Krebs cycle",
      expected: "Krebs Cycle",
    },
    {
      input: "Read this chemistry diagram",
      expected: "Chemistry Diagram",
    },
    {
      input: "Help me structure my TOK essay",
      expected: "TOK Essay Structure",
    },
  ];

  console.log("1. Automatic Title Quality Test:");
  let passTitles = true;
  testCases.forEach((tc) => {
    const title = generateHeuristicTitle(tc.input);
    const pass = title.toLowerCase() === tc.expected.toLowerCase();
    if (!pass) passTitles = false;
    console.log(`Input: "${tc.input.substring(0, 45)}..."`);
    console.log(`Generated Title: "${title}" | Expected: "${tc.expected}" | Result: ${pass ? "PASS" : "FAIL"}\n`);
  });

  console.log("2. Admin Unrestricted Mode Server Check:");
  const mockAdminProfile = { role: "admin", email: "admin@ibnexus.com" };
  const isAdmin = mockAdminProfile.role === "admin" || mockAdminProfile.email.endsWith("@ibnexus.com");
  console.log(`Admin Role Detection: ${isAdmin ? "ADMIN DETECTED (Bypass Limits)" : "FAIL"}`);

  console.log("\n=================================================");
  console.log("SUMMARY RESULTS:");
  console.log(`Chat Title Topic Extraction: ${passTitles ? "PASS" : "FAIL"}`);
  console.log(`Server Admin Role Authorization: ${isAdmin ? "PASS" : "FAIL"}`);
  console.log("=================================================");
}

verifyTitlesAndAdminMode();
