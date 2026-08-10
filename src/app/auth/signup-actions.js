"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";

const PENDING_SIGNUP_TTL_SECONDS = 600; // 10 minutes
const NONCE_COOKIE = "ib_nexus_oauth_nonce";

/**
 * Creates a short-lived, single-use pending signup authorization for a
 * Google OAuth sign-up attempt.
 *
 * Flow:
 *   1. Generate a cryptographically random nonce.
 *   2. Store SHA-256(nonce) in pending_oauth_signups alongside the email.
 *   3. Set the raw nonce as an HttpOnly, SameSite=Lax cookie so the
 *      callback can verify it (future enhancement — currently the hook
 *      validates by email + expiry + consumed_at alone).
 *   4. Return { ok: true } so the client can proceed to signInWithOAuth.
 *
 * The Before User Created hook reads pending_oauth_signups and atomically
 * consumes the row. If no valid row exists, the hook blocks user creation
 * before any auth.users row is inserted.
 *
 * Security properties:
 *   - Short-lived (10 minutes).
 *   - Single-use (consumed_at set atomically on first use).
 *   - Unpredictable nonce (32 bytes of crypto-random data).
 *   - Only the hash is stored server-side.
 *   - Service-role only — never callable from the browser directly.
 */
export async function createPendingGoogleSignup() {
  console.log("[SIGNUP FLOW] Step 2: createPendingGoogleSignup() called");
  const admin = createAdminClient();

  // Generate a 32-byte random nonce and store its SHA-256 hash.
  const rawNonce = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawNonce).digest("hex");
  const expiresAt = new Date(Date.now() + PENDING_SIGNUP_TTL_SECONDS * 1000).toISOString();

  console.log("[SIGNUP FLOW] Step 2: Inserting pending row — email='', token_hash prefix:", tokenHash.slice(0, 8), "expires_at:", expiresAt);

  // Delete any stale unconsumed wildcard rows from previous attempts
  // to prevent accumulation that would trigger P0003 in the hook.
  await admin
    .from("pending_oauth_signups")
    .delete()
    .eq("email", "")
    .is("consumed_at", null);

  // email is intentionally empty — the hook matches on wildcard rows (email = '').
  // We cannot know the Google account email before the OAuth redirect.
  const { data: insertedRow, error: insertError } = await admin
    .from("pending_oauth_signups")
    .insert({ email: "", provider: "google", token_hash: tokenHash, expires_at: expiresAt })
    .select("id, email, expires_at")
    .single();

  if (insertError) {
    console.error("[SIGNUP FLOW] Step 2: FAILED — insert error:", {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
    });
    return { error: "Could not initialize sign-up. Please try again." };
  }

  console.log("[SIGNUP FLOW] Step 2: SUCCESS — pending row inserted:", insertedRow);

  // Set the raw nonce as an HttpOnly cookie so the callback can
  // cross-check it against the hash if needed in the future.
  const cookieStore = await cookies();
  cookieStore.set(NONCE_COOKIE, rawNonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_SIGNUP_TTL_SECONDS,
    path: "/",
  });

  return { ok: true };
}
