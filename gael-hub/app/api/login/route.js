import { NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "../../../lib/auth";

export async function POST(request) {
  let password;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const configured = process.env.HUB_PASSWORD || "";

  if (!configured) {
    return NextResponse.json(
      { error: "Server is missing HUB_PASSWORD env var." },
      { status: 500 }
    );
  }

  if (password !== configured) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expectedToken(), {
    httpOnly: true,
    // Secure cookies are refused by browsers over plain http, which would make
    // login silently fail on http://localhost during development. Production on
    // Vercel is always https, so this stays on where it matters.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
