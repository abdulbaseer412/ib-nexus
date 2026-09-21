import { indexDocument, retrieveKnowledgeLens } from "../src/lib/ai/knowledge-lens.js";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env
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
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Starting Knowledge Lens test...");

  // 1. Get a mock user ID
  const { data: users } = await supabase.auth.admin.listUsers({ limit: 1 });
  let userId = "00000000-0000-0000-0000-000000000000";
  if (users?.users?.length > 0) {
    userId = users.users[0].id;
  }
  console.log("Using user ID:", userId);

  // 2. Index a mock note
  const sourceId = "11111111-1111-1111-1111-111111111111"; // fake UUID
  console.log("Indexing mock note...");
  await indexDocument({
    sourceType: "note",
    sourceId,
    title: "Mitochondria Study Guide",
    content: "The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell's biochemical reactions.",
    userId,
    metadata: { subject: "Biology", level: "HL" }
  });

  console.log("Index request submitted.");

  // Wait a moment for async insert
  await new Promise(r => setTimeout(r, 2000));

  // 3. Query
  console.log("Retrieving knowledge...");
  const results = await retrieveKnowledgeLens({
    query: "What generates energy for the cell?",
    userId,
    limit: 3
  });

  console.log("Results found:", results.length);
  results.forEach((r, i) => {
    console.log(`\nResult ${i + 1} [${r.typeLabel}]: ${r.title}`);
    console.log(`Content: ${r.content}`);
  });

  // Check if pgvector is missing
  if (results.length === 0) {
    console.log("No results returned. This usually means the pgvector SQL script hasn't been run yet in the Supabase Dashboard, or OPENAI_API_KEY is missing (using dummy embeddings).");
  } else {
    console.log("SUCCESS! Semantic search is working.");
  }
}

runTest().catch(console.error);
