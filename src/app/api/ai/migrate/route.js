import { NextResponse } from "next/server";
import { bootstrapAiTables } from "@/lib/ai/db-conversations";

export async function GET() {
  try {
    const res = await bootstrapAiTables();
    return NextResponse.json({ success: true, res });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
