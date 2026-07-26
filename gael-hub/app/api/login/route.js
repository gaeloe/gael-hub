import { NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "../../../lib/auth";

export async function POST(request) {
  const { password } = await request.json();
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
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
