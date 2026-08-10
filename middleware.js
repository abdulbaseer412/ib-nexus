import { createMiddlewareClient } from "./src/lib/supabase/middleware";
import { NextResponse } from "next/server";
import { AUTH_ROUTES, PROTECTED_PREFIXES } from "./src/lib/constants";
import { isOnboardingComplete } from "./src/lib/profile";

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
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isOAuthCallback = pathname === "/auth/callback";

  // Route prefetches are speculative requests. Running a remote auth check and
  // a database query for each one puts network work directly on the eventual
  // navigation path. Protected server layouts still enforce access when a
  // route is rendered, so a prefetch can safely use the cached route payload.
  if (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return response;
  }

  if (isOAuthCallback) {
    console.log("[MIDDLEWARE:OAUTH-CALLBACK:ENTRY]", {
      url: request.url,
      cookieNames: request.cookies.getAll().map(({ name }) => name),
      pkceVerifierCookies: request.cookies
        .getAll()
        .filter(({ name }) => name.includes("code-verifier"))
        .map(({ name, value }) => ({ name, exists: Boolean(value), valueLength: value?.length ?? 0 })),
    });
  }

  const supabase = createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isOAuthCallback) {
    console.log("[MIDDLEWARE:OAUTH-CALLBACK:AFTER-GET-USER]", {
      responseCookieMutations: response.cookies
        .getAll()
        .map(({ name, value, ...options }) => ({ name, valueLength: value?.length ?? 0, options })),
    });
  }

  const redirectWithCookies = (url) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  };

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl);
  }

  if (user && isAuthRoute(pathname)) {
    // Completion is checked in the destination layout. Keeping middleware
    // auth-only avoids a profiles read on every dashboard route transition.
    return redirectWithCookies(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
