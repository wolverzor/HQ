import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check only: bounce visitors without a session cookie to the
// login page before rendering anything. The real session validation happens
// in src/app/(app)/layout.tsx and in every API route.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // App pages only — not the login page, API routes, PWA files or static assets.
  matcher: ["/", "/tasks/:path*", "/calendar/:path*", "/opportunities/:path*"],
};
