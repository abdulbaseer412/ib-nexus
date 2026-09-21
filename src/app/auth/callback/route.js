import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-service";
import { isOnboardingComplete } from "@/lib/profile";
import { mapAuthError } from "@/lib/auth-errors";
import {
  GOOGLE_ALREADY_LINKED_MESSAGE,
  GOOGLE_LINK_SUCCESS_MESSAGE,
  GOOGLE_SIGNIN_CANCELLED_MESSAGE,
  GOOGLE_NO_ACCOUNT_MESSAGE,
  isIdentityConflictError,
  validateGoogleLinkOwnership,
} from "@/lib/auth-linking";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { appendFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const LOG_FILE = join(process.cwd(), "callback-debug.log");
const PENDING_SIGNUP_NONCE_COOKIE = "ib_nexus_oauth_nonce";
function flog(label, data) {
  const line = `${new Date().toISOString()} ${label} ${JSON.stringify(data)}\n`;
  process.stdout.write(line);
  try { appendFileSync(LOG_FILE, line); } catch { }
}

function securityRedirect(origin, params) {
  const url = new URL("/settings/security", origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url.toString());
}

function loginRedirect(origin, message, nextPath = null) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  if (nextPath) url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url.toString());
}

function signupRedirect(origin, message) {
  const url = new URL("/signup", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url.toString());
}

/**
 * Clears all Supabase auth cookies on the response so no orphaned session
 * lingers in the browser after a rejected flow.
 */
