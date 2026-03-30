import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  if (process.env.DEV_AUTH_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev login disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const rl = checkRateLimit(`dev-login:${email}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limited. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  const userResult = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  const user = userResult.rows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions ("userId", "sessionToken", expires)
     VALUES ($1, $2, $3)`,
    [user.id, sessionToken, expires]
  );

  const response = NextResponse.json({ ok: true });

  const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https");
  const cookieName = secureCookie
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: !!secureCookie,
    sameSite: "lax",
    path: "/",
    expires,
  });

  return response;
}
