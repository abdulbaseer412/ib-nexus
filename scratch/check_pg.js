import { Client } from "pg";
import fs from "fs";
import path from "path";

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

const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgres://postgres:').replace('.supabase.co', '.supabase.co:5432/postgres'); // Try to get db url if possible

async function checkPgVector() {
  // If no DATABASE_URL, print it. Supabase exposes postgres://
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found. We can't connect directly via pg without it.");
    console.log("We will use Supabase SQL Editor or RPC.");
    return;
  }
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");
    
    // Check vector extension
    const res = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector';");
    console.log("Vector extension:", res.rows);
    
  } catch (err) {
    console.error("PG Error:", err);
  } finally {
    await client.end();
  }
}

checkPgVector();
