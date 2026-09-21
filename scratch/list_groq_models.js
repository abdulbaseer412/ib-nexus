import fs from "fs";
import path from "path";
import Groq from "groq-sdk";

const envPath = path.join(process.cwd(), ".env.local");
const lines = fs.readFileSync(envPath, "utf8").split("\n");
let key = "";
for (const line of lines) {
  if (line.startsWith("GROQ_API_KEY=")) {
    key = line.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
  }
}

console.log("Groq API key found:", key ? "YES" : "NO");
const groq = new Groq({ apiKey: key });

groq.chat.completions.create({
  messages: [{ role: "user", content: "Hello" }],
  model: "qwen/qwen3.6-27b",
}).then((res) => {
  console.log("qwen/qwen3.6-27b SUCCESS:", res.choices[0].message.content.slice(0, 50));
}).catch((err) => console.error("qwen/qwen3.6-27b ERROR:", err.message));

