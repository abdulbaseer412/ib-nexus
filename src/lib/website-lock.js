import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { IS_APPLICATION_LOCKED } from "@/lib/constants";

// Global in-memory fallback state in case database table is not yet provisioned in Supabase
let inMemoryLockSettings = {
  is_locked: false,
  lock_message: null,
  updated_at: new Date().toISOString(),
  updated_by: "system",
};

import { createClient } from "@supabase/supabase-js";

/**
 * Direct fetch function compatible with Next.js Edge Middleware and Node.js SSR.
 * Uses standard Supabase client with persistSession: false to avoid URL/header issues.
 */
export async function fetchDirectLockStatus() {
  if (IS_APPLICATION_LOCKED) {
    return { is_locked: true, lock_message: null };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th";

    if (supabaseUrl && serviceKey) {
      // Use standard Supabase JS client to avoid manual fetch URL concatenation bugs (e.g. trailing slashes)
      // Force no-store cache so Server Components always get the fresh lock status
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (url, options) => {
            return fetch(url, { ...options, cache: "no-store" });
          },
        },
      });

      const { data, error } = await supabase
        .from("website_settings")
        .select("is_locked, lock_message, updated_at, updated_by")
        .eq("id", "global")
        .maybeSingle();

      if (!error && data) {
        const isLocked = Boolean(data.is_locked) || IS_APPLICATION_LOCKED;
        inMemoryLockSettings = {
          is_locked: isLocked,
          lock_message: data.lock_message || null,
          updated_at: data.updated_at || null,
          updated_by: data.updated_by || null,
        };
        return {
          is_locked: isLocked,
          lock_message: data.lock_message || null,
          updated_at: data.updated_at || null,
          updated_by: data.updated_by || null,
        };
      }
    }
  } catch (err) {
    console.error("[fetchDirectLockStatus] Supabase client error:", err?.message);
  }

  return {
    is_locked: Boolean(inMemoryLockSettings.is_locked) || IS_APPLICATION_LOCKED,
    lock_message: inMemoryLockSettings.lock_message || null,
    updated_at: inMemoryLockSettings.updated_at || null,
    updated_by: inMemoryLockSettings.updated_by || null,
  };
}

export const getWebsiteLockSettings = cache(async () => {
  return await fetchDirectLockStatus();
});

export async function isApplicationLocked() {
  if (IS_APPLICATION_LOCKED) return true;
  const settings = await fetchDirectLockStatus();
  return Boolean(settings.is_locked);
}

export async function updateWebsiteLockSettingsInDB({ is_locked, lock_message, updated_by }) {
  const payload = {
    id: "global",
    is_locked: Boolean(is_locked),
    lock_message: lock_message || null,
    updated_at: new Date().toISOString(),
    updated_by: updated_by || "system",
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("website_settings")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }
    
    if (data) {
      inMemoryLockSettings = {
        is_locked: data.is_locked,
        lock_message: data.lock_message,
        updated_at: data.updated_at,
        updated_by: data.updated_by,
      };
      return { success: true, settings: inMemoryLockSettings };
    }
  } catch (err) {
    console.error("[updateWebsiteLockSettingsInDB] Error writing website_settings:", err?.message);
    return { success: false, error: "Database error: " + (err?.message || "Failed to save lock settings") };
  }

  return { success: false, error: "Unknown error occurred while updating lock settings." };
}