function clearAuthCookies(request, response) {
  request.cookies.getAll().forEach(({ name }) => {
    // The PKCE verifier is written by the browser client.  Clearing it here
    // with HttpOnly creates an empty cookie that JavaScript cannot overwrite
    // when the user immediately starts a second OAuth request.
    if (
      (name.startsWith("sb-") || name.startsWith("supabase-auth")) &&
      !name.includes("code-verifier")
    ) {
      flog("[CALLBACK:COOKIE:CLEAR]", { name, reason: "rejected auth session" });
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  });
  return response;
}

/**
 * Returns true when auth.users was inserted during the current OAuth exchange
 * (the account did not exist before the user clicked Continue with Google).
 *
 * The previous identity-delta heuristic permanently marked every Google-only
 * account as "new" because identity.created_at and user.created_at are always
 * co-created and never change on later sign-ins.
 */
function wasUserCreatedInThisOAuthExchange(user) {
  if (!user?.created_at || !user?.last_sign_in_at) return false;

  const createdAtMs = new Date(user.created_at).getTime();
  const lastSignInMs = new Date(user.last_sign_in_at).getTime();
  const ageMs = Date.now() - createdAtMs;
  const signInSpreadMs = Math.abs(lastSignInMs - createdAtMs);

  // An account inserted during THIS exchange code call was created within the last 10 seconds.
  // Anything older than 10 seconds was created in a previous request / session.
  if (ageMs > 10_000) {
    return false;
  }

  // Returning user: last_sign_in_at advanced well after account creation.
  if (signInSpreadMs > 1_000) {
    return false;
  }

  // Inserted within the current OAuth request window (under 10s old, signInSpread under 1s).
  return ageMs <= 10_000;
}

/**
 * Deletes a user from auth.users (and cascades to identities, profiles,
 * user_auth_settings via ON DELETE CASCADE) using the service-role client.
 *
 * MUST only run for sign-in orphans: unknown Google account where Supabase
 * created a temporary auth.users row before application validation.
 */
async function deleteUser(userId, audit = {}) {
  if (!userId) return;

  flog("[CALLBACK:deleteUser]", {
    function: "deleteUser",
    file: "src/app/auth/callback/route.js",
    userId,
    email: audit.email ?? null,
    intent: audit.intent ?? null,
    isNewUser: audit.isNewUser ?? null,
    redirectTarget: audit.redirectTarget ?? null,
    reason:
      audit.reason ??
      "Google sign-in for unregistered account; removing temporary auth.users row",
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    flog("[CALLBACK:deleteUser:FAILED]", { userId, error: error.message });
  } else {
    flog("[CALLBACK:deleteUser:OK]", { userId });
  }
}

/**
 * A rejected Google sign-up leaves a short-lived authorization row behind.
 * Clear it in that callback, before rendering the linked-account prompt.
 */
async function clearRejectedSignupAuthorization(request, response) {
  const nonce = request.cookies.get(PENDING_SIGNUP_NONCE_COOKIE)?.value;
  if (!nonce) {
    flog("[CALLBACK:PENDING-SIGNUP:CLEAR]", { status: "SKIPPED", reason: "nonce cookie missing" });
    return response;
  }

  const tokenHash = createHash("sha256").update(nonce).digest("hex");
  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_oauth_signups")
    .delete()
    .eq("provider", "google")
    .eq("token_hash", tokenHash)
    .is("consumed_at", null);

  if (error) {
    flog("[CALLBACK:PENDING-SIGNUP:CLEAR:FAILED]", {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      fullErrorObject: JSON.stringify(error),
    });
  } else {
    flog("[CALLBACK:PENDING-SIGNUP:CLEAR]", { status: "SUCCESS" });
  }

  response.cookies.set(PENDING_SIGNUP_NONCE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const rawError = searchParams.get("error");
    const rawErrorDescription = searchParams.get("error_description");
    const rawErrorCode = searchParams.get("error_code");
    const reconnect = searchParams.get("reconnect");
    const oauthProvider = searchParams.get("provider");
    const expectedUserId = searchParams.get("expected_user_id");
    const intent = searchParams.get("intent") ?? "signin";
    const state = searchParams.get("state");
    const traceId = searchParams.get("trace");
    const redirect_to = searchParams.get("redirect_to") || next;
    const isLinkFlow = Boolean(reconnect || expectedUserId);

    flog("[CALLBACK:ENTRY]", {
      incomingUrl: request.url,
      provider: oauthProvider,
      intent,
      state,
      traceId,
      redirect_to,
      isLinkFlow,
      hasCode: Boolean(code),
      codePrefix: code ? code.slice(0, 8) + "..." : null,
      requestCookieNames: request.cookies.getAll().map(({ name }) => name),
      pkceVerifierCookies: request.cookies
        .getAll()
        .filter(({ name }) => name.includes("code-verifier"))
        .map(({ name, value }) => ({ name, exists: Boolean(value), valueLength: value?.length ?? 0 })),
      rawError,
      rawErrorDescription,
      rawErrorCode,
    });

    // ── BRANCH A: OAuth provider error (no code in URL) ────────────────────────
    if (rawError) {
      let message;
      if (rawError === "access_denied") {
        if (!isLinkFlow && intent === "signin") {
          const description = (rawErrorDescription || "").toLowerCase();
          const noAccount =
            description.includes("no account") || description.includes("create an account");
          message = noAccount ? GOOGLE_NO_ACCOUNT_MESSAGE : GOOGLE_SIGNIN_CANCELLED_MESSAGE;
        } else if (!isLinkFlow && intent === "signup") {
          message = "Sign-up was interrupted. Please try again.";
        } else {
          message = GOOGLE_SIGNIN_CANCELLED_MESSAGE;
        }
      } else {
        message = mapAuthError({ message: rawError });
      }

      flog("[CALLBACK:BRANCH-A] rawError branch — NO user created", {
        branch: "A",
        intent,
        isLinkFlow,
        rawError,
        rawErrorDescription,
        rawErrorCode,
        resolvedMessage: message,
        redirectTo: intent === "signup" ? `/signup?error=${encodeURIComponent(message)}` : "/login",
      });

      if (isLinkFlow) {
        return clearAuthCookies(request, securityRedirect(origin, { error: message }));
      }
      if (intent === "signup") {
        return clearAuthCookies(request, signupRedirect(origin, message));
      }
      return clearAuthCookies(request, loginRedirect(origin, message));
    }

    // ── BRANCH B: No code and no error ─────────────────────────────────────────
    if (!code) {
      const message = isLinkFlow
        ? GOOGLE_SIGNIN_CANCELLED_MESSAGE
        : intent === "signup"
          ? "Sign-up was interrupted. Please try again."
          : "Sign in was interrupted. Please try again.";

      flog("[CALLBACK:BRANCH-B] no code, no error — interrupted before consent", {
        branch: "B",
        intent,
        isLinkFlow,
        resolvedMessage: message,
      });

      if (isLinkFlow) {
        return clearAuthCookies(request, securityRedirect(origin, { error: message }));
      }
      if (intent === "signup") {
        return clearAuthCookies(request, signupRedirect(origin, message));
      }
      return clearAuthCookies(request, loginRedirect(origin, message));
    }

    // ── BRANCH C: Exchange code for session ────────────────────────────────────
    flog("[CALLBACK:EXCHANGE:STARTING]", {
      status: "Starting exchangeCodeForSession...",
      intent,
      provider: oauthProvider,
      callbackUrl: request.url,
      codePrefix: code.slice(0, 8) + "...",
    });

    const supabase = await createServerClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      flog("[CALLBACK:EXCHANGE:FAILED]", {
        status: "FAILED",
        intent,
        isLinkFlow,
        errorName: exchangeError.name,
        errorMessage: exchangeError.message,
        errorCode: exchangeError.code,
        errorStatus: exchangeError.status,
        errorStack: exchangeError.stack,
        fullErrorObject: JSON.stringify(exchangeError),
      });

      if (isLinkFlow) {
        const message = isIdentityConflictError(exchangeError.message)
          ? GOOGLE_ALREADY_LINKED_MESSAGE
          : mapAuthError(exchangeError);
        return clearAuthCookies(request, securityRedirect(origin, { error: message }));
      }

      const isPkceLoss =
        exchangeError.name === "AuthPKCECodeVerifierMissingError" ||
        exchangeError.code === "pkce_code_verifier_not_found" ||
        /pkce/i.test(exchangeError.message || "");

      if (intent === "signup") {
        return clearAuthCookies(
          request,
          signupRedirect(
            origin,
            isPkceLoss
              ? "Sign-up was interrupted. Please try again."
              : mapAuthError(exchangeError)
          )
        );
      }

      if (isPkceLoss) {
        return clearAuthCookies(
          request,
          loginRedirect(origin, "Google sign-in was interrupted. Please try again.")
        );
      }

      return clearAuthCookies(request, loginRedirect(origin, mapAuthError(exchangeError)));
    }

    const user = data.user;
    const identities = user.identities ?? [];
    let isNewUser = wasUserCreatedInThisOAuthExchange(user);
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const signInSpreadMs =
      new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime();

    flog("[CALLBACK:EXCHANGE:SUCCESS]", {
      status: "SUCCESS",
      message: "✓ OAuth exchange succeeded",
      returnedSession: Boolean(data.session),
      returnedUser: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      },
      returnedIdentities: identities.map((id) => ({
        id: id.id,
        provider: id.provider,
        createdAt: id.created_at,
        lastSignInAt: id.last_sign_in_at,
      })),
      returnedProvider: oauthProvider || user.app_metadata?.provider || identities[0]?.provider,
      isNewUser,
      accountAgeMs,
      signInSpreadMs,
    });

    // ── BRANCH D: Link-flow ownership validation ───────────────────────────────
    if (isLinkFlow && expectedUserId) {
      const ownership = await validateGoogleLinkOwnership(supabase, user, expectedUserId);
      if (!ownership.allowed) {
        flog("[CALLBACK:BRANCH-D] link ownership check failed", { userId: user.id, expectedUserId });
        return clearAuthCookies(request, securityRedirect(origin, { error: GOOGLE_ALREADY_LINKED_MESSAGE }));
      }
    }

    // ── BRANCH E/F: Intent enforcement ───────────────────────────────────────────
    if (!isLinkFlow) {
      if (intent === "signup" && !isNewUser) {
        flog("[CALLBACK:BRANCH-E] BLOCKED: existing account used signup intent", {
          branch: "E",
          condition: "intent=signup && !isNewUser",
          userId: user.id,
          email: user.email,
          isNewUser,
          accountAgeMs,
          signInSpreadMs,
          deleteUserExecuted: false,
          redirectUrl: "/signup?google_exists=1",
        });
        const url = new URL("/signup", origin);
        url.searchParams.set("google_exists", "1");
        const response = NextResponse.redirect(url.toString());
        await supabase.auth.signOut({ scope: "local" });
        await clearRejectedSignupAuthorization(request, response);
        return clearAuthCookies(request, response);
      }

      if (intent === "signin" && isNewUser) {
        // Double-check if a profile row already exists in the database
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileCheckError) {
          flog("[CALLBACK:BRANCH-F:PROFILE-CHECK-ERROR]", {
            errorName: profileCheckError.name,
            errorMessage: profileCheckError.message,
            fullError: JSON.stringify(profileCheckError),
          });
        }

        if (existingProfile) {
          flog("[CALLBACK:BRANCH-F:OVERRIDE]", {
            message: "✓ Existing account detected (profile found in database despite isNewUser flag)",
            userId: user.id,
            email: user.email,
          });
          isNewUser = false;
        } else {
          const redirectTarget = loginRedirect(origin, GOOGLE_NO_ACCOUNT_MESSAGE).headers.get("location");
          flog("[CALLBACK:BRANCH-F] BLOCKED: unregistered Google sign-in — deleting orphan", {
            branch: "F",
            condition: "intent=signin && isNewUser",
            userId: user.id,
            email: user.email,
            isNewUser,
            accountAgeMs,
            signInSpreadMs,
            sessionExists: Boolean(data.session),
            deleteUserExecuted: true,
            redirectUrl: redirectTarget,
          });
          await deleteUser(user.id, {
            email: user.email,
            intent,
            isNewUser,
            redirectTarget,
            reason:
              "Google sign-in with no prior IB Nexus registration; Supabase created temporary auth.users row",
          });
          return clearAuthCookies(request, loginRedirect(origin, GOOGLE_NO_ACCOUNT_MESSAGE));
        }
      }
    }

    // ── BRANCH G: Password recovery ────────────────────────────────────────────
    if (user.recovery_sent_at || next === "reset-password") {
      const amr = data.session?.user?.amr ?? [];
      const isRecovery = amr.some?.((e) => e.method === "recovery") || next === "reset-password";
      if (isRecovery) {
        flog("[CALLBACK:BRANCH-G] password recovery redirect", {});
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
    }

    // ── BRANCH H: Success path ──────────────────────────────────────────────────
    flog("[CALLBACK:BRANCH-H]", {
      step: "✓ OAuth exchange succeeded",
      accountStatus: "✓ Existing account detected",
      userId: user.id,
      intent,
    });

    flog("[CALLBACK:PROFILE:STARTING]", { step: "✓ Loading profile", userId: user.id });
    let profile = null;
    try {
      profile = await ensureProfile(user);
      flog("[CALLBACK:PROFILE:SUCCESS]", {
        step: "✓ Loading profile succeeded",
        userId: user.id,
        profileId: profile?.id,
        onboardingComplete: profile?.onboarding_completed,
      });
    } catch (profileErr) {
      flog("[CALLBACK:PROFILE:FAILED]", {
        step: "✗ Failed loading profile",
        errorName: profileErr?.name,
        errorMessage: profileErr?.message,
        errorStack: profileErr?.stack,
        fullError: JSON.stringify(profileErr, Object.getOwnPropertyNames(profileErr)),
      });
      throw profileErr;
    }

    let destination = getPostAuthRedirect(profile);
    flog("[CALLBACK:DESTINATION-INITIAL]", { destination });

    flog("[CALLBACK:SETTINGS:STARTING]", { step: "✓ Loading user settings", userId: user.id });
    const { data: settings, error: settingsError } = await supabase
      .from("user_auth_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      flog("[CALLBACK:SETTINGS:FAILED]", {
        step: "✗ Failed loading user settings",
        errorName: settingsError.name,
        errorMessage: settingsError.message,
        fullError: JSON.stringify(settingsError),
      });
    } else {
      flog("[CALLBACK:SETTINGS:SUCCESS]", {
        step: "✓ Loading user settings succeeded",
        settingsFound: Boolean(settings),
        googleEnabled: settings?.google_enabled,
        emailPasswordEnabled: settings?.email_password_enabled,
      });
    }

    if (!settingsError && settings) {
      if (reconnect === "google") {
        await supabase
          .from("user_auth_settings")
          .update({ google_enabled: true, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        revalidatePath("/settings/security");
        destination = `/settings/security?success=${encodeURIComponent(GOOGLE_LINK_SUCCESS_MESSAGE)}`;
      } else {
        const providerUsed = oauthProvider || user.app_metadata?.provider;
        if (providerUsed === "google" && settings.google_enabled === false) {
          flog("[CALLBACK:BRANCH-I] Google disabled for account", { userId: user.id });
          await supabase.auth.signOut({ scope: "local" });
          return clearAuthCookies(
            request,
            loginRedirect(origin, "Google sign-in has been disabled for this account.")
          );
        }
      }
    }

    if (
      reconnect !== "google" &&
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/\\")
    ) {
      if (isOnboardingComplete(profile)) {
        destination = next;
      }
    }

    flog("[CALLBACK:SUCCESS]", {
      step: "✓ Creating session cookie & Redirecting dashboard",
      destination,
      redirectUrl: `${origin}${destination}`,
    });

    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    flog("[CALLBACK:UNHANDLED-EXCEPTION]", {
      errorName: err?.name ?? "Error",
      errorMessage: err?.message ?? String(err),
      errorStack: err?.stack ?? null,
      fullObject: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    console.error("[CALLBACK:UNHANDLED-EXCEPTION]", err);
    const origin = new URL(request.url).origin;
    return clearAuthCookies(
      request,
      loginRedirect(origin, err?.message || "Authentication issue")
    );
  }
}
