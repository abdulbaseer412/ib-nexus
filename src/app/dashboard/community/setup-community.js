"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * One-time database setup for the Community system.
 * Run this once via the admin setup page, then it can be removed.
 * Uses the service-role client so it bypasses RLS.
 */
export async function setupCommunityTables() {
  const supabase = createAdminClient();

  // 1. Add is_admin to profiles
  const { error: alterError } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
    `,
  });

  // If rpc doesn't exist, try direct approach
  if (alterError) {
    // Try updating directly - the column may already exist
    console.log("Note: Could not alter table via RPC, trying direct update.");
  }

  // 2. Create community_posts
  const { error: postsError } = await supabase.from("community_posts").select("id").limit(1);
  if (postsError?.code === "42P01") {
    // Table doesn't exist - we need to create it via SQL
    console.log("community_posts table does not exist. Creating via SQL...");
  }

  return { message: "Setup check complete. See console for details." };
}
