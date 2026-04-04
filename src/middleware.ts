/**
 * Auth middleware
 *
 * Runs on every request. If the user doesn't have a valid auth cookie
 * they get redirected to /login.
 *
 * Public routes (login page and auth API) are always allowed through.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("auth_token");

  if (!authCookie || authCookie.value !== "authenticated") {
    // Redirect to login, preserving the original destination
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
