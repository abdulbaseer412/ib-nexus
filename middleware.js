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

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl);
  }

  if (user && (isProtectedRoute(pathname) || isAuthRoute(pathname))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, display_name, ib_program")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingComplete = isOnboardingComplete(profile);

    if (isAuthRoute(pathname)) {
      const destination = onboardingComplete ? "/dashboard" : "/onboarding";
      return redirectWithCookies(new URL(destination, request.url));
    }

    if (pathname.startsWith("/onboarding") && onboardingComplete) {
      return redirectWithCookies(new URL("/dashboard", request.url));
    }

    if (
      isProtectedRoute(pathname) &&
      !pathname.startsWith("/onboarding") &&
      !onboardingComplete
    ) {
      return redirectWithCookies(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
