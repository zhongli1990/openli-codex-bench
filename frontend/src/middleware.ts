import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/pending"];
const AUTH_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for token in cookies or localStorage (via custom header)
  // Since middleware runs on server, we check for a cookie
  const token = request.cookies.get("saas-codex-token")?.value;

  // For client-side token storage, we'll use a different approach:
  // Check if the request has an auth header or redirect to login
  // The actual auth check happens client-side, but we can still protect routes

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  // If accessing root, redirect to dashboard or login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For now, allow all requests through - client-side will handle auth
  // This is because we're using localStorage for token storage
  // A more secure approach would use httpOnly cookies
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
