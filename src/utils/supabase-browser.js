import { createBrowserClient } from "@supabase/ssr";

let browserClient;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return browserClient;
}

/**
 * Wipes all Supabase auth data from localStorage and nulls the singleton.
 * Does NOT make any network call — avoids interfering with concurrent requests.
 */
export function clearClientSession() {
  browserClient = null;
  try {
    if (typeof localStorage !== "undefined") {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // localStorage not available (SSR guard)
  }
}

/**
 * Signs out via network and then clears local state.
 * Only call this when you have a confirmed valid session to invalidate.
 */
export async function destroyClient() {
  if (browserClient) {
    await browserClient.auth.signOut({ scope: "local" }).catch(() => {});
  }
  clearClientSession();
}
