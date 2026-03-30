"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

const DEV_USERS = [
  { email: "admin@test.com", label: "Admin", role: "admin" },
  { email: "user@test.com", label: "Subscriber (Pro)", role: "subscriber" },
  { email: "free@test.com", label: "Free User", role: "subscriber" },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("email", { email, redirect: false });
      if (res?.error) {
        setError(res.error);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin(email: string) {
    setDevLoading(email);
    setError(null);

    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Login failed" }));
        setError(body.error ?? "Login failed");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Dev login failed. Is DEV_AUTH_BYPASS enabled?");
    } finally {
      setDevLoading(null);
    }
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 p-8">
        <div className="w-full space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Check your console</h1>
          <p className="text-muted-foreground">
            A magic link has been logged to the terminal running your dev server.
            Click it to sign in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 p-8">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email for a magic link, or use a dev shortcut below.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Dev shortcuts
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {DEV_USERS.map((u) => (
            <Button
              key={u.email}
              variant="outline"
              className="w-full justify-between"
              onClick={() => handleDevLogin(u.email)}
              disabled={devLoading !== null}
            >
              <span>{u.label}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
