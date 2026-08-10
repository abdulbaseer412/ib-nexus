import { appendFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const LOG_FILE = join(process.cwd(), "callback-debug.log");

export async function POST(request) {
  try {
    const event = await request.json();
    const line = `${new Date().toISOString()} [OAUTH:CLIENT] ${JSON.stringify(event)}\n`;
    process.stdout.write(line);
    appendFileSync(LOG_FILE, line);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[OAUTH:CLIENT:TRACE:FAILED]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
