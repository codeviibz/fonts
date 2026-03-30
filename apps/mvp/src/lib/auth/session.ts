import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) {
    throw new AuthError("Not authenticated", 401);
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
