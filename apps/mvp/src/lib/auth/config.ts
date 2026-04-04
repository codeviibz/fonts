import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/auth/rate-limit";

const pgAdapter = PostgresAdapter(pool) as Adapter;
const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";

export const authOptions: NextAuthOptions = {
  adapter: pgAdapter,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
    error: "/auth-error",
  },
  providers: [
    EmailProvider({
      server: {
        host: "localhost",
        port: 25,
        auth: { user: "", pass: "" },
      },
      from: "fonts-dev@localhost",
      sendVerificationRequest({ identifier: email, url }) {
        if (!devAuthBypass) {
          throw new Error("DEV_AUTH_BYPASS must be true to use console magic-link transport.");
        }

        const rateLimit = checkRateLimit(`magic-link:${email.trim().toLowerCase()}`);
        if (!rateLimit.allowed) {
          throw new Error(
            `Too many magic-link requests. Try again in ${Math.ceil(rateLimit.retryAfterMs / 1000)}s.`
          );
        }

        console.log(
          `\n╔══════════════════════════════════════════════╗` +
          `\n║  MAGIC LINK for ${email}` +
          `\n║  ${url}` +
          `\n╚══════════════════════════════════════════════╝\n`
        );
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await pool.query<{ id: number; role: string }>(
        "SELECT id, role FROM users WHERE id = $1",
        [user.id]
      );
      const row = dbUser.rows[0];
      if (row) {
        session.user.id = row.id;
        session.user.role = row.role as "subscriber" | "admin";
      }
      return session;
    },
  },
};
