import { createClient } from "@supabase/supabase-js";

/**
 * Service-role admin client. Safe to use in both server components,
 * server actions, and API routes without next/headers dependencies.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
