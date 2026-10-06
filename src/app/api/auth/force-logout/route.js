import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut().catch(() => {});
  } catch {
    // Ignore server client failure
  }

  const response = NextResponse.json(
    { success: true, loggedOut: true },
    { status: 200 }
  );

  // Forcibly expire all Supabase auth cookies across the entire domain
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith("sb-") || name.startsWith("supabase-auth")) {
      if (!name.includes("code-verifier")) {
        response.cookies.set(name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
  });

  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}
