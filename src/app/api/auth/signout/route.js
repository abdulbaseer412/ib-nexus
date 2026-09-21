import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[Signout Route] Error:", err);
  }
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}
