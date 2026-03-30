"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  isLoggedIn: boolean;
  hasActiveSubscription: boolean;
}

export function SubscribeClient({ isLoggedIn, hasActiveSubscription }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="w-full space-y-4 rounded-md border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in to subscribe to the Pro plan.
        </p>
        <Link href="/login" className={buttonVariants()}>
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Checkout failed" }));
        setError(body.error ?? "Checkout failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Cancel failed" }));
        setError(body.error ?? "Cancel failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (hasActiveSubscription) {
    return (
      <div className="w-full space-y-4 rounded-md border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Pro Plan</p>
            <p className="text-sm text-muted-foreground">Active subscription</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Active
          </span>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? "Cancelling…" : "Cancel subscription"}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 rounded-md border border-border p-6">
      <div>
        <p className="font-medium">Pro Plan</p>
        <p className="text-sm text-muted-foreground">
          Full catalog access — all font families in OTF, TTF, and WOFF2
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button className="w-full" onClick={handleSubscribe} disabled={loading}>
        {loading ? "Processing…" : "Subscribe (mock)"}
      </Button>
    </div>
  );
}
