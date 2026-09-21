import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export async function POST(request) {
  try {
    await requireAdmin();

    const results = [];

    // Test Gemini
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      await model.generateContent("Test");
      results.push({ provider: "Gemini", status: "success" });
    } catch (err) {
      results.push({ provider: "Gemini", status: "error", message: err.message });
    }

    // Test OpenAI
    try {
      const OpenAI = require("openai").default;
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      const openai = new OpenAI({ apiKey });
      await openai.models.list();
      results.push({ provider: "OpenAI", status: "success" });
    } catch (err) {
      results.push({ provider: "OpenAI", status: "error", message: err.message });
    }

    // Test Groq
    try {
      const Groq = require("groq-sdk").default || require("groq-sdk");
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not set");
      const groq = new Groq({ apiKey });
      await groq.models.list();
      results.push({ provider: "Groq", status: "success" });
    } catch (err) {
      results.push({ provider: "Groq", status: "error", message: err.message });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Test Connections Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
