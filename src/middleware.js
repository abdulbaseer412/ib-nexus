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

  if (user?.id) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th";

      if (supabaseUrl && serviceKey) {
        const adminSupabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: profile, error } = await adminSupabase
          .from("profiles")
          .select("is_admin, is_restricted")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && profile) {
          if (profile.is_admin === true && profile.is_restricted !== true && profile.is_suspended !== true) {
            isAdmin = true;
          }
        }

        // Check Google Allowlist
        if (!isAdmin && user.email) {
          const isGoogleAuth = 
            user.app_metadata?.providers?.includes('google') || 
            user.app_metadata?.provider === 'google' ||
            user.identities?.some(id => id.provider === 'google');

          if (isGoogleAuth) {
            const normalizedEmail = user.email.trim().toLowerCase();
            const { data: allowlistData, error: allowErr } = await adminSupabase
              .from("website_access_allowlist")
              .select("id")
              .eq("provider", "google")
              .eq("normalized_email", normalizedEmail)
              .eq("active", true)
              .maybeSingle();
              
            if (!allowErr && allowlistData) {
              isAllowedGoogle = true;
            }
          }
        }
      }
    } catch (err) {
      console.error("[Middleware] Admin verification error:", err?.message);
    }
  }

  // 5. Query dynamic database website lock state
  const lockStatus = await fetchDirectLockStatus();
  const isLocked = IS_APPLICATION_LOCKED || Boolean(lockStatus.is_locked);
  const isApproved = isAdmin || isAllowedGoogle;

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
        response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
        return response;
      }

      // Allow all authentication routes so unapproved users can still log in or switch accounts
      const isAuthRoutePath = isAuthRoute(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");
      if (isAuthRoutePath) {
        return response;
      }

      // ALL OTHER Page Routes: Redirect directly to / (lock screen)
      const lockRedirect = redirectWithCookies(new URL("/", request.url));
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
    const errorParam = request.nextUrl.searchParams.get("error");
    if (errorParam === "account_suspended") {
      return response;
    }
    
    // Do not redirect if they are logging out, or if they are hitting an API auth route,
    // or if the website is locked and they are unapproved (to prevent redirect loop from /login -> /dashboard -> /)
    if (
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

