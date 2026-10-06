import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

export async function createServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components; middleware handles refresh.
          }
        },
      },
    }
  );
}

export { createAdminClient } from "./admin.js";
