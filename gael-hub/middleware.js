import { NextResponse } from "next/server";
import { isAuthedRequest } from "./lib/auth";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login page and the login API to load.
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  if (!isAuthedRequest(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
