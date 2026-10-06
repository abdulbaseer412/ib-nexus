import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import { AUTH_ROUTES, PROTECTED_PREFIXES, IS_APPLICATION_LOCKED } from "@/lib/constants";
import { fetchDirectLockStatus } from "@/lib/website-lock";
import { createClient } from "@supabase/supabase-js";

function isProtectedRoute(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getSuperAdminEmails() {
  const envVal = process.env.SUPER_ADMIN_EMAIL;
  if (!envVal) return [];
  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  
  let response = NextResponse.next({ request: { headers } });

  // 1. Static Framework & Media Asset Bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/suspended" ||
    /\.(png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$/i.test(pathname)
  ) {
    return response;
  }

  // 2. Route prefetches are speculative requests
  if (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return response;
  }

  // 3. Establish Session early
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectWithCookies = (url) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  };

  // 4. Determine Admin & Allowlist status IF user exists
  let isAdmin = false;
  let isAllowedGoogle = false;
  let isUserSuspended = false;

  if (user?.id) {
    try {
      // 1. Fetch profile using user's authenticated session client (bypasses RLS issues)
      let { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, is_restricted, preferences")
        .eq("id", user.id)
        .maybeSingle();

      // 2. Fallback to service role client if session query returned null
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th";

      let adminSupabase = null;
      if (supabaseUrl && serviceKey) {
        adminSupabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        if (!profile) {
          const { data: adminProfile } = await adminSupabase
            .from("profiles")
            .select("is_admin, is_restricted, preferences")
            .eq("id", user.id)
            .maybeSingle();

          if (adminProfile) profile = adminProfile;
        }
      }

      const superAdminEmails = getSuperAdminEmails();
      const isSuper = user?.email && superAdminEmails.includes(user.email.trim().toLowerCase());

      if (isSuper) {
        isAdmin = true;
        isUserSuspended = false;
      } else if (profile) {
        if (profile.preferences?.is_suspended === true || (user.banned_until && new Date(user.banned_until).getTime() > Date.now())) {
          isUserSuspended = true;
        }

        if (profile.is_admin === true && !profile.is_restricted && !isUserSuspended) {
          isAdmin = true;
        }
      }

      // 3. Check Allowlist
      if (user.email && adminSupabase) {
        const normalizedEmail = user.email.trim().toLowerCase();
        const { data: allowlistData, error: allowErr } = await adminSupabase
          .from("website_access_allowlist")
          .select("id")
          .eq("normalized_email", normalizedEmail)
          .eq("active", true)
          .maybeSingle();

        if (!allowErr && allowlistData) {
          isAllowedGoogle = true;
        }
      }

      // 4. Check user_auth_settings to enforce disabled sign-in methods
      if (adminSupabase && pathname !== "/login" && !pathname.startsWith("/api/auth/") && pathname !== "/suspended") {
        const { data: authSettings } = await adminSupabase
          .from("user_auth_settings")
          .select("email_password_enabled, google_enabled")
          .eq("user_id", user.id)
          .maybeSingle();

        if (authSettings) {
          const provider = user.app_metadata?.provider;
          const isEmailSession = provider === "email" || (!provider && !user.app_metadata?.providers?.includes("google"));

          if (isEmailSession && authSettings.email_password_enabled === false) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("error", "Email & password sign-in has been disabled for this account. Please sign in using Google.");
            const logoutRedirect = NextResponse.redirect(loginUrl);
            request.cookies.getAll().forEach(({ name }) => {
              if (name.startsWith("sb-") || name.startsWith("supabase-auth")) {
                logoutRedirect.cookies.set(name, "", {
                  path: "/",
                  maxAge: 0,
                  expires: new Date(0),
                  httpOnly: true,
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                });
              }
            });
            logoutRedirect.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
            return logoutRedirect;
          }
        }
      }
    } catch (err) {
      console.error("[Middleware] Admin verification error:", err?.message);
    }
  }

  // If user is suspended, send them to the beautiful suspended page
  if (isUserSuspended && pathname !== "/suspended" && !pathname.startsWith("/api/auth/") && pathname !== "/contact") {
    return redirectWithCookies(new URL("/suspended", request.url));
  }

  // 5. Query dynamic database website lock state
  const lockStatus = await fetchDirectLockStatus();
  const isLocked = IS_APPLICATION_LOCKED || Boolean(lockStatus.is_locked);
  
  const superAdminEmails = getSuperAdminEmails();
  const userEmail = user?.email?.trim().toLowerCase();
  const isSuperAdmin = Boolean(userEmail && superAdminEmails.includes(userEmail));

  const isApproved = isSuperAdmin || isAllowedGoogle;

  // 6. Enforce Website Lock
  if (isLocked) {
    if (!isApproved) {
      // Direct API requests (except login/auth endpoints): Return HTTP 423 Locked
      if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
        return NextResponse.json(
          { error: "Workspace Temporarily Locked", isLocked: true },
          { 
            status: 423,
            headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" }
          }
        );
      }

      // Root path /: Allow through so page.js renders <NexusOpeningExperience />
      if (pathname === "/") {
        // If an unapproved user lands on / with an active session, redirect to tag rejected_email
        if (user?.email && !request.nextUrl.searchParams.has("rejected_email")) {
          const taggedUrl = new URL(request.url);
          taggedUrl.searchParams.set("rejected_email", user.email);
          const taggedRedirect = NextResponse.redirect(taggedUrl);
          request.cookies.getAll().forEach(({ name }) => {
            if (name.startsWith("sb-") || name.startsWith("supabase-auth")) {
              if (!name.includes("code-verifier")) {
                taggedRedirect.cookies.set(name, "", {
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
          taggedRedirect.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
          return taggedRedirect;
        }

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

      // When website is locked, ONLY allow the OAuth callback and auth API endpoints through
      const isAllowedLockAuthEndpoint = pathname === "/auth/callback" || pathname.startsWith("/api/auth/");
      if (isAllowedLockAuthEndpoint) {
        return response;
      }

      // ALL OTHER Page Routes: Redirect directly to / (lock screen)
      const targetUrl = new URL("/", request.url);
      request.nextUrl.searchParams.forEach((val, key) => {
        if (key === "error") {
          targetUrl.searchParams.set("lock_error", val);
        } else {
          targetUrl.searchParams.set(key, val);
        }
      });
      if (user?.email && !targetUrl.searchParams.has("rejected_email")) {
        targetUrl.searchParams.set("rejected_email", user.email);
      }
      const lockRedirect = NextResponse.redirect(targetUrl);
      
      // Force logout for unapproved users so they must login again
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith("sb-") || name.startsWith("supabase-auth")) {
          if (!name.includes("code-verifier")) {
            lockRedirect.cookies.set(name, "", {
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

      lockRedirect.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return lockRedirect;
    }
  }

  // 7. Normal Authorization
  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl);
  }

  if (user && isAuthRoute(pathname)) {
    // Do not redirect if they are hitting an API auth route, OAuth callback,
    // if there are error / disabled_method / logout query params,
    // or if the website is locked and they are unapproved
    if (
      request.nextUrl.searchParams.has("error") ||
      request.nextUrl.searchParams.has("disabled_method") ||
      request.nextUrl.searchParams.has("logout") ||
      request.nextUrl.searchParams.has("switch") ||
      pathname.startsWith("/api/auth/") || 
      pathname.startsWith("/auth/") ||
      (isLocked && !isApproved)
    ) {
       return response;
    }

    return redirectWithCookies(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

